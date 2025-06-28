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
from sqlalchemy import select, and_
import httpx
import pandas as pd
import io
from sqlalchemy.orm import Session
from app.models.student import Student
from app.models.exam import Exam, Result, AnswerSheet
from app.models.class_room import ClassRoom
import re
from sqlalchemy import func
from decimal import Decimal
from app.models.user import User

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

class OMRDatabaseService:
    """
    Service xử lý OMR tích hợp với database
    """
    
    @staticmethod
    def detect_ma_de_from_omr_results(omr_results: Dict[str, Any]) -> Optional[str]:
        """
        Phát hiện mã đề từ kết quả OMR tự động
        
        Args:
            omr_results: Kết quả từ OMR processing
            
        Returns:
            Mã đề nếu tìm thấy, None nếu không
        """
        try:
            # Log để debug
            logging.debug(f"Detecting mã đề from OMR results keys: {list(omr_results.keys())}")
            
            # 1. Tìm trong metadata trước
            if "_metadata" in omr_results:
                metadata = omr_results["_metadata"]
                if isinstance(metadata, dict) and "ma_de" in metadata:
                    ma_de_value = str(metadata["ma_de"]).strip()
                    if ma_de_value and ma_de_value != "" and ma_de_value != "unknown":
                        logging.info(f"Detected mã đề from metadata: {ma_de_value}")
                        return ma_de_value
            
            # 2. Danh sách các key có thể chứa mã đề (mở rộng)
            ma_de_keys = [
                "ma_de", "made", "mdt", "code", "form_code", "version", 
                "exam_code", "test_code", "variant", "form", "exam_version",
                "test_version", "paper_code", "question_set"
            ]
            
            # 3. Tìm trong các key chuẩn
            for key in ma_de_keys:
                if key in omr_results and omr_results[key]:
                    ma_de_value = str(omr_results[key]).strip()
                    if ma_de_value and ma_de_value != "" and ma_de_value != "unknown":
                        logging.info(f"Detected mã đề from key '{key}': {ma_de_value}")
                        return ma_de_value
            
            # 4. Tìm trong key có pattern tương tự
            for key, value in omr_results.items():
                if key.startswith("_"):  # Skip metadata
                    continue
                key_lower = key.lower()
                if any(pattern in key_lower for pattern in ["ma_de", "made", "mdt", "code", "form", "version"]):
                    if value:
                        ma_de_value = str(value).strip()
                        if ma_de_value and ma_de_value != "" and ma_de_value != "unknown":
                            logging.info(f"Detected mã đề from pattern key '{key}': {ma_de_value}")
                            return ma_de_value
            
            # 5. Tìm trong key số có 3 chữ số (123, 456, 777)
            for key, value in omr_results.items():
                if key.startswith("_"):  # Skip metadata
                    continue
                if value and str(value).isdigit():
                    digit_str = str(value)
                    if len(digit_str) == 3:  # 3 digits
                        ma_de_value = digit_str
                        logging.info(f"Detected mã đề from 3-digit pattern '{key}': {ma_de_value}")
                        return ma_de_value
                    elif len(digit_str) == 1 and digit_str in ["1", "2", "3", "4", "5"]:  # Single digit 1-5
                        ma_de_value = digit_str
                        logging.info(f"Detected mã đề from single digit '{key}': {ma_de_value}")
                        return ma_de_value
            
            # 6. Nếu không tìm thấy, log để debug
            logging.warning("Không tự động nhận diện được mã đề từ OMR results")
            logging.debug(f"Available OMR results: {dict((k, v) for k, v in omr_results.items() if not k.startswith('_'))}")
            return None
            
        except Exception as e:
            logging.error(f"Error detecting mã đề from OMR results: {str(e)}")
            return None

    @staticmethod
    async def get_answer_key_from_db(
        db: AsyncSession, 
        exam_id: int,
        ma_de: Optional[str] = None
    ) -> Tuple[Dict[str, str], Dict[str, float]]:
        """
        Lấy đáp án và điểm từ database theo exam_id và mã đề
        
        Args:
            db: Database session
            exam_id: ID bài kiểm tra
            ma_de: Mã đề (nếu có nhiều đề khác nhau)
            
        Returns:
            Tuple of (answer_key, score_key)
            answer_key: Dict[question_id, correct_answer]
            score_key: Dict[question_id, score_points]
        """
        try:
            # Lấy đáp án từ bảng DAPAN
            stmt = select(Answer).where(Answer.maBaiKiemTra == exam_id)
            result = await db.execute(stmt)
            answer_obj = result.scalars().first()
            
            if not answer_obj:
                raise ValueError(f"Không tìm thấy đáp án cho bài kiểm tra ID: {exam_id}")
            
            # Parse JSON data với error handling
            answer_key = {}
            score_key = {}
            
            if answer_obj.dapAnJson:
                try:
                    # Đảm bảo dapAnJson là dict, không phải string
                    if isinstance(answer_obj.dapAnJson, str):
                        # Nếu là string, parse JSON
                        dap_an_data = json.loads(answer_obj.dapAnJson)
                    elif isinstance(answer_obj.dapAnJson, dict):
                        # Nếu đã là dict, sử dụng trực tiếp
                        dap_an_data = answer_obj.dapAnJson
                    else:
                        # Nếu là type khác, convert sang string rồi parse
                        dap_an_data = json.loads(str(answer_obj.dapAnJson))
                    
                    # Kiểm tra format đáp án
                    if isinstance(dap_an_data, dict):
                        # **ENHANCED**: Xử lý trường hợp ma_de=None
                        if ma_de and ma_de in dap_an_data:
                            # Format mới: {"123": {...}, "456": {...}} - theo mã đề
                            answers_for_ma_de = dap_an_data[ma_de]
                            for q_id, answer in answers_for_ma_de.items():
                                answer_key[str(q_id)] = str(answer)
                            logging.info(f"Using answer key for mã đề: {ma_de}")
                        elif len(dap_an_data) == 1:
                            # Chỉ có 1 đề duy nhất - sử dụng luôn
                            first_ma_de = next(iter(dap_an_data.keys()))
                            if first_ma_de.isdigit():
                                answers_for_ma_de = dap_an_data[first_ma_de]
                                for q_id, answer in answers_for_ma_de.items():
                                    answer_key[str(q_id)] = str(answer)
                                logging.info(f"Auto-selected mã đề: {first_ma_de} (only option)")
                            else:
                                # Format cũ trực tiếp
                                for q_id, answer in dap_an_data.items():
                                    answer_key[str(q_id)] = str(answer)
                                logging.info("Using direct answer format")
                        elif not ma_de and len(dap_an_data) > 1:
                            # Nhiều mã đề nhưng không detect được - lấy đề đầu tiên
                            first_ma_de = next(iter(dap_an_data.keys()))
                            if all(k.isdigit() for k in dap_an_data.keys()):
                                # Tất cả key đều là số - format theo mã đề
                                answers_for_ma_de = dap_an_data[first_ma_de]
                                for q_id, answer in answers_for_ma_de.items():
                                    answer_key[str(q_id)] = str(answer)
                                logging.warning(f"Cannot detect mã đề, using first available: {first_ma_de}")
                            else:
                                # Format cũ
                                for q_id, answer in dap_an_data.items():
                                    answer_key[str(q_id)] = str(answer)
                                logging.info("Using direct answer format (fallback)")
                        else:
                            # Format cũ: {"1": "A", "2": "B", ...} - trực tiếp
                            if all(isinstance(v, str) for v in dap_an_data.values()):
                                for q_id, answer in dap_an_data.items():
                                    answer_key[str(q_id)] = str(answer)
                                logging.info("Using legacy direct format")
                            else:
                                # Thử lấy đề đầu tiên nếu có thể
                                if dap_an_data:
                                    first_key = next(iter(dap_an_data.keys()))
                                    first_value = dap_an_data[first_key]
                                    if isinstance(first_value, dict):
                                        for q_id, answer in first_value.items():
                                            answer_key[str(q_id)] = str(answer)
                                        logging.warning(f"Using fallback format with key: {first_key}")
                                    else:
                                        raise ValueError(f"Cannot parse answer format. Available keys: {list(dap_an_data.keys())}")
                    
                except (json.JSONDecodeError, TypeError, UnicodeDecodeError) as e:
                    logging.error(f"Error parsing dapAnJson: {e}")
                    raise ValueError(f"Lỗi parse đáp án JSON: {str(e)}")
            
            if answer_obj.diemMoiCauJson:
                try:
                    # Đảm bảo diemMoiCauJson là dict
                    if isinstance(answer_obj.diemMoiCauJson, str):
                        diem_data = json.loads(answer_obj.diemMoiCauJson)
                    elif isinstance(answer_obj.diemMoiCauJson, dict):
                        diem_data = answer_obj.diemMoiCauJson
                    else:
                        diem_data = json.loads(str(answer_obj.diemMoiCauJson))
                    
                    # diemMoiCauJson format: {"q1": 0.132, "q2": 0.132, ...}
                    for q_id, score in diem_data.items():
                        score_key[str(q_id)] = float(score)
                        
                except (json.JSONDecodeError, TypeError, ValueError, UnicodeDecodeError) as e:
                    logging.error(f"Error parsing diemMoiCauJson: {e}")
                    # Fallback: tính điểm đều
                    pass
            
            # Nếu không có điểm riêng hoặc lỗi parse, tính điểm đều cho tất cả câu
            if not score_key:
                exam_stmt = select(Exam).where(Exam.maBaiKiemTra == exam_id)
                exam_result = await db.execute(exam_stmt)
                exam_obj = exam_result.scalars().first()
                
                if exam_obj and exam_obj.tongSoCau > 0:
                    points_per_question = float(exam_obj.tongDiem) / exam_obj.tongSoCau
                    for q_id in answer_key.keys():
                        score_key[q_id] = points_per_question
                else:
                    # Default scoring nếu không có thông tin
                    for q_id in answer_key.keys():
                        score_key[q_id] = 1.0
            
            if not answer_key:
                raise ValueError(f"Không thể lấy được đáp án cho exam_id={exam_id}, ma_de={ma_de}")
            
            logging.info(f"Loaded answer key for exam {exam_id}, mã đề {ma_de}: {len(answer_key)} questions")
            return answer_key, score_key
            
        except Exception as e:
            logging.error(f"Error loading answer key for exam {exam_id}, mã đề {ma_de}: {str(e)}")
            raise ValueError(f"Lỗi khi lấy đáp án từ database: {str(e)}")
    
    @staticmethod
    async def find_student_by_sbd(
        db: AsyncSession,
        exam_id: int,
        sbd: str
    ) -> Optional[Student]:
        """
        Tìm học sinh theo số báo danh (6 số cuối của mã học sinh trường)
        trong các lớp tham gia bài kiểm tra
        
        Args:
            db: Database session
            exam_id: ID bài kiểm tra
            sbd: Số báo danh (6 ký tự cuối)
            
        Returns:
            Student object nếu tìm thấy, None nếu không
        """
        try:
            # Lấy danh sách lớp tham gia bài kiểm tra
            from app.models.exam import ExamClassRoom
            
            stmt = select(Student).join(
                ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc
            ).join(
                ExamClassRoom, ClassRoom.maLopHoc == ExamClassRoom.maLopHoc
            ).where(
                and_(
                    ExamClassRoom.maBaiKiemTra == exam_id,
                    Student.maHocSinhTruong.like(f"%{sbd}"),  # Tìm SBD ở cuối
                    Student.trangThai == True
                )
            )
            
            result = await db.execute(stmt)
            students = result.scalars().all()
            
            # Lọc chính xác 6 số cuối
            matching_students = []
            for student in students:
                if student.maHocSinhTruong and len(student.maHocSinhTruong) >= 6:
                    last_6_digits = student.maHocSinhTruong[-6:]
                    if last_6_digits == sbd:
                        matching_students.append(student)
            
            if len(matching_students) == 1:
                logging.info(f"Found student {matching_students[0].hoTen} for SBD {sbd}")
                return matching_students[0]
            elif len(matching_students) > 1:
                logging.warning(f"Multiple students found for SBD {sbd}")
                return matching_students[0]  # Return first match
            else:
                logging.warning(f"No student found for SBD {sbd}")
                return None
                
        except Exception as e:
            logging.error(f"Error finding student by SBD {sbd}: {str(e)}")
            return None
    
    @staticmethod
    def generate_sbd_from_ma_hoc_sinh(ma_hoc_sinh_truong: str) -> str:
        """
        Tạo số báo danh từ 6 số cuối của mã học sinh trường
        
        Args:
            ma_hoc_sinh_truong: Mã học sinh trường (ví dụ: "HS20240001234")
            
        Returns:
            Số báo danh 6 số cuối (ví dụ: "001234")
        """
        if not ma_hoc_sinh_truong or len(ma_hoc_sinh_truong) < 6:
            return "000000"
        
        return ma_hoc_sinh_truong[-6:]
    
    @staticmethod
    async def score_omr_result(
        db: AsyncSession,
        exam_id: int,
        student_answers: Dict[str, str],
        sbd: str,
        image_path: Optional[str] = None,
        scanner_user_id: Optional[int] = None,
        annotated_image_path: Optional[str] = None,
        save_to_db: bool = False
    ) -> Dict[str, Any]:
        """
        Chấm điểm và tùy chọn lưu kết quả vào database
        """
        try:
            # LOG: In ra student_answers để debug
            logging.info(f"Processing OMR for SBD {sbd}, answers keys: {list(student_answers.keys())}")
            
            # 1. Phát hiện mã đề từ kết quả OMR
            ma_de = OMRDatabaseService.detect_ma_de_from_omr_results(student_answers)
            logging.info(f"Detected mã đề: {ma_de}")
            
            # 2. Lấy đáp án chuẩn từ database (với fallback handling)
            try:
                answer_key, score_key = await OMRDatabaseService.get_answer_key_from_db(db, exam_id, ma_de)
            except ValueError as e:
                if "không tìm thấy mã đề" in str(e) or ma_de is None:
                    # Fallback: thử lấy đáp án với mã đề đầu tiên có sẵn
                    logging.warning(f"Fallback: trying to get any available answer key for exam {exam_id}")
                    
                    # Lấy thông tin đáp án để xem có mã đề nào
                    stmt = select(Answer).where(Answer.maBaiKiemTra == exam_id)
                    result = await db.execute(stmt)
                    answer_obj = result.scalars().first()
                    
                    if answer_obj and answer_obj.dapAnJson:
                        available_codes = list(answer_obj.dapAnJson.keys()) if isinstance(answer_obj.dapAnJson, dict) else []
                        logging.info(f"Available answer codes: {available_codes}")
                        
                        if available_codes and all(code.isdigit() for code in available_codes):
                            # Thử với mã đề đầu tiên
                            fallback_ma_de = available_codes[0]
                            logging.warning(f"Using fallback mã đề: {fallback_ma_de}")
                            answer_key, score_key = await OMRDatabaseService.get_answer_key_from_db(db, exam_id, fallback_ma_de)
                            ma_de = fallback_ma_de  # Update ma_de
                        else:
                            # Thử với None để get format cũ
                            answer_key, score_key = await OMRDatabaseService.get_answer_key_from_db(db, exam_id, None)
                    else:
                        raise e
                else:
                    raise e
            
            # 3. Tìm học sinh theo SBD
            student = await OMRDatabaseService.find_student_by_sbd(db, exam_id, sbd)
            if not student:
                return {
                    "success": False,
                    "error": f"Không tìm thấy học sinh với SBD: {sbd}",
                    "sbd": sbd,
                    "student_answers": student_answers
                }
            
            # 4. Chấm điểm
            total_score = 0.0
            correct_count = 0
            wrong_count = 0
            blank_count = 0
            details = []
            
            logging.info(f"Scoring: {len(answer_key)} questions from answer key, {len(student_answers)} student answers")
            
            # Xử lý từng câu hỏi
            for q_id, correct_answer in answer_key.items():
                student_answer = student_answers.get(q_id, "")
                points = score_key.get(q_id, 0.0)
                
                if not student_answer or student_answer.strip() == "":
                    # Câu bỏ trống
                    blank_count += 1
                    is_correct = False
                    earned_points = 0.0
                elif student_answer.upper() == correct_answer.upper():
                    # Câu trả lời đúng
                    correct_count += 1
                    is_correct = True
                    earned_points = points
                    total_score += points
                else:
                    # Câu trả lời sai
                    wrong_count += 1
                    is_correct = False
                    earned_points = 0.0
                
                details.append({
                    "question_id": q_id,
                    "student_answer": student_answer,
                    "correct_answer": correct_answer,
                    "is_correct": is_correct,
                    "points": points,
                    "earned_points": earned_points
                })
            
            # 4. Lưu/cập nhật AnswerSheet
            answer_sheet_stmt = select(AnswerSheet).where(
                and_(
                    AnswerSheet.maBaiKiemTra == exam_id,
                    AnswerSheet.maHocSinh == student.maHocSinh
                )
            )
            answer_sheet_result = await db.execute(answer_sheet_stmt)
            answer_sheet = answer_sheet_result.scalars().first()
            
            if not answer_sheet:
                # Tạo mới AnswerSheet
                answer_sheet = AnswerSheet(
                    maBaiKiemTra=exam_id,
                    maHocSinh=student.maHocSinh,
                    maNguoiQuet=scanner_user_id,
                    urlHinhAnh=annotated_image_path,
                    cauTraLoiJson=student_answers,
                    daXuLyHoanTat=True,
                    doTinCay=95.0  # Default confidence
                )
                db.add(answer_sheet)
            else:
                # Cập nhật AnswerSheet
                answer_sheet.cauTraLoiJson = student_answers
                answer_sheet.daXuLyHoanTat = True
                answer_sheet.urlHinhAnh = annotated_image_path
                if scanner_user_id:
                    answer_sheet.maNguoiQuet = scanner_user_id
            
            await db.flush()  # Để có ID của answer_sheet
            
            # 5. Lưu/cập nhật Result
            result_stmt = select(Result).where(
                and_(
                    Result.maBaiKiemTra == exam_id,
                    Result.maHocSinh == student.maHocSinh
                )
            )
            result_result = await db.execute(result_stmt)
            exam_result = result_result.scalars().first()
            
            if not exam_result:
                # Tạo mới Result
                exam_result = Result(
                    maPhieuTraLoi=answer_sheet.maPhieuTraLoi,
                    maBaiKiemTra=exam_id,
                    maHocSinh=student.maHocSinh,
                    diem=Decimal(str(round(total_score, 2))),
                    soCauDung=correct_count,
                    soCauSai=wrong_count,
                    soCauChuaTraLoi=blank_count,
                    chiTietJson=details
                )
                db.add(exam_result)
            else:
                # Cập nhật Result
                exam_result.diem = Decimal(str(round(total_score, 2)))
                exam_result.soCauDung = correct_count
                exam_result.soCauSai = wrong_count
                exam_result.soCauChuaTraLoi = blank_count
                exam_result.chiTietJson = details
                exam_result.maPhieuTraLoi = answer_sheet.maPhieuTraLoi
            
            if save_to_db:
                await db.commit()
                logging.info(f"Result for SBD {sbd} saved to database.")
            
            # 6. Trả về kết quả (luôn trả về, dù có lưu hay không)
            result_data = {
                "success": True,
                "student_id": student.maHocSinh,
                "student_name": student.hoTen,
                "student_code": student.maHocSinhTruong,
                "sbd": sbd,
                "ma_de": ma_de,
                "total_score": round(total_score, 2),
                "correct_answers": correct_count,
                "wrong_answers": wrong_count,
                "blank_answers": blank_count,
                "total_questions": len(answer_key),
                "percentage": round((correct_count / len(answer_key)) * 100, 2) if answer_key else 0,
                "details": details,
                "answer_sheet_id": answer_sheet.maPhieuTraLoi if 'answer_sheet' in locals() and answer_sheet else None,
                "result_id": exam_result.maKetQua if 'exam_result' in locals() and hasattr(exam_result, 'maKetQua') else None
            }
            
            logging.info(f"OMR scoring completed for student {student.hoTen} (SBD: {sbd}): {total_score} points, mã đề: {ma_de}")
            return result_data
            
        except Exception as e:
            logging.error(f"Error scoring OMR result: {str(e)}")
            await db.rollback()
            return {
                "success": False,
                "error": f"Lỗi khi chấm điểm: {str(e)}",
                "sbd": sbd,
                "student_answers": student_answers
            }
    
    @staticmethod
    async def batch_score_omr_results(
        db: AsyncSession,
        exam_id: int,
        batch_results: List[Dict[str, Any]],
        scanner_user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Chấm điểm batch, KHÔNG lưu vào database.
        Chỉ trả về kết quả đã chấm.
        """
        try:
            total_processed = len(batch_results)
            successful = 0
            failed = 0
            results = []
            errors = []
            
            for i, omr_result in enumerate(batch_results):
                filename = omr_result.get("filename", f"image_{i}")
                sbd = omr_result.get("sbd", "")
                
                try:
                    student_answers = omr_result.get("student_answers", {})
                    image_path = omr_result.get("image_path")
                    annotated_image_path = omr_result.get("annotated_image_path")
                    
                    if not sbd:
                        raise ValueError(f"Không xác định được SBD cho ảnh: {filename}")
                    
                    result = await OMRDatabaseService.score_omr_result(
                        db, exam_id, student_answers, sbd, image_path, scanner_user_id,
                        annotated_image_path=annotated_image_path,
                        save_to_db=False
                    )
                    
                    if result.get("success"):
                        successful += 1
                        # Thêm filename vào kết quả thành công để frontend dễ map
                        result["filename"] = filename
                        results.append(result)
                    else:
                        failed += 1
                        errors.append({
                            "filename": filename,
                            "sbd": sbd,
                            "error": result.get('error', 'Lỗi không xác định')
                        })
                        
                except Exception as e:
                    failed += 1
                    errors.append({
                        "filename": filename,
                        "sbd": sbd,
                        "error": str(e)
                    })
            
            return {
                "success": True,
                "total_processed": total_processed,
                "successful": successful,
                "failed": failed,
                "errors": errors,
                "results": results
            }
            
        except Exception as e:
            logging.error(f"Error in batch OMR scoring: {str(e)}")
            return {
                "success": False,
                "error": f"Lỗi khi chấm điểm batch: {str(e)}",
                "total_processed": len(batch_results),
                "successful": 0,
                "failed": len(batch_results)
            }
    
    @staticmethod
    async def get_exam_omr_stats(
        db: AsyncSession,
        exam_id: int
    ) -> Dict[str, Any]:
        """
        Lấy thống kê OMR cho bài kiểm tra
        
        Args:
            db: Database session
            exam_id: ID bài kiểm tra
            
        Returns:
            Dict thống kê
        """
        try:
            # Đếm tổng số học sinh trong bài thi
            from app.models.exam import ExamClassRoom
            
            total_students_stmt = select(func.count(Student.maHocSinh)).join(
                ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc
            ).join(
                ExamClassRoom, ClassRoom.maLopHoc == ExamClassRoom.maLopHoc
            ).where(
                and_(
                    ExamClassRoom.maBaiKiemTra == exam_id,
                    Student.trangThai == True
                )
            )
            total_students = await db.execute(total_students_stmt)
            total_count = total_students.scalar() or 0
            
            # Đếm số học sinh đã quét OMR
            scanned_stmt = select(func.count(AnswerSheet.maPhieuTraLoi)).where(
                and_(
                    AnswerSheet.maBaiKiemTra == exam_id,
                    AnswerSheet.daXuLyHoanTat == True
                )
            )
            scanned_result = await db.execute(scanned_stmt)
            scanned_count = scanned_result.scalar() or 0
            
            # Đếm số học sinh đã có kết quả
            completed_stmt = select(func.count(Result.maKetQua)).where(
                Result.maBaiKiemTra == exam_id
            )
            completed_result = await db.execute(completed_stmt)
            completed_count = completed_result.scalar() or 0
            
            # Tính điểm trung bình
            avg_score_stmt = select(func.avg(Result.diem)).where(
                Result.maBaiKiemTra == exam_id
            )
            avg_result = await db.execute(avg_score_stmt)
            avg_score = avg_result.scalar() or 0
            
            return {
                "exam_id": exam_id,
                "total_students": total_count,
                "scanned_students": scanned_count,
                "completed_students": completed_count,
                "pending_students": total_count - completed_count,
                "completion_rate": round((completed_count / total_count) * 100, 2) if total_count > 0 else 0,
                "average_score": round(float(avg_score), 2) if avg_score else 0
            }
            
        except Exception as e:
            logging.error(f"Error getting OMR stats for exam {exam_id}: {str(e)}")
            return {
                "exam_id": exam_id,
                "error": str(e)
            } 

    @staticmethod
    async def backfill_results(
        db: AsyncSession,
        exam_id: Optional[int],
        class_id: Optional[int],
        dry_run: bool,
        scanner_user_id: Optional[int]
    ) -> Tuple[int, List[Dict]]:
        """
        Xử lý và chấm lại điểm cho các bài thi đã tồn tại.
        """
        if not exam_id and not class_id:
            raise ValueError("Cần cung cấp ít nhất exam_id hoặc class_id.")

        # Lấy danh sách các phiếu trả lời cần xử lý
        stmt = select(AnswerSheet).where(AnswerSheet.daXuLyHoanTat == True)
        if exam_id:
            stmt = stmt.where(AnswerSheet.maBaiKiemTra == exam_id)
        if class_id:
            student_subquery = select(Student.maHocSinh).where(Student.maLopHoc == class_id)
            stmt = stmt.where(AnswerSheet.maHocSinh.in_(student_subquery))
        
        answer_sheets = (await db.execute(stmt)).scalars().all()
        
        updated_count = 0
        errors = []
        
        for sheet in answer_sheets:
            try:
                if not sheet.cauTraLoiJson or not sheet.sobaodanh:
                    errors.append({"answer_sheet_id": sheet.maPhieuTraLoi, "error": "Thiếu dữ liệu câu trả lời hoặc SBD."})
                    continue

                # Gọi lại hàm chấm điểm, nhưng chỉ lưu nếu dry_run=False
                await OMRDatabaseService.score_omr_result(
                    db=db,
                    exam_id=sheet.maBaiKiemTra,
                    student_answers=sheet.cauTraLoiJson,
                    sbd=sheet.sobaodanh,
                    image_path=sheet.urlHinhAnh,
                    scanner_user_id=scanner_user_id,
                    annotated_image_path=sheet.urlHinhAnhXuLy, # Giả sử đây là ảnh đã xử lý
                    save_to_db=not dry_run
                )
                updated_count += 1
            except Exception as e:
                errors.append({"answer_sheet_id": sheet.maPhieuTraLoi, "error": str(e)})

        if dry_run:
            await db.rollback() # Hoàn tác tất cả thay đổi nếu là dry run
        
        return updated_count, errors 