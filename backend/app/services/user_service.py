from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, not_
from sqlalchemy.exc import IntegrityError
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import verify_password, get_password_hash
from app.models.organization import Organization

class UserService:
    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalars().first()
    
    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        return await db.get(User, user_id)
    
    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str) -> Optional[User]:
        user = await UserService.get_by_email(db, email)
        if not user or not verify_password(password, user.matKhauMaHoa):
            return None
        return user

    @staticmethod
    async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
        logger.debug("\ud83d\udd0d Kiểm tra email tồn tại: %s", user_in.email)
        existing_user = await UserService.get_by_email(db, user_in.email)
        if existing_user:
            logger.debug("Email đã tồn tại: %s", user_in.email)
            raise ValueError("Email đã được sử dụng")
        
        logger.debug("\u2705 Email chưa tồn tại, tạo user mới...")
        hashed_password = get_password_hash(user_in.password)
        
        db_user = User(
            email=user_in.email,
            matKhauMaHoa=hashed_password,
            hoTen=user_in.hoTen,
            vaiTro=user_in.vaiTro,
            soDienThoai=user_in.soDienThoai,
            urlAnhDaiDien=user_in.urlAnhDaiDien,
            maToChuc=user_in.maToChuc,
            trangThai=True,
            thoiGianTao=datetime.utcnow(),
            thoiGianCapNhat=datetime.utcnow()
        )
        
        logger.debug(
            "\ud83d\udd0d User object tạo: %s",
            {
                "email": db_user.email,
                "hoTen": db_user.hoTen,
                "vaiTro": db_user.vaiTro,
                "maToChuc": db_user.maToChuc,
                "soDienThoai": db_user.soDienThoai,
            },
        )
        
        try:
            db.add(db_user)
            await db.commit()
            await db.refresh(db_user)
            logger.debug("\u2705 User tạo thành công với ID: %s", db_user.maNguoiDung)
            return db_user
        except IntegrityError as e:
            await db.rollback()
            logger.error("\u274c IntegrityError chi tiết: %s", e)
            logger.error("\u274c Lỗi args: %s", e.args)
            raise ValueError(f"Lỗi khi tạo người dùng: {str(e)}")
        except Exception as e:
            await db.rollback()
            logger.error("\u274c Exception khác: %s: %s", type(e).__name__, e)
            raise ValueError(f"Lỗi không xác định: {str(e)}")
    
    @staticmethod
    async def update_user(db: AsyncSession, user_id: int, user_in: UserUpdate) -> Optional[User]:
        user = await UserService.get_by_id(db, user_id)
        if not user:
            return None
        update_data = user_in.model_dump(exclude_unset=True)
        update_data["thoiGianCapNhat"] = datetime.utcnow()
        try:
            await db.execute(
                update(User).where(User.maNguoiDung == user_id).values(**update_data)
            )
            await db.commit()
            return await UserService.get_by_id(db, user_id)
        except IntegrityError:
            await db.rollback()
            raise ValueError("Lỗi khi cập nhật thông tin người dùng")

    @staticmethod
    async def change_password(db: AsyncSession, user_id: int, current_password: str, new_password: str) -> bool:
        user = await UserService.get_by_id(db, user_id)
        if not user or not verify_password(current_password, user.matKhauMaHoa):
            raise ValueError("Mật khẩu hiện tại không đúng")
        hashed_password = get_password_hash(new_password)
        try:
            await db.execute(
                update(User)
                .where(User.maNguoiDung == user_id)
                .values(matKhauMaHoa=hashed_password, thoiGianCapNhat=datetime.utcnow())
            )
            await db.commit()
            return True
        except Exception:
            await db.rollback()
            raise ValueError("Lỗi khi thay đổi mật khẩu")

    @staticmethod
    async def get_all_users_with_org(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        maToChuc: Optional[int] = None,
        vaiTro: Optional[str] = None,
        filters: Dict[str, Any] = None
    ) -> List[dict]:
        conditions = [User.maToChuc != None]

        # Combine explicit params with filters dict
        query_filters = filters.copy() if filters else {}
        if maToChuc:
            query_filters["maToChuc"] = maToChuc
        if vaiTro:
            query_filters["vaiTro"] = vaiTro

        if query_filters:
            if query_filters.get("email"):
                conditions.append(User.email.ilike(f"%{query_filters['email']}%"))
            if query_filters.get("hoTen"):
                conditions.append(User.hoTen.ilike(f"%{query_filters['hoTen']}%"))
            if query_filters.get("vaiTro"):
                conditions.append(User.vaiTro == query_filters["vaiTro"])
            if query_filters.get("trangThai") is not None:
                conditions.append(User.trangThai == query_filters["trangThai"])
            if query_filters.get("maToChuc"):
                conditions.append(User.maToChuc == query_filters["maToChuc"])
        # JOIN với bảng TOCHUC
        query = (
            select(
                User,
                Organization.tenToChuc
            )
            .join(Organization, User.maToChuc == Organization.maToChuc, isouter=True)
            .where(and_(*conditions))
            .offset(skip).limit(limit)
        )
        result = await db.execute(query)
        # Kết quả: list[(User, tenToChuc)]
        users = []
        for user, tenToChuc in result.all():
            user_dict = user.__dict__.copy()
            user_dict["tenToChuc"] = tenToChuc
            users.append(user_dict)
        return users


    @staticmethod
    async def get_users_by_organization(db: AsyncSession, org_id: int, skip: int = 0, limit: int = 100) -> List[User]:
        query = select(User).where(User.maToChuc == org_id).offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())
    @staticmethod
    async def deactivate_user(db: AsyncSession, user_id: int) -> bool:
        """
        Vô hiệu hóa user (đặt trường trangThai=False).
        """
        user = await UserService.get_by_id(db, user_id)
        if not user:
            return False
        try:
            await db.execute(
                update(User)
                .where(User.maNguoiDung == user_id)
                .values(trangThai=False, thoiGianCapNhat=datetime.utcnow())
            )
            await db.commit()
            return True
        except Exception:
            await db.rollback()
            return False
    @staticmethod
    async def get_user_with_org(db: AsyncSession, user_id: int) -> Optional[dict]:
        query = (
            select(
                User,
                Organization.tenToChuc
            )
            .join(Organization, User.maToChuc == Organization.maToChuc, isouter=True)
            .where(User.maNguoiDung == user_id)
        )
        result = await db.execute(query)
        row = result.first()
        if not row:
            return None
        user, tenToChuc = row
        user_dict = user.__dict__.copy()
        user_dict["tenToChuc"] = tenToChuc
        return user_dict

    @staticmethod
    async def update_password(db: AsyncSession, user_id: int, hashed_password: str) -> bool:
        """Cập nhật mật khẩu đã hash cho user"""
        try:
            await db.execute(
                update(User)
                .where(User.maNguoiDung == user_id)
                .values(matKhauMaHoa=hashed_password)
            )
            await db.commit()
            return True
        except Exception as e:
            logger.error(f"Error updating password for user {user_id}: {str(e)}")
            await db.rollback()
            return False
