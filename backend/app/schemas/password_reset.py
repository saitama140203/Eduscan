from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class PasswordResetRequestCreate(BaseModel):
    """Schema để tạo yêu cầu reset password mới"""
    lyDo: Optional[str] = Field(None, description="Lý do yêu cầu reset password")

class PasswordResetRequestCreatePublic(BaseModel):
    """Schema để tạo yêu cầu reset password từ trang forgot-password"""
    user_email: EmailStr = Field(..., description="Email của người dùng")
    reason: Optional[str] = Field(None, description="Lý do yêu cầu reset password")

class PasswordResetRequestUpdate(BaseModel):
    """Schema để admin cập nhật yêu cầu reset password"""
    trangThai: str = Field(..., description="Trạng thái mới: APPROVED hoặc REJECTED")
    ghiChuAdmin: Optional[str] = Field(None, description="Ghi chú của admin")

class PasswordResetRequestOut(BaseModel):
    """Schema để trả về thông tin yêu cầu reset password"""
    maYeuCau: int
    maNguoiDung: int
    hoTenNguoiYeuCau: str
    emailNguoiYeuCau: str
    vaiTroNguoiYeuCau: str
    lyDo: Optional[str]
    trangThai: str
    maAdminXuLy: Optional[int]
    hoTenAdminXuLy: Optional[str]
    ghiChuAdmin: Optional[str]
    thoiGianTao: datetime
    thoiGianXuLy: Optional[datetime]

    class Config:
        from_attributes = True

class PasswordResetRequestList(BaseModel):
    """Schema cho danh sách yêu cầu reset password với phân trang"""
    items: list[PasswordResetRequestOut]
    total: int
    page: int
    size: int
    pages: int 