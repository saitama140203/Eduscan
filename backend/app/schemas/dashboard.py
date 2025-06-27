from pydantic import BaseModel
from typing import Optional

class AdminStats(BaseModel):
    organizations: int
    classes: int
    managers: int
    teachers: int
    exams: int
    students: int
    averageScore: Optional[float] = None

class ManagerStats(BaseModel):
    classes: int
    teachers: int
    exams: int
    students: int
    averageScore: Optional[float] = None

class TeacherStats(BaseModel):
    classes: int
    exams: int
    answerSheets: int
    averageScore: Optional[float] = None

