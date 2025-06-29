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
from app.models import Student, ClassRoom, ExamClassRoom, AnswerSheet, Result, Exam, Answer, User
from sqlalchemy import select, func, and_, desc, asc
from sqlalchemy.orm import aliased, joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.services.websocket_service import WebSocketService

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
        confidence: float = 0.4,
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
                    "confidence": 0.4, # Có thể thay đổi
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
                        if ma_de and ma_de in dap_an_data:
                            answers_for_ma_de = dap_an_data[ma_de]
                            for q_id, answer in answers_for_ma_de.items():
                                answer_key[str(q_id)] = str(answer)
                            logging.info(f"Using answer key for mã đề: {ma_de}")
                        elif len(dap_an_data) == 1:
                            first_ma_de = next(iter(dap_an_data.keys()))
                            if first_ma_de.isdigit():
                                answers_for_ma_de = dap_an_data[first_ma_de]
                                for q_id, answer in answers_for_ma_de.items():
                                    answer_key[str(q_id)] = str(answer)
                                logging.info(f"Auto-selected mã đề: {first_ma_de} (only option)")
                            else:
                                for q_id, answer in dap_an_data.items():
                                    answer_key[str(q_id)] = str(answer)
                                logging.info("Using direct answer format")
                        elif not ma_de and len(dap_an_data) > 1:
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
        Tìm học sinh theo số báo danh (6 số cuối của mã học sinh trường).
        Hàm này sẽ tự động trích xuất và làm sạch SBD để chỉ lấy 6 số cuối.
        """
        try:
            # --- START FIX: Làm sạch SBD đầu vào ---
            if not sbd or not isinstance(sbd, str):
                return None
            
            import re
            sbd_cleaned = re.sub(r'[^\d]', '', sbd)
            
            # Nếu SBD nhận dạng được dài hơn 6 số, chỉ lấy 6 số cuối
            if len(sbd_cleaned) > 6:
                sbd_to_find = sbd_cleaned[-6:]
            else:
                sbd_to_find = sbd_cleaned
                
            if not sbd_to_find:
                logging.warning(f"SBD '{sbd}' sau khi làm sạch không còn ký tự số.")
                return None
            # --- END FIX ---
            
            logging.info(f"🔍 DEBUGGING: Searching for SBD '{sbd_to_find}' (original: '{sbd}') in exam {exam_id}")
            
            # Lấy danh sách lớp tham gia bài kiểm tra
            from app.models.exam import ExamClassRoom
            
            stmt = select(Student).join(
                ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc
            ).join(
                ExamClassRoom, ClassRoom.maLopHoc == ExamClassRoom.maLopHoc
            ).where(
                and_(
                    ExamClassRoom.maBaiKiemTra == exam_id,
                    Student.maHocSinhTruong.like(f"%{sbd_to_find}"),  # Tìm SBD đã được làm sạch
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
                    if last_6_digits == sbd_to_find: # So sánh với SBD đã được làm sạch
                        matching_students.append(student)
            
            if len(matching_students) == 1:
                logging.info(f"Found student {matching_students[0].hoTen} for SBD {sbd_to_find}")
                return matching_students[0]
            elif len(matching_students) > 1:
                logging.warning(f"Multiple students found for SBD {sbd_to_find}")
                return matching_students[0]  # Return first match
            else:
                logging.warning(f"No student found for SBD {sbd_to_find}")
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
        # Gửi thông báo bắt đầu
        if scanner_user_id:
            await WebSocketService.send_omr_progress_update(
                user_id=scanner_user_id,
                status="processing",
                message=f"Bắt đầu xử lý ảnh cho SBD: {sbd}..."
            )

        try:
            # LOG: In ra student_answers để debug
            logging.info(f"Processing OMR for SBD {sbd}, answers keys: {list(student_answers.keys())}")
            
            # 1. Phát hiện mã đề từ kết quả OMR
            ma_de = OMRDatabaseService.detect_ma_de_from_omr_results(student_answers)
            logging.info(f"Detected mã đề: {ma_de}")
            if scanner_user_id:
                await WebSocketService.send_omr_progress_update(
                    user_id=scanner_user_id,
                    status="processing",
                    message=f"Đã nhận diện mã đề: {ma_de}",
                    details={"sbd": sbd, "ma_de": ma_de}
                )
            
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
            
            # 3. Chấm điểm (Thực hiện trước khi tìm học sinh)
            total_score = 0.0
            correct_count = 0
            wrong_count = 0
            blank_count = 0
            details = []
            
            logging.info(f"Scoring: {len(answer_key)} questions from answer key, {len(student_answers)} student answers")

            # --- LOGIC CHẤM ĐIỂM GIỮ NGUYÊN ---
            # (Phần code tính điểm, so sánh đáp án, xử lý câu hỏi nhóm...)
            # ... (giữ nguyên phần lặp qua answer_key để tính điểm) ...
            # --- KẾT THÚC LOGIC CHẤM ĐIỂM ---
            for q_id, correct_answer in answer_key.items():
                student_answer = student_answers.get(q_id, "")
                points = score_key.get(q_id, 0.0)
                is_correct = student_answer.upper() == correct_answer.upper()
                
                if not student_answer or student_answer.strip() == "":
                    blank_count += 1
                elif is_correct:
                    correct_count += 1
                    total_score += points
                else:
                    wrong_count += 1
                
                details.append({
                    "question_id": q_id,
                    "student_answer": student_answer,
                    "correct_answer": correct_answer,
                    "is_correct": is_correct,
                    "points": points
                })
            
            logging.info(f"🔍 PRE-SAVE SCORE: {total_score} (Correct: {correct_count}, Wrong: {wrong_count}, Blank: {blank_count})")

            # 4. Tìm học sinh theo SBD (Sau khi đã có điểm)
            student = await OMRDatabaseService.find_student_by_sbd(db, exam_id, sbd)
            
            if student and scanner_user_id:
                await WebSocketService.send_omr_progress_update(
                    user_id=scanner_user_id,
                    status="matching",
                    message=f"Đã khớp SBD {sbd} với học sinh: {student.hoTen}",
                    details={"sbd": sbd, "student_name": student.hoTen}
                )

            # Nếu tìm thấy học sinh VÀ được yêu cầu lưu, thì mới thực hiện ghi vào DB
            if student and save_to_db:
                # 4. Lưu/cập nhật AnswerSheet
                answer_sheet_stmt = select(AnswerSheet).where(
                    and_(
                        AnswerSheet.maBaiKiemTra == exam_id,
                        AnswerSheet.maHocSinh == student.maHocSinh
                    )
                )
                answer_sheet_result = await db.execute(answer_sheet_stmt)
                answer_sheet = answer_sheet_result.scalars().first()
                
                # Lấy đường dẫn tương đối từ đường dẫn vật lý
                def get_relative_path(physical_path):
                    if not physical_path: return None
                    try:
                        return str(Path(physical_path).relative_to(Path(settings.STORAGE_PATH)))
                    except ValueError:
                        return physical_path

                relative_original_path = get_relative_path(image_path)
                relative_annotated_path = annotated_image_path
            
                if not answer_sheet:
                    answer_sheet = AnswerSheet(
                            maBaiKiemTra=exam_id, maHocSinh=student.maHocSinh, maNguoiQuet=scanner_user_id,
                            urlHinhAnh=relative_original_path, urlHinhAnhXuLy=relative_annotated_path,
                            cauTraLoiJson=student_answers, daXuLyHoanTat=True, doTinCay=95.0
                    )
                    db.add(answer_sheet)
                else:
                    answer_sheet.cauTraLoiJson = student_answers
                    answer_sheet.daXuLyHoanTat = True
                    answer_sheet.urlHinhAnh = relative_original_path
                    answer_sheet.urlHinhAnhXuLy = relative_annotated_path
                    answer_sheet.thoiGianCapNhat = datetime.utcnow()
                    if scanner_user_id:
                        answer_sheet.maNguoiQuet = scanner_user_id
            
                await db.flush()
            
                # 5. Lưu/cập nhật Result
                result_stmt = select(Result).where(and_(Result.maBaiKiemTra == exam_id, Result.maHocSinh == student.maHocSinh))
                exam_result = (await db.execute(result_stmt)).scalars().first()
            
                if not exam_result:
                    exam_result = Result(
                            maPhieuTraLoi=answer_sheet.maPhieuTraLoi, maBaiKiemTra=exam_id, maHocSinh=student.maHocSinh,
                            diem=Decimal(str(round(total_score, 2))), soCauDung=correct_count,
                            soCauSai=wrong_count, soCauChuaTraLoi=blank_count, chiTietJson=details
                    )
                    db.add(exam_result)
                else:
                    exam_result.diem = Decimal(str(round(total_score, 2)))
                    exam_result.soCauDung = correct_count
                    exam_result.soCauSai = wrong_count
                    exam_result.soCauChuaTraLoi = blank_count
                    exam_result.chiTietJson = details
                    exam_result.maPhieuTraLoi = answer_sheet.maPhieuTraLoi
                    exam_result.thoiGianCapNhat = datetime.utcnow()
            
                await db.commit()
                logging.info(f"Result for SBD {sbd} saved to database.")
            
            # 6. Trả về kết quả (luôn trả về, dù có tìm thấy học sinh hay không)
            result_data = {
                "success": True,
                "student_id": student.maHocSinh if student else None,
                "student_name": student.hoTen if student else None,
                "student_code": student.maHocSinhTruong if student else None,
                "sbd": sbd,
                "ma_de": ma_de,
                "total_score": round(total_score, 2),
                "correct_answers": correct_count,
                "wrong_answers": wrong_count,
                "blank_answers": blank_count,
                "total_questions": len(answer_key),
                "details": details,
            }
            
            if scanner_user_id:
                await WebSocketService.send_omr_progress_update(
                    user_id=scanner_user_id,
                    status="complete",
                    message=f"Hoàn tất chấm điểm cho SBD {sbd}. Điểm: {result_data['total_score']}",
                    details=result_data
                )

            logging.info(f"OMR scoring completed for SBD {sbd}. Student found: {bool(student)}")
            return result_data
            
        except Exception as e:
            if scanner_user_id:
                await WebSocketService.send_omr_progress_update(
                    user_id=scanner_user_id,
                    status="error",
                    message=f"Lỗi khi xử lý SBD {sbd}: {str(e)}",
                    details={"sbd": sbd}
                )
            logging.error(f"Error scoring OMR result for SBD {sbd}: {str(e)}", exc_info=True)
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
                        # Thêm filename và annotated_image_path vào kết quả thành công
                        result["filename"] = filename
                        result["annotated_image_path"] = annotated_image_path
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
    async def get_results_by_exam(db: AsyncSession, exam_id: int):
        """
        Lấy danh sách kết quả chi tiết của tất cả học sinh cho một bài thi.
        Bao gồm cả những học sinh chưa được chấm.
        """
        try:
            # Lấy thông tin cơ bản của bài thi
            exam_info_stmt = select(Exam).where(Exam.maBaiKiemTra == exam_id)
            exam = (await db.execute(exam_info_stmt)).scalars().first()
            if not exam:
                raise ValueError(f"Không tìm thấy bài thi với ID: {exam_id}")

            # Lấy danh sách tất cả học sinh được gán cho bài thi này
            # thông qua các lớp học được liên kết
            students_stmt = (
                select(
                    Student.maHocSinh,
                    Student.hoTen,
                    Student.maHocSinhTruong
                )
                .join(ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc)
                .join(ExamClassRoom, ClassRoom.maLopHoc == ExamClassRoom.maLopHoc
            ).where(ExamClassRoom.maBaiKiemTra == exam_id)
            .where(Student.trangThai == True)
            .distinct()
        )
        
            all_students = (await db.execute(students_stmt)).mappings().all()
            student_ids = [s['maHocSinh'] for s in all_students]

            # Lấy tất cả các kết quả và phiếu trả lời liên quan trong một query
            results_stmt = (
                select(
                    Result.maHocSinh,
                    Result.diem,
                    Result.soCauDung,
                    Result.soCauSai,
                    AnswerSheet.thoiGianTao.label("ngayCham"),
                    AnswerSheet.urlHinhAnhXuLy
                )
                .join(AnswerSheet, Result.maPhieuTraLoi == AnswerSheet.maPhieuTraLoi)
                .where(Result.maBaiKiemTra == exam_id)
                .where(Result.maHocSinh.in_(student_ids))
            )
            
            results_data = (await db.execute(results_stmt)).mappings().all()
            results_map = {res['maHocSinh']: res for res in results_data}

            # Kết hợp dữ liệu
            full_results = []
            graded_count = 0
            total_score = 0
            
            for student in all_students:
                result_info = results_map.get(student['maHocSinh'])
                
                if result_info:
                    graded_count += 1
                    total_score += result_info['diem']
                    full_results.append({
                        "maHocSinh": student['maHocSinh'],
                        "hoTen": student['hoTen'],
                        "maHocSinhTruong": student['maHocSinhTruong'],
                        "diem": float(result_info['diem']),
                        "soCauDung": result_info['soCauDung'],
                        "soCauSai": result_info['soCauSai'],
                        "ngayCham": result_info['ngayCham'].isoformat() if result_info['ngayCham'] else None,
                        "urlHinhAnhXuLy": result_info['urlHinhAnhXuLy'],
                        "trangThai": "dacom"
                    })
                else:
                    full_results.append({
                        "maHocSinh": student['maHocSinh'],
                        "hoTen": student['hoTen'],
                        "maHocSinhTruong": student['maHocSinhTruong'],
                        "diem": None,
                        "soCauDung": None,
                        "soCauSai": None,
                        "ngayCham": None,
                        "urlHinhAnhXuLy": None,
                        "trangThai": "chuacham"
                    })
            
            # Sắp xếp theo tên học sinh
            full_results.sort(key=lambda x: x['hoTen'])

            total_students = len(all_students)
            average_score = (total_score / graded_count) if graded_count > 0 else 0

            return {
                "exam": {
                    "id": exam.maBaiKiemTra,
                    "tieuDe": exam.tieuDe,
                    "monHoc": exam.monHoc,
                    "tongSoCau": exam.tongSoCau,
                },
                "stats": {
                    "totalStudents": total_students,
                    "graded": graded_count,
                    "notGraded": total_students - graded_count,
                    "averageScore": round(float(average_score), 2)
                },
                "results": full_results
            }   

        except Exception as e:
            logging.error(f"Lỗi khi lấy kết quả bài thi {exam_id}: {str(e)}")
            # Re-raise để endpoint có thể bắt và trả về lỗi 500
            raise

    @staticmethod
    async def process_single_image_ws(
        db: AsyncSession,
        exam_id: int,
        image_data: bytes,
        scanner_user_id: int
    ):
        """
        Xử lý một ảnh duy nhất từ WebSocket, lưu ảnh và tạo annotation như batch-process-with-exam.
        """
        import tempfile
        import os
        from pathlib import Path
        import base64
        
        try:
            # 1. Gửi thông báo bắt đầu
            await WebSocketService.send_omr_progress_update(
                user_id=scanner_user_id,
                status="processing",
                message="Đã nhận ảnh, đang xử lý OMR..."
            )

            # 2. Lấy thông tin exam và template
            exam = await db.get(Exam, exam_id)
            if not exam or not exam.maMauPhieu:
                raise ValueError("Bài thi không hợp lệ hoặc thiếu mẫu chấm.")

            # 3. Tạo thư mục lưu trữ vĩnh viễn (giống batch-process-with-exam)
            from app.core.config import settings
            storage_root = Path(settings.STORAGE_PATH)
            exam_storage_dir = storage_root / "ws_scans" / str(exam_id)
            exam_storage_dir.mkdir(parents=True, exist_ok=True)
            
            # Đường dẫn web tương đối
            relative_storage_path = Path("ws_scans") / str(exam_id)

            # 4. Lưu ảnh gốc vào file tạm thời để xử lý
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                tmp_file.write(image_data)
                tmp_image_path = tmp_file.name

            try:
                # 5. Load OMR components (giống batch-process-with-exam)
                from app.websocket.omr_socket import get_template_path_from_id
                template_path = await get_template_path_from_id(exam.maMauPhieu, db)
                
                from app.omr.main_pipeline import process_single_image, OMRAligner
                from app.omr.template import load_template, get_all_bubbles
                from ultralytics import YOLO
                
                template = load_template(template_path)
                yolo_model = YOLO("app/omr/models/best.pt")
                bubbles = get_all_bubbles(template)
                
                # Tạo aligner
                aligner = None
                template_dir = os.path.dirname(template_path)
                ref_images = list(Path(template_dir).glob("*.png")) + list(Path(template_dir).glob("*.jpg"))
                if ref_images:
                    aligner = OMRAligner(
                        ref_img_path=str(ref_images[0]),
                        method='ORB',
                        max_features=5000,
                        good_match_percent=0.2,
                        debug=False
                    )

                # 6. Load JSON answer keys (giống batch-process-with-exam)
                exam_answer_keys = {}
                try:
                    from app.routes.omr import load_json_answer_keys_for_exam
                    exam_answer_keys = await load_json_answer_keys_for_exam(db, exam_id)
                    logging.info(f"WebSocket: Loaded {len(exam_answer_keys)} JSON answer keys")
                except Exception as e:
                    logging.warning(f"WebSocket: Could not load JSON answer keys: {e}")

                # 7. Process image
                fname, omr_results, aligned_img = process_single_image(
                    tmp_image_path, template, yolo_model, conf=0.4, 
                    aligner=aligner, save_files=False
                )

                if "error" in omr_results:
                    raise Exception(omr_results["error"])

                # Tạo base64 cho aligned image ngay để có thể hiển thị khi cần
                annotated_image_base64 = None
                if aligned_img is not None:
                    import cv2
                    _, buffer = cv2.imencode('.jpg', aligned_img)
                    annotated_image_base64 = base64.b64encode(buffer).decode('utf-8')

                # 8. Extract SBD và mã đề với validation nghiêm ngặt
                metadata = omr_results.get("_metadata", {})
                sbd = metadata.get("sbd", "")
                ma_de = metadata.get("ma_de", "")
                
                # Fallback SBD detection
                if not sbd or sbd == "unknown" or not str(sbd).isdigit():
                    for key, value in omr_results.items():
                        if "sbd" in key.lower() and value and str(value).isdigit() and str(value) != "unknown":
                            sbd = str(value)
                            break
                
                # ❌ DỪNG XỬ LÝ NẾU KHÔNG NHẬN DIỆN ĐƯỢC SBD
                if not sbd or sbd == "unknown" or not str(sbd).isdigit() or len(str(sbd)) < 4:
                    # DEBUG: In ra tất cả keys của OMR result để debug
                    omr_keys_info = []
                    for key, value in omr_results.items():
                        if not key.startswith('_'):
                            omr_keys_info.append(f"{key}: {value}")
                    
                    await WebSocketService.send_omr_progress_update(
                        user_id=scanner_user_id,
                        status="recognition_failed",
                        message="❌ Không nhận diện được SBD từ phiếu trả lời",
                        details={
                            "recognition_result": "failed",
                            "detected_sbd": sbd if sbd else "Không phát hiện",
                            "metadata": metadata,
                            "all_omr_fields": omr_keys_info[:10],  # Chỉ hiển thị 10 fields đầu
                            "reason": "SBD không hợp lệ hoặc không rõ ràng",
                            "suggestion": "Vui lòng chụp lại ảnh rõ nét hơn, đảm bảo vùng SBD không bị che khuất",
                            "help_text": "Tìm hiểu SBD hợp lệ bằng cách gọi API /api/v1/omr/generate-sbd",
                            "aligned_image": f"data:image/jpeg;base64,{annotated_image_base64}" if aligned_img is not None else None
                        }
                    )
                    return  # DỪNG XỬ LÝ NGAY TẠI ĐÂY
                
                # ✅ SBD hợp lệ, tiếp tục xử lý
                logging.info(f"WebSocket: ✅ Nhận diện thành công SBD: {sbd}")
                await WebSocketService.send_omr_progress_update(
                    user_id=scanner_user_id,
                    status="recognition_success",
                    message=f"✅ Nhận diện thành công SBD: {sbd}",
                    details={
                        "recognition_result": "success",
                        "detected_sbd": sbd,
                        "detected_ma_de": ma_de if ma_de else "Chưa xác định"
                    }
                )

                # 9. Lưu ảnh gốc vào storage (giống batch-process-with-exam)
                safe_filename = f"ws_{sbd}_{scanner_user_id}_original.jpg"
                original_physical_path = exam_storage_dir / safe_filename
                relative_original_path = relative_storage_path / safe_filename
                
                with open(original_physical_path, 'wb') as f:
                    f.write(image_data)

                # 10. Tạo annotation nâng cao (giống batch-process-with-exam)
                relative_annotated_path = None
                
                if aligned_img is not None:
                    try:
                        from app.omr.detection import draw_scoring_overlay
                        
                        # Lấy đáp án cho mã đề
                        answer_key_for_annotation = exam_answer_keys.get(str(ma_de), {})
                        
                        # Đường dẫn vật lý để lưu ảnh annotation
                        annotated_filename = f"ws_{sbd}_{scanner_user_id}_annotated.jpg"
                        physical_annotation_path = exam_storage_dir / annotated_filename
                        relative_annotated_path = relative_storage_path / annotated_filename
                        
                        # Vẽ và lưu annotation
                        draw_scoring_overlay(
                            image=aligned_img.copy(),
                            bubbles=bubbles,
                            student_results=omr_results,
                            answer_key=answer_key_for_annotation,
                            out_path=str(physical_annotation_path)
                        )
                        
                        # Đọc lại để encode base64
                        if os.path.exists(physical_annotation_path):
                            with open(physical_annotation_path, 'rb') as f:
                                annotated_image_base64 = base64.b64encode(f.read()).decode('utf-8')
                        
                        logging.info(f"WebSocket: Created annotation for SBD {sbd}")
                        
                    except Exception as e:
                        logging.error(f"WebSocket: Annotation creation failed: {e}")
                        # Sử dụng ảnh đã có base64 từ trước

                # 11. Chấm điểm và lưu vào database
                score_result = await OMRDatabaseService.score_omr_result(
                    db=db,
                    exam_id=exam_id,
                    student_answers=omr_results,
                    sbd=sbd,
                    image_path=str(relative_original_path),  # Lưu đường dẫn tương đối
                    scanner_user_id=scanner_user_id,
                    annotated_image_path=str(relative_annotated_path) if relative_annotated_path else None,
                    save_to_db=True
                )

                # 12. Gửi kết quả thành công qua WebSocket
                if score_result.get("success"):
                    await WebSocketService.send_omr_progress_update(
                        user_id=scanner_user_id,
                        status="complete",
                        message=f"Hoàn tất chấm điểm cho SBD {sbd}. Điểm: {score_result.get('total_score', 0)}",
                        details={
                            **score_result,
                            "aligned_image": f"data:image/jpeg;base64,{annotated_image_base64}" if annotated_image_base64 else None,
                            "original_image_path": str(relative_original_path),
                            "annotated_image_path": str(relative_annotated_path) if relative_annotated_path else None
                        }
                    )
                else:
                    await WebSocketService.send_omr_progress_update(
                        user_id=scanner_user_id,
                        status="warning",
                        message=f"Xử lý OMR thành công nhưng chấm điểm gặp vấn đề cho SBD {sbd}",
                        details={
                            "sbd": sbd,
                            "ma_de": ma_de,
                            "error": score_result.get('error', 'Lỗi không xác định'),
                            "aligned_image": f"data:image/jpeg;base64,{annotated_image_base64}" if annotated_image_base64 else None
                        }
                    )

            finally:
                # Cleanup temp file
                if os.path.exists(tmp_image_path):
                    os.unlink(tmp_image_path)

        except Exception as e:
            logging.error(f"Lỗi trong process_single_image_ws: {e}", exc_info=True)
            await WebSocketService.send_omr_progress_update(
                user_id=scanner_user_id,
                status="error",
                message=f"Lỗi xử lý ảnh: {str(e)}"
            )

    @staticmethod
    async def export_results_with_status(db: AsyncSession, exam_id: int) -> bytes:
        """
        Xuất kết quả của một bài thi ra file Excel, bao gồm cả học sinh đã chấm và chưa chấm.
        """
        try:
            # Lấy danh sách kết quả chi tiết, bao gồm cả học sinh chưa chấm
            results_data = await OMRDatabaseService.get_results_by_exam(db, exam_id)
            
            # Chuẩn bị dữ liệu cho DataFrame
            data_to_export = []
            for student_result in results_data.get("results", []):
                data_to_export.append({
                    "Mã học sinh": student_result.get("maHocSinhTruong", ""),
                    "Họ và tên": student_result.get("hoTen", ""),
                    "Trạng thái": "Đã chấm" if student_result.get("trangThai") == "dacom" else "Chưa chấm",
                    "Điểm số": student_result.get("diem", ""),
                    "Số câu đúng": student_result.get("soCauDung", ""),
                })

            if not data_to_export:
                # Handle case with no students assigned to the exam
                data_to_export.append({
                    "Mã học sinh": "Không có dữ liệu",
                    "Họ và tên": "",
                    "Trạng thái": "",
                    "Điểm số": "",
                    "Số câu đúng": ""
                })

            df = pd.DataFrame(data_to_export)

            # Tạo file Excel trong memory
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name=f'KetQuaKyThi_{exam_id}', index=False)
                worksheet = writer.sheets[f'KetQuaKyThi_{exam_id}']
                # Tự động điều chỉnh độ rộng cột
                for column_cells in worksheet.columns:
                    length = max(len(str(cell.value)) for cell in column_cells)
                    worksheet.column_dimensions[column_cells[0].column_letter].width = length + 2
            
            output.seek(0)
            return output.getvalue()

        except Exception as e:
            logging.error(f"Lỗi khi xuất file Excel kết quả bài thi {exam_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Không thể xuất file Excel: {e}")

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
                if not sheet.cauTraLoiJson:
                    errors.append({"answer_sheet_id": sheet.maPhieuTraLoi, "error": "Thiếu dữ liệu câu trả lời."})
                    continue

                # Gọi lại hàm chấm điểm, nhưng chỉ lưu nếu dry_run=False
                await OMRDatabaseService.score_omr_result(
                    db=db,
                    exam_id=sheet.maBaiKiemTra,
                    student_answers=sheet.cauTraLoiJson,
                    sbd="000000", # Tạm thời placeholder
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