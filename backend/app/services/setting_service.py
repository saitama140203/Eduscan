from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from typing import List, Optional

from app.models.setting import Setting
from app.schemas.setting import SettingCreate, SettingUpdate, SettingOut

class SettingService:
    @staticmethod
    async def get_list(db: AsyncSession, maToChuc: Optional[int] = None) -> List[SettingOut]:
        stmt = select(Setting)
        if maToChuc:
            stmt = stmt.where(Setting.maToChuc == maToChuc)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_setting(db: AsyncSession, setting_id: int) -> Setting:
        setting = await db.get(Setting, setting_id)
        if not setting:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setting not found")
        return setting

    @staticmethod
    async def create_setting(db: AsyncSession, setting_in: SettingCreate) -> Setting:
        setting = Setting(**setting_in.dict())
        db.add(setting)
        await db.commit()
        await db.refresh(setting)
        return setting

    @staticmethod
    async def update_setting(db: AsyncSession, setting_id: int, setting_upd: SettingUpdate) -> Setting:
        setting = await SettingService.get_setting(db, setting_id)
        for attr, value in setting_upd.dict(exclude_unset=True).items():
            setattr(setting, attr, value)
        await db.commit()
        await db.refresh(setting)
        return setting

    @staticmethod
    async def delete_setting(db: AsyncSession, setting_id: int) -> None:
        setting = await SettingService.get_setting(db, setting_id)
        await db.delete(setting)
        await db.commit()
