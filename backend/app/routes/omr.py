"""
OMR Checker API Routes - Version 2: Ultra Simple File-Based Annotation
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict
import tempfile
import cv2
import os
import base64
import json
import logging
from pathlib import Path
import numpy as np
from pydantic import BaseModel

from app.db.session import get_async_db
from app.models.user import User
from app.utils.auth import get_current_user
from app.omr.main_pipeline import process_single_image, OMRAligner
from app.omr.template import load_template, get_all_bubbles
from app.services.omr_service import OMRDatabaseService
from app.models.student import Student
from app.models.class_room import ClassRoom
from ultralytics import YOLO
from app.models.answer_sheet_template import AnswerSheetTemplate
from app.models.exam import Exam
from app.core.config import settings

router = APIRouter(prefix="/omr", tags=["OMR Checker"])

async def get_template_path_from_id(template_id: int, db: AsyncSession) -> str:
    """
    Lấy đường dẫn template vật lý từ ID mẫu phiếu bằng cách đọc `cauTrucJson`.
    """
    template_obj = await db.get(AnswerSheetTemplate, template_id)
    if not template_obj:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy Mẫu phiếu với ID: {template_id}")

    if not template_obj.cauTrucJson:
        raise HTTPException(status_code=404, detail=f"Mẫu phiếu ID {template_id} không có cấu trúc OMR (cauTrucJson).")

    try:
        # cauTrucJson có thể là dict hoặc chuỗi JSON
        config = json.loads(template_obj.cauTrucJson) if isinstance(template_obj.cauTrucJson, str) else template_obj.cauTrucJson

        omr_config = config.get("fileTypes", {}).get("omrConfig", {})
        old_path_str = omr_config.get("storagePath")

        if not old_path_str:
            raise ValueError("Không tìm thấy 'storagePath' trong cauTrucJson.fileTypes.omrConfig")
            
        # Đường dẫn trong DB có thể chứa tiền tố '$' hoặc trỏ đến cấu trúc cũ
        if old_path_str.startswith('$'):
            old_path_str = old_path_str[1:]
        
        # Trích xuất tên thư mục template từ đường dẫn cũ (ví dụ: 'template_1')
        template_folder_name = Path(old_path_str).parent.name
        

        base_template_dir = Path("/root/projects/Eduscan/backend/OMRChecker/templates")
        new_template_path = base_template_dir / template_folder_name / "template.json"
        
        if not new_template_path.exists():
            raise HTTPException(
                status_code=404, 
                detail=f"File template không tồn tại tại đường dẫn mong muốn: {new_template_path}. Dữ liệu trong DB có thể đã cũ."
            )
            
        return str(new_template_path)

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logging.error(f"Lỗi khi xử lý cauTrucJson cho template ID {template_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Cấu trúc OMR (cauTrucJson) của mẫu phiếu ID {template_id} bị lỗi: {e}")

@router.post("/process-with-exam")
async def process_omr_with_exam(
    exam_id: int = Form(...),
    image: UploadFile = File(...),
    template_id: int = Form(...),
    yolo_model: str = Form(default="app/omr/models/best.pt"),
    auto_align: bool = Form(default=False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Xử lý OMR với tích hợp database - chấm điểm từ đáp án trong DB
    """
    try:
        template_path = await get_template_path_from_id(template_id, db)
        # Kiểm tra quyền truy cập
        if current_user.vaiTro not in ["ADMIN", "MANAGER", "TEACHER"]:
            raise HTTPException(status_code=403, detail="Không có quyền sử dụng chức năng này")
        
        # Kiểm tra file đầu vào
        if not image.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            raise HTTPException(status_code=400, detail="File phải có định dạng PNG, JPG hoặc JPEG")
        
        # Tạo file tạm và xử lý OMR
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmpf:
            content = await image.read()
            tmpf.write(content)
            tmpf.flush()
            
            # Khởi tạo aligner nếu cần
            aligner = None
            if auto_align:
                template_dir = os.path.dirname(template_path)
                ref_images = list(Path(template_dir).glob("*.png")) + list(Path(template_dir).glob("*.jpg"))
                if ref_images:
                    ref_img_path = str(ref_images[0])
                    aligner = OMRAligner(
                        ref_img_path=ref_img_path,
                        method='ORB',
                        max_features=5000,
                        good_match_percent=0.2,
                        debug=False
                    )
            
            # Xử lý ảnh OMR để lấy câu trả lời
            fname, omr_results = process_single_image(
                tmpf.name,
                load_template(template_path),
                YOLO(yolo_model),
                conf=0.25,
                aligner=aligner,
                answer_key_excel=None,  # Không dùng Excel
                save_files=False  # Không lưu file trung gian cho single image API
            )
            
            # Lấy SBD từ metadata nếu có
            metadata = omr_results.get("_metadata", {})
            sbd = metadata.get("sbd", "")
            ma_de = metadata.get("ma_de", "")
            
            # Fallback: Tìm SBD từ các key khác nếu không có trong metadata
            if not sbd:
                sbd_keys = ["sbd", "so_bao_danh", "student_id", "id"]
                for key in sbd_keys:
                    if key in omr_results and omr_results[key]:
                        sbd = str(omr_results[key])
                        break
                
                # Thử tìm trong key có pattern số
                if not sbd:
                    for key, value in omr_results.items():
                        if "sbd" in key.lower() or "id" in key.lower():
                            if value and str(value).isdigit():
                                sbd = str(value)
                                break
            
            if not sbd:
                raise HTTPException(
                    status_code=400, 
                    detail="Không thể tự động nhận diện số báo danh từ phiếu trả lời. Vui lòng kiểm tra template và ảnh."
                )
            
            # Chấm điểm bằng database service
            scoring_result = await OMRDatabaseService.score_omr_result(
            db=db,
            exam_id=exam_id,
                student_answers=omr_results,
                sbd=sbd,
                image_path=tmpf.name,
                scanner_user_id=current_user.maNguoiDung
            )
            
            # Tạo annotated image cho response (không lưu file)
            img_anno_b64 = ""
            try:
                # Tạo annotated image trong memory
                with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_anno:
                    template_obj = load_template(template_path)
                    bubbles = get_all_bubbles(template_obj)
                    
                    # Tạo ảnh annotation
                    from app.omr.detection import draw_scoring_overlay
                    image = cv2.imread(tmpf.name)
                    if image is not None:
                        draw_scoring_overlay(
                            image, bubbles, omr_results, {}, temp_anno.name
                        )
                        
                        # Đọc và encode
                        if os.path.exists(temp_anno.name):
                            with open(temp_anno.name, "rb") as f:
                                img_anno_b64 = base64.b64encode(f.read()).decode()
                            os.unlink(temp_anno.name)  # Cleanup
            except Exception as e:
                logging.warning(f"Failed to create annotated image: {e}")
        
        # Dọn dẹp file tạm
        try:
            os.unlink(tmpf.name)
        except:
            pass
        
        return JSONResponse({
            "success": True,
            "file": fname,
            "exam_id": exam_id,
            "omr_results": omr_results,
            "scoring_result": scoring_result,
            "annotated_image": img_anno_b64
        })
        
    except Exception as e:
        logging.error(f"OMR processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý OMR: {str(e)}")

@router.post("/batch-process-with-exam")
async def batch_process_omr_with_exam(
    exam_id: int = Form(...),
    template_id: int = Form(...),
    images: List[UploadFile] = File(...),
    yolo_model: str = Form(default="app/omr/models/best.pt"),
    confidence: float = Form(default=0.25),
    auto_align: bool = Form(default=True),
    create_annotations: bool = Form(default=True),
    max_annotation_images: int = Form(default=10),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    ⭐ FINAL VERSION: Annotation với JSON answer key từ database
    """
    try:
        template_path = await get_template_path_from_id(template_id, db)
        logging.info(f"Starting FINAL batch processing with JSON answer key comparison")
        
        if len(images) > 50:
            raise HTTPException(status_code=400, detail="Không thể xử lý quá 50 ảnh cùng lúc")
        
        # 1. Tạo thư mục lưu trữ vĩnh viễn cho các ảnh đã annotate
        annotated_storage_dir = Path(settings.STORAGE_PATH) / "annotated_scans" / str(exam_id)
        annotated_storage_dir.mkdir(parents=True, exist_ok=True)

        # Tạo thư mục tạm
        temp_dir = tempfile.mkdtemp()
        image_paths = []
        
        # Lưu images vào thư mục tạm
        for i, image in enumerate(images):
            if not image.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                continue
                
            temp_path = os.path.join(temp_dir, f"image_{i}_{image.filename}")
            with open(temp_path, 'wb') as f:
                content = await image.read()
                f.write(content)
            image_paths.append(temp_path)
        
        if not image_paths:
            raise HTTPException(status_code=400, detail="Không có ảnh hợp lệ để xử lý")
        
        logging.info(f"Processing {len(image_paths)} images with JSON answer key comparison")
        
        # Load components
        template = load_template(template_path)
        model = YOLO(yolo_model)
        bubbles = get_all_bubbles(template)
        
        # Tạo aligner nếu cần
        aligner = None
        if auto_align:
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
                logging.info(f"Created aligner with reference: {ref_images[0]}")
        
        should_create_annotations = create_annotations and len(image_paths) <= max_annotation_images
        
        # Import draw function
        try:
            from app.omr.detection import draw_scoring_overlay
            draw_function_available = True
            logging.info("draw_scoring_overlay imported successfully")
        except ImportError as e:
            logging.error(f"Cannot import draw_scoring_overlay: {e}")
            draw_function_available = False
            should_create_annotations = False
        
        logging.info(f"Will create annotations with JSON answer key: {should_create_annotations}")
        
        # 🎯 LOAD JSON ANSWER KEYS từ exam trong database
        exam_answer_keys = {}
        try:
            exam_answer_keys = await load_json_answer_keys_for_exam(db, exam_id)
            logging.info(f"Loaded JSON answer keys for {len(exam_answer_keys)} mã đề: {list(exam_answer_keys.keys())}")
        except Exception as e:
            logging.warning(f"Could not load JSON answer keys: {e}")
            exam_answer_keys = {}
        
        # Process images
        batch_results = []
        omr_results = {}
        annotated_images = {}
        
        for i, img_path in enumerate(image_paths):
            try:
                logging.info(f"Processing {i+1}/{len(image_paths)}: {os.path.basename(img_path)}")
                
                # Process để lấy kết quả và ảnh đã căn chỉnh
                fname, results, aligned_img = process_single_image(
                    img_path, template, model, confidence, aligner, 
                    answer_key_excel=None, save_files=True
                )
                
                logging.info(f"process_single_image completed for {fname}")
                
                if "error" not in results:
                    metadata = results.get("_metadata", {})
                    sbd = metadata.get("sbd", "")
                    ma_de = metadata.get("ma_de", "")
                    
                    # Fallback SBD detection
                    if not sbd:
                        for key, value in results.items():
                            if "sbd" in key.lower() and value and str(value).isdigit():
                                sbd = str(value)
                                break
                    
                    # Fallback mã đề detection
                    if not ma_de:
                        for key, value in results.items():
                            if "mdt" in key.lower() or "made" in key.lower():
                                if value and str(value).isdigit():
                                    ma_de = str(value)
                                    break
                    
                    logging.info(f"Detected SBD: {sbd}, mã đề: {ma_de}")
                    
                    # Chuẩn bị cho database scoring
                    if sbd:
                        # Tạo đường dẫn lưu trữ vĩnh viễn cho ảnh annotation
                        permanent_annotation_path = annotated_storage_dir / f"{sbd}_{fname}_annotated.jpg"
                        
                        # Thêm đường dẫn này vào dict để truyền đi
                        batch_item = {
                            "student_answers": results,
                            "sbd": sbd,
                            "image_path": img_path, # Đường dẫn ảnh gốc
                            "filename": fname,
                            "annotated_image_path": str(permanent_annotation_path) # Đường dẫn ảnh sau xử lý
                        }
                        batch_results.append(batch_item)
                    
                    # 🎨 FINAL ANNOTATION: Luôn sử dụng ảnh đã căn chỉnh (hoặc ảnh gốc nếu align lỗi)
                    if should_create_annotations and draw_function_available and aligned_img is not None:
                        try:
                            logging.info(f"Creating FINAL annotation for {fname} with mã đề {ma_de}")
                            
                            # 🔑 LẤY JSON ANSWER KEY cho mã đề này
                            answer_key_for_annotation = {}
                            if ma_de and str(ma_de) in exam_answer_keys:
                                answer_key_for_annotation = exam_answer_keys[str(ma_de)]
                                logging.info(f"Using JSON answer key for mã đề {ma_de}: {len(answer_key_for_annotation)} questions")
                                
                                # Log một vài câu để debug
                                sample_questions = list(answer_key_for_annotation.items())[:5]
                                logging.info(f"Sample answer key: {sample_questions}")
                            else:
                                logging.warning(f"No JSON answer key found for mã đề {ma_de}, annotation will show selected only")
                            
                            draw_scoring_overlay(
                                aligned_img,
                                bubbles,
                                results,
                                answer_key_for_annotation,
                                str(permanent_annotation_path) # Sử dụng đường dẫn đã tạo
                            )
                            
                            # Đọc lại file đã annotate để encode (vẫn giữ để trả về cho UI)
                            if os.path.exists(permanent_annotation_path):
                                with open(permanent_annotation_path, 'rb') as f:
                                    annotated_images[fname] = base64.b64encode(f.read()).decode()
                                    
                        except Exception as e:
                            logging.error(f"Final annotation error for {fname}: {e}")
                else:
                    logging.error(f"OMR processing failed for {fname}: {results.get('error', 'Unknown error')}")
                
                omr_results[fname] = results
                
            except Exception as e:
                logging.error(f"Error processing {img_path}: {e}")
                import traceback
                logging.error(f"Processing traceback: {traceback.format_exc()}")
                omr_results[f"error_{i}"] = {"error": str(e), "original_path": img_path}
        
        logging.info(f"OMR processing completed. Created {len(annotated_images)} FINAL annotated images: {list(annotated_images.keys())}")
        
        # Database scoring
        scoring_result = await OMRDatabaseService.batch_score_omr_results(
            db=db,
            exam_id=exam_id,
            batch_results=batch_results,
            scanner_user_id=current_user.maNguoiDung
        )
        
        logging.info(f"Database scoring completed for {len(batch_results)} students")
        
        # Summary
        summary = {
            "total_images": len(image_paths),
            "successful": len([r for r in omr_results.values() if "error" not in r]),
            "failed": len([r for r in omr_results.values() if "error" in r]),
            "annotated_images_created": len(annotated_images),
            "alignment_enabled": auto_align,
            "annotations_enabled": should_create_annotations,
            "max_annotation_limit": max_annotation_images,
            "draw_function_available": draw_function_available,
            "aligner_created": aligner is not None,
            "json_answer_keys_loaded": len(exam_answer_keys),
            "enhancement": "json_answer_key_comparison"
        }
        
        logging.info(f"FINAL batch processing summary: {summary}")
        
        return JSONResponse({
            "success": True,
            "exam_id": exam_id,
            "summary": summary,
            "omr_results": omr_results,
            "scoring_result": scoring_result,
            "annotated_images": annotated_images,  # 🎯 Final annotations với đúng/sai từ JSON
            "temp_directory": temp_dir,  # For debugging
            "json_answer_keys_available": list(exam_answer_keys.keys())
        })
        
    except Exception as e:
        logging.error(f"FINAL batch processing error: {str(e)}")
        import traceback
        logging.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý batch OMR: {str(e)}")

# Function để load JSON answer keys từ database
async def load_json_answer_keys_for_exam(db: AsyncSession, exam_id: int):
    """
    Load JSON answer keys từ exam database
    Format: {"123": {"q1":"A","q2":"B",...}, "777": {"q1":"A",...}}
    """
    try:
        from app.models.exam import Answer
        from sqlalchemy import select
        
        # Lấy exam record
        stmt = select(Answer).where(Answer.maBaiKiemTra == exam_id)  # Điều chỉnh field name
        result = await db.execute(stmt)
        exam = result.scalar_one_or_none()
        
        if not exam:
            logging.error(f"Exam not found: {exam_id}")
            return {}
        
        # Lấy JSON answer keys từ field trong exam
        # Điều chỉnh field name theo database thực tế
        answer_keys_json = exam.dapAnJson  # Tùy theo tên field
        
        if not answer_keys_json:
            logging.warning(f"No answer keys found for exam {exam_id}")
            return {}
        
        # Parse JSON
        if isinstance(answer_keys_json, str):
            answer_keys = json.loads(answer_keys_json)
        else:
            answer_keys = answer_keys_json  # Đã là dict
        
        # Validate format
        if not isinstance(answer_keys, dict):
            logging.error(f"Invalid answer keys format for exam {exam_id}")
            return {}
        
        # Filter ra chỉ phần answer keys (loại bỏ scoring weights nếu có)
        cleaned_answer_keys = {}
        for ma_de, questions in answer_keys.items():
            if isinstance(questions, dict) and all(isinstance(v, str) for v in questions.values()):
                cleaned_answer_keys[str(ma_de)] = questions
                logging.info(f"Loaded answer key for mã đề {ma_de}: {len(questions)} questions")
        
        return cleaned_answer_keys
        
    except Exception as e:
        logging.error(f"Error loading JSON answer keys for exam {exam_id}: {e}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        return {}

@router.get("/exam-stats/{exam_id}")
async def get_exam_omr_stats(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Lấy thống kê OMR cho bài kiểm tra
    """
    try:
        # Kiểm tra quyền truy cập
        if current_user.vaiTro not in ["ADMIN", "MANAGER", "TEACHER"]:
            raise HTTPException(status_code=403, detail="Không có quyền sử dụng chức năng này")
        
        stats = await OMRDatabaseService.get_exam_omr_stats(db, exam_id)
        
        return JSONResponse({
            "success": True,
            "stats": stats
        })
        
    except Exception as e:
        logging.error(f"Error getting OMR stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê OMR: {str(e)}")

@router.post("/preview")
async def omr_preview(
    image: UploadFile = File(...),
    template_id: int = Form(...),
    auto_align: bool = Form(default=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Xem trước template OMR với ảnh mẫu.
    Bản demo sẽ được vẽ trên ảnh ĐÃ ĐƯỢC CĂN CHỈNH (aligned).
    """
    try:
        # 1. Lấy đường dẫn template và kiểm tra quyền
        template_path_str = await get_template_path_from_id(template_id, db)
        template_path = Path(template_path_str)
        template_dir = template_path.parent

        if current_user.vaiTro not in ["ADMIN", "MANAGER", "TEACHER"]:
            raise HTTPException(status_code=403, detail="Không có quyền sử dụng chức năng này")

        # 2. Lưu ảnh upload tạm thời
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmpf:
            content = await image.read()
            tmpf.write(content)
            tmpf.flush()
            
            img_to_process = cv2.imread(tmpf.name)
            if img_to_process is None:
                os.unlink(tmpf.name)
                raise HTTPException(status_code=400, detail="Không thể đọc file ảnh được upload.")

            # 3. Thực hiện căn chỉnh ảnh nếu được yêu cầu
            alignment_status = "Not Performed"
            if auto_align:
                try:
                    # Tìm ảnh tham chiếu trong thư mục template
                    ref_images = list(template_dir.glob("*.png")) + list(template_dir.glob("*.jpg"))
                    if not ref_images:
                        logging.warning(f"Không tìm thấy ảnh tham chiếu trong: {template_dir}. Bỏ qua bước căn chỉnh.")
                        alignment_status = "Skipped (No reference image)"
                    else:
                        ref_img_path = str(ref_images[0])
                        aligner = OMRAligner(ref_img_path=ref_img_path)
                        
                        # Căn chỉnh ảnh
                        aligned_img = aligner.align(img_to_process)
                        
                        if aligned_img is not None:
                            img_to_process = aligned_img  # >> Sử dụng ảnh đã căn chỉnh
                            alignment_status = "Success"
                        else:
                            logging.warning(f"Căn chỉnh thất bại cho template {template_id}. Sử dụng ảnh gốc để preview.")
                            alignment_status = "Failed (Using original image)"

                except Exception as align_error:
                    logging.error(f"Lỗi trong quá trình căn chỉnh ảnh preview: {align_error}")
                    alignment_status = f"Error: {align_error}"
            else:
                alignment_status = "Disabled"

            # 4. Load template và vẽ các ô nhận dạng
            template = load_template(str(template_path))
            bubbles = get_all_bubbles(template)
            
            for bubble in bubbles:
                x1, y1, x2, y2 = bubble['bounds']
                cv2.rectangle(img_to_process, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(img_to_process, f"{bubble.get('qid', '')}-{bubble.get('choice', '')}", 
                           (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
            
            # 5. Encode ảnh preview để gửi về client
            _, buffer = cv2.imencode('.jpg', img_to_process)
            preview_b64 = base64.b64encode(buffer).decode()
            
            # 6. Dọn dẹp file tạm và trả về kết quả
            os.unlink(tmpf.name)
            
            return JSONResponse({
                "success": True,
                "template_info": {
                    "page_dimensions": template.page_dimensions,
                    "bubble_dimensions": template.bubble_dimensions,
                    "field_blocks": len(template.field_blocks),
                    "total_bubbles": len(bubbles)
                },
                "alignment_status": alignment_status,
                "alignment_enabled": auto_align,
                "preview_image": preview_b64
            })
        
    except Exception as e:
        # Dọn dẹp nếu có lỗi xảy ra
        if 'tmpf' in locals() and os.path.exists(tmpf.name):
            os.unlink(tmpf.name)
        logging.error(f"OMR preview error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi preview OMR: {str(e)}")

@router.get("/models")
async def get_available_models(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Lấy danh sách YOLO models có sẵn
    """
    try:
        # Kiểm tra quyền truy cập
        if current_user.vaiTro not in ["ADMIN", "MANAGER", "TEACHER"]:
            raise HTTPException(status_code=403, detail="Không có quyền sử dụng chức năng này")
        
        models = []
        models_dir = Path("app/omr/models")
        
        if models_dir.exists():
            for model_file in models_dir.glob("*.pt"):
                stat = model_file.stat()
                models.append({
                    "name": model_file.name,
                    "path": str(model_file),
                    "size": stat.st_size,
                    "modified": stat.st_mtime
                })
        
        return JSONResponse({
            "success": True,
            "models": models
        })
        
    except Exception as e:
        logging.error(f"Get models error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách models: {str(e)}")

@router.get("/templates")
async def get_available_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Lấy danh sách templates có sẵn
    """
    try:
        # Kiểm tra quyền truy cập
        if current_user.vaiTro not in ["ADMIN", "MANAGER", "TEACHER"]:
            raise HTTPException(status_code=403, detail="Không có quyền sử dụng chức năng này")
        
        templates = []
        templates_dir = Path("/root/projects/Eduscan/backend/OMRChecker/templates")
        
        if templates_dir.exists():
            for template_dir in templates_dir.iterdir():
                if template_dir.is_dir():
                    template_file = template_dir / "template.json"
                    if template_file.exists():
                        stat = template_file.stat()
                        templates.append({
                            "name": template_dir.name,
                            "path": str(template_file),
                            "size": stat.st_size,
                            "modified": stat.st_mtime
                        })
        
        return JSONResponse({
            "success": True,
            "templates": templates
        })
        
    except Exception as e:
        logging.error(f"Get templates error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách templates: {str(e)}")

@router.post("/generate-sbd")
async def generate_sbd_for_students(
    exam_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Tạo số báo danh cho tất cả học sinh trong bài kiểm tra
    """
    try:
        # Kiểm tra quyền truy cập
        if current_user.vaiTro not in ["ADMIN", "MANAGER", "TEACHER"]:
            raise HTTPException(status_code=403, detail="Không có quyền sử dụng chức năng này")
        
        # Lấy danh sách học sinh trong bài kiểm tra
        from app.models.exam import ExamClassRoom
        from sqlalchemy import select
        
        stmt = select(Student).join(
            ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc
        ).join(
            ExamClassRoom, ClassRoom.maLopHoc == ExamClassRoom.maLopHoc
        ).where(
            ExamClassRoom.maBaiKiemTra == exam_id
        )
        
        result = await db.execute(stmt)
        students = result.scalars().all()
        
        # Tạo mapping SBD cho mỗi học sinh
        sbd_mapping = []
        for student in students:
            sbd = OMRDatabaseService.generate_sbd_from_ma_hoc_sinh(student.maHocSinhTruong)
            sbd_mapping.append({
                "student_id": student.maHocSinh,
                "student_name": student.hoTen,
                "student_code": student.maHocSinhTruong,
                "class_name": student.lopHoc.tenLop if hasattr(student, 'lopHoc') else "",
                "sbd": sbd
            })
        
        return JSONResponse({
            "success": True,
            "exam_id": exam_id,
            "total_students": len(students),
            "sbd_mapping": sbd_mapping
        })
        
    except Exception as e:
        logging.error(f"Error generating SBD: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi tạo số báo danh: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Health check endpoint cho OMR service tích hợp database
    """
    return JSONResponse({
        "status": "healthy",
        "service": "OMRChecker Database Integration",
        "version": "2.1.0 - Ultra Simple",
        "features": [
            "Database scoring",
            "SBD from student code", 
            "Auto result saving",
            "File-based annotation from aligned images",
            "Ultra simple batch processing",
            "Reuses existing functions"
        ]
    })

@router.get("/storage/info")
async def get_omr_storage_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Lấy thông tin về storage OMR
    """
    try:
        # Kiểm tra quyền truy cập
        if current_user.vaiTro not in ["ADMIN", "MANAGER"]:
            raise HTTPException(status_code=403, detail="Không có quyền sử dụng chức năng này")
        
        import shutil
        storage_info = {}
        
        # Kiểm tra thư mục temporary
        temp_dir = "/tmp"
        temp_usage = shutil.disk_usage(temp_dir)
        storage_info["temp_directory"] = {
            "path": temp_dir,
            "total_gb": round(temp_usage.total / (1024**3), 2),
            "free_gb": round(temp_usage.free / (1024**3), 2),
            "used_gb": round((temp_usage.total - temp_usage.free) / (1024**3), 2)
        }
        
        # Kiểm tra thư mục OMR models
        models_dir = Path("app/omr/models")
        models_size = 0
        models_count = 0
        if models_dir.exists():
            for model_file in models_dir.glob("*.pt"):
                models_size += model_file.stat().st_size
                models_count += 1
        
        storage_info["models"] = {
            "directory": str(models_dir),
            "count": models_count,
            "total_size_mb": round(models_size / (1024**2), 2)
        }
        
        # Kiểm tra thư mục templates
        templates_dir = Path("app/omr/templates")
        templates_count = 0
        if templates_dir.exists():
            templates_count = len([d for d in templates_dir.iterdir() if d.is_dir()])
        
        storage_info["templates"] = {
            "directory": str(templates_dir),
            "count": templates_count
        }
        
        return JSONResponse({
            "success": True,
            "storage_info": storage_info
        })
        
    except Exception as e:
        logging.error(f"Error getting storage info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thông tin storage: {str(e)}")

@router.post("/storage/cleanup")
async def cleanup_omr_temp_files(
    older_than_hours: int = Form(default=24),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Dọn dẹp file tạm OMR cũ
    """
    try:
        # Kiểm tra quyền truy cập
        if current_user.vaiTro not in ["ADMIN", "MANAGER"]:
            raise HTTPException(status_code=403, detail="Không có quyền sử dụng chức năng này")
        
        import glob
        import time
        
        cleanup_stats = {
            "files_deleted": 0,
            "space_freed_mb": 0,
            "directories_cleaned": []
        }
        
        # Dọn dẹp file tạm trong /tmp
        temp_patterns = [
            "/tmp/tmp*omr*",
            "/tmp/omr_batch_*",
            "/tmp/tmpfile_*"
        ]
        
        current_time = time.time()
        cutoff_time = current_time - (older_than_hours * 3600)
        
        for pattern in temp_patterns:
            for file_path in glob.glob(pattern):
                try:
                    stat = os.stat(file_path)
                    if stat.st_mtime < cutoff_time:
                        file_size = stat.st_size
                        if os.path.isfile(file_path):
                            os.unlink(file_path)
                        elif os.path.isdir(file_path):
                            import shutil
                            shutil.rmtree(file_path)
                            cleanup_stats["directories_cleaned"].append(file_path)
                        
                        cleanup_stats["files_deleted"] += 1
                        cleanup_stats["space_freed_mb"] += file_size / (1024**2)
                        
                except Exception as e:
                    logging.warning(f"Failed to delete {file_path}: {e}")
        
        cleanup_stats["space_freed_mb"] = round(cleanup_stats["space_freed_mb"], 2)
        
        logging.info(f"OMR cleanup completed: {cleanup_stats}")
        
        return JSONResponse({
            "success": True,
            "cleanup_stats": cleanup_stats
        })
        
    except Exception as e:
        logging.error(f"Error during cleanup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi dọn dẹp file: {str(e)}")

@router.get("/processing/stats")
async def get_omr_processing_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Lấy thống kê xử lý OMR tổng quát
    """
    try:
        # Kiểm tra quyền truy cập
        if current_user.vaiTro not in ["ADMIN", "MANAGER", "TEACHER"]:
            raise HTTPException(status_code=403, detail="Không có quyền sử dụng chức năng này")
        
        from app.models.exam import AnswerSheet, Result
        from sqlalchemy import func, and_
        from datetime import datetime, timedelta
        
        # Thống kê 7 ngày qua
        week_ago = datetime.now() - timedelta(days=7)
        
        # Tổng số phiếu trả lời đã quét
        total_scanned_stmt = select(func.count(AnswerSheet.maPhieuTraLoi)).where(
            AnswerSheet.daXuLyHoanTat == True
        )
        total_scanned = await db.execute(total_scanned_stmt)
        total_scanned_count = total_scanned.scalar() or 0
        
        # Số phiếu quét trong 7 ngày qua
        recent_scanned_stmt = select(func.count(AnswerSheet.maPhieuTraLoi)).where(
            and_(
                AnswerSheet.daXuLyHoanTat == True,
                AnswerSheet.ngayTao >= week_ago
            )
        )
        recent_scanned = await db.execute(recent_scanned_stmt)
        recent_scanned_count = recent_scanned.scalar() or 0
        
        # Tổng số kết quả đã chấm
        total_results_stmt = select(func.count(Result.maKetQua))
        total_results = await db.execute(total_results_stmt)
        total_results_count = total_results.scalar() or 0
        
        stats = {
            "total_sheets_scanned": total_scanned_count,
            "recent_sheets_scanned": recent_scanned_count,
            "total_results_graded": total_results_count,
            "processing_rate": {
                "daily_average": round(recent_scanned_count / 7, 1),
                "period": "7 days"
            },
            "system_info": {
                "templates_available": len(list(Path("app/omr/templates").glob("*/template.json"))) if Path("app/omr/templates").exists() else 0,
                "models_available": len(list(Path("app/omr/models").glob("*.pt"))) if Path("app/omr/models").exists() else 0,
                "alignment_support": True,
                "batch_processing_support": True,
                "ultra_simple_approach": True
            }
        }
        
        return JSONResponse({
            "success": True,
            "stats": stats
        })
        
    except Exception as e:
        logging.error(f"Error getting processing stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê: {str(e)}")

class SaveResultItem(BaseModel):
    student_answers: Dict[str, str]
    sbd: str
    filename: str
    annotated_image_path: Optional[str] = None

class SaveResultsRequest(BaseModel):
    exam_id: int
    results: List[SaveResultItem]

@router.post("/save-results")
async def save_omr_results(
    request: SaveResultsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Lưu một batch kết quả OMR đã được chấm điểm vào database.
    """
    saved_count = 0
    errors = []
    for result_item in request.results:
        try:
            await OMRDatabaseService.score_omr_result(
                db=db,
                exam_id=request.exam_id,
                student_answers=result_item.student_answers,
                sbd=result_item.sbd,
                scanner_user_id=current_user.maNguoiDung,
                annotated_image_path=result_item.annotated_image_path,
                save_to_db=True
            )
            saved_count += 1
        except Exception as e:
            errors.append({"filename": result_item.filename, "error": str(e)})

    if saved_count > 0:
        return JSONResponse({
            "success": True, 
            "message": f"Đã lưu thành công {saved_count}/{len(request.results)} kết quả.",
            "errors": errors
        })
    else:
        raise HTTPException(status_code=400, detail={"message": "Không có kết quả nào được lưu.", "errors": errors})