from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_db
from app.services.organization_service import OrganizationService
from app.schemas.organization import OrganizationOut, OrganizationCreate, OrganizationUpdate
from app.models.user import User
from app.utils.auth import get_current_active_user, check_admin_permission

router = APIRouter(
    prefix="/organizations",
    tags=["organizations"],
    responses={404: {"description": "Not found"}}
)

@router.get("/", response_model=List[OrganizationOut])
async def read_organizations(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy danh sách tổ chức (Admin có thể xem tất cả, người dùng khác chỉ xem tổ chức của mình)"""
    if current_user.vaiTro.upper() == "ADMIN":
        organizations = await OrganizationService.get_organizations(db, skip=skip, limit=limit)
    else:
        # Người dùng khác chỉ có thể xem tổ chức của mình
        if current_user.maToChuc:
            org = await OrganizationService.get_organization_by_id(db, current_user.maToChuc)
            organizations = [org] if org else []
        else:
            organizations = []
    return organizations

@router.post("/", response_model=OrganizationOut)
async def create_organization(
    organization: OrganizationCreate,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Tạo tổ chức mới (yêu cầu quyền Admin)"""
    return await OrganizationService.create_organization(db, organization)

@router.get("/{org_id}", response_model=OrganizationOut)
async def read_organization(
    org_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy thông tin tổ chức cụ thể"""
    if current_user.vaiTro.upper() != "ADMIN" and current_user.maToChuc != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền truy cập thông tin của tổ chức khác"
        )
    db_org = await OrganizationService.get_organization_by_id(db, org_id)
    if db_org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tổ chức với ID: {org_id}"
        )
    return db_org

@router.put("/{org_id}", response_model=OrganizationOut)
async def update_organization(
    org_id: int,
    org_update: OrganizationUpdate,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Cập nhật thông tin tổ chức (yêu cầu quyền Admin)"""
    return await OrganizationService.update_organization(db, org_id, org_update)

@router.delete("/{org_id}", response_model=dict)
async def delete_organization(
    org_id: int,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Xóa tổ chức (yêu cầu quyền Admin)"""
    await OrganizationService.delete_organization(db, org_id)
    return {"message": f"Đã xóa tổ chức với ID: {org_id}"}
