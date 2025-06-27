from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc, text, String
from sqlalchemy.orm import joinedload, selectinload
from app.models.class_room import ClassRoom
from app.models.user import User
from app.models.student import Student
from app.models.organization import Organization
from app.models.exam import Exam, ExamClassRoom, Result
from app.schemas.class_student import ClassCreate, ClassUpdate, ClassOut, ClassDetail
from fastapi import HTTPException, status
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import pandas as pd
from io import BytesIO
import json
import logging

class ClassService:
    @staticmethod
    async def get_list(
        db: AsyncSession, 
        maToChuc: int = None, 
        maGiaoVien: int = None, 
        search: str = None, 
        skip: int = 0, 
        limit: int = 100,
        sort_by: str = "tenLop",
        sort_order: str = "asc",
        filters: Dict[str, Any] = None
    ):
        """Enhanced get_list with advanced filtering and sorting"""
        # Subquery để count students cho mỗi class
        student_count_subq = (
            select(
                Student.maLopHoc, 
                func.count(Student.maHocSinh).label('total_students')
            )
            .where(Student.trangThai == True)
            .group_by(Student.maLopHoc)
            .subquery()
        )
        
        # Subquery để count exams thông qua ExamClassRoom
        exam_count_subq = (
            select(
                ExamClassRoom.maLopHoc,
                func.count(ExamClassRoom.maBaiKiemTra).label('total_exams')
            )
            .join(Exam, ExamClassRoom.maBaiKiemTra == Exam.maBaiKiemTra)
            .where(Exam.trangThai.in_(['nhap', 'xuatBan', 'dongDaChAm']))
            .group_by(ExamClassRoom.maLopHoc)
            .subquery()
        )
        
        # Main query với left join để có cả classes không có students/exams
        stmt = (
            select(
                ClassRoom,
                func.coalesce(student_count_subq.c.total_students, 0).label('total_students'),
                func.coalesce(exam_count_subq.c.total_exams, 0).label('total_exams')
            )
            .outerjoin(student_count_subq, ClassRoom.maLopHoc == student_count_subq.c.maLopHoc)
            .outerjoin(exam_count_subq, ClassRoom.maLopHoc == exam_count_subq.c.maLopHoc)
            .where(ClassRoom.trangThai == True)
        )
        
        # Apply filters
        if maToChuc:
            stmt = stmt.where(ClassRoom.maToChuc == maToChuc)
        if maGiaoVien:
            stmt = stmt.where(ClassRoom.maGiaoVienChuNhiem == maGiaoVien)
        if search:
            stmt = stmt.where(
                or_(
                    ClassRoom.tenLop.ilike(f"%{search}%"),
                    ClassRoom.moTa.ilike(f"%{search}%")
                )
            )
            
        # Advanced filters
        if filters:
            if filters.get('capHoc'):
                stmt = stmt.where(ClassRoom.capHoc == filters['capHoc'])
            if filters.get('namHoc'):
                stmt = stmt.where(ClassRoom.namHoc == filters['namHoc'])
            if filters.get('trangThai') is not None:
                stmt = stmt.where(ClassRoom.trangThai == filters['trangThai'])
            if filters.get('dateFrom'):
                stmt = stmt.where(ClassRoom.thoiGianTao >= filters['dateFrom'])
            if filters.get('dateTo'):
                stmt = stmt.where(ClassRoom.thoiGianTao <= filters['dateTo'])
            if filters.get('minStudents'):
                stmt = stmt.having(func.coalesce(student_count_subq.c.total_students, 0) >= filters['minStudents'])
            if filters.get('maxStudents'):
                stmt = stmt.having(func.coalesce(student_count_subq.c.total_students, 0) <= filters['maxStudents'])
        
        # Apply sorting
        sort_column = getattr(ClassRoom, sort_by, ClassRoom.tenLop)
        if sort_order.lower() == "desc":
            stmt = stmt.order_by(desc(sort_column))
        else:
            stmt = stmt.order_by(asc(sort_column))
            
        stmt = stmt.offset(skip).limit(limit)
        stmt = stmt.options(
            joinedload(ClassRoom.giaoVienChuNhiem),
            joinedload(ClassRoom.toChuc)
        )

        result = await db.execute(stmt)
        rows = result.all()

        out_list = []
        for row in rows:
            class_obj = row[0]  # ClassRoom object
            total_students = row[1]  # student count
            total_exams = row[2]  # exam count
            
            tenGiaoVien = class_obj.giaoVienChuNhiem.hoTen if class_obj.giaoVienChuNhiem else None
            tenToChuc = class_obj.toChuc.tenToChuc if class_obj.toChuc else None
            
            out = ClassOut(
                **class_obj.__dict__,
                tenGiaoVienChuNhiem=tenGiaoVien,
                tenToChuc=tenToChuc,
                total_students=total_students,
                total_exams=total_exams
            )
            out_list.append(out)
        return out_list

    @staticmethod
    async def get_class_detail(db: AsyncSession, class_id: int):
        """Enhanced class detail with comprehensive stats"""
        # Count students for this specific class
        student_count_stmt = (
            select(func.count(Student.maHocSinh))
            .where(Student.maLopHoc == class_id, Student.trangThai == True)
        )
        student_count_result = await db.execute(student_count_stmt)
        total_students = student_count_result.scalar() or 0
        
        # Count exams thông qua ExamClassRoom
        exam_count_stmt = (
            select(func.count(ExamClassRoom.maBaiKiemTra))
            .join(Exam, ExamClassRoom.maBaiKiemTra == Exam.maBaiKiemTra)
            .where(
                ExamClassRoom.maLopHoc == class_id, 
                Exam.trangThai.in_(['nhap', 'xuatBan', 'dongDaChAm'])
            )
        )
        exam_count_result = await db.execute(exam_count_stmt)
        total_exams = exam_count_result.scalar() or 0
        
        # Get average score thông qua ExamClassRoom
        avg_score_stmt = (
            select(func.avg(Result.diem))
            .join(Exam, Result.maBaiKiemTra == Exam.maBaiKiemTra)
            .join(ExamClassRoom, Exam.maBaiKiemTra == ExamClassRoom.maBaiKiemTra)
            .where(ExamClassRoom.maLopHoc == class_id)
        )
        avg_score_result = await db.execute(avg_score_stmt)
        avg_score = avg_score_result.scalar() or 0
        
        stmt = select(ClassRoom).where(ClassRoom.maLopHoc == class_id)
        stmt = stmt.options(
            joinedload(ClassRoom.giaoVienChuNhiem),
            joinedload(ClassRoom.toChuc)
        )
        result = await db.execute(stmt)
        c = result.scalars().first()
        if not c:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lớp học không tồn tại."
            )
        tenGiaoVien = c.giaoVienChuNhiem.hoTen if c.giaoVienChuNhiem else None
        tenToChuc = c.toChuc.tenToChuc if c.toChuc else None
        
        out = ClassDetail(
            **c.__dict__,
            tenGiaoVienChuNhiem=tenGiaoVien,
            tenToChuc=tenToChuc,
            total_students=total_students,
            total_exams=total_exams,
            average_score=round(float(avg_score), 2) if avg_score else 0
        )
        return out

    @staticmethod
    async def create_class(db: AsyncSession, class_create: ClassCreate):
        """Enhanced create with validation and auto-generation"""
        stmt = select(ClassRoom).where(
            ClassRoom.maToChuc == class_create.maToChuc,
            ClassRoom.tenLop == class_create.tenLop,
            ClassRoom.namHoc == class_create.namHoc,
            ClassRoom.trangThai == True
        )
        result = await db.execute(stmt)
        exists = result.scalars().first()
        if exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, 
                detail="Lớp học đã tồn tại trong tổ chức và năm học này."
            )
        
        # Create new class with auto-increment maLopHoc
        class_data = class_create.dict()  # Get all data from pydantic model
        new_class = ClassRoom(**class_data)
        db.add(new_class)
        await db.commit()
        await db.refresh(new_class)
        return new_class

    @staticmethod
    async def update_class(db: AsyncSession, maLopHoc: int, class_update: ClassUpdate):
        stmt = select(ClassRoom).where(
            ClassRoom.maLopHoc == maLopHoc,
            ClassRoom.trangThai == True
        )
        result = await db.execute(stmt)
        db_class = result.scalars().first()
        if not db_class:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lớp học không tồn tại hoặc đã bị khóa."
            )
        for attr, value in class_update.dict(exclude_unset=True).items():
            setattr(db_class, attr, value)
        await db.commit()
        await db.refresh(db_class)
        return db_class

    @staticmethod
    async def delete_class(db: AsyncSession, maLopHoc: int):
        stmt = select(ClassRoom).where(
            ClassRoom.maLopHoc == maLopHoc,
            ClassRoom.trangThai == True
        )
        result = await db.execute(stmt)
        db_class = result.scalars().first()
        if not db_class:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lớp học không tồn tại hoặc đã bị khóa."
            )
        db_class.trangThai = False  # Xóa mềm
        await db.commit()
        return db_class

    # NEW ADVANCED METHODS FOR ADMIN

    @staticmethod
    async def bulk_operations(db: AsyncSession, operation: str, class_ids: List[int], data: Dict[str, Any] = None):
        """Bulk operations for multiple classes"""
        if not class_ids:
            raise HTTPException(status_code=400, detail="Danh sách lớp học không được để trống")
            
        stmt = select(ClassRoom).where(
            ClassRoom.maLopHoc.in_(class_ids),
            ClassRoom.trangThai == True
        )
        result = await db.execute(stmt)
        classes = result.scalars().all()
        
        if len(classes) != len(class_ids):
            raise HTTPException(status_code=404, detail="Một số lớp học không tồn tại")
        
        updated_count = 0
        
        if operation == "delete":
            for cls in classes:
                cls.trangThai = False               
                updated_count += 1
                
        elif operation == "update_teacher":
            teacher_id = data.get("teacher_id")
            if not teacher_id:
                raise HTTPException(status_code=400, detail="ID giáo viên không được để trống")
            for cls in classes:
                cls.maGiaoVienChuNhiem = teacher_id                
                updated_count += 1
                
        elif operation == "update_status":
            status_value = data.get("status")
            if status_value is None:
                raise HTTPException(status_code=400, detail="Trạng thái không được để trống")
            for cls in classes:
                cls.trangThai = status_value                
                updated_count += 1
                
        elif operation == "move_organization":
            org_id = data.get("organization_id")
            if not org_id:
                raise HTTPException(status_code=400, detail="ID tổ chức không được để trống")
            for cls in classes:
                cls.maToChuc = org_id                
                updated_count += 1
        
        await db.commit()
        return {"updated_count": updated_count, "message": f"Đã cập nhật {updated_count} lớp học"}

    @staticmethod
    async def get_class_analytics(db: AsyncSession, class_id: int = None, period: str = "all"):
        """Advanced analytics for classes"""
        base_query = select(ClassRoom).where(ClassRoom.trangThai == True)
        
        if class_id:
            base_query = base_query.where(ClassRoom.maLopHoc == class_id)
            
        # Date filtering
        if period != "all":
            date_filter = datetime.now()
            if period == "week":
                date_filter = date_filter - timedelta(days=7)
            elif period == "month":
                date_filter = date_filter - timedelta(days=30)
            elif period == "semester":
                date_filter = date_filter - timedelta(days=180)
            base_query = base_query.where(ClassRoom.thoiGianTao >= date_filter)
        
        result = await db.execute(base_query)
        classes = result.scalars().all()
        
        # Calculate analytics
        total_classes = len(classes)
        active_classes = len([c for c in classes if c.trangThai])
        
        # Student statistics
        student_stmt = (
            select(
                func.count(Student.maHocSinh).label('total_students'),
                func.avg(func.count(Student.maHocSinh)).over().label('avg_students_per_class')
            )
            .join(ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc)
            .where(Student.trangThai == True, ClassRoom.trangThai == True)
        )
        
        if class_id:
            student_stmt = student_stmt.where(ClassRoom.maLopHoc == class_id)
            
        student_result = await db.execute(student_stmt)
        student_stats = student_result.first()
        
        # Grade distribution
        grade_stmt = (
            select(
                ClassRoom.capHoc,
                func.count(ClassRoom.maLopHoc).label('count')
            )
            .where(ClassRoom.trangThai == True)
            .group_by(ClassRoom.capHoc)
        )
        
        if class_id:
            grade_stmt = grade_stmt.where(ClassRoom.maLopHoc == class_id)
            
        grade_result = await db.execute(grade_stmt)
        grade_distribution = {row.capHoc: row.count for row in grade_result}
        
        return {
            "total_classes": total_classes,
            "active_classes": active_classes,
            "total_students": student_stats.total_students if student_stats else 0,
            "avg_students_per_class": round(float(student_stats.avg_students_per_class), 2) if student_stats and student_stats.avg_students_per_class else 0,
            "grade_distribution": grade_distribution,
            "activity_rate": round((active_classes / total_classes * 100), 2) if total_classes > 0 else 0
        }

    @staticmethod
    async def export_classes_excel(db: AsyncSession, filters: Dict[str, Any] = None):
        """Export classes to Excel with comprehensive data"""
        classes = await ClassService.get_list(db, filters=filters, limit=10000)
        
        # Prepare data for Excel
        data = []
        for cls in classes:
            data.append({
                "Mã lớp": cls.maLopHoc,
                "Tên lớp": cls.tenLop,
                "Cấp học": cls.capHoc,
                "Năm học": cls.namHoc,
                "Tổ chức": cls.tenToChuc,
                "GVCN": cls.tenGiaoVienChuNhiem,
                "Số học sinh": cls.total_students,
                "Số bài kiểm tra": getattr(cls, 'total_exams', 0),
                "Trạng thái": "Hoạt động" if cls.trangThai else "Đã đóng",
                "Ngày tạo": cls.thoiGianTao.strftime("%d/%m/%Y") if cls.thoiGianTao else "",
                "Mô tả": cls.moTa or ""
            })
        
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Danh sách lớp học', index=False)
            
            # Format the worksheet
            worksheet = writer.sheets['Danh sách lớp học']
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width
        
        output.seek(0)
        return output

    @staticmethod
    async def import_classes_excel(db: AsyncSession, file_content: bytes, organization_id: int):
        """Import classes from Excel file"""
        try:
            df = pd.read_excel(BytesIO(file_content))
            
            required_columns = ['Tên lớp', 'Cấp học', 'Năm học']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Thiếu các cột bắt buộc: {', '.join(missing_columns)}"
                )
            
            created_classes = []
            errors = []
            
            for index, row in df.iterrows():
                try:
                    class_data = ClassCreate(
                        tenLop=row['Tên lớp'],
                        capHoc=row['Cấp học'],
                        namHoc=row['Năm học'],
                        maToChuc=organization_id,
                        moTa=row.get('Mô tả', ''),
                        maGiaoVienChuNhiem=row.get('Mã GVCN', None)
                    )
                    
                    new_class = await ClassService.create_class(db, class_data)
                    created_classes.append(new_class)
                    
                except Exception as e:
                    errors.append(f"Dòng {index + 2}: {str(e)}")
            
            return {
                "created_count": len(created_classes),
                "error_count": len(errors),
                "errors": errors[:10]  # Limit to first 10 errors
            }
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Lỗi xử lý file Excel: {str(e)}")

    @staticmethod
    async def create_class_template(db: AsyncSession, template_data: Dict[str, Any]):
        """Create class template for bulk creation"""
        template = {
            "name": template_data.get("name"),
            "description": template_data.get("description"),
            "settings": {
                "capHoc": template_data.get("capHoc"),
                "namHoc": template_data.get("namHoc"),
                "maxStudents": template_data.get("maxStudents", 40),
                "autoAssignTeacher": template_data.get("autoAssignTeacher", False),
                "defaultSettings": template_data.get("defaultSettings", {})
            },
            "created_at": datetime.now().isoformat()
        }
        
        # Store template in database or cache (implement based on your needs)
        return template

    @staticmethod
    async def get_dashboard_stats(db: AsyncSession, organization_id: int = None):
        """Get comprehensive dashboard statistics for admin"""
        base_filter = ClassRoom.trangThai == True
        if organization_id:
            base_filter = and_(base_filter, ClassRoom.maToChuc == organization_id)
        
        # Total classes
        total_classes_stmt = select(func.count(ClassRoom.maLopHoc)).where(base_filter)
        total_classes_result = await db.execute(total_classes_stmt)
        total_classes = total_classes_result.scalar() or 0
        
        # Active classes
        active_classes_stmt = select(func.count(ClassRoom.maLopHoc)).where(
            and_(base_filter, ClassRoom.trangThai == True)
        )
        active_classes_result = await db.execute(active_classes_stmt)
        active_classes = active_classes_result.scalar() or 0
        
        # Total students
        student_stmt = (
            select(func.count(Student.maHocSinh))
            .join(ClassRoom, Student.maLopHoc == ClassRoom.maLopHoc)
            .where(and_(base_filter, Student.trangThai == True))
        )
        student_result = await db.execute(student_stmt)
        total_students = student_result.scalar() or 0
        
        # Classes created this month
        this_month = datetime.now().replace(day=1)
        monthly_classes_stmt = select(func.count(ClassRoom.maLopHoc)).where(
            and_(base_filter, ClassRoom.thoiGianTao >= this_month)
        )
        monthly_classes_result = await db.execute(monthly_classes_stmt)
        monthly_classes = monthly_classes_result.scalar() or 0
        
        # Grade distribution
        grade_distribution_stmt = (
            select(ClassRoom.capHoc, func.count(ClassRoom.maLopHoc))
            .where(base_filter)
            .group_by(ClassRoom.capHoc)
        )
        grade_distribution_result = await db.execute(grade_distribution_stmt)
        grade_distribution = {row[0]: row[1] for row in grade_distribution_result}
        
        # Recent activity (classes created in last 7 days)
        week_ago = datetime.now() - timedelta(days=7)
        recent_activity_stmt = select(func.count(ClassRoom.maLopHoc)).where(
            and_(base_filter, ClassRoom.thoiGianTao >= week_ago)
        )
        recent_activity_result = await db.execute(recent_activity_stmt)
        recent_activity = recent_activity_result.scalar() or 0
        
        return {
            "total_classes": total_classes,
            "active_classes": active_classes,
            "total_students": total_students,
            "monthly_classes": monthly_classes,
            "grade_distribution": grade_distribution,
            "recent_activity": recent_activity,
            "activity_rate": round((active_classes / total_classes * 100), 2) if total_classes > 0 else 0,
            "avg_students_per_class": round(total_students / total_classes, 2) if total_classes > 0 else 0
        }

    @staticmethod
    async def get_students_by_class_id(db: AsyncSession, class_id: int, teacher_id: int) -> Optional[List[Student]]:
        """
        Lấy danh sách học sinh theo class_id, đồng thời kiểm tra xem giáo viên có quyền truy cập không.
        Trả về None nếu không có quyền.
        """
        # Bước 1: Kiểm tra xem lớp có tồn tại và giáo viên có phải là GVCN không
        class_room = await db.get(ClassRoom, class_id)
        if not class_room:
            return None  # Lớp không tồn tại
        
        # Hiện tại, chỉ kiểm tra GVCN. Sau này có thể mở rộng cho giáo viên bộ môn.
        if class_room.maGiaoVienChuNhiem != teacher_id:
            # Nếu không phải GVCN, có thể kiểm tra xem có dạy bài thi nào trong lớp không
            # (Logic này có thể thêm sau)
            return None # Không có quyền

        # Bước 2: Lấy danh sách học sinh
        stmt = select(Student).where(Student.maLopHoc == class_id).order_by(Student.hoTen)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_class_by_id(db: AsyncSession, class_id: int) -> Optional[ClassRoom]:
        return await db.get(ClassRoom, class_id)

    @staticmethod
    async def get_by_id(db: AsyncSession, class_id: int) -> Optional[ClassRoom]:
        return await db.get(ClassRoom, class_id)

    @staticmethod
    async def import_students_to_class(db: AsyncSession, class_id: int, file_content: bytes):
        """Import students from Excel file to a specific class"""
        try:
            import pandas as pd
            from app.services.student_service import StudentService
            from app.schemas.class_student import StudentCreate
            from datetime import datetime
            
            df = pd.read_excel(BytesIO(file_content), dtype=str)
            logging.info(f"Excel columns: {df.columns.tolist()}")

            # Define column mappings (Vietnamese to English)
            column_mapping = {
                'ma_hoc_sinh_truong': 'maHocSinhTruong',
                'ho_ten': 'hoTen',
                'ngay_sinh': 'ngaySinh',
                'gioi_tinh': 'gioiTinh',
                'dia_chi': 'diaChi',
                'so_dien_thoai': 'soDienThoai',
                'email': 'email',
                'ho_ten_phu_huynh': 'hoTenPhuHuynh',
                'so_dien_thoai_phu_huynh': 'soDienThoaiPhuHuynh',
                'dia_chi_phu_huynh': 'diaChiPhuHuynh'
            }
            
            df.rename(columns=column_mapping, inplace=True)
            df = df.fillna('')
            
            required_columns = ['maHocSinhTruong', 'hoTen']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Thiếu các cột bắt buộc: {', '.join(missing_columns)}"
                )

            created_students = []
            errors = []
            
            for index, row in df.iterrows():
                try:
                    birth_date_val = row.get('ngaySinh')
                    birth_date = None
                    if birth_date_val:
                        try:
                            birth_date = datetime.strptime(birth_date_val, '%Y-%m-%d').date()
                        except ValueError:
                            try:
                                birth_date = datetime.strptime(birth_date_val, '%d/%m/%Y').date()
                            except ValueError:
                                errors.append(f"Dòng {index + 2}: Định dạng ngày sinh không hợp lệ")
                                continue
                    
                    student_data = StudentCreate(
                        maLopHoc=class_id,
                        maHocSinhTruong=str(row['maHocSinhTruong']).strip(),
                        hoTen=str(row['hoTen']).strip(),
                        ngaySinh=birth_date,
                        gioiTinh=str(row.get('gioiTinh')).strip() if row.get('gioiTinh') else None,
                        diaChi=str(row.get('diaChi')).strip() if row.get('diaChi') else None,
                        soDienThoai=str(row.get('soDienThoai')).strip() if row.get('soDienThoai') else None,
                        email=str(row.get('email')).strip() if row.get('email') else None,
                        hoTenPhuHuynh=str(row.get('hoTenPhuHuynh')).strip() if row.get('hoTenPhuHuynh') else None,
                        soDienThoaiPhuHuynh=str(row.get('soDienThoaiPhuHuynh')).strip() if row.get('soDienThoaiPhuHuynh') else None,
                        emailPhuHuynh=str(row.get('emailPhuHuynh')).strip() if row.get('emailPhuHuynh') else None,
                        diaChiPhuHuynh=str(row.get('diaChiPhuHuynh')).strip() if row.get('diaChiPhuHuynh') else None
                    )
                    
                    if student_data.gioiTinh and student_data.gioiTinh not in ['Nam', 'Nữ', 'Khác']:
                        student_data.gioiTinh = None
                    
                    new_student = await StudentService.create_student(db, student_data)
                    created_students.append(new_student)
                    
                except Exception as e:
                    errors.append(f"Dòng {index + 2}: {str(e)}")
            
            return {
                "created_count": len(created_students),
                "error_count": len(errors),
                "errors": errors[:10],
                "total_processed": len(df)
            }
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Lỗi xử lý file Excel: {str(e)}")


