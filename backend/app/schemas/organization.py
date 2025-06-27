from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# Base Organization Schema
class OrganizationBase(BaseModel):
    tenToChuc: str = Field(..., min_length=2, max_length=255)
    loaiToChuc: str = Field(..., min_length=2, max_length=50)
    diaChi: Optional[str] = None
    urlLogo: Optional[str] = None

# Schema cho việc tạo Organization mới
class OrganizationCreate(OrganizationBase):
    pass

# Schema cho việc cập nhật Organization
class OrganizationUpdate(BaseModel):
    tenToChuc: Optional[str] = Field(None, min_length=2, max_length=255)
    loaiToChuc: Optional[str] = Field(None, min_length=2, max_length=50)
    diaChi: Optional[str] = None
    urlLogo: Optional[str] = None

# Schema đầu ra - thông tin trả về frontend
class OrganizationOut(OrganizationBase):
    maToChuc: int
    thoiGianTao: datetime
    thoiGianCapNhat: datetime
    
    class Config:
        from_attributes = True 