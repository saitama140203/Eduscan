from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SettingBase(BaseModel):
    maToChuc: Optional[int] = None
    tuKhoa: str
    giaTri: Optional[str] = None

class SettingCreate(SettingBase):
    pass

class SettingUpdate(BaseModel):
    maToChuc: Optional[int] = None
    tuKhoa: Optional[str] = None
    giaTri: Optional[str] = None

class SettingOut(SettingBase):
    maCaiDat: int
    thoiGianTao: datetime
    thoiGianCapNhat: datetime

    class Config:
        from_attributes = True
