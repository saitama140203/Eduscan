from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.models.student import Student
from app.models.class_room import ClassRoom
from app.schemas.class_student import StudentCreate, StudentUpdate, StudentBatchCreate, StudentTransfer

class StudentService:
    @staticmethod
    async def create_student(db: AsyncSession, student_create: StudentCreate) -> Student:
        # Kiểm tra lớp học tồn tại
        stmt = select(ClassRoom).where(
            ClassRoom.maLopHoc == student_create.maLopHoc,
            ClassRoom.trangThai == True
        )
        result = await db.execute(stmt)
        db_class = result.scalars().first()
        
        if not db_class:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy lớp học với ID: {student_create.maLopHoc} hoặc lớp không hoạt động"
            )
        
        # Kiểm tra mã học sinh đã tồn tại trong lớp chưa
        stmt = select(Student).where(
            Student.maLopHoc == student_create.maLopHoc,
            Student.maHocSinhTruong == student_create.maHocSinhTruong
        )
        result = await db.execute(stmt)
        db_student = result.scalars().first()
        
        if db_student:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã học sinh {student_create.maHocSinhTruong} đã tồn tại trong lớp này"
            )
        
        # Tạo học sinh mới với tất cả fields
        db_student = Student(
            maLopHoc=student_create.maLopHoc,
            maHocSinhTruong=student_create.maHocSinhTruong,
            hoTen=student_create.hoTen,
            ngaySinh=student_create.ngaySinh,
            gioiTinh=student_create.gioiTinh,
            diaChi=student_create.diaChi,
            soDienThoai=student_create.soDienThoai,
            email=student_create.email,
            hoTenPhuHuynh=student_create.hoTenPhuHuynh,
            soDienThoaiPhuHuynh=student_create.soDienThoaiPhuHuynh,
            emailPhuHuynh=student_create.emailPhuHuynh,
            diaChiPhuHuynh=student_create.diaChiPhuHuynh,
            trangThai=True
        )
        
        # Thêm vào DB và commit
        db.add(db_student)
        
        try:
            await db.commit()
            await db.refresh(db_student)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã học sinh {student_create.maHocSinhTruong} đã tồn tại trong lớp này"
            )
        
        return db_student
    
    @staticmethod
    async def create_students_batch(db: AsyncSession, student_batch: StudentBatchCreate) -> List[Student]:
        """Tạo nhiều học sinh cùng lúc"""
        created_students = []
        
        # Validate lớp học
        class_ids = set(student.maLopHoc for student in student_batch.students)
        for class_id in class_ids:
            stmt = select(ClassRoom).where(
                ClassRoom.maLopHoc == class_id,
                ClassRoom.trangThai == True
            )
            result = await db.execute(stmt)
            db_class = result.scalars().first()
            
            if not db_class:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy lớp học với ID: {class_id} hoặc lớp không hoạt động"
                )
                
        # Check for duplicate student IDs within the same class
        student_ids_by_class = {}
        for student in student_batch.students:
            if student.maLopHoc not in student_ids_by_class:
                student_ids_by_class[student.maLopHoc] = set()
            
            if student.maHocSinhTruong in student_ids_by_class[student.maLopHoc]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mã học sinh {student.maHocSinhTruong} bị trùng lặp trong lớp {student.maLopHoc}"
                )
            
            student_ids_by_class[student.maLopHoc].add(student.maHocSinhTruong)
        
        # Check for existing student IDs in database
        for class_id, student_ids in student_ids_by_class.items():
            stmt = select(Student.maHocSinhTruong).where(
                Student.maLopHoc == class_id,
                Student.maHocSinhTruong.in_(student_ids)
            )
            result = await db.execute(stmt)
            existing_students = result.scalars().all()
            
            if existing_students:
                existing_ids = list(existing_students)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mã học sinh {', '.join(existing_ids)} đã tồn tại trong lớp {class_id}"
                )
        
        # Create students
        for student_create in student_batch.students:
            db_student = Student(
                maLopHoc=student_create.maLopHoc,
                maHocSinhTruong=student_create.maHocSinhTruong,
                hoTen=student_create.hoTen,
                ngaySinh=student_create.ngaySinh,
                gioiTinh=student_create.gioiTinh,
                diaChi=student_create.diaChi,
                soDienThoai=student_create.soDienThoai,
                email=student_create.email,
                hoTenPhuHuynh=student_create.hoTenPhuHuynh,
                soDienThoaiPhuHuynh=student_create.soDienThoaiPhuHuynh,
                emailPhuHuynh=student_create.emailPhuHuynh,
                diaChiPhuHuynh=student_create.diaChiPhuHuynh,
                trangThai=True
            )
            db.add(db_student)
            created_students.append(db_student)
        
        try:
            await db.commit()
            for student in created_students:
                await db.refresh(student)
        except IntegrityError as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lỗi khi thêm học sinh, có thể do mã học sinh trùng lặp: {str(e)}"
            )
        
        return created_students
    
    @staticmethod
    async def get_student_by_id(db: AsyncSession, student_id: int) -> Optional[Student]:
        stmt = select(Student).where(Student.maHocSinh == student_id)
        result = await db.execute(stmt)
        return result.scalars().first()
    
    @staticmethod
    async def get_student_by_school_id(db: AsyncSession, class_id: int, school_id: str) -> Optional[Student]:
        stmt = select(Student).where(
            Student.maLopHoc == class_id, 
            Student.maHocSinhTruong == school_id
        )
        result = await db.execute(stmt)
        return result.scalars().first()
    
    @staticmethod
    async def get_students_by_class(db: AsyncSession, class_id: int, 
                             skip: int = 0, limit: int = 100,
                             search: Optional[str] = None) -> List[Student]:
        stmt = select(Student).where(Student.maLopHoc == class_id)
        
        # Search by name or school ID
        if search:
            search_term = f"%{search}%"
            stmt = stmt.where(
                (Student.hoTen.ilike(search_term)) | 
                (Student.maHocSinhTruong.ilike(search_term))
            )
            
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def update_student(db: AsyncSession, student_id: int, student_update: StudentUpdate) -> Student:
        # Tìm học sinh cần cập nhật
        db_student = await StudentService.get_student_by_id(db, student_id)
        if not db_student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy học sinh với ID: {student_id}"
            )
        
        # Kiểm tra trùng mã học sinh trong lớp nếu có thay đổi
        if student_update.maHocSinhTruong and student_update.maHocSinhTruong != db_student.maHocSinhTruong:
            stmt = select(Student).where(
                Student.maLopHoc == db_student.maLopHoc,
                Student.maHocSinhTruong == student_update.maHocSinhTruong,
                Student.maHocSinh != student_id
            )
            result = await db.execute(stmt)
            existing = result.scalars().first()
            
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mã học sinh {student_update.maHocSinhTruong} đã tồn tại trong lớp này"
                )
        
        # Cập nhật thông tin
        update_data = student_update.dict(exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(db_student, key, value)
        
        # Cập nhật thời gian
        db_student.thoiGianCapNhat = datetime.now()
        
        try:
            await db.commit()
            await db.refresh(db_student)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lỗi khi cập nhật học sinh"
            )
        
        return db_student
    
    @staticmethod
    async def delete_student(db: AsyncSession, student_id: int) -> bool:
        # Tìm học sinh
        db_student = await StudentService.get_student_by_id(db, student_id)
        if not db_student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy học sinh với ID: {student_id}"
            )
        
        # Xóa mềm - set trangThai = False
        db_student.trangThai = False
        db_student.thoiGianCapNhat = datetime.now()
        
        await db.commit()
        return True
    
    @staticmethod
    async def transfer_students(db: AsyncSession, transfer_data: StudentTransfer) -> List[Student]:
        """Chuyển học sinh sang lớp mới"""
        transferred_students = []
        
        # Kiểm tra lớp đích tồn tại
        stmt = select(ClassRoom).where(
            ClassRoom.maLopHoc == transfer_data.maLopHocMoi,
            ClassRoom.trangThai == True
        )
        result = await db.execute(stmt)
        target_class = result.scalars().first()
        
        if not target_class:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy lớp học đích với ID: {transfer_data.maLopHocMoi}"
            )
        
        # Cập nhật lớp học cho từng học sinh
        for student_id in transfer_data.maHocSinhList:
            db_student = await StudentService.get_student_by_id(db, student_id)
            if db_student:
                db_student.maLopHoc = transfer_data.maLopHocMoi
                db_student.thoiGianCapNhat = datetime.now()
                transferred_students.append(db_student)
        
        await db.commit()
        
        for student in transferred_students:        
                await db.refresh(student)
        
        return transferred_students


    # ========== NEW EXCEL IMPORT/EXPORT METHODS ==========
    
    @staticmethod
    async def import_from_excel(db: AsyncSession, file, class_id: int) -> dict:
        """Import học sinh từ file Excel"""
        import pandas as pd
        import io
        
        try:
            # Đọc file Excel
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents))
            
            # Validate columns
            required_columns = ['ho_ten', 'ngay_sinh', 'gioi_tinh', 'ma_hoc_sinh_truong']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise ValueError(f"Thiếu các cột: {', '.join(missing_columns)}")
            
            total_processed = len(df)
            successful = 0
            failed = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # Validate data
                    if pd.isna(row['ho_ten']) or pd.isna(row['ma_hoc_sinh_truong']):
                        errors.append(f"Dòng {index + 2}: Thiếu thông tin bắt buộc")
                        failed += 1
                        continue
                    
                    # Check if student already exists
                    existing = await db.execute(
                        select(Student).where(Student.maHocSinhTruong == row['ma_hoc_sinh_truong'])
                    )
                    if existing.scalar_one_or_none():
                        errors.append(f"Dòng {index + 2}: Mã học sinh {row['ma_hoc_sinh_truong']} đã tồn tại")
                        failed += 1
                        continue
                    
                    # Format phone numbers properly (add leading 0 if missing and numeric)
                    def format_phone(phone_value):
                        if pd.isna(phone_value):
                            return None
                        phone_str = str(phone_value).strip()
                        if phone_str and phone_str.isdigit() and len(phone_str) == 9:
                            return '0' + phone_str  # Add leading 0
                        return phone_str if phone_str else None
                    
                    # Create student
                    student_data = StudentCreate(
                        hoTen=str(row['ho_ten']).strip(),
                        ngaySinh=pd.to_datetime(row['ngay_sinh']).date() if not pd.isna(row['ngay_sinh']) else None,
                        gioiTinh=str(row['gioi_tinh']).strip() if not pd.isna(row['gioi_tinh']) else None,
                        maHocSinhTruong=str(row['ma_hoc_sinh_truong']).strip(),
                        maLopHoc=class_id,
                        diaChi=str(row.get('dia_chi', '')).strip() if not pd.isna(row.get('dia_chi')) else None,
                        soDienThoai=format_phone(row.get('so_dien_thoai')),
                        email=str(row.get('email', '')).strip() if not pd.isna(row.get('email')) else None,
                        hoTenPhuHuynh=str(row.get('ho_ten_phu_huynh', '')).strip() if not pd.isna(row.get('ho_ten_phu_huynh')) else None,
                        soDienThoaiPhuHuynh=format_phone(row.get('so_dien_thoai_phu_huynh'))
                    )
                    
                    await StudentService.create_student(db, student_data)
                    successful += 1
                    
                except Exception as e:
                    errors.append(f"Dòng {index + 2}: {str(e)}")
                    failed += 1
            
            return {
                "total_processed": total_processed,
                "successful": successful,
                "failed": failed,
                "errors": errors
            }
            
        except Exception as e:
            raise ValueError(f"Lỗi đọc file Excel: {str(e)}")
    
    @staticmethod
    async def export_to_excel(students: List[Student]) -> bytes:
        """Export danh sách học sinh ra Excel"""
        import pandas as pd
        import io
        
        # Prepare data
        data = []
        for student in students:
            data.append({
                'STT': len(data) + 1,
                'Mã học sinh': student.maHocSinhTruong,
                'Họ tên': student.hoTen,
                'Ngày sinh': student.ngaySinh.strftime('%d/%m/%Y') if student.ngaySinh else '',
                'Giới tính': student.gioiTinh or '',
                'Lớp': student.lop_hoc.tenLop if student.lop_hoc else '',
                'Địa chỉ': student.diaChi or '',
                'Số điện thoại': student.soDienThoai or '',
                'Email': student.email or '',
                'Họ tên phụ huynh': student.hoTenPhuHuynh or '',
                'SĐT phụ huynh': student.soDienThoaiPhuHuynh or '',
                'Trạng thái': 'Hoạt động' if student.trangThai else 'Không hoạt động',
                'Ngày tạo': student.thoiGianTao.strftime('%d/%m/%Y %H:%M') if student.thoiGianTao else ''
            })
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Create Excel file
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Danh sách học sinh', index=False)
            
            # Format worksheet
            worksheet = writer.sheets['Danh sách học sinh']
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
        
        return output.getvalue()
    
    @staticmethod
    async def create_import_template() -> bytes:
        """Tạo template Excel để import học sinh với dữ liệu mẫu thực tế"""
        import pandas as pd
        import io
        
        # Template data với 5 học sinh mẫu thực tế
        template_data = {
            'ho_ten': [
                'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Minh Châu', 
                'Phạm Thị Dung', 'Hoàng Văn Hùng'
            ],
            'ngay_sinh': [
                '15/03/2008', '22/07/2008', '03/11/2008', 
                '18/01/2009', '09/05/2008'
            ],
            'gioi_tinh': [
                'Nam', 'Nữ', 'Nam', 'Nữ', 'Nam'
            ],
            'ma_hoc_sinh_truong': [
                'HS2024001', 'HS2024002', 'HS2024003', 
                'HS2024004', 'HS2024005'
            ],
            'dia_chi': [
                '123 Nguyễn Văn Cừ, Q.5, TP.HCM',
                '456 Lê Văn Sỹ, Q.3, TP.HCM',
                '789 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM',
                '321 Cách Mạng Tháng 8, Q.10, TP.HCM',
                '654 Lý Tự Trọng, Q.1, TP.HCM'
            ],
            'so_dien_thoai': [
                '0901234567', '0912345678', '0923456789', 
                '0934567890', '0945678901'
            ],
            'email': [
                'nguyenvanan@email.com', 'tranthbich@email.com', 
                'leminhchau@email.com', 'phamthidung@email.com', 
                'hoangvanhung@email.com'
            ],
            'ho_ten_phu_huynh': [
                'Nguyễn Văn Bình', 'Trần Thị Cúc', 'Lê Minh Đức',
                'Phạm Văn Em', 'Hoàng Thị Phượng'
            ],
            'so_dien_thoai_phu_huynh': [
                '0987654321', '0976543210', '0965432109',
                '0954321098', '0943210987'
            ]
        }
        
        df = pd.DataFrame(template_data)
        
        # Create Excel file
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Danh sách học sinh', index=False)
            
            # Add detailed instructions sheet
            instructions = pd.DataFrame({
                'STT': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                'Hướng dẫn sử dụng Template Import Học Sinh': [
                    '✅ BƯỚC 1: Sử dụng sheet "Danh sách học sinh" để nhập dữ liệu',
                    '⚠️ CÁC CỘT BẮT BUỘC: ho_ten, ma_hoc_sinh_truong',
                    '📅 Định dạng ngày sinh: DD/MM/YYYY (VD: 15/03/2008)',
                    '👤 Giới tính: chỉ nhập "Nam", "Nữ" hoặc "Khác"',
                    '🆔 Mã học sinh: phải DUY NHẤT trong toàn trường',
                    '📱 Số điện thoại: 10 số, bắt đầu bằng 0 (VD: 0901234567)',
                    '📧 Email: đúng định dạng (VD: ten@email.com)',
                    '🏠 Địa chỉ: đầy đủ số nhà, đường, quận/huyện, tỉnh/thành',
                    '👨‍👩‍👧‍👦 Thông tin phụ huynh: không bắt buộc nhưng khuyến khích điền',
                    '💾 Lưu file dạng .xlsx (Excel) trước khi upload',
                    '🔄 Hệ thống sẽ tự động validate và báo lỗi nếu có',
                    '📞 Liên hệ admin nếu gặp vấn đề khi import'
                ]
            })
            instructions.to_excel(writer, sheet_name='Hướng dẫn', index=False)
            
            # Add validation rules sheet
            validation_rules = pd.DataFrame({
                'Tên cột': [
                    'ho_ten', 'ma_hoc_sinh_truong', 'ngay_sinh', 'gioi_tinh',
                    'dia_chi', 'so_dien_thoai', 'email', 'ho_ten_phu_huynh', 'so_dien_thoai_phu_huynh'
                ],
                'Bắt buộc': [
                    'CÓ', 'CÓ', 'Không', 'Không',
                    'Không', 'Không', 'Không', 'Không', 'Không'
                ],
                'Quy tắc validation': [
                    'Tối thiểu 2 ký tự, không được để trống',
                    'Phải duy nhất, không trùng với học sinh khác',
                    'Định dạng DD/MM/YYYY, VD: 15/03/2008',
                    'Chỉ được: Nam, Nữ, hoặc Khác',
                    'Địa chỉ đầy đủ, rõ ràng',
                    '10 số, bắt đầu bằng 0',
                    'Đúng định dạng email',
                    'Họ tên đầy đủ của phụ huynh',
                    '10 số, bắt đầu bằng 0'
                ]
            })
            validation_rules.to_excel(writer, sheet_name='Quy tắc validation', index=False)
            
            # Format all worksheets
            for sheet_name in writer.sheets:
                worksheet = writer.sheets[sheet_name]
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = min(max_length + 3, 60)
                    worksheet.column_dimensions[column_letter].width = adjusted_width
        
        return output.getvalue()
    
    @staticmethod
    async def bulk_operations(
        db: AsyncSession, 
        operation: str, 
        student_ids: List[int], 
        current_user,
        target_class_id: Optional[int] = None,
        new_status: Optional[bool] = None
    ) -> dict:
        """Thực hiện các thao tác hàng loạt"""
        processed = len(student_ids)
        successful = 0
        failed = 0
        errors = []
        
        for student_id in student_ids:
            try:
                student = await StudentService.get_student_by_id(db, student_id)
                if not student:
                    errors.append(f"Học sinh ID {student_id}: Không tìm thấy")
                    failed += 1
                    continue
                
                # Check permissions
                if current_user.vaiTro == "MANAGER" and student.lop_hoc.maToChuc != current_user.maToChuc:
                    errors.append(f"Học sinh ID {student_id}: Không có quyền truy cập")
                    failed += 1
                    continue
                if current_user.vaiTro == "TEACHER" and student.lop_hoc.maGiaoVienChuNhiem != current_user.maNguoiDung:
                    errors.append(f"Học sinh ID {student_id}: Không có quyền truy cập")
                    failed += 1
                    continue
                
                # Perform operation
                if operation == "delete":
                    await StudentService.delete_student(db, student_id)
                elif operation == "move_class" and target_class_id:
                    student.maLopHoc = target_class_id
                elif operation == "update_status" and new_status is not None:
                    student.trangThai = new_status
                else:
                    errors.append(f"Học sinh ID {student_id}: Thao tác không hợp lệ")
                    failed += 1
                    continue
                
                successful += 1
                
            except Exception as e:
                errors.append(f"Học sinh ID {student_id}: {str(e)}")
                failed += 1
        
        await db.commit()
        
        return {
            "processed": processed,
            "successful": successful,
            "failed": failed,
            "errors": errors
        } 