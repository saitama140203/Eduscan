import os
import json
import aiohttp
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import tempfile
import shutil
from fastapi import UploadFile, HTTPException
import logging
from app.core.config import settings
from app.models.exam import Answer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
import pandas as pd
import io
from sqlalchemy.orm import Session
from app.models.student import Student
from app.models.exam import Exam, Result, AnswerSheet
from app.models.class_room import ClassRoom
import re
from sqlalchemy import func

logger = logging.getLogger(__name__)

class OMRService:
    """Service để tích hợp với OMRChecker"""
    
    def __init__(self, omr_base_url: str = None):
        from app.core.config import settings
        self.omr_base_url = omr_base_url or getattr(settings, 'OMR_API_URL', 'http://localhost:8001')
        self.templates_dir = Path(getattr(settings, 'OMR_DATA_DIR', '/var/lib/eduscan/omr')) / "templates"
        self.models_dir = Path("uploads/omr_models") 
        self.results_dir = Path("uploads/omr_results")
        
    async def convert_eduscan_template_to_omr(self, template_data: Dict) -> Dict:
        """Chuyển đổi template format của EduScan sang format OMRChecker"""
        try:
            omr_template = {
                "pageDimensions": template_data.get("pageDimensions", [2084, 2947]),
                "bubbleDimensions": template_data.get("bubbleDimensions", [45, 45]),
                "customLabels": template_data.get("customLabels", {}),
                "fieldBlocks": {}
            }
            if "fieldBlocks" in template_data:
                for block_name, block_data in template_data["fieldBlocks"].items():
                    omr_template["fieldBlocks"][block_name] = {
                        "fieldType": block_data.get("fieldType", "QTYPE_MCQ4"),
                        "origin": block_data.get("origin", [0, 0]),
                        "fieldLabels": block_data.get("fieldLabels", []),
                        "bubblesGap": block_data.get("bubblesGap", 60),
                        "labelsGap": block_data.get("labelsGap", 60),
                        "rows": block_data.get("rows", 1),
                        "cols": block_data.get("cols", 4)
                    }
            if "preProcessors" in template_data:
                omr_template["preProcessors"] = template_data["preProcessors"]
            return omr_template
        except Exception as e:
            logger.error(f"Error converting template: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Template conversion failed: {str(e)}")
    
    async def save_omr_template(self, template_id: int, omr_template: Dict, reference_image_path: Optional[str] = None) -> str:
        """Lưu OMR template vào file system"""
        try:
            self.templates_dir.mkdir(parents=True, exist_ok=True)
            template_dir = self.templates_dir / f"template_{template_id}"
            template_dir.mkdir(exist_ok=True)
            template_file = template_dir / "template.json"
            with open(template_file, 'w', encoding='utf-8') as f:
                json.dump(omr_template, f, ensure_ascii=False, indent=2)
            if reference_image_path and os.path.exists(reference_image_path):
                ref_image_name = f"template_{template_id}.png"
                ref_image_path_dest = template_dir / ref_image_name
                shutil.copy2(reference_image_path, ref_image_path_dest)
                if "preProcessors" in omr_template:
                    for processor in omr_template["preProcessors"]:
                        if processor.get("name") == "AdvancedFeatureAlignment":
                            processor["options"]["reference"] = ref_image_name
            logger.info(f"OMR template saved: {template_file}")
            return str(template_file)
        except Exception as e:
            logger.error(f"Error saving OMR template: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save template: {str(e)}")
    
    async def process_omr_images(
        self, 
        db: AsyncSession,
        exam_id: int,
        template_id: int,
        images: List[UploadFile],
        yolo_model: str = "models/best.pt",
        confidence: float = 0.25,
        auto_align: bool = True
    ) -> Dict:
        """Xử lý batch OMR images, tự động lấy đáp án từ DB."""
        try:
            self.results_dir.mkdir(parents=True, exist_ok=True)
            batch_id = f"batch_{template_id}_{int(asyncio.get_event_loop().time())}"
            batch_dir = self.results_dir / batch_id
            batch_dir.mkdir(exist_ok=True)
            
            answer_result = await db.execute(select(Answer).where(Answer.maBaiKiemTra == exam_id))
            exam_answer = answer_result.scalars().first()
            if not exam_answer:
                raise HTTPException(status_code=404, detail=f"Không tìm thấy đáp án cho bài thi ID {exam_id}")
            answer_key_data = {"answers": exam_answer.dapAnJson, "scores": exam_answer.diemMoiCauJson}
            
            answer_key_path = None
            with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.json', encoding='utf-8') as temp_answer_file:
                json.dump(answer_key_data, temp_answer_file, ensure_ascii=False, indent=2)
                answer_key_path = temp_answer_file.name
            
            image_paths = []
            for i, image in enumerate(images):
                temp_path = batch_dir / f"image_{i}_{image.filename}"
                with open(temp_path, 'wb') as f:
                    content = await image.read()
                    f.write(content)
                image_paths.append(str(temp_path))
            
            template_path = self.templates_dir / f"template_{template_id}" / "template.json"
            
            async with aiohttp.ClientSession() as session:
                data = aiohttp.FormData()
                for i, img_path in enumerate(image_paths):
                    with open(img_path, 'rb') as f:
                        data.add_field(f'images', f.read(), filename=f'image_{i}.jpg')
                data.add_field('template_path', str(template_path))
                data.add_field('yolo_model', yolo_model)
                data.add_field('confidence', str(confidence))
                data.add_field('auto_align', str(auto_align).lower())
                if answer_key_path:
                    data.add_field('answer_key_json_path', answer_key_path)
                
                async with session.post(
                    f"{self.omr_base_url}/api/omr/batch",
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=300)
                ) as response:
                    if response.status != 200:
                        error_detail = response.text
                        try:
                            error_detail_json = response.json().get('detail', error_detail)
                            error_detail = error_detail_json
                        except:
                            pass
                        raise HTTPException(status_code=response.status, detail=f"Lỗi từ OMR service: {error_detail}")
                    result = await response.json()
                    result_file = batch_dir / "results.json"
                    with open(result_file, 'w', encoding='utf-8') as f:
                        json.dump(result, f, ensure_ascii=False, indent=2)
                    result["batch_id"] = batch_id
                    result["batch_dir"] = str(batch_dir)
                    result["processed_images"] = len(image_paths)
                    if answer_key_path:
                        os.unlink(answer_key_path)
                    return result
        except Exception as e:
            logger.error(f"Error processing OMR images: {str(e)}")
            raise HTTPException(status_code=500, detail=f"OMR processing failed: {str(e)}")
    
    async def get_available_models(self) -> List[Dict]:
        """Lấy danh sách YOLO models có sẵn"""
        try:
            models = []
            models_path = Path("../OMRChecker/models")
            
            # Also check the models_dir if it exists
            if self.models_dir.exists():
                for model_file in self.models_dir.glob("*.pt"):
                    stat = model_file.stat()
                    models.append({
                        "name": model_file.name,
                        "path": str(model_file),
                        "size": stat.st_size,
                        "modified": stat.st_mtime
                    })
            
            if models_path.exists():
                for model_file in models_path.glob("*.pt"):
                    stat = model_file.stat()
                    models.append({
                        "name": model_file.name,
                        "path": str(model_file),
                        "size": stat.st_size,
                        "modified": stat.st_mtime
                    })
            
            return models
            
        except Exception as e:
            logger.error(f"Error getting models: {str(e)}")
            return []
    
    async def validate_template(self, template_data: Dict) -> Dict:
        """
        Validate OMR template configuration
        
        Args:
            template_data: Template data to validate
            
        Returns:
            Dict: Validation result
        """
        try:
            errors = []
            warnings = []
            
            # Kiểm tra các trường bắt buộc
            required_fields = ["pageDimensions", "fieldBlocks"]
            for field in required_fields:
                if field not in template_data:
                    errors.append(f"Missing required field: {field}")
            
            # Kiểm tra fieldBlocks
            if "fieldBlocks" in template_data:
                for block_name, block_data in template_data["fieldBlocks"].items():
                    if "origin" not in block_data:
                        errors.append(f"Block {block_name}: Missing origin coordinates")
                    
                    if "fieldLabels" not in block_data or not block_data["fieldLabels"]:
                        errors.append(f"Block {block_name}: Missing fieldLabels")
                    
                    # Kiểm tra fieldType
                    valid_types = ["QTYPE_MCQ4", "QTYPE_MCQ2", "QTYPE_INT", "QTYPE_INT10_SYMBOL"]
                    if block_data.get("fieldType") not in valid_types:
                        warnings.append(f"Block {block_name}: Unknown fieldType {block_data.get('fieldType')}")
            
            return {
                "valid": len(errors) == 0,
                "errors": errors,
                "warnings": warnings
            }
            
        except Exception as e:
            return {
                "valid": False,
                "errors": [f"Validation error: {str(e)}"],
                "warnings": []
            }
    
    async def preview_template(self, template_id: int, sample_image: Optional[UploadFile] = None) -> Dict:
        """
        Preview OMR template với hoặc không có sample image
        """
        try:
            # Kiểm tra template file có tồn tại không
            template_path = self.templates_dir / f"template_{template_id}" / "template.json"
            
            if not template_path.exists():
                raise HTTPException(status_code=404, detail=f"Template {template_id} not found")
            
            # Mock response khi không có OMR service
            if sample_image:
                # Mock preview với sample image
                return {
                    "success": True,
                    "template_info": {
                        "page_dimensions": [2084, 2947],
                        "bubble_dimensions": [45, 45],
                        "field_blocks": 5,
                        "total_bubbles": 40
                    },
                    "preview_image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                    "message": "Mock preview image - OMR service offline"
                }
            
            # Nếu không có sample image, chỉ trả về template info
            with open(template_path, 'r', encoding='utf-8') as f:
                template_data = json.load(f)
            
            return {
                "success": True,
                "template_id": template_id,
                "template_data": template_data,
                "preview_available": False,
                "message": "Template info loaded - no sample image provided"
            }
            
        except Exception as e:
            logger.error(f"Error previewing template: {str(e)}")
            # Trả về thông báo lỗi thay vì raise exception
            return {
                "success": False,
                "template_id": template_id,
                "error": str(e),
                "message": f"Error previewing template: {str(e)}"
            }

    def extract_student_id_from_image(self, sbd_text: str) -> Optional[str]:
        """
        Trích xuất 6 số cuối từ số báo danh được OCR.
        Trả về None nếu không có số nào.
        """
        if not sbd_text or not isinstance(sbd_text, str):
            return None
        numbers_only = re.sub(r'[^\d]', '', sbd_text)
        if len(numbers_only) >= 6:
            return numbers_only[-6:]
        return numbers_only if numbers_only else None
    
    async def match_student_by_sbd(self, db: AsyncSession, sbd: str, class_id: Optional[int] = None) -> Optional[Student]:
        """
        Match học sinh dựa trên 6 số cuối của mã học sinh (maHocSinhTruong).
        """
        if not sbd:
            return None
            
        stmt = select(Student)
        if class_id:
            stmt = stmt.where(Student.maLopHoc == class_id)
            
        # Tối ưu hóa query bằng cách chỉ tìm các mã có độ dài >= 6
        stmt = stmt.where(func.length(Student.maHocSinhTruong) >= 6)

        result = await db.execute(stmt)
        students = result.scalars().all()
        
        for student in students:
            # Lấy 6 ký tự cuối của maHocSinhTruong
            student_code_suffix = student.maHocSinhTruong[-6:]
            if student_code_suffix == sbd:
                return student
                
        return None
    
    async def process_and_match_batch(
        self,
        db: AsyncSession,
        exam_id: int,
        images: List[UploadFile],
        template_id: int,
        class_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Hàm xử lý OMR chính: lấy đáp án từ DB, gọi OMR service,
        khớp SBD và lưu kết quả.
        """
        logger.info(f"=== Backend: Bắt đầu xử lý batch cho kỳ thi ID: {exam_id}, template ID: {template_id} ===")
        import traceback

        try:
            # 1. Lấy đáp án từ DB
            logger.info("Bước 1: Lấy đáp án từ DB...")
            answer_result = await db.execute(select(Answer).where(Answer.maBaiKiemTra == exam_id))
            exam_answer = answer_result.scalars().first()

            if not exam_answer or not exam_answer.dapAnJson:
                 raise HTTPException(status_code=404, detail=f"Không tìm thấy đáp án hoặc đáp án rỗng cho kỳ thi ID {exam_id}")

            answer_key_data = { "answers": exam_answer.dapAnJson, "scores": exam_answer.diemMoiCauJson or {} }
            logger.info(f"Đã tìm thấy đáp án cho {len(answer_key_data['answers'])} câu hỏi.")

            # 2. Gọi OMRChecker service
            logger.info("Bước 2: Gọi OMRChecker service...")

            # Sửa lại để gửi đường dẫn tuyệt đối đến OMRChecker
            omr_checker_base_path = Path(__file__).resolve().parent.parent.parent / "OMRChecker"
            full_template_path = omr_checker_base_path / f"templates/template_{template_id}/template.json"
            full_model_path = omr_checker_base_path / "models/best.pt"

            if not full_template_path.exists():
                raise HTTPException(status_code=404, detail=f"Template file {full_template_path} không tồn tại.")

            async with httpx.AsyncClient(timeout=300.0) as client:
                files_to_send = [("images", (img.filename, await img.read(), img.content_type)) for img in images]
                
                # Gộp tất cả metadata vào một chuỗi JSON để gửi đi
                json_data_payload = {
                    "template_path": str(full_template_path),
                    "yolo_model": str(full_model_path),
                    "answer_key_data": answer_key_data,
                    "confidence": 0.25, # Có thể thay đổi
                    "auto_align": True   # Có thể thay đổi
                }

                data_to_send = {
                    "json_data": json.dumps(json_data_payload)
                }
                
                logger.info(f"Gửi request tới OMR service với data: {data_to_send}")
                response = await client.post(f"{self.omr_base_url}/api/v1/omr/batch", files=files_to_send, data=data_to_send)
                
                logger.info(f"OMR service response status: {response.status_code}")
                
                if response.status_code != 200:
                    error_detail = response.text
                    try:
                        # Cố gắng parse JSON để lấy thông báo lỗi rõ hơn
                        error_detail_json = response.json().get('detail', error_detail)
                        error_detail = error_detail_json
                    except:
                        pass # Nếu không phải JSON, giữ nguyên text
                    raise HTTPException(status_code=response.status_code, detail=f"Lỗi từ OMR service: {error_detail}")
                
                omr_results = response.json()

            # 3. Xử lý kết quả, khớp SBD và lưu vào DB
            logger.info("Bước 3: Xử lý kết quả và lưu vào DB...")
            processed_results = []
            matched_count = 0
            
            for res in omr_results.get("results", []):
                filename = res.get("file")
                omr_data = res.get("results", {})
                
                sbd = self.extract_student_id_from_image(omr_data.get("sbd"))
                student = await self.match_student_by_sbd(db, sbd, class_id)
                
                if student and "score" in omr_data:
                    # Tránh ghi trùng lặp kết quả
                    result = await db.execute(select(Result).where(Result.maBaiKiemTra == exam_id, Result.maHocSinh == student.maHocSinh))
                    existing_result = result.scalars().first()

                    if existing_result:
                        # Cập nhật kết quả cũ
                        existing_result.diem = float(omr_data["score"])
                        existing_result.chiTiet = str(omr_data.get("answers", {}))
                        # Cần tìm và cập nhật AnswerSheet nữa nếu cần
                    else:
                        # Tạo kết quả mới
                        answer_sheet = AnswerSheet(
                            maKyThi=exam_id,
                            maHocSinh=student.maHocSinh,
                            sobaodanh=sbd,
                            trangThai=True
                        )
                        db.add(answer_sheet)
                        await db.flush()
                        
                        exam_result = Result(
                            maKyThi=exam_id,
                            maHocSinh=student.maHocSinh,
                            maPhieuTraLoi=answer_sheet.maPhieuTraLoi,
                            diem=float(omr_data["score"]),
                            chiTiet=str(omr_data.get("answers", {}))
                        )
                        db.add(exam_result)

                    matched_count += 1
                
                processed_results.append({
                    "filename": filename,
                    "sbd": sbd,
                    "student": {
                        "maHocSinh": student.maHocSinh,
                        "hoTen": student.hoTen,
                        "maHocSinhTruong": student.maHocSinhTruong
                    } if student else None,
                    "score": omr_data.get("score"),
                    "answers": omr_data.get("answers", {}),
                    "matched": student is not None,
                    "annotated_image": res.get("annotated_image")
                })
            
            await db.commit()
            
            logger.info(f"Hoàn tất xử lý. {matched_count}/{len(processed_results)} bài thi được khớp.")
            return {
                "total_processed": len(processed_results),
                "matched_count": matched_count,
                "results": processed_results
            }

        except Exception as e:
            logger.error(f"Lỗi nghiêm trọng trong process_and_match_batch: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            await db.rollback() # Rollback nếu có lỗi
            raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi xử lý OMR: {e}")

    async def export_results_to_excel(
        self,
        db: AsyncSession,
        exam_id: int,
        class_id: int = None
    ) -> bytes:
        """
        Xuất kết quả thi ra file Excel
        """
        try:
            # Query kết quả thi
            stmt = select(
                Result.diem,
                Student.maHocSinhTruong,
                Student.hoTen,
                Student.ngaySinh,
                Student.gioiTinh,
                ClassRoom.tenLop,
                AnswerSheet.sobaodanh,
                Result.chiTiet
            ).join(
                Student, Result.maHocSinh == Student.maHocSinh
            ).join(
                ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc
            ).join(
                AnswerSheet, Result.maPhieuTraLoi == AnswerSheet.maPhieuTraLoi
            ).where(
                Result.maKyThi == exam_id
            )
            
            if class_id:
                stmt = stmt.where(Student.maLopHoc == class_id)
            
            result = await db.execute(stmt)
            results = result.all()
            
            # Tạo DataFrame
            data = []
            for res in results:
                data.append({
                    "Số báo danh": res.sobaodanh,
                    "Mã học sinh": res.maHocSinhTruong,
                    "Họ tên": res.hoTen,
                    "Ngày sinh": res.ngaySinh.strftime("%d/%m/%Y") if res.ngaySinh else "",
                    "Giới tính": res.gioiTinh,
                    "Lớp": res.tenLop,
                    "Điểm": res.diem,
                    "Chi tiết đáp án": res.chiTiet
                })
            
            df = pd.DataFrame(data)
            
            # Xuất ra Excel
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Kết quả thi', index=False)
                
                # Format worksheet
                worksheet = writer.sheets['Kết quả thi']
                
                # Adjust column widths
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = min(max_length + 2, 50)
                    worksheet.column_dimensions[column_letter].width = adjusted_width
            
            output.seek(0)
            return output.getvalue()
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Excel export error: {str(e)}")

# Lazy-loaded singleton instance
_omr_service = None

def get_omr_service() -> OMRService:
    """Get the OMR service singleton instance"""
    global _omr_service
    if _omr_service is None:
        _omr_service = OMRService()
    return _omr_service 