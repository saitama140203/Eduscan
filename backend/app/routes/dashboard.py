from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_db
from app.models.user import User
from app.utils.auth import get_current_active_user
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import AdminStats, ManagerStats, TeacherStats

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/overview", response_model=dict)
async def get_overview_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Lấy thống kê tổng quan dựa theo vai trò người dùng"""
    if current_user.vaiTro.upper() == "ADMIN":
        return await DashboardService.admin_stats(db)
    elif current_user.vaiTro.upper() == "MANAGER":
        return await DashboardService.manager_stats(db, current_user.maToChuc)
    else:
        return await DashboardService.teacher_stats(db, current_user.maNguoiDung)

@router.get("/admin/recent-activities")
async def get_admin_recent_activities(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
    limit: int = 10
):
    """Lấy hoạt động gần đây của hệ thống (admin only)"""
    if current_user.vaiTro.upper() != "ADMIN":
        return {"detail": "Chỉ admin mới có quyền truy cập"}
    
    return await DashboardService.get_recent_activities(db, limit)

@router.get("/admin/detailed")
async def get_admin_detailed_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Lấy thống kê chi tiết cho admin dashboard"""
    if current_user.vaiTro.upper() != "ADMIN":
        return {"detail": "Chỉ admin mới có quyền truy cập"}
    
    stats = await DashboardService.admin_stats(db)
    activities = await DashboardService.get_recent_activities(db, 8)
    
    return {
        "stats": stats,
        "recentActivities": activities,
        "timestamp": "2024-01-15T10:30:00Z"
    }