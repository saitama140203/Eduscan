#!/usr/bin/env python3
"""
Debug script để kiểm tra dữ liệu học sinh và SBD matching
"""
import asyncio
import sys
import os
sys.path.append('/root/projects/Eduscan/backend')

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, and_
from app.models.student import Student
from app.models.class_room import ClassRoom
from app.models.exam import ExamClassRoom
from app.core.config import settings

# Tạo database connection
engine = create_async_engine(settings.DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def debug_sbd_matching(exam_id: int, sbd: str):
    """
    Debug SBD matching cho exam cụ thể
    """
    async with async_session() as db:
        print(f"\n=== DEBUG SBD MATCHING ===")
        print(f"Exam ID: {exam_id}")
        print(f"SBD cần tìm: {sbd}")
        print(f"Độ dài SBD: {len(sbd)}")
        
        # 1. Lấy tất cả học sinh trong exam
        stmt = select(Student, ClassRoom.tenLop).join(
            ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc
        ).join(
            ExamClassRoom, ClassRoom.maLopHoc == ExamClassRoom.maLopHoc
        ).where(
            and_(
                ExamClassRoom.maBaiKiemTra == exam_id,
                Student.trangThai == True
            )
        )
        
        result = await db.execute(stmt)
        students_in_exam = result.all()
        
        print(f"\n=== DANH SÁCH HỌC SINH TRONG BÀI THI ===")
        print(f"Tổng số học sinh: {len(students_in_exam)}")
        
        for student, class_name in students_in_exam:
            ma_hoc_sinh = student.maHocSinhTruong or ""
            last_6 = ma_hoc_sinh[-6:] if len(ma_hoc_sinh) >= 6 else ma_hoc_sinh
            
            print(f"- {student.hoTen}")
            print(f"  Mã HS: {ma_hoc_sinh}")
            print(f"  6 số cuối: {last_6}")
            print(f"  Lớp: {class_name}")
            print(f"  Match với SBD {sbd}: {last_6 == sbd}")
            print()
        
        # 2. Thử tìm với LIKE pattern
        print(f"\n=== TÌM KIẾM VỚI LIKE PATTERN ===")
        like_stmt = select(Student).join(
            ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc
        ).join(
            ExamClassRoom, ClassRoom.maLopHoc == ExamClassRoom.maLopHoc
        ).where(
            and_(
                ExamClassRoom.maBaiKiemTra == exam_id,
                Student.maHocSinhTruong.like(f"%{sbd}"),
                Student.trangThai == True
            )
        )
        
        like_result = await db.execute(like_stmt)
        like_students = like_result.scalars().all()
        
        print(f"Tìm thấy {len(like_students)} học sinh với LIKE pattern '%{sbd}':")
        for student in like_students:
            print(f"- {student.hoTen}: {student.maHocSinhTruong}")
        
        # 3. Kiểm tra tất cả SBD có thể
        print(f"\n=== TẤT CẢ SBD CÓ THỂ TRONG BÀI THI ===")
        all_sbds = {}
        for student, class_name in students_in_exam:
            ma_hoc_sinh = student.maHocSinhTruong or ""
            if len(ma_hoc_sinh) >= 6:
                sbd_generated = ma_hoc_sinh[-6:]
                if sbd_generated not in all_sbds:
                    all_sbds[sbd_generated] = []
                all_sbds[sbd_generated].append(student.hoTen)
        
        print(f"Danh sách tất cả SBD trong bài thi:")
        for generated_sbd, names in all_sbds.items():
            print(f"- SBD {generated_sbd}: {', '.join(names)}")
        
        # 4. Kiểm tra có SBD nào gần giống không
        print(f"\n=== SBD TƯƠNG TỰ ===")
        similar_sbds = []
        for generated_sbd in all_sbds.keys():
            if sbd in generated_sbd or generated_sbd in sbd:
                similar_sbds.append(generated_sbd)
        
        if similar_sbds:
            print(f"Tìm thấy SBD tương tự: {similar_sbds}")
        else:
            print("Không tìm thấy SBD tương tự")

async def main():
    if len(sys.argv) != 3:
        print("Usage: python debug_sbd.py <exam_id> <sbd>")
        print("Example: python debug_sbd.py 1 131313")
        sys.exit(1)
    
    exam_id = int(sys.argv[1])
    sbd = sys.argv[2]
    
    await debug_sbd_matching(exam_id, sbd)

if __name__ == "__main__":
    asyncio.run(main()) 