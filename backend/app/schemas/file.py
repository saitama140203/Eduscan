from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FileBase(BaseModel):
    tenTapTin: str
    loaiTapTin: str
    thucTheNguon: Optional[str] = None
    maThucTheNguon: Optional[int] = None

class FileCreate(FileBase):
    maNguoiDung: int
    maToChuc: int
    duongDan: str
    kichThuoc: int

class FileUpdate(BaseModel):
    tenTapTin: Optional[str] = None
    thucTheNguon: Optional[str] = None
    maThucTheNguon: Optional[int] = None

class FileOut(FileBase):
    maTapTin: int
    maNguoiDung: int
    maToChuc: int
    duongDan: str
    kichThuoc: int
    thoiGianTao: datetime
    
    class Config:
        from_attributes = True

class FileUploadRequest(BaseModel):
    thucTheNguon: str = "GENERAL"
    maThucTheNguon: Optional[int] = None

class FileUploadResponse(BaseModel):
    success: bool
    message: str
    maTapTin: Optional[int] = None
    tenTapTin: Optional[str] = None
    duongDan: Optional[str] = None
    kichThuoc: Optional[int] = None
    loaiTapTin: Optional[str] = None 