from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, Form, File
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
import io
from fastapi.responses import StreamingResponse

from app.db.session import get_async_db
from app.services.student_service import StudentService
from app.services.class_service import ClassService
from app.schemas.class_student import StudentOut, StudentCreate, StudentUpdate, StudentBatchCreate, StudentTransfer
from app.models.user import User
from app.models.class_room import ClassRoom
from app.utils.auth import (
    get_current_active_user, 
    check_admin_permission, 
    check_manager_permission,
    check_teacher_permission,
    check_class_access
)

router = APIRouter(
    prefix="/students",
    tags=["students"],
    responses={404: {"description": "Not found"}}
)

@router.get("/class/{class_id}", response_model=List[StudentOut])
async def read_students_by_class(
    class_id: int,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Lấy danh sách học sinh theo lớp học"""
    # Kiểm tra quyền truy cập lớp học
    db_class = await check_class_access(class_id, current_user, db)
    
    # Lấy danh sách học sinh
    students = await StudentService.get_students_by_class(db, class_id, skip=skip, limit=limit, search=search)
    return students

@router.post("/", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_create: StudentCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Tạo học sinh mới"""
    # Kiểm tra quyền truy cập lớp học
    db_class = await check_class_access(student_create.maLopHoc, current_user, db)
    
    # Tạo học sinh mới
    return await StudentService.create_student(db, student_create)

@router.post("/batch", response_model=List[StudentOut], status_code=status.HTTP_201_CREATED)
async def create_students_batch(
    student_batch: StudentBatchCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Tạo nhiều học sinh cùng lúc"""
    if not student_batch.students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Danh sách học sinh không được trống"
        )
    
    # Kiểm tra quyền truy cập cho tất cả lớp học
    class_ids = set(student.maLopHoc for student in student_batch.students)
    
    for class_id in class_ids:
        # Kiểm tra quyền truy cập từng lớp học
        await check_class_access(class_id, current_user, db)
    
    # Tạo học sinh mới
    return await StudentService.create_students_batch(db, student_batch)

@router.get("/{student_id}", response_model=StudentOut)
async def read_student(
    student_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Lấy thông tin học sinh cụ thể"""
    # Lấy thông tin học sinh
    db_student = await StudentService.get_student_by_id(db, student_id)
    if not db_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy học sinh với ID: {student_id}"
        )
    
    # Kiểm tra quyền truy cập lớp học của học sinh
    await check_class_access(db_student.maLopHoc, current_user, db)
    
    return db_student

@router.put("/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: int,
    student_update: StudentUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật thông tin học sinh"""
    # Lấy thông tin học sinh
    db_student = await StudentService.get_student_by_id(db, student_id)
    if not db_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy học sinh với ID: {student_id}"
        )
    
    # Kiểm tra quyền truy cập lớp học của học sinh
    await check_class_access(db_student.maLopHoc, current_user, db)
    
    return await StudentService.update_student(db, student_id, student_update)

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: int,
    current_user: User = Depends(check_manager_permission),
    db: AsyncSession = Depends(get_async_db),
):
    student = await StudentService.get_student_by_id(db, student_id)
    if current_user.vaiTro == "MANAGER" and student.lop_hoc.maToChuc != current_user.maToChuc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập")
    if current_user.vaiTro == "TEACHER" and student.lop_hoc.maGiaoVienChuNhiem != current_user.maNguoiDung:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập")
    await StudentService.delete_student(db, student_id)
    return {"message": "deleted"}

@router.post("/transfer", response_model=List[StudentOut])
async def transfer_students(
    transfer_data: StudentTransfer,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Chuyển học sinh sang lớp khác"""
    # Lấy danh sách học sinh
    students = []
    for student_id in transfer_data.maHocSinhList:
        db_student = await StudentService.get_student_by_id(db, student_id)
        if not db_student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy học sinh với ID: {student_id}"
            )
        students.append(db_student)
    
    # Admin có quyền chuyển bất kỳ học sinh nào
    if current_user.vaiTro == "ADMIN":
        pass
    # Manager chỉ có thể chuyển trong cùng tổ chức
    elif current_user.vaiTro == "MANAGER":
        # Kiểm tra lớp đích thuộc tổ chức của manager
        db_target_class = await ClassService.get_class_detail(db, transfer_data.maLopHocMoi)
        if not db_target_class:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy lớp học đích với ID: {transfer_data.maLopHocMoi}"
            )
            
        if db_target_class.maToChuc != current_user.maToChuc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chuyển học sinh vào lớp học thuộc tổ chức khác"
            )
            
        # Kiểm tra học sinh thuộc tổ chức của manager
        for student in students:
            db_student_class = await ClassService.get_class_detail(db, student.maLopHoc)
            if db_student_class.maToChuc != current_user.maToChuc:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Bạn không có quyền chuyển học sinh với ID: {student.maHocSinh}"
                )
    
    # Teacher không có quyền chuyển học sinh sang lớp khác
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền chuyển học sinh sang lớp khác"
        )
    
    # Thực hiện chuyển lớp
    return await StudentService.transfer_students(db, transfer_data)

# ========== NEW IMPORT/EXPORT ENDPOINTS ==========

@router.post("/import-excel")
async def import_students_from_excel(
    file: UploadFile = File(...),
    class_id: int = Form(...),
    current_user: User = Depends(check_manager_permission),
    db: AsyncSession = Depends(get_async_db),
):
    """Import danh sách học sinh từ file Excel"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File phải có định dạng Excel (.xlsx hoặc .xls)"
        )
    
    try:
        # Kiểm tra quyền truy cập lớp học
        class_obj = await ClassService.get_class_detail(db, class_id)
        if current_user.vaiTro == "MANAGER" and class_obj.maToChuc != current_user.maToChuc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập")
        if current_user.vaiTro == "TEACHER" and class_obj.maGiaoVienChuNhiem != current_user.maNguoiDung:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập")
        
        # Đọc và xử lý file Excel
        result = await StudentService.import_from_excel(db, file, class_id)
        
        return {
            "message": "Import thành công",
            "total_processed": result["total_processed"],
            "successful": result["successful"],
            "failed": result["failed"],
            "errors": result["errors"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi import file: {str(e)}"
        )

@router.get("/export-excel")
async def export_students_to_excel(
    class_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Export danh sách học sinh ra file Excel"""
    try:
        # Lấy danh sách học sinh theo quyền
        if current_user.vaiTro == "ADMIN":
            students = await StudentService.get_list(db, maLopHoc=class_id)
        elif current_user.vaiTro == "MANAGER":
            students = await StudentService.get_list(db, maLopHoc=class_id, maToChuc=current_user.maToChuc)
        else:  # TEACHER
            if class_id:
                class_obj = await ClassService.get_class_detail(db, class_id)
                if class_obj.maGiaoVienChuNhiem != current_user.maNguoiDung:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập")
            students = await StudentService.get_list_by_teacher(db, current_user.maNguoiDung, class_id)
        
        # Tạo file Excel
        excel_file = await StudentService.export_to_excel(students)
        
        return StreamingResponse(
            io.BytesIO(excel_file),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=danh_sach_hoc_sinh.xlsx"}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi export file: {str(e)}"
        )

@router.get("/template-excel")
async def download_import_template():
    """Tải template Excel để import học sinh - Không cần authentication"""
    try:
        template_file = await StudentService.create_import_template()
        
        return StreamingResponse(
            io.BytesIO(template_file),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=template_import_hoc_sinh.xlsx"}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tạo template: {str(e)}"
        )

@router.post("/bulk-operations")
async def bulk_student_operations(
    operation: str = Form(...),  # "delete", "move_class", "update_status"
    student_ids: List[int] = Form(...),
    target_class_id: Optional[int] = Form(None),
    new_status: Optional[bool] = Form(None),
    current_user: User = Depends(check_manager_permission),
    db: AsyncSession = Depends(get_async_db),
):
    """Thực hiện các thao tác hàng loạt với học sinh"""
    try:
        result = await StudentService.bulk_operations(
            db, 
            operation, 
            student_ids, 
            current_user,
            target_class_id=target_class_id,
            new_status=new_status
        )
        
        return {
            "message": f"Thực hiện {operation} thành công",
            "processed": result["processed"],
            "successful": result["successful"],
            "failed": result["failed"],
            "errors": result.get("errors", [])
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi thực hiện thao tác: {str(e)}"
        ) 