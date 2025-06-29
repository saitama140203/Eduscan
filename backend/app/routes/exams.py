from fastapi import APIRouter, Depends, status, Body, HTTPException
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import StreamingResponse
import io

from app.db.session import get_async_db
from app.services.exam_service import ExamService
from app.schemas.exam import ExamCreate, ExamUpdate, ExamOut, ExamClassAssignment, ExamAnswersCreate, ExamAnswersOut
from app.models.user import User
from app.utils.auth import get_current_active_user, check_manager_permission, check_teacher_permission
from app.services.user_service import UserService
from app.services.omr_service import get_omr_service, OMRDatabaseService

router = APIRouter(
    prefix="/exams", 
    tags=["exams"],
    redirect_slashes=False
)


@router.get("/", response_model=List[ExamOut])
async def read_exams(
    org_id: Optional[int] = None,
    creator_id: Optional[int] = None,
    class_id: Optional[int] = None,
    trangThai: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    if current_user.vaiTro == "ADMIN":
        exams = await ExamService.get_list(
            db, 
            maToChuc=org_id, 
            maNguoiTao=creator_id, 
            maLopHoc=class_id,
            trangThai=trangThai
        )
    elif current_user.vaiTro == "MANAGER":
        exams = await ExamService.get_list(
            db, 
            maToChuc=current_user.maToChuc, 
            maLopHoc=class_id,
            trangThai=trangThai
        )
    else:
        exams = await ExamService.get_list(
            db, 
            maNguoiTao=current_user.maNguoiDung, 
            maLopHoc=class_id,
            trangThai=trangThai
        )
    return exams


@router.post("/", response_model=ExamOut, status_code=status.HTTP_201_CREATED)
async def create_exam(
    exam_create: ExamCreate,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db),
):
    # Tự động set maToChuc và maNguoiTao dựa trên current user
    exam_create.maToChuc = current_user.maToChuc
    exam_create.maNguoiTao = current_user.maNguoiDung
    
    new_exam = await ExamService.create_exam(db, exam_create)
    return new_exam


@router.get("/{exam_id}", response_model=ExamOut)
async def read_exam(
    exam_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    exam = await ExamService.get_exam(db, exam_id)
    if current_user.vaiTro == "MANAGER" and exam.maToChuc != current_user.maToChuc:
        return status.HTTP_403_FORBIDDEN
    if current_user.vaiTro == "TEACHER" and exam.maNguoiTao != current_user.maNguoiDung:
        return status.HTTP_403_FORBIDDEN
    return exam


@router.put("/{exam_id}", response_model=ExamOut)
async def update_exam(
    exam_id: int,
    exam_update: ExamUpdate,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db),
):
    exam = await ExamService.get_exam(db, exam_id)
    if current_user.vaiTro == "MANAGER" and exam.maToChuc != current_user.maToChuc:
        return status.HTTP_403_FORBIDDEN
    if current_user.vaiTro == "TEACHER" and exam.maNguoiTao != current_user.maNguoiDung:
        return status.HTTP_403_FORBIDDEN
    updated_exam = await ExamService.update_exam(db, exam_id, exam_update)
    return updated_exam


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: int,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db),
):
    exam = await ExamService.get_exam(db, exam_id)
    if current_user.vaiTro == "MANAGER" and exam.maToChuc != current_user.maToChuc:
        return status.HTTP_403_FORBIDDEN
    if current_user.vaiTro == "TEACHER" and exam.maNguoiTao != current_user.maNguoiDung:
        return status.HTTP_403_FORBIDDEN
    await ExamService.delete_exam(db, exam_id)
    return {"message": "deleted"}


# ========== NEW ENDPOINTS ==========

@router.post("/{exam_id}/assign-classes")
async def assign_exam_to_classes(
    exam_id: int,
    assignment_data: ExamClassAssignment,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db),
):
    """Gán bài kiểm tra cho các lớp học"""
    exam = await ExamService.get_exam(db, exam_id)
    if current_user.vaiTro == "MANAGER" and exam.maToChuc != current_user.maToChuc:
        return status.HTTP_403_FORBIDDEN
    if current_user.vaiTro == "TEACHER" and exam.maNguoiTao != current_user.maNguoiDung:
        return status.HTTP_403_FORBIDDEN
    
    result = await ExamService.assign_to_classes(db, exam_id, assignment_data.class_ids)
    return {"message": "Exam assigned to classes successfully", "assigned_classes": result}


@router.get("/{exam_id}/classes")
async def get_exam_classes(
    exam_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Lấy danh sách lớp đã được gán bài kiểm tra"""
    exam = await ExamService.get_exam(db, exam_id)
    if current_user.vaiTro == "MANAGER" and exam.maToChuc != current_user.maToChuc:
        return status.HTTP_403_FORBIDDEN
    if current_user.vaiTro == "TEACHER" and exam.maNguoiTao != current_user.maNguoiDung:
        return status.HTTP_403_FORBIDDEN
    
    classes = await ExamService.get_assigned_classes(db, exam_id)
    return classes


@router.post("/{exam_id}/answers", response_model=ExamAnswersOut)
async def create_exam_answers(
    exam_id: int,
    answers_data: ExamAnswersCreate,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db),
):
    """Tạo/cập nhật đáp án cho bài kiểm tra"""
    exam = await ExamService.get_exam(db, exam_id)
    if current_user.vaiTro == "MANAGER" and exam.maToChuc != current_user.maToChuc:
        return status.HTTP_403_FORBIDDEN
    if current_user.vaiTro == "TEACHER" and exam.maNguoiTao != current_user.maNguoiDung:
        return status.HTTP_403_FORBIDDEN
    
    # Chuyển đổi từ schema sang dict để service có thể xử lý
    answers_dict = {
        "answers": answers_data.answers,
        "scores": answers_data.scores or {}
    }
    
    answers = await ExamService.create_or_update_answers(db, exam_id, answers_dict)
    return answers


@router.get("/{exam_id}/answers", response_model=Optional[ExamAnswersOut])
async def get_exam_answers(
    exam_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Lấy đáp án của bài kiểm tra"""
    exam = await ExamService.get_exam(db, exam_id)
    if current_user.vaiTro == "MANAGER" and exam.maToChuc != current_user.maToChuc:
        return status.HTTP_403_FORBIDDEN
    if current_user.vaiTro == "TEACHER" and exam.maNguoiTao != current_user.maNguoiDung:
        return status.HTTP_403_FORBIDDEN
    
    answers = await ExamService.get_exam_answers(db, exam_id)
    return answers


@router.get("/{exam_id}/statistics")
async def get_exam_statistics(
    exam_id: int,
    class_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Lấy thống kê kết quả bài kiểm tra"""
    exam = await ExamService.get_exam(db, exam_id)
    if current_user.vaiTro == "MANAGER" and exam.maToChuc != current_user.maToChuc:
        return status.HTTP_403_FORBIDDEN
    if current_user.vaiTro == "TEACHER" and exam.maNguoiTao != current_user.maNguoiDung:
        return status.HTTP_403_FORBIDDEN
    
    stats = await ExamService.get_exam_statistics(db, exam_id, class_id)
    return stats


@router.get("/{exam_id}/results")
async def get_exam_results(
    exam_id: int,
    class_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Lấy kết quả chi tiết của bài kiểm tra"""
    exam = await ExamService.get_exam(db, exam_id)
    if current_user.vaiTro == "MANAGER" and exam.maToChuc != current_user.maToChuc:
        return status.HTTP_403_FORBIDDEN
    if current_user.vaiTro == "TEACHER" and exam.maNguoiTao != current_user.maNguoiDung:
        return status.HTTP_403_FORBIDDEN
    
    results = await ExamService.get_exam_results(db, exam_id, class_id)
    return results


@router.get("/{exam_id}/export-results", response_class=StreamingResponse)
async def export_exam_results_with_status(
    exam_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Export kết quả bài thi ra file Excel, bao gồm cả học sinh đã chấm và chưa chấm.
    """
    try:
        excel_bytes = await OMRDatabaseService.export_results_with_status(db, exam_id)
        
        return StreamingResponse(
            io.BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=ket_qua_ky_thi_{exam_id}.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
