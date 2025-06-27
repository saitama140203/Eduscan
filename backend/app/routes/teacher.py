from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_db
from app.models.user import User
from app.utils.auth import get_current_active_user, check_teacher_permission
from app.services.teacher_service import TeacherService

router = APIRouter()

@router.get("/dashboard", summary="Lấy dữ liệu tổng quan cho dashboard của giáo viên")
async def get_teacher_dashboard(
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Tổng hợp và trả về tất cả dữ liệu cần thiết cho trang dashboard của giáo viên.
    """
    dashboard_data = await TeacherService.get_dashboard_data(db, current_user.maNguoiDung)
    return dashboard_data 