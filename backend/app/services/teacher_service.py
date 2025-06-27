from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta

from app.models import User, ClassRoom, Exam, Result as ExamResult, Student

class TeacherService:
    @staticmethod
    async def get_dashboard_data(db: AsyncSession, teacher_id: int):
        """
        Lấy dữ liệu tổng quan cho dashboard của giáo viên.
        """

        # 1. Thống kê tổng quan (Quick Stats)
        # Tổng số học sinh mà giáo viên này dạy
        stmt_total_students = select(func.count(Student.maHocSinh)).join(ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc).where(ClassRoom.maGiaoVienChuNhiem == teacher_id)
        total_students = (await db.execute(stmt_total_students)).scalar_one_or_none() or 0
        
        # Tổng số bài thi trong tháng này
        start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        stmt_exams_this_month = select(func.count(Exam.maBaiKiemTra)).where(
            and_(Exam.maNguoiTao == teacher_id, Exam.thoiGianTao >= start_of_month)
        )
        total_exams_this_month = (await db.execute(stmt_exams_this_month)).scalar_one_or_none() or 0

        # Điểm trung bình tất cả các bài thi
        stmt_avg_score = select(func.avg(ExamResult.diem)).where(Exam.maNguoiTao == teacher_id, ExamResult.maBaiKiemTra == Exam.maBaiKiemTra)
        average_score_all_time = (await db.execute(stmt_avg_score)).scalar_one_or_none() or 0

        # 2. Hoạt động gần đây (Lấy 5 bài thi được tạo gần nhất)
        stmt_recent_exams = select(Exam).where(Exam.maNguoiTao == teacher_id).order_by(Exam.thoiGianTao.desc()).limit(5)
        recent_exams_results = await db.execute(stmt_recent_exams)
        recent_activities = [
            {
                "id": str(exam.maBaiKiemTra),
                "type": "exam",
                "title": f"Tạo bài thi: {exam.tieuDe}",
                "description": f"Môn: {exam.monHoc}",
                "timestamp": exam.thoiGianTao.isoformat(),
                "status": "success"
            } for exam in recent_exams_results.scalars().all()
        ]

        # 3. Bài thi sắp tới (Lấy 3 bài thi có ngày thi trong tương lai gần nhất)
        stmt_upcoming_exams = select(Exam).where(
            and_(Exam.maNguoiTao == teacher_id, Exam.ngayThi >= datetime.now().date())
        ).order_by(Exam.ngayThi.asc()).limit(3)
        upcoming_exams_results = await db.execute(stmt_upcoming_exams)
        upcoming_exams = [
            {
              "id": str(exam.maBaiKiemTra),
              "title": exam.tieuDe,
              "subject": exam.monHoc,
              "date": exam.ngayThi.isoformat() if exam.ngayThi else "N/A",
              "class_name": "N/A", # Cần logic để lấy tên lớp
              "students_count": 0 # Cần logic để lấy sĩ số
            } for exam in upcoming_exams_results.scalars().all()
        ]

        # 4. Dữ liệu biểu đồ (Lấy điểm trung bình 6 tháng gần nhất)
        performance_data = []
        for i in range(6):
            month_date = datetime.now() - timedelta(days=i*30)
            start_month = month_date.replace(day=1)
            end_month = (start_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            stmt_perf = select(func.avg(ExamResult.diem)).where(
                and_(
                    Exam.maNguoiTao == teacher_id,
                    ExamResult.maBaiKiemTra == Exam.maBaiKiemTra,
                    Exam.thoiGianTao >= start_month,
                    Exam.thoiGianTao <= end_month
                )
            )
            avg_score_month = (await db.execute(stmt_perf)).scalar_one_or_none() or 0
            performance_data.append({"month": f"T{month_date.month}", "score": avg_score_month})
        
        performance_data.reverse()

        return {
            "stats": {
                "totalStudents": total_students,
                "studentGrowth": 0, # Tạm thời
                "totalExamsThisMonth": total_exams_this_month,
                "examGrowth": 0, # Tạm thời
                "averageScore": average_score_all_time,
                "scoreChange": 0, # Tạm thời
                "aiAccuracy": 99.1 # Giả
            },
            "activities": recent_activities,
            "upcomingExams": upcoming_exams,
            "performanceData": performance_data,
        } 