from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, text
from typing import Dict, List, Optional
from datetime import datetime, timedelta

from app.models.organization import Organization
from app.models.class_room import ClassRoom
from app.models.user import User
from app.models.exam import Exam, AnswerSheet, Result, ExamStatistic
from app.models.student import Student

class DashboardService:
    @staticmethod
    async def admin_stats(db: AsyncSession) -> Dict:
        """Lấy thống kê tổng quan cho admin"""
        try:
            # Basic counts
            total_orgs = await db.scalar(select(func.count()).select_from(Organization))
            total_users = await db.scalar(select(func.count()).select_from(User))
            total_managers = await db.scalar(select(func.count()).select_from(User).where(User.vaiTro == "manager"))
            total_teachers = await db.scalar(select(func.count()).select_from(User).where(User.vaiTro == "teacher"))
            total_classes = await db.scalar(select(func.count()).select_from(ClassRoom))
            total_students = await db.scalar(select(func.count()).select_from(Student))
            total_exams = await db.scalar(select(func.count()).select_from(Exam))
            
            # Answer sheets processing
            total_answer_sheets = await db.scalar(select(func.count()).select_from(AnswerSheet))
            processed_sheets = await db.scalar(
                select(func.count()).select_from(AnswerSheet).where(AnswerSheet.daXuLyHoanTat == True)
            )
            
            # Score statistics
            avg_score = await db.scalar(select(func.avg(Result.diem)))
            highest_score = await db.scalar(select(func.max(Result.diem)))
            lowest_score = await db.scalar(select(func.min(Result.diem)))
            
            # Recent activity counts (last 30 days)
            thirty_days_ago = datetime.now() - timedelta(days=30)
            
            recent_users = await db.scalar(
                select(func.count()).select_from(User).where(User.thoiGianTao >= thirty_days_ago)
            )
            recent_exams = await db.scalar(
                select(func.count()).select_from(Exam).where(Exam.thoiGianTao >= thirty_days_ago)
            )
            recent_orgs = await db.scalar(
                select(func.count()).select_from(Organization).where(Organization.thoiGianTao >= thirty_days_ago)
            )
            
            # Today's activities
            today = datetime.now().date()
            today_exams = await db.scalar(
                select(func.count()).select_from(Exam).where(func.date(Exam.thoiGianTao) == today)
            )
            today_sheets = await db.scalar(
                select(func.count()).select_from(AnswerSheet).where(func.date(AnswerSheet.thoiGianQuet) == today)
            )
            
            # Active users (logged in last 30 days)
            active_users = await db.scalar(
                select(func.count()).select_from(User).where(
                    User.thoiGianDangNhapCuoi >= thirty_days_ago
                )
            )
            
            # Processing accuracy (sheets với doTinCay >= 95%)
            high_confidence_sheets = await db.scalar(
                select(func.count()).select_from(AnswerSheet).where(AnswerSheet.doTinCay >= 95.0)
            )
            accuracy_rate = (high_confidence_sheets / total_answer_sheets * 100) if total_answer_sheets > 0 else 0
            
            return {
                "totalUsers": total_users or 0,
                "totalExams": total_exams or 0,
                "totalOrganizations": total_orgs or 0,
                "totalManagers": total_managers or 0,
                "totalTeachers": total_teachers or 0,
                "totalClasses": total_classes or 0,
                "totalStudents": total_students or 0,
                "totalAnswerSheets": total_answer_sheets or 0,
                "processedSheets": processed_sheets or 0,
                "activeUsers": active_users or 0,
                "todayExams": today_exams or 0,
                "todaySheets": today_sheets or 0,
                "accuracy": round(accuracy_rate, 1),
                "averageScore": round(float(avg_score), 2) if avg_score else 0,
                "highestScore": float(highest_score) if highest_score else 0,
                "lowestScore": float(lowest_score) if lowest_score else 0,
                "trends": {
                    "users": round((recent_users / max(total_users - recent_users, 1)) * 100, 1),
                    "exams": round((recent_exams / max(total_exams - recent_exams, 1)) * 100, 1),
                    "organizations": round((recent_orgs / max(total_orgs - recent_orgs, 1)) * 100, 1),
                    "accuracy": round(accuracy_rate - 95.0, 1)  # Baseline 95%
                }
            }
        except Exception as e:
            print(f"Error in admin_stats: {e}")
            # Fallback
            return {
                "totalUsers": 0, "totalExams": 0, "totalOrganizations": 0,
                "totalManagers": 0, "totalTeachers": 0, "totalClasses": 0,
                "totalStudents": 0, "totalAnswerSheets": 0, "processedSheets": 0,
                "activeUsers": 0, "todayExams": 0, "todaySheets": 0,
                "accuracy": 0, "averageScore": 0, "highestScore": 0, "lowestScore": 0,
                "trends": {"users": 0, "exams": 0, "organizations": 0, "accuracy": 0}
            }

    @staticmethod
    async def get_recent_activities(db: AsyncSession, limit: int = 10) -> List[Dict]:
        """Lấy hoạt động gần đây của hệ thống"""
        try:
            activities = []
            
            # Recent exams
            recent_exams = await db.execute(
                select(Exam.tieuDe, Exam.thoiGianTao, User.hoTen.label('nguoiTao'))
                .join(User, Exam.maNguoiTao == User.maNguoiDung)
                .order_by(desc(Exam.thoiGianTao))
                .limit(3)
            )
            
            for exam in recent_exams:
                time_diff = datetime.now() - exam.thoiGianTao
                if time_diff.days == 0:
                    timestamp = f"{time_diff.seconds // 3600} giờ trước"
                else:
                    timestamp = f"{time_diff.days} ngày trước"
                    
                activities.append({
                    "id": f"exam_{exam.thoiGianTao.timestamp()}",
                    "type": "exam",
                    "action": f"Tạo bài thi: '{exam.tieuDe}'",
                    "user": exam.nguoiTao,
                    "timestamp": timestamp,
                    "status": "success"
                })
            
            # Recent users
            recent_users = await db.execute(
                select(User.hoTen, User.vaiTro, User.thoiGianTao)
                .order_by(desc(User.thoiGianTao))
                .limit(3)
            )
            
            for user in recent_users:
                time_diff = datetime.now() - user.thoiGianTao
                timestamp = f"{time_diff.days} ngày trước" if time_diff.days > 0 else f"{time_diff.seconds // 3600} giờ trước"
                
                activities.append({
                    "id": f"user_{user.thoiGianTao.timestamp()}",
                    "type": "user", 
                    "action": f"Đăng ký tài khoản {user.vaiTro.lower()}",
                    "user": user.hoTen,
                    "timestamp": timestamp,
                    "status": "success"
                })
            
            # Recent organizations
            recent_orgs = await db.execute(
                select(Organization.tenToChuc, Organization.thoiGianTao)
                .order_by(desc(Organization.thoiGianTao))
                .limit(2)
            )
            
            for org in recent_orgs:
                time_diff = datetime.now() - org.thoiGianTao
                timestamp = f"{time_diff.days} ngày trước" if time_diff.days > 0 else f"{time_diff.seconds // 3600} giờ trước"
                
                activities.append({
                    "id": f"org_{org.thoiGianTao.timestamp()}",
                    "type": "organization",
                    "action": f"Đăng ký tổ chức: '{org.tenToChuc}'",
                    "user": "Admin",
                    "timestamp": timestamp,
                    "status": "success"
                })
            
            # Sort by timestamp and limit
            activities.sort(key=lambda x: x["timestamp"])
            return activities[:limit]
            
        except Exception as e:
            print(f"Error in get_recent_activities: {e}")
            return []

    @staticmethod
    async def manager_stats(db: AsyncSession, org_id: int) -> Dict:
        """Enhanced manager stats với chi tiết hơn"""
        try:
            classes = await db.scalar(select(func.count()).select_from(ClassRoom).where(ClassRoom.maToChuc == org_id))
            teachers = await db.scalar(select(func.count()).select_from(User).where(User.maToChuc == org_id, User.vaiTro == "teacher"))
            exams = await db.scalar(select(func.count()).select_from(Exam).where(Exam.maToChuc == org_id))
            students = await db.scalar(
                select(func.count()).select_from(Student).join(ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc).where(ClassRoom.maToChuc == org_id)
            )
            avg_score = await db.scalar(
                select(func.avg(Result.diem)).join(Exam, Result.maBaiKiemTra == Exam.maBaiKiemTra).where(Exam.maToChuc == org_id)
            )
            
            return {
                "classes": classes or 0,
                "teachers": teachers or 0,
                "exams": exams or 0,
                "students": students or 0,
                "averageScore": round(float(avg_score), 2) if avg_score else 0,
            }
        except Exception as e:
            print(f"Error in manager_stats: {e}")
            return {"classes": 0, "teachers": 0, "exams": 0, "students": 0, "averageScore": 0}

    @staticmethod
    async def teacher_stats(db: AsyncSession, teacher_id: int) -> Dict:
        """Enhanced teacher stats"""
        try:
            classes = await db.scalar(select(func.count()).select_from(ClassRoom).where(ClassRoom.maGiaoVienChuNhiem == teacher_id))
            exams = await db.scalar(select(func.count()).select_from(Exam).where(Exam.maNguoiTao == teacher_id))
            answer_sheets = await db.scalar(select(func.count()).select_from(Result).where(Result.maBaiKiemTra.in_(
                select(Exam.maBaiKiemTra).where(Exam.maNguoiTao == teacher_id)
            )))
            avg_score = await db.scalar(
                select(func.avg(Result.diem)).join(Exam, Result.maBaiKiemTra == Exam.maBaiKiemTra).where(Exam.maNguoiTao == teacher_id)
            )
            
            return {
                "classes": classes or 0,
                "exams": exams or 0,
                "answerSheets": answer_sheets or 0,
                "averageScore": round(float(avg_score), 2) if avg_score else 0,
            }
        except Exception as e:
            print(f"Error in teacher_stats: {e}")
            return {"classes": 0, "exams": 0, "answerSheets": 0, "averageScore": 0}

