from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import math

from app.db.session import get_async_db
from app.models.user import User
from app.schemas.password_reset import (
    PasswordResetRequestCreate, 
    PasswordResetRequestUpdate,
    PasswordResetRequestOut,
    PasswordResetRequestList,
    PasswordResetRequestCreatePublic
)
from app.services.file_password_reset_service import FilePasswordResetService
from app.utils.auth import get_current_user, check_admin_permission

router = APIRouter(
    prefix="/password-reset-requests",
    tags=["password-reset-requests"],
    responses={401: {"description": "Unauthorized"}}
)

# Tạo instance của service
password_reset_service = FilePasswordResetService()

@router.post("/public", response_model=dict)
async def create_password_reset_request_public(
    request_data: PasswordResetRequestCreatePublic,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Tạo yêu cầu reset password từ trang forgot-password (không cần auth)
    """
    try:
        # Tìm user theo email
        result = await db.execute(
            "SELECT maNguoiDung, hoTen, vaiTro FROM NguoiDung WHERE email = :email",
            {"email": request_data.user_email}
        )
        user_row = result.fetchone()
        
        if not user_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy tài khoản với email này"
            )
        
        user_id = user_row[0]
        user_name = user_row[1] 
        user_role = user_row[2]
        
        # Chỉ cho phép teacher và manager
        if user_role not in ["TEACHER", "MANAGER"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ tài khoản giáo viên và quản lý mới có thể yêu cầu reset password"
            )
        
        request_id = await password_reset_service.create_request(
            db, user_id, request_data.reason or "Yêu cầu đặt lại mật khẩu từ trang quên mật khẩu"
        )
        
        return {
            "message": "Yêu cầu reset password đã được gửi thành công",
            "id": request_id
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Có lỗi xảy ra khi xử lý yêu cầu"
        )

@router.post("/", response_model=dict)
async def create_password_reset_request(
    request_data: PasswordResetRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Tạo yêu cầu reset password cho teacher/manager đã đăng nhập
    """
    if current_user.vaiTro not in ["TEACHER", "MANAGER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ giáo viên và quản lý mới có thể tạo yêu cầu reset password"
        )
    
    try:
        request_id = await password_reset_service.create_request(
            db, current_user.maNguoiDung, request_data.lyDo
        )
        return {
            "message": "Yêu cầu reset password đã được tạo thành công",
            "id": request_id
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=dict)
async def get_password_reset_requests(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    status_filter: Optional[str] = Query(None, regex="^(PENDING|APPROVED|REJECTED)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Lấy danh sách yêu cầu reset password (chỉ admin)
    """
    check_admin_permission(current_user)
    
    requests, total = password_reset_service.get_requests_with_pagination(
        page, size, status_filter
    )
    
    pages = math.ceil(total / size) if total > 0 else 1
    
    return {
        "items": requests,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.put("/{request_id}", response_model=dict)
async def update_password_reset_request(
    request_id: str,
    update_data: PasswordResetRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Admin cập nhật trạng thái yêu cầu reset password
    """
    check_admin_permission(current_user)
    
    try:
        await password_reset_service.update_request(
            db, request_id, current_user.maNguoiDung, 
            update_data.trangThai, update_data.ghiChuAdmin
        )
        
        action = "phê duyệt" if update_data.trangThai == "APPROVED" else "từ chối"
        return {"message": f"Đã {action} yêu cầu reset password thành công"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/my-requests", response_model=list)
async def get_my_password_reset_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Lấy danh sách yêu cầu reset password của user hiện tại
    """
    if current_user.vaiTro not in ["TEACHER", "MANAGER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ giáo viên và quản lý mới có thể xem yêu cầu của mình"
        )
    
    requests = password_reset_service.get_user_requests(current_user.maNguoiDung)
    return requests

@router.get("/pending-count", response_model=dict)
async def get_pending_requests_count(
    current_user: User = Depends(get_current_user)
):
    """
    Lấy số lượng yêu cầu đang chờ xử lý (cho admin)
    """
    check_admin_permission(current_user)
    
    count = password_reset_service.get_pending_count()
    return {"pending_count": count} 