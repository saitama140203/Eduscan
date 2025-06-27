from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, desc
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from datetime import datetime
import logging

from app.models.password_reset_request import PasswordResetRequest
from app.models.user import User
from app.schemas.password_reset import PasswordResetRequestCreate, PasswordResetRequestUpdate
from app.services.user_service import UserService
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

class PasswordResetService:
    
    @staticmethod
    async def create_request(
        db: AsyncSession, 
        user_id: int, 
        request_data: PasswordResetRequestCreate
    ) -> PasswordResetRequest:
        """Tạo yêu cầu reset password mới"""
        
        # Kiểm tra xem user có yêu cầu pending nào không
        existing_request = await db.execute(
            select(PasswordResetRequest)
            .where(
                and_(
                    PasswordResetRequest.maNguoiDung == user_id,
                    PasswordResetRequest.trangThai == "PENDING"
                )
            )
        )
        
        if existing_request.scalars().first():
            raise ValueError("Bạn đã có yêu cầu đang chờ xử lý")
        
        # Tạo yêu cầu mới
        new_request = PasswordResetRequest(
            maNguoiDung=user_id,
            lyDo=request_data.lyDo,
            trangThai="PENDING"
        )
        
        db.add(new_request)
        await db.commit()
        await db.refresh(new_request)
        
        return new_request
    
    @staticmethod
    async def get_requests_with_pagination(
        db: AsyncSession,
        page: int = 1,
        size: int = 10,
        status_filter: Optional[str] = None
    ) -> Tuple[List[PasswordResetRequest], int]:
        """Lấy danh sách yêu cầu với phân trang"""
        
        query = select(PasswordResetRequest).options(
            selectinload(PasswordResetRequest.nguoi_yeu_cau),
            selectinload(PasswordResetRequest.admin_xu_ly)
        ).order_by(desc(PasswordResetRequest.thoiGianTao))
        
        if status_filter:
            query = query.where(PasswordResetRequest.trangThai == status_filter)
        
        # Đếm tổng số
        count_query = select(PasswordResetRequest)
        if status_filter:
            count_query = count_query.where(PasswordResetRequest.trangThai == status_filter)
        
        total_result = await db.execute(count_query)
        total = len(total_result.scalars().all())
        
        # Phân trang
        offset = (page - 1) * size
        query = query.offset(offset).limit(size)
        
        result = await db.execute(query)
        requests = result.scalars().all()
        
        return requests, total
    
    @staticmethod
    async def update_request(
        db: AsyncSession,
        request_id: int,
        admin_id: int,
        update_data: PasswordResetRequestUpdate
    ) -> PasswordResetRequest:
        """Admin cập nhật trạng thái yêu cầu"""
        
        # Lấy yêu cầu
        result = await db.execute(
            select(PasswordResetRequest).where(PasswordResetRequest.maYeuCau == request_id)
        )
        request = result.scalars().first()
        
        if not request:
            raise ValueError("Không tìm thấy yêu cầu")
        
        if request.trangThai != "PENDING":
            raise ValueError("Yêu cầu đã được xử lý")
        
        # Cập nhật yêu cầu
        request.trangThai = update_data.trangThai
        request.ghiChuAdmin = update_data.ghiChuAdmin
        request.maAdminXuLy = admin_id
        request.thoiGianXuLy = datetime.utcnow()
        
        # Nếu approved, reset password của user
        if update_data.trangThai == "APPROVED":
            await PasswordResetService._reset_user_password(db, request.maNguoiDung)
        
        await db.commit()
        await db.refresh(request)
        
        return request
    
    @staticmethod
    async def _reset_user_password(db: AsyncSession, user_id: int):
        """Reset password của user về mặc định"""
        
        # Tạo mật khẩu mặc định
        default_password = "123456"
        hashed_password = get_password_hash(default_password)
        
        # Cập nhật mật khẩu
        await db.execute(
            update(User)
            .where(User.maNguoiDung == user_id)
            .values(matKhauMaHoa=hashed_password)
        )
        
        logger.info(f"Reset password for user {user_id} to default")
    
    @staticmethod
    async def get_user_requests(
        db: AsyncSession,
        user_id: int
    ) -> List[PasswordResetRequest]:
        """Lấy danh sách yêu cầu của một user"""
        
        result = await db.execute(
            select(PasswordResetRequest)
            .where(PasswordResetRequest.maNguoiDung == user_id)
            .order_by(desc(PasswordResetRequest.thoiGianTao))
        )
        
        return result.scalars().all() 