from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from fastapi import HTTPException, status
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.models.exam import Exam, ExamClassRoom, Answer, Result, ExamStatistic
from app.models.class_room import ClassRoom
from app.models.student import Student
from app.schemas.exam import ExamCreate, ExamUpdate, ExamOut

class ExamService:
    @staticmethod
    async def get_list(
        db: AsyncSession, 
        maToChuc: Optional[int] = None, 
        maNguoiTao: Optional[int] = None,
        maLopHoc: Optional[int] = None,
        trangThai: Optional[str] = None,
        skip: int = 0,
        limit: int = 1000
    ) -> List[ExamOut]:
        stmt = select(Exam)
        if maToChuc:
            stmt = stmt.where(Exam.maToChuc == maToChuc)
        if maNguoiTao:
            stmt = stmt.where(Exam.maNguoiTao == maNguoiTao)
        if trangThai:
            stmt = stmt.where(Exam.trangThai == trangThai)
        if maLopHoc:
            stmt = stmt.join(ExamClassRoom, Exam.maBaiKiemTra == ExamClassRoom.maBaiKiemTra).where(
                ExamClassRoom.maLopHoc == maLopHoc
            )
        
        stmt = stmt.offset(skip).limit(limit)
        
        result = await db.execute(stmt)
        exams = result.scalars().all()
        return exams

    @staticmethod
    async def get_exam(db: AsyncSession, exam_id: int) -> Exam:
        result = await db.execute(select(Exam).where(Exam.maBaiKiemTra == exam_id))
        exam = result.scalars().first()
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bài kiểm tra không tồn tại")
        return exam

    @staticmethod
    async def create_exam(db: AsyncSession, exam_in: ExamCreate) -> Exam:
        new_exam = Exam(**exam_in.dict())
        db.add(new_exam)
        await db.commit()
        await db.refresh(new_exam)
        return new_exam

    @staticmethod
    async def update_exam(db: AsyncSession, exam_id: int, exam_update: ExamUpdate) -> Exam:
        exam = await ExamService.get_exam(db, exam_id)
        for attr, value in exam_update.dict(exclude_unset=True).items():
            setattr(exam, attr, value)
        exam.thoiGianCapNhat = datetime.utcnow()
        await db.commit()
        await db.refresh(exam)
        return exam

    @staticmethod
    async def delete_exam(db: AsyncSession, exam_id: int) -> None:
        exam = await ExamService.get_exam(db, exam_id)
        await db.delete(exam)
        await db.commit()

    # ========== NEW METHODS ==========
    
    @staticmethod
    async def assign_to_classes(db: AsyncSession, exam_id: int, class_ids: List[int]) -> List[Dict]:
        """Gán bài kiểm tra cho các lớp học"""
        # Kiểm tra exam tồn tại
        await ExamService.get_exam(db, exam_id)
        
        # Xóa các assignment cũ
        await db.execute(
            select(ExamClassRoom).where(ExamClassRoom.maBaiKiemTra == exam_id)
        )
        
        # Tạo assignment mới
        assigned_classes = []
        for class_id in class_ids:
            # Kiểm tra class tồn tại
            class_result = await db.execute(select(ClassRoom).where(ClassRoom.maLopHoc == class_id))
            class_obj = class_result.scalars().first()
            if not class_obj:
                continue
                
            exam_class = ExamClassRoom(
                maBaiKiemTra=exam_id,
                maLopHoc=class_id
            )
            db.add(exam_class)
            assigned_classes.append({
                "class_id": class_id,
                "class_name": class_obj.tenLop
            })
        
        await db.commit()
        return assigned_classes

    @staticmethod
    async def get_assigned_classes(db: AsyncSession, exam_id: int) -> List[Dict]:
        """Lấy danh sách lớp đã được gán bài kiểm tra"""
        stmt = select(ClassRoom).join(ExamClassRoom).where(
            ExamClassRoom.maBaiKiemTra == exam_id
        )
        result = await db.execute(stmt)
        classes = result.scalars().all()
        
        return [
            {
                "class_id": cls.maLopHoc,
                "class_name": cls.tenLop,
                "grade": cls.capHoc,
                "school_year": cls.namHoc
            }
            for cls in classes
        ]

    @staticmethod
    async def create_or_update_answers(db: AsyncSession, exam_id: int, answers_data: Dict) -> Answer:
        """Tạo hoặc cập nhật đáp án cho bài kiểm tra"""
        # Kiểm tra exam tồn tại
        await ExamService.get_exam(db, exam_id)
        
        # Kiểm tra đáp án đã tồn tại chưa
        result = await db.execute(select(Answer).where(Answer.maBaiKiemTra == exam_id))
        existing_answer = result.scalars().first()
        
        if existing_answer:
            # Cập nhật đáp án hiện có
            existing_answer.dapAnJson = answers_data.get("answers", {})
            existing_answer.diemMoiCauJson = answers_data.get("scores", {})
            existing_answer.thoiGianCapNhat = datetime.utcnow()
            await db.commit()
            await db.refresh(existing_answer)
            return existing_answer
        else:
            # Tạo đáp án mới
            new_answer = Answer(
                maBaiKiemTra=exam_id,
                dapAnJson=answers_data.get("answers", {}),
                diemMoiCauJson=answers_data.get("scores", {})
            )
            db.add(new_answer)
            await db.commit()
            await db.refresh(new_answer)
            return new_answer

    @staticmethod
    async def get_exam_answers(db: AsyncSession, exam_id: int) -> Optional[Answer]:
        """Lấy đáp án của bài kiểm tra"""
        result = await db.execute(select(Answer).where(Answer.maBaiKiemTra == exam_id))
        return result.scalars().first()

    @staticmethod
    async def get_exam_statistics(db: AsyncSession, exam_id: int, class_id: Optional[int] = None) -> Dict[str, Any]:
        """Lấy thống kê kết quả bài kiểm tra"""
        # Base query cho results
        stmt = select(Result).where(Result.maBaiKiemTra == exam_id)
        if class_id:
            stmt = stmt.join(Student).where(Student.maLopHoc == class_id)
        
        result = await db.execute(stmt)
        results = result.scalars().all()
        
        if not results:
            return {
                "total_students": 0,
                "average_score": 0,
                "highest_score": 0,
                "lowest_score": 0,
                "pass_rate": 0,
                "score_distribution": {}
            }
        
        scores = [r.diem for r in results]
        
        return {
            "total_students": len(results),
            "average_score": sum(scores) / len(scores),
            "highest_score": max(scores),
            "lowest_score": min(scores),
            "pass_rate": len([s for s in scores if s >= 5.0]) / len(scores) * 100,
            "score_distribution": ExamService._calculate_score_distribution(scores)
        }

    @staticmethod
    async def get_exam_results(db: AsyncSession, exam_id: int, class_id: Optional[int] = None) -> List[Dict]:
        """Lấy kết quả chi tiết của bài kiểm tra"""
        stmt = select(Result, Student).join(Student, Result.maHocSinh == Student.maHocSinh).where(
            Result.maBaiKiemTra == exam_id
        )
        if class_id:
            stmt = stmt.where(Student.maLopHoc == class_id)
        
        result = await db.execute(stmt)
        results = result.all()
        
        return [
            {
                "student_id": student.maHocSinh,
                "student_name": student.hoTen,
                "student_code": student.maHocSinhTruong,
                "score": result_obj.diem,
                "correct_answers": result_obj.soCauDung,
                "wrong_answers": result_obj.soCauSai,
                "blank_answers": result_obj.soCauChuaTraLoi,
                "rank": result_obj.thuHangTrongLop,
                "details": result_obj.chiTietJSON
            }
            for result_obj, student in results
        ]

    @staticmethod
    def _calculate_score_distribution(scores: List[float]) -> Dict[str, int]:
        """Tính phân bố điểm số"""
        distribution = {
            "0-2": 0, "2-4": 0, "4-6": 0, "6-8": 0, "8-10": 0
        }
        
        for score in scores:
            if score < 2:
                distribution["0-2"] += 1
            elif score < 4:
                distribution["2-4"] += 1
            elif score < 6:
                distribution["4-6"] += 1
            elif score < 8:
                distribution["6-8"] += 1
            else:
                distribution["8-10"] += 1
        
        return distribution

