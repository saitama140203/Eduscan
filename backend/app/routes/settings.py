from fastapi import APIRouter, Depends, status
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_db
from app.services.setting_service import SettingService
from app.schemas.setting import SettingCreate, SettingUpdate, SettingOut
from app.models.user import User
from app.utils.auth import check_admin_permission

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/", response_model=List[SettingOut])
async def read_settings(ma_to_chuc: Optional[int] = None, current_user: User = Depends(check_admin_permission), db: AsyncSession = Depends(get_async_db)):
    return await SettingService.get_list(db, ma_to_chuc)

@router.post("/", response_model=SettingOut, status_code=status.HTTP_201_CREATED)
async def create_setting(setting: SettingCreate, current_user: User = Depends(check_admin_permission), db: AsyncSession = Depends(get_async_db)):
    return await SettingService.create_setting(db, setting)

@router.get("/{setting_id}", response_model=SettingOut)
async def get_setting(setting_id: int, current_user: User = Depends(check_admin_permission), db: AsyncSession = Depends(get_async_db)):
    return await SettingService.get_setting(db, setting_id)

@router.put("/{setting_id}", response_model=SettingOut)
async def update_setting(setting_id: int, setting_update: SettingUpdate, current_user: User = Depends(check_admin_permission), db: AsyncSession = Depends(get_async_db)):
    return await SettingService.update_setting(db, setting_id, setting_update)

@router.delete("/{setting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_setting(setting_id: int, current_user: User = Depends(check_admin_permission), db: AsyncSession = Depends(get_async_db)):
    await SettingService.delete_setting(db, setting_id)
    return {"message": "deleted"}
