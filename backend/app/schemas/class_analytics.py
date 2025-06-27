from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ExamStatistic(BaseModel):
    maKyThi: int
    tenKyThi: str
    ngayThi: str
    soLuongHocSinh: int
    diemTrungBinh: float
    diemCao: float
    diemThap: float
    tyLeDau: float
    phanPhoi: Dict[str, int]
    trend: Optional[str] = None

class ClassAnalytics(BaseModel):
    totalStudents: int
    activeStudents: int
    inactiveStudents: int
    examTrend: List[ExamStatistic]
    overallAverage: str
    bestExam: ExamStatistic
    worstExam: ExamStatistic
    totalExams: int
    
    class Config:
        from_attributes = True

class AnalyticsFilters(BaseModel):
    period: Optional[str] = "all"
    metric: Optional[str] = "average" 