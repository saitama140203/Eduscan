from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.models.user import User
from app.models.class_room import ClassRoom

class ManagerService:

    @staticmethod
    async def get_teachers(
        db: AsyncSession, 
        organization_id: int,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[bool] = None
    ) -> List[User]:
        """
        Lấy danh sách giáo viên thuộc một tổ chức, hỗ trợ tìm kiếm và lọc.
        """
        stmt = (
            select(User)
            .where(User.maToChuc == organization_id)
            .where(User.vaiTro == 'TEACHER')
            .offset(skip)
            .limit(limit)
            .order_by(User.hoTen)
            .options(selectinload(User.lopHocsQuanLy)) # Tải sẵn thông tin lớp học
        )

        if search:
            search_term = f"%{search.lower()}%"
            stmt = stmt.where(
                func.lower(User.hoTen).like(search_term) |
                func.lower(User.email).like(search_term)
            )
        
        if status is not None:
            stmt = stmt.where(User.trangThai == status)
            
        result = await db.execute(stmt)
        teachers = result.scalars().all()
        
        # Có thể thêm logic để đếm số lớp/học sinh ở đây nếu cần
        # for teacher in teachers:
        #     teacher.so_lop_phu_trach = len(teacher.lopHocsQuanLy)
            
        return teachers 