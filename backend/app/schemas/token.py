from pydantic import BaseModel, Field
from typing import Optional, List


class Token(BaseModel):
    """
    Schema đại diện cho JWT token trả về khi đăng nhập hoặc refresh
    """
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """
    Schema đại diện cho JWT payload (nội dung được giải mã từ token)
    """
    sub: str  # email của người dùng
    exp: int  # thời điểm hết hạn (unix timestamp)
    iat: Optional[int] = None  # thời điểm phát hành
    roles: List[str] = []  # danh sách các vai trò (vaiTro)
    jti: Optional[str] = None  # JWT ID, dùng để theo dõi và thu hồi token nếu cần
    org_id: Optional[int] = None  # ID của tổ chức (maToChuc)


class TokenData(BaseModel):
    """
    Dữ liệu cơ bản được trích xuất từ JWT token sau khi xác thực
    """
    email: Optional[str] = None
    user_id: Optional[int] = None
    roles: List[str] = []
    exp: Optional[int] = None  # Thêm trường exp (thời gian hết hạn)


class RefreshToken(BaseModel):
    """
    Schema cho yêu cầu refresh token
    """
    refresh_token: str = Field(..., description="JWT refresh token để lấy access token mới")


class PasswordResetRequest(BaseModel):
    """
    Schema cho yêu cầu đặt lại mật khẩu
    """
    email: str = Field(..., description="Email của người dùng cần đặt lại mật khẩu")


class PasswordReset(BaseModel):
    """
    Schema cho việc đặt lại mật khẩu với token
    """
    token: str = Field(..., description="Token đặt lại mật khẩu từ email")
    new_password: str = Field(..., min_length=8, description="Mật khẩu mới")
    confirm_password: str = Field(..., min_length=8, description="Xác nhận mật khẩu mới")