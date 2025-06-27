from pydantic import BaseModel, Field, validator
from typing import Optional, Any, Dict, List
from datetime import datetime

# File Info Schema (nested in cauTrucJson)
class FileInfo(BaseModel):
    maTapTin: Optional[int] = None
    tenFileGoc: Optional[str] = None
    kichThuocFile: Optional[int] = None
    loaiFile: Optional[str] = None

# AI Config Schema (nested in cauTrucJson)
class AIConfig(BaseModel):
    aiTemplateId: Optional[str] = None
    recognitionAreas: Optional[list] = None
    processingRules: Optional[Dict] = None

# Template Structure (full cauTrucJson structure)
class TemplateStructure(BaseModel):
    fileInfo: Optional[FileInfo] = None
    aiConfig: Optional[AIConfig] = None
    layout: Optional[Dict] = None  # Existing layout config

class AnswerSheetTemplateBase(BaseModel):
    maToChuc: Optional[int] = None  # Allow None for system templates created by Admin
    maNguoiTao: int
    tenMauPhieu: str = Field(..., max_length=255)
    soCauHoi: int = Field(..., gt=0, description="Số lượng câu hỏi")
    soLuaChonMoiCau: int = Field(default=4, gt=0, le=10, description="Số lượng đáp án mỗi câu")
    khoGiay: str = Field(default="A4", description="Khổ giấy")
    coTuLuan: bool = Field(default=False, description="Có phần tự luận")
    coThongTinHocSinh: bool = Field(default=True, description="Có thông tin học sinh")
    coLogo: bool = Field(default=False, description="Có logo")
    cauTrucJson: Optional[Any] = None  # Will contain TemplateStructure
    cssFormat: Optional[str] = None
    laMacDinh: bool = False
    laCongKhai: bool = False

class AnswerSheetTemplateCreate(AnswerSheetTemplateBase):
    pass

class AnswerSheetTemplateUpdate(BaseModel):
    tenMauPhieu: Optional[str] = Field(None, max_length=255)
    soCauHoi: Optional[int] = Field(None, gt=0)
    soLuaChonMoiCau: Optional[int] = Field(None, gt=0, le=10)
    khoGiay: Optional[str] = None
    coTuLuan: Optional[bool] = None
    coThongTinHocSinh: Optional[bool] = None
    coLogo: Optional[bool] = None
    cauTrucJson: Optional[Any] = None
    cssFormat: Optional[str] = None
    laMacDinh: Optional[bool] = None
    laCongKhai: Optional[bool] = None

class AnswerSheetTemplateOut(AnswerSheetTemplateBase):
    maMauPhieu: int
    thoiGianTao: datetime
    thoiGianCapNhat: datetime

    class Config:
        from_attributes = True

# File Upload Schemas
class FileUploadResponse(BaseModel):
    success: bool
    message: str
    fileUrl: Optional[str] = None
    previewUrl: Optional[str] = None
    cloudFileId: Optional[str] = None
    fileName: str
    fileSize: int
    fileType: str

class TemplateFileInfo(BaseModel):
    maMauPhieu: int
    tenMauPhieu: str
    urlFileMau: Optional[str] = None
    urlFilePreview: Optional[str] = None
    tenFileGoc: Optional[str] = None
    downloadUrl: Optional[str] = None  # URL để download trực tiếp

# Search & Filter Schemas
class TemplateSearchRequest(BaseModel):
    keyword: Optional[str] = None
    ma_to_chuc: Optional[int] = None
    la_cong_khai: Optional[bool] = None
    la_mac_dinh: Optional[bool] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)

class TemplateSearchResponse(BaseModel):
    templates: List[AnswerSheetTemplateOut]
    total: int
    page: int
    limit: int
    total_pages: int

# Duplicate Template Schema
class TemplateDuplicateRequest(BaseModel):
    new_name: str = Field(..., max_length=255)

# Template Statistics Schema
class TemplateStatistics(BaseModel):
    maMauPhieu: int
    tenMauPhieu: str
    soCauHoi: int
    soLuaChonMoiCau: int
    laCongKhai: bool
    laMacDinh: bool
    thoiGianTao: datetime
    thoiGianCapNhat: datetime
    coFile: bool
    soLanSuDung: int
    soBaiKiemTra: int

# Template Validation Schema
class TemplateValidationResponse(BaseModel):
    valid: bool
    errors: List[str]
    warnings: List[str]

# Visibility Toggle Schema
class TemplateVisibilityRequest(BaseModel):
    la_cong_khai: bool

# Default Template Schema
class TemplateDefaultRequest(BaseModel):
    la_mac_dinh: bool

# Bulk Operations Schema
class TemplateBulkDeleteRequest(BaseModel):
    template_ids: List[int] = Field(..., min_items=1)

class TemplateBulkResponse(BaseModel):
    success: bool
    message: str
    processed_count: int
    failed_count: int
    errors: List[str] = []
