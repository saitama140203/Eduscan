from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List, Dict, Any


class ExamBase(BaseModel):
    maToChuc: Optional[int] = None
    maNguoiTao: Optional[int] = None
    maMauPhieu: Optional[int] = None
    tieuDe: str = Field(..., max_length=255)
    monHoc: str = Field(..., max_length=100)
    ngayThi: Optional[date] = None
    thoiGianLamBai: Optional[int] = None
    tongSoCau: int
    tongDiem: float = 10.0
    moTa: Optional[str] = None
    laDeTongHop: Optional[bool] = False


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    maToChuc: Optional[int] = None
    maNguoiTao: Optional[int] = None
    maMauPhieu: Optional[int] = None
    tieuDe: Optional[str] = Field(None, max_length=255)
    monHoc: Optional[str] = Field(None, max_length=100)
    ngayThi: Optional[date] = None
    thoiGianLamBai: Optional[int] = None
    tongSoCau: Optional[int] = None
    tongDiem: Optional[float] = None
    moTa: Optional[str] = None
    laDeTongHop: Optional[bool] = None
    trangThai: Optional[str] = None


class ExamClassAssignment(BaseModel):
    class_ids: List[int]


class ExamAnswersCreate(BaseModel):
    """Schema cho việc tạo/cập nhật đáp án"""
    answers: Dict[str, Any] = Field(..., description="Đáp án cho từng câu hỏi")
    scores: Optional[Dict[str, float]] = Field(None, description="Điểm cho từng câu hỏi")


class ExamAnswersOut(BaseModel):
    """Schema cho response đáp án"""
    maDapAn: int
    maBaiKiemTra: int
    dapAnJson: Dict[str, Any]
    diemMoiCauJson: Optional[Dict[str, Any]] = None
    thoiGianTao: datetime
    thoiGianCapNhat: datetime

    class Config:
        from_attributes = True


class ExamOut(ExamBase):
    maBaiKiemTra: int
    trangThai: str
    thoiGianTao: datetime
    thoiGianCapNhat: datetime

    class Config:
        from_attributes = True
