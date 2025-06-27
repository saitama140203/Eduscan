from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Form, Body
import logging
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_db
from app.services.user_service import UserService
from app.models.user import User
from app.schemas.token import Token, RefreshToken, PasswordResetRequest, PasswordReset
from app.schemas.user import UserCreate, UserOut, UserChangePassword
from app.core.config import settings

logger = logging.getLogger(__name__)
from app.core.security import (
    create_access_token, 
    create_refresh_token, 
    verify_token, 
    create_password_reset_token,
    get_password_hash
)
from app.utils.auth import get_current_user, check_admin_permission

# Có thể import SendGrid hoặc dùng giải pháp gửi email khác
# from app.utils.email import send_reset_password_email

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={401: {"description": "Unauthorized"}}
)

@router.post("/register", response_model=UserOut)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_async_db)):
    """
    Đăng ký tài khoản mới
    """
    try:
        user = await UserService.create_user(db, user_data)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login", response_model=Token)
async def login(
    response: Response,
    email: str = Form(...),
    password: str = Form(...),
    remember_me: bool = Form(False),  # Thêm tham số remember_me
    db: AsyncSession = Depends(get_async_db)
):
    """
    Đăng nhập và lấy JWT token với tùy chọn remember me
    """
    # Xác thực người dùng với email từ username field của form
    user = await UserService.authenticate(db, email, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Kiểm tra trạng thái tài khoản
    if not user.trangThai:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa"
        )
    
    logger.debug(
        "[LOGIN_ROUTE] About to create access token. Settings SECRET_KEY: %s",
        settings.SECRET_KEY,
    )
    
    # Tạo token với thời gian khác nhau tùy vào remember_me
    if remember_me:
        # Remember me: token kéo dài 30 ngày
        access_token_expires = timedelta(days=30)
        cookie_max_age = 60*60*24*30  # 30 ngày
    else:
        # Bình thường: token theo config
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        cookie_max_age = 60*60*24*7  # 7 ngày
    
    # Tạo access token và refresh token
    access_token = create_access_token(
        subject=user.email,
        user_id=user.maNguoiDung,
        roles=[user.vaiTro],
        org_id=user.maToChuc,
        expires_delta=access_token_expires
    )
    
    refresh_token = create_refresh_token(
        subject=user.email
    )
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",  # "lax" cho development localhost (thay vì "none")
        secure=False,  # False cho HTTP development
        max_age=cookie_max_age,
        path="/",
        # domain=None  # Để browser tự detect domain
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "remember_me": remember_me
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: RefreshToken,
    response: Response,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Làm mới access token bằng refresh token
    """
    try:
        # Xác minh refresh token
        payload = verify_token(token_data.refresh_token, token_type="refresh")
        
        # Lấy email từ refresh token
        email = payload.get("sub")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không hợp lệ",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Lấy thông tin người dùng
        user = await UserService.get_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Người dùng không tồn tại",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Kiểm tra trạng thái tài khoản
        if not user.trangThai:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị vô hiệu hóa"
            )
        
        # Tạo access token mới
        access_token = create_access_token(
            subject=user.email,
            user_id=user.maNguoiDung,
            roles=[user.vaiTro],
            org_id=user.maToChuc,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        # Tạo refresh token mới
        refresh_token = create_refresh_token(
            subject=user.email
        )
        response.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                samesite="lax",   # "lax" cho development localhost  
                secure=False,  # False cho HTTP development
                max_age=60*60*24*7,
                path="/",
                # domain=None  # Để browser tự detect domain
            )
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không thể làm mới token, vui lòng đăng nhập lại",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/forgot-password", response_model=dict)
async def forgot_password(
    reset_request: PasswordResetRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Yêu cầu đặt lại mật khẩu
    """
    # Kiểm tra email có tồn tại không
    user = await UserService.get_by_email(db, reset_request.email)
    if not user:
        # Không tiết lộ rằng email không tồn tại (để tránh enumeration attack)
        return {"message": "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi"}
    
    # Tạo token đặt lại mật khẩu
    reset_token = create_password_reset_token(user.email)
    
    # Trong môi trường phát triển, chỉ in ra token
    logger.debug("Password reset token for %s: %s", user.email, reset_token)
    
    # Trong môi trường sản xuất, sẽ gửi email
    # background_tasks.add_task(
    #     send_reset_password_email, 
    #     email=user.email, 
    #     token=reset_token,
    #     username=user.hoTen
    # )
    
    return {"message": "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi"}

@router.post("/reset-password", response_model=dict)
async def reset_password(
    reset_data: PasswordReset,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Đặt lại mật khẩu với token
    """
    # Xác minh token
    try:
        payload = verify_token(reset_data.token, token_type="password_reset")
        email = payload.get("sub")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token không hợp lệ hoặc đã hết hạn"
            )
        
        # Kiểm tra mật khẩu và xác nhận mật khẩu
        if reset_data.new_password != reset_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu và xác nhận mật khẩu không khớp"
            )
        
        # Đặt lại mật khẩu
        success = await UserService.reset_password(db, email, reset_data.new_password)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể đặt lại mật khẩu"
            )
        
        return {"message": "Đặt lại mật khẩu thành công"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể đặt lại mật khẩu: {str(e)}"
        )

@router.get("/me", response_model=UserOut)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Lấy thông tin người dùng hiện tại
    """
    return current_user

@router.post("/change-password", response_model=dict)
async def change_password(
    password_data: UserChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Đổi mật khẩu người dùng
    """
    try:
        # Kiểm tra mật khẩu xác nhận
        if password_data.new_password != password_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu mới và mật khẩu xác nhận không khớp"
            )
            
        # Thay đổi mật khẩu
        await UserService.change_password(
            db,
            current_user.maNguoiDung,
            password_data.current_password,
            password_data.new_password
        )
        
        return {"message": "Đổi mật khẩu thành công"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/logout", response_model=dict)
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Đăng xuất thành công"}

# Endpoint hỗ trợ debug trong môi trường phát triển
@router.get("/debug-token", include_in_schema=settings.DEBUG)
async def debug_token(current_user: User = Depends(get_current_user)):
    """
    Debug token - chỉ có trong môi trường phát triển
    """
    return {
        "user_id": current_user.maNguoiDung,
        "email": current_user.email,
        "role": current_user.vaiTro,
        "org_id": current_user.maToChuc
    }

# Endpoint tạm thời để reset mật khẩu cho mục đích debug
@router.post("/debug-force-password-reset", include_in_schema=settings.DEBUG)
async def debug_force_password_reset(
    email: str = Form(...),
    new_password: str = Form(...),
    db: AsyncSession = Depends(get_async_db)
):
    """
    !!! DEBUGGING ONLY !!!
    Buộc đặt lại mật khẩu cho một người dùng mà không cần mật khẩu cũ.
    Endpoint này phải được xóa trước khi đưa lên production.
    """
    user = await UserService.get_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy người dùng với email: {email}")
    
    hashed_password = get_password_hash(new_password)
    success = await UserService.update_password(db, user.maNguoiDung, hashed_password)

    if not success:
        raise HTTPException(status_code=500, detail="Không thể cập nhật mật khẩu.")

    return {"message": f"Mật khẩu cho {email} đã được đặt lại thành công."} 