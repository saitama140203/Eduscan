from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_db
from app.services.user_service import UserService
from app.schemas.user import UserOut, UserCreate, UserUpdate
from app.models.user import User
from app.utils.auth import get_current_active_user, check_admin_permission, check_manager_permission
from app.services.organization_service import OrganizationService
router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}}
)

@router.get("/", response_model=List[UserOut])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    maToChuc: Optional[int] = None,
    vaiTro: Optional[str] = None,
    current_user: User = Depends(check_manager_permission),
    db: AsyncSession = Depends(get_async_db)
):
    return await UserService.get_all_users_with_org(
        db, skip=skip, limit=limit, maToChuc=maToChuc, vaiTro=vaiTro
    )

@router.get("/organization/{org_id}", response_model=List[UserOut])
async def read_users_by_organization(
    org_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(check_manager_permission),
    db: AsyncSession = Depends(get_async_db)
):
    if current_user.vaiTro == "ADMIN":
        return await UserService.get_users_by_organization(db, org_id, skip, limit)
    elif current_user.vaiTro == "MANAGER":
        if current_user.maToChuc != org_id:
            raise HTTPException(status_code=403, detail="Không có quyền xem tổ chức khác")
        return await UserService.get_users_by_organization(db, org_id, skip, limit)
    else:
        raise HTTPException(status_code=403, detail="Không có quyền")

@router.post("/", response_model=UserOut)
async def create_user( 
    user: UserCreate,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    return await UserService.create_user(db, user)

@router.get("/{user_id}", response_model=UserOut)
async def read_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    if current_user.vaiTro != "ADMIN" and current_user.maNguoiDung != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền truy cập thông tin người dùng khác"
        )
    user = await UserService.get_user_with_org(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Không tìm thấy người dùng với ID: {user_id}")
    return user

@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    is_self_update = current_user.maNguoiDung == user_id
    is_admin = current_user.vaiTro == "ADMIN"
    if not (is_self_update or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền cập nhật thông tin người dùng khác"
        )
    if is_self_update and not is_admin:
        restricted_fields = ["vaiTro", "maToChuc", "trangThai"]
        update_data = user_update.dict(exclude_unset=True)
        for field in restricted_fields:
            if field in update_data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Không thể cập nhật trường {field}"
                )
    user = await UserService.update_user(db, user_id, user_update)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")
    return user

@router.delete("/{user_id}", response_model=dict)
async def delete_user(
    user_id: int,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    if current_user.maNguoiDung == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể xóa tài khoản của chính bạn")
    await UserService.deactivate_user(db, user_id)
    return {"message": f"Đã xóa người dùng với ID: {user_id}"}

@router.get("/teachers/available")
async def get_available_teachers(
    current_user: User = Depends(check_manager_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy danh sách giáo viên có sẵn để phân công"""
    from sqlalchemy import select, func
    from app.models.class_room import ClassRoom
    from app.models.user import User as UserModel
    from app.models.organization import Organization
    
    # Query giáo viên với thông tin số lớp đang chủ nhiệm
    query = select(
        UserModel.maNguoiDung,
        UserModel.hoTen,
        UserModel.email,
        UserModel.soDienThoai,
        UserModel.trangThai,
        UserModel.thoiGianTao,
        Organization.tenToChuc,
        func.count(ClassRoom.maLopHoc).label('currentClasses')
    ).select_from(
        UserModel
    ).outerjoin(
        ClassRoom, UserModel.maNguoiDung == ClassRoom.maGiaoVienChuNhiem
    ).outerjoin(
        Organization, UserModel.maToChuc == Organization.maToChuc
    ).where(
        UserModel.vaiTro == "TEACHER",
        UserModel.trangThai == True
    )
    
    # Lọc theo quyền
    if current_user.vaiTro == "MANAGER":
        query = query.where(UserModel.maToChuc == current_user.maToChuc)
    elif current_user.vaiTro == "TEACHER":
        # Teacher không được xem danh sách giáo viên khác
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teachers cannot access this endpoint"
        )
    
    query = query.group_by(
        UserModel.maNguoiDung,
        UserModel.hoTen,
        UserModel.email,
        UserModel.soDienThoai,
        UserModel.trangThai,
        UserModel.thoiGianTao,
        Organization.tenToChuc
    ).order_by(UserModel.hoTen)
    
    result = await db.execute(query)
    teachers_data = result.all()
    
    # Format response
    teachers = []
    for teacher_data in teachers_data:
        # Tính kinh nghiệm từ thoiGianTao
        years_experience = 0
        if teacher_data.thoiGianTao:
            from datetime import datetime
            years_experience = (datetime.now() - teacher_data.thoiGianTao).days // 365
        
        # Giả sử chủ nhiệm tối đa 3 lớp
        is_available = teacher_data.currentClasses < 3
        
        teachers.append({
            "maGiaoVien": teacher_data.maNguoiDung,
            "tenGiaoVien": teacher_data.hoTen,
            "email": teacher_data.email,
            "soDienThoai": teacher_data.soDienThoai or "",
            "vaiTro": "TEACHER",
            "currentClasses": teacher_data.currentClasses,
            "maxClasses": 3,
            "available": is_available,
            "experience": years_experience,
            "organization": teacher_data.tenToChuc or "",
            "subject": "Chưa cập nhật"  # Có thể thêm field môn học vào model User sau
        })
    
    return teachers
