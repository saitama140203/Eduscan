from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, List

from app.db.session import get_async_db
from app.models.user import User
from app.utils.auth import get_current_user
from app.schemas.user import UserOut
from app.services.manager_service import ManagerService

router = APIRouter()

@router.get("/teachers", response_model=List[UserOut])
async def get_teachers_list(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    search: str = Query(None),
    status: bool = Query(None),
) -> Any:
    """
    Lấy danh sách giáo viên cho manager.
    Hỗ trợ tìm kiếm, lọc theo trạng thái và phân trang.
    """
    if current_user.vaiTro not in ["ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
        
    teachers = await ManagerService.get_teachers(
        db=db, 
        organization_id=current_user.maToChuc,
        skip=skip,
        limit=limit,
        search=search,
        status=status
    )
    return teachers 