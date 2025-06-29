from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.db.session import get_async_db
from app.models.user import User
from app.models.class_room import ClassRoom
from app.models.student import Student
from app.models.exam import Exam, Result
from app.utils.auth import get_current_active_user, check_manager_permission

router = APIRouter(
    prefix="/stats",
    tags=["stats"],
    responses={404: {"description": "Not found"}}
)

@router.get("/overview")
async def get_manager_dashboard_overview(
    current_user: User = Depends(check_manager_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Lấy thống kê tổng quan cho manager dashboard
    """
    # Determine organization filter based on user role
    org_filter = None
    if current_user.vaiTro == "MANAGER":
        org_filter = current_user.maToChuc
    
    # Count classes
    classes_query = select(func.count(ClassRoom.maLopHoc)).where(ClassRoom.trangThai == True)
    if org_filter:
        classes_query = classes_query.where(ClassRoom.maToChuc == org_filter)
    
    classes_result = await db.execute(classes_query)
    total_classes = classes_result.scalar() or 0
    
    # Count teachers
    teachers_query = select(func.count(User.maNguoiDung)).where(
        and_(
            User.vaiTro == "TEACHER",
            User.trangThai == True
        )
    )
    if org_filter:
        teachers_query = teachers_query.where(User.maToChuc == org_filter)
    
    teachers_result = await db.execute(teachers_query)
    total_teachers = teachers_result.scalar() or 0
    
    # Count students
    students_query = select(func.count(Student.maHocSinh)).where(Student.trangThai == True)
    if org_filter:
        students_query = students_query.join(ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc).where(ClassRoom.maToChuc == org_filter)
    
    students_result = await db.execute(students_query)
    total_students = students_result.scalar() or 0
    
    # Count exams
    exams_query = select(func.count(Exam.maBaiKiemTra)).where(Exam.trangThai == 'published')
    if org_filter:
        # This join logic seems complex and might be incorrect if exams aren't directly linked to classes in a simple way
        # For now, let's assume a simpler join through the creator (User)
        exams_query = select(func.count(Exam.maBaiKiemTra)).join(
            User, Exam.maNguoiTao == User.maNguoiDung
        ).where(
            and_(
                Exam.trangThai == 'published',
                User.maToChuc == org_filter
            )
        )
    
    exams_result = await db.execute(exams_query)
    total_exams = exams_result.scalar() or 0
    
    # Calculate average score
    avg_score_query = select(func.avg(Result.diem))
    if org_filter:
        avg_score_query = avg_score_query.join(
            Student, Result.maHocSinh == Student.maHocSinh
        ).join(
            ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc
        ).where(ClassRoom.maToChuc == org_filter)
    
    avg_score_result = await db.execute(avg_score_query)
    average_score = avg_score_result.scalar()
    
    return {
        "classes": total_classes,
        "teachers": total_teachers,
        "students": total_students,
        "exams": total_exams,
        "averageScore": float(average_score) if average_score else None
    }

@router.get("/recent-activities")
async def get_recent_activities(
    current_user: User = Depends(check_manager_permission),
    db: AsyncSession = Depends(get_async_db),
    limit: int = 10
):
    """
    Lấy danh sách hoạt động gần đây
    """
    org_filter = None
    if current_user.vaiTro == "MANAGER":
        org_filter = current_user.maToChuc
    
    activities = []
    
    # Recent classes created
    recent_classes_query = select(
        ClassRoom.tenLop,
        ClassRoom.thoiGianTao,
        User.hoTen.label('teacher_name')
    ).outerjoin(
        User, ClassRoom.maGiaoVienChuNhiem == User.maNguoiDung
    ).where(ClassRoom.trangThai == True).order_by(ClassRoom.thoiGianTao.desc()).limit(3)
    
    if org_filter:
        recent_classes_query = recent_classes_query.where(ClassRoom.maToChuc == org_filter)
    
    recent_classes = await db.execute(recent_classes_query)
    for class_data in recent_classes.all():
        activities.append({
            "id": len(activities) + 1,
            "type": "class",
            "title": f"Lớp {class_data.tenLop}",
            "description": f"Tạo lớp học mới với GVCN: {class_data.teacher_name or 'Chưa phân công'}",
            "timestamp": class_data.thoiGianTao.strftime("%d/%m/%Y %H:%M") if class_data.thoiGianTao else "",
            "status": "success"
        })
    
    # Recent exams created
    recent_exams_query = select(
        Exam.tieuDe,
        Exam.thoiGianTao,
        User.hoTen.label('creator_name')
    ).join(
        User, Exam.maNguoiTao == User.maNguoiDung
    ).where(Exam.trangThai == 'published').order_by(Exam.thoiGianTao.desc()).limit(3)
    
    if org_filter:
        recent_exams_query = recent_exams_query.where(User.maToChuc == org_filter)
    
    recent_exams = await db.execute(recent_exams_query)
    for exam_data in recent_exams.all():
        activities.append({
            "id": len(activities) + 1,
            "type": "exam",
            "title": exam_data.tieuDe,
            "description": f"Tạo bài kiểm tra bởi {exam_data.creator_name}",
            "timestamp": exam_data.thoiGianTao.strftime("%d/%m/%Y %H:%M") if exam_data.thoiGianTao else "",
            "status": "success"
        })
    
    # Recent teachers added
    recent_teachers_query = select(
        User.hoTen,
        User.email,
        User.thoiGianTao
    ).where(
        and_(
            User.vaiTro == "TEACHER",
            User.trangThai == True
        )
    ).order_by(User.thoiGianTao.desc()).limit(2)
    
    if org_filter:
        recent_teachers_query = recent_teachers_query.where(User.maToChuc == org_filter)
    
    recent_teachers = await db.execute(recent_teachers_query)
    for teacher_data in recent_teachers.all():
        activities.append({
            "id": len(activities) + 1,
            "type": "teacher",
            "title": teacher_data.hoTen,
            "description": f"Thêm giáo viên mới: {teacher_data.email}",
            "timestamp": teacher_data.thoiGianTao.strftime("%d/%m/%Y %H:%M") if teacher_data.thoiGianTao else "",
            "status": "success"
        })
    
    # Sort by timestamp and limit
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities[:limit] 