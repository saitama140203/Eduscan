from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from app.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationUpdate

class OrganizationService:
    @staticmethod
    async def create_organization(db: AsyncSession, org_create: OrganizationCreate) -> Organization:
        db_org = Organization(
            tenToChuc=org_create.tenToChuc,
            loaiToChuc=org_create.loaiToChuc,
            diaChi=org_create.diaChi,
            urlLogo=org_create.urlLogo,
            thoiGianTao=datetime.utcnow(),
            thoiGianCapNhat=datetime.utcnow(),
        )
        db.add(db_org)
        await db.commit()
        await db.refresh(db_org)
        return db_org

    @staticmethod
    async def get_organization_by_id(db: AsyncSession, org_id: int) -> Optional[Organization]:
        result = await db.execute(select(Organization).where(Organization.maToChuc == org_id))
        return result.scalars().first()

    @staticmethod
    async def get_organizations(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Organization]:
        result = await db.execute(select(Organization).offset(skip).limit(limit))
        return result.scalars().all()

    @staticmethod
    async def update_organization(db: AsyncSession, org_id: int, org_update: OrganizationUpdate) -> Organization:
        db_org = await OrganizationService.get_organization_by_id(db, org_id)
        if not db_org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy tổ chức với ID: {org_id}"
            )

        update_data = org_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_org, key, value)
        db_org.thoiGianCapNhat = datetime.utcnow() + timedelta(hours=7)
        db.add(db_org)
        await db.commit()
        await db.refresh(db_org)
        return db_org

    @staticmethod
    async def delete_organization(db: AsyncSession, org_id: int) -> bool:
        db_org = await OrganizationService.get_organization_by_id(db, org_id)
        if not db_org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy tổ chức với ID: {org_id}"
            )
        await db.delete(db_org)
        await db.commit()
        return True
    @staticmethod
    async def get_orgs_basic_info(db: AsyncSession) -> List[Dict[str, Any]]:        
        result = await db.execute(
            select(Organization.maToChuc, Organization.tenToChuc)
        )
        return [{"maToChuc": r[0], "tenToChuc": r[1]} for r in result.all()]

