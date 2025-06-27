from pydantic import BaseModel, EmailStr, Field, validator, EmailStr
from typing import Optional
from datetime import datetime

# Base User Schema - Các trường chung cho tất cả các schema người dùng
class UserBase(BaseModel):
    email: EmailStr
    hoTen: str = Field(..., min_length=2, max_length=255)
    vaiTro: str = Field(..., pattern="^(ADMIN|MANAGER|TEACHER)$")
    soDienThoai: Optional[str] = Field(None, min_length=10, max_length=20)
    urlAnhDaiDien: Optional[str] = None
    maToChuc: Optional[int] = None

# Schema cho việc tạo User mới
class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

# Schema cho việc cập nhật User
class UserUpdate(BaseModel):
    hoTen: Optional[str] = Field(None, min_length=2, max_length=255)
    soDienThoai: Optional[str] = None
    urlAnhDaiDien: Optional[str] = None
    trangThai: Optional[bool] = None
    vaiTro: Optional[str] = Field(None, pattern="^(ADMIN|MANAGER|TEACHER)$")
    maToChuc: Optional[int] = None

# Schema cho việc đổi mật khẩu
class UserChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Mật khẩu mới và mật khẩu xác nhận không khớp')
        return v

# Schema đầu ra - thông tin trả về frontend
class UserOut(BaseModel):
    maNguoiDung: int
    email: EmailStr
    hoTen: str
    vaiTro: str
    soDienThoai: Optional[str] = None
    urlAnhDaiDien: Optional[str] = None
    maToChuc: Optional[int] = None
    tenToChuc: Optional[str] = None
    trangThai: bool
    thoiGianTao: datetime
    thoiGianCapNhat: datetime
    
    class Config:
        from_attributes = True

# Schema cho đăng nhập
class UserLogin(BaseModel):
    email: EmailStr
    password: str 