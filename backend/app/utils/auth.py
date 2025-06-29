from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from fastapi import Request, Depends, HTTPException, status, WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ValidationError
from passlib.context import CryptContext
from sqlalchemy.future import select
from app.models.class_room import ClassRoom
from app.core.config import settings
from app.core.security import verify_token
from app.db.session import get_async_db
from app.models.user import User
from app.schemas.token import TokenData

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def extract_token_from_request(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1]
    return request.cookies.get("access_token")

async def get_current_user(request: Request, db: AsyncSession = Depends(get_async_db)) -> User:
    token = extract_token_from_request(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Chưa đăng nhập hoặc token không hợp lệ")
    try:
        payload = verify_token(token)
        token_data = TokenData(
            email=payload.get("sub"),
            user_id=payload.get("user_id"),
            roles=payload.get("roles", []),
        )
        if not token_data.email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token thiếu email")
    except (JWTError, ValidationError, Exception) as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token không hợp lệ: {str(e)}")
    user = None
    if token_data.user_id:
        result = await db.execute(select(User).where(User.maNguoiDung == token_data.user_id))
        user = result.scalars().first()
    if not user and token_data.email:
        result = await db.execute(select(User).where(User.email == token_data.email))
        user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thông tin người dùng")
    if not user.trangThai:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị vô hiệu hóa")
    return user

async def get_current_user_websocket(websocket: WebSocket, token: str, db: AsyncSession) -> Optional[User]:
    """
    Xác thực người dùng cho WebSocket connection
    """
    if not token:
        return None
    
    try:
        payload = verify_token(token)
        token_data = TokenData(
            email=payload.get("sub"),
            user_id=payload.get("user_id"),
            roles=payload.get("roles", []),
        )
        if not token_data.email:
            return None
    except (JWTError, ValidationError, Exception):
        return None
    
    user = None
    if token_data.user_id:
        result = await db.execute(select(User).where(User.maNguoiDung == token_data.user_id))
        user = result.scalars().first()
    if not user and token_data.email:
        result = await db.execute(select(User).where(User.email == token_data.email))
        user = result.scalars().first()
    
    if not user or not user.trangThai:
        return None
    
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.trangThai:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị vô hiệu hóa")
    return current_user

def check_admin_permission(current_user: User = Depends(get_current_active_user)) -> User:
    if str(current_user.vaiTro).upper() != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền Admin.")
    return current_user

def check_manager_permission(current_user: User = Depends(get_current_active_user)) -> User:
    if str(current_user.vaiTro).upper() not in ["ADMIN", "MANAGER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền Manager trở lên.")
    return current_user

def check_teacher_permission(current_user: User = Depends(get_current_active_user)) -> User:
    if str(current_user.vaiTro).upper() not in ["ADMIN", "MANAGER", "TEACHER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền Teacher trở lên.")
    return current_user

async def check_class_access(
    class_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
) -> ClassRoom:
    # Lấy lớp học cần kiểm tra
    result = await db.execute(select(ClassRoom).where(ClassRoom.maLopHoc == class_id, ClassRoom.trangThai == True))
    db_class = result.scalars().first()
    if not db_class:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại hoặc đã bị xóa.")
    # Quyền Admin luôn OK
    if str(current_user.vaiTro).upper() == "ADMIN":
        return db_class
    # Manager chỉ xem lớp thuộc tổ chức mình
    if str(current_user.vaiTro).upper() == "MANAGER":
        if db_class.maToChuc != current_user.maToChuc:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập lớp của tổ chức khác.")
        return db_class
    # Teacher chỉ xem lớp mình chủ nhiệm
    if str(current_user.vaiTro).upper() == "TEACHER":
        if db_class.maGiaoVienChuNhiem != current_user.maNguoiDung:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập lớp không phải chủ nhiệm.")
        return db_class
    raise HTTPException(status_code=403, detail="Phân quyền không hợp lệ.")

async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    """
    Lấy thông tin người dùng bằng ID.
    """
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.maNguoiDung == user_id))
    return result.scalars().first()

async def get_user_from_ws_token(db: AsyncSession, token: str) -> Optional[User]:
    """
    Xác thực và lấy thông tin người dùng từ token cho WebSocket.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            return None
    except (JWTError, KeyError):
        return None
    
    user = await get_user_by_id(db, user_id)
    return user
