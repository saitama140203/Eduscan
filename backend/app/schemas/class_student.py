from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
from datetime import datetime, date

# --- CLASS SCHEMAS ---
class ClassBase(BaseModel):
    tenLop: str = Field(..., min_length=2, max_length=100)
    maToChuc: Optional[int] = None  # Auto-set from current user
    capHoc: Optional[str] = None
    namHoc: Optional[str] = None
    maGiaoVienChuNhiem: Optional[int] = None
    moTa: Optional[str] = None

class ClassCreate(ClassBase):
    pass

class ClassUpdate(BaseModel):
    tenLop: Optional[str] = Field(None, min_length=2, max_length=100)
    capHoc: Optional[str] = None
    namHoc: Optional[str] = None
    maGiaoVienChuNhiem: Optional[int] = None
    moTa: Optional[str] = None
    trangThai: Optional[bool] = None

class ClassOut(ClassBase):
    maLopHoc: int
    trangThai: bool
    thoiGianTao: Optional[datetime] = None
    thoiGianCapNhat: Optional[datetime] = None
    tenGiaoVienChuNhiem: Optional[str] = None
    tenToChuc: Optional[str] = None
    total_students: Optional[int] = None
    total_exams: Optional[int] = None
    
    class Config:
        from_attributes = True

class ClassDetail(ClassOut):
    tenToChuc: Optional[str] = None
    total_students: Optional[int] = None
    total_exams: Optional[int] = None
    average_score: Optional[float] = None
    
    class Config:
        from_attributes = True

# --- STUDENT SCHEMAS ---
class StudentBase(BaseModel):
    maLopHoc: int
    maHocSinhTruong: str = Field(..., min_length=1, max_length=50)
    hoTen: str = Field(..., min_length=2, max_length=255)
    ngaySinh: Optional[date] = None
    gioiTinh: Optional[str] = Field(None, pattern="^(Nam|Nữ|Khác)$")
    diaChi: Optional[str] = Field(None, max_length=500)
    soDienThoai: Optional[str] = Field(None, min_length=10, max_length=20)
    email: Optional[EmailStr] = None
    hoTenPhuHuynh: Optional[str] = Field(None, min_length=2, max_length=255)
    soDienThoaiPhuHuynh: Optional[str] = Field(None, min_length=10, max_length=20)
    emailPhuHuynh: Optional[EmailStr] = None
    diaChiPhuHuynh: Optional[str] = Field(None, max_length=500)

class StudentCreate(StudentBase):
    pass

class StudentBatchCreate(BaseModel):
    students: List[StudentCreate]

class StudentUpdate(StudentBase):
    trangThai: Optional[bool] = None

class StudentOut(StudentBase):
    maHocSinh: int
    trangThai: bool
    thoiGianTao: Optional[datetime] = None
    thoiGianCapNhat: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class StudentTransfer(BaseModel):
    maHocSinhList: List[int]
    maLopHocMoi: int
    
    @validator('maHocSinhList')
    def validate_student_list(cls, v):
        if not v or len(v) == 0:
            raise ValueError('Danh sách học sinh không được trống')
        return v

# --- BULK OPERATIONS SCHEMAS ---
class BulkOperationRequest(BaseModel):
    operation: str = Field(..., pattern="^(delete|update_teacher|update_status|move_organization)$")
    class_ids: List[int] = Field(..., min_items=1)
    data: Optional[dict] = None

class BulkOperationResponse(BaseModel):
    updated_count: int
    message: str

# --- IMPORT/EXPORT SCHEMAS ---
class ImportResult(BaseModel):
    created_count: int
    error_count: int
    errors: List[str]

class ClassTemplate(BaseModel):
    name: str
    description: Optional[str] = None
    settings: dict

# --- ANALYTICS SCHEMAS ---
class ClassAnalyticsResponse(BaseModel):
    total_classes: int
    active_classes: int
    total_students: int
    avg_students_per_class: float
    grade_distribution: dict
    activity_rate: float

class DashboardStats(BaseModel):
    total_classes: int
    active_classes: int
    total_students: int
    monthly_classes: int
    grade_distribution: dict
    recent_activity: int
    activity_rate: float
    avg_students_per_class: float 
