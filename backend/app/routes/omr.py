from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import io

from app.db.session import get_async_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.exam import Exam
from app.models.answer_sheet_template import AnswerSheetTemplate
from app.services.omr_service import OMRService, get_omr_service

router = APIRouter(prefix="/omr", tags=["OMR"])

@router.post("/process-single")
async def process_single_omr(
    image: UploadFile = File(...),
    exam_id: int = Form(...),
    template_id: int = Form(...),
    class_id: Optional[int] = Form(None),
    auto_align: bool = Form(True),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    """
    Xử lý một ảnh OMR đơn lẻ
    """
    try:
        # Kiểm tra exam tồn tại
        exam_result = await db.execute(select(Exam).where(Exam.maBaiKiemTra == exam_id))
        exam = exam_result.scalars().first()
        if not exam:
            raise HTTPException(status_code=404, detail="Kỳ thi không tồn tại")
        
        # Kiểm tra template tồn tại
        template_result = await db.execute(select(AnswerSheetTemplate).where(AnswerSheetTemplate.maMauPhieu == template_id))
        template = template_result.scalars().first()
        if not template:
            raise HTTPException(status_code=404, detail="Template không tồn tại")
        
        # Kiểm tra quyền truy cập
        if str(current_user.vaiTro).upper() != "ADMIN" and current_user.maToChuc != exam.maToChuc:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập kỳ thi này")
        
        omr_service = get_omr_service()
        
        # Xử lý OMR
        result = await omr_service.process_omr_single(
            image=image,
            template_path=f"templates/template_{template_id}/template.json",
            answer_key_excel="", # Sẽ lấy từ DB
            db=db,
            exam_id=exam_id,
            class_id=class_id,
            auto_align=auto_align
        )
        
        return {
            "success": True,
            "message": "Xử lý OMR thành công",
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý OMR: {str(e)}")

@router.post("/process-batch")
async def process_batch_omr(
    images: List[UploadFile] = File(...),
    exam_id: int = Form(...),
    template_id: int = Form(...),
    class_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
    omr_service: OMRService = Depends(get_omr_service)
):
    """Xử lý batch ảnh OMR"""
    try:
        exam_result = await db.execute(select(Exam).where(Exam.maBaiKiemTra == exam_id))
        exam = exam_result.scalars().first()
        if not exam:
            raise HTTPException(status_code=404, detail="Kỳ thi không tồn tại")
        
        template_result = await db.execute(select(AnswerSheetTemplate).where(AnswerSheetTemplate.maMauPhieu == template_id))
        template = template_result.scalars().first()
        if not template:
            raise HTTPException(status_code=404, detail="Template không tồn tại")
        
        if str(current_user.vaiTro).upper() != "ADMIN" and current_user.maToChuc != exam.maToChuc:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập kỳ thi này")
        
        result = await omr_service.process_and_match_batch(
            db=db,
            exam_id=exam_id,
            images=images,
            template_id=template_id,
            class_id=class_id,
        )
        return {"success": True, "message": f"Xử lý batch {len(images)} ảnh thành công", "data": result}
    except Exception as e:
        # Log the full error for debugging
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý batch OMR: {str(e)}")

@router.get("/export-excel/{exam_id}")
async def export_results_excel(
    exam_id: int,
    class_id: Optional[int] = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
    omr_service: OMRService = Depends(get_omr_service)
):
    """
    Xuất kết quả thi ra file Excel
    """
    try:
        exam_result = await db.execute(select(Exam).where(Exam.maBaiKiemTra == exam_id))
        exam = exam_result.scalars().first()
        if not exam:
            raise HTTPException(status_code=404, detail="Kỳ thi không tồn tại")
        
        if str(current_user.vaiTro).upper() != "ADMIN" and current_user.maToChuc != exam.maToChuc:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập kỳ thi này")
        
        excel_data = await omr_service.export_results_to_excel(
            db=db,
            exam_id=exam_id,
            class_id=class_id
        )
        
        filename = f"ket_qua_{exam.tieuDe.replace(' ', '_')}_{exam_id}.xlsx"
        
        return StreamingResponse(
            io.BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi xuất Excel: {str(e)}")

@router.get("/templates")
async def get_omr_templates(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy danh sách templates OMR có sẵn
    """
    try:
        # Lấy templates từ DB
        templates_result = await db.execute(select(AnswerSheetTemplate).where(AnswerSheetTemplate.maToChuc == current_user.maToChuc))
        templates = templates_result.scalars().all()
        
        return {
            "success": True,
            "templates": [
                {
                    "id": t.maMauPhieu,
                    "name": t.tieuDe,
                    "description": t.moTa,
                    "created_at": t.thoiGianTao,
                    "has_omr_config": bool(t.cauTrucJson)
                }
                for t in templates
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách templates: {str(e)}")

@router.get("/models")
async def get_available_models(
    current_user: User = Depends(get_current_user)
):
    """
    Lấy danh sách YOLO models có sẵn
    """
    try:
        omr_service = get_omr_service()
        models = await omr_service.get_available_models()
        
        return {
            "success": True,
            "models": models
        }
        
    except Exception as e:
        return {
            "success": False,
            "models": [],
            "error": str(e)
        }

@router.post("/preview-template/{template_id}")
async def preview_template(
    template_id: int,
    sample_image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    """
    Preview template OMR với sample image
    """
    try:
        # Kiểm tra template tồn tại
        template_result = await db.execute(select(AnswerSheetTemplate).where(AnswerSheetTemplate.maMauPhieu == template_id))
        template = template_result.scalars().first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template không tồn tại")
        
        # Kiểm tra quyền truy cập
        if str(current_user.vaiTro).upper() != "ADMIN" and current_user.maToChuc != template.maToChuc:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập template này")
        
        omr_service = get_omr_service()
        
        # Preview template
        result = await omr_service.preview_template(
            template_id=template_id,
            sample_image=sample_image
        )
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi preview template: {str(e)}")

@router.get("/stats/{exam_id}")
async def get_omr_stats(
    exam_id: int,
    class_id: Optional[int] = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy thống kê kết quả OMR
    """
    from app.services.omr_service import OMRService # Re-import for clarity
    omr_service = OMRService()
    stats = await omr_service.get_exam_stats(db, exam_id, class_id)
    return {"success": True, "stats": stats} 