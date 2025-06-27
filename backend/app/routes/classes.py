from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from io import BytesIO
import logging

from app.db.session import get_async_db
from app.services.class_service import ClassService
from app.services.class_analytics_service import ClassAnalyticsService
from app.schemas.class_student import (
    ClassOut, ClassCreate, ClassUpdate, ClassDetail,
    BulkOperationRequest, BulkOperationResponse,
    ImportResult, ClassTemplate, ClassAnalyticsResponse, DashboardStats,
    StudentOut
)
from app.schemas.class_analytics import ClassAnalytics, AnalyticsFilters

from app.models.user import User
from app.utils.auth import (
    get_current_active_user, 
    check_manager_permission, 
    check_class_access,
    check_admin_permission,
    check_teacher_permission
)

router = APIRouter(
    prefix="/classes",
    tags=["classes"],
    responses={404: {"description": "Not found"}}
)

@router.get("/", response_model=List[ClassOut])
async def read_classes(
    org_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên lớp"),
    skip: int = 0,
    limit: int = 100,
    sort_by: str = Query("tenLop", description="Sắp xếp theo cột"),
    sort_order: str = Query("asc", description="Thứ tự sắp xếp: asc/desc"),
    cap_hoc: Optional[str] = Query(None, description="Lọc theo cấp học"),
    nam_hoc: Optional[str] = Query(None, description="Lọc theo năm học"),
    trang_thai: Optional[bool] = Query(None, description="Lọc theo trạng thái"),
    date_from: Optional[str] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    min_students: Optional[int] = Query(None, description="Số học sinh tối thiểu"),
    max_students: Optional[int] = Query(None, description="Số học sinh tối đa"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Lấy danh sách lớp học với filtering và sorting nâng cao.
    Quyền truy cập:
    - Admin: xem tất cả, hoặc lọc theo org_id/teacher_id nếu có
    - Manager: chỉ xem lớp học của tổ chức mình
    - Teacher: chỉ xem lớp học mình chủ nhiệm
    """
    # Build advanced filters
    filters = {}
    if cap_hoc:
        filters['capHoc'] = cap_hoc
    if nam_hoc:
        filters['namHoc'] = nam_hoc
    if trang_thai is not None:
        filters['trangThai'] = trang_thai
    if date_from:
        filters['dateFrom'] = date_from
    if date_to:
        filters['dateTo'] = date_to
    if min_students:
        filters['minStudents'] = min_students
    if max_students:
        filters['maxStudents'] = max_students
    
    if current_user.vaiTro == "ADMIN":
        classes = await ClassService.get_list(
            db, 
            maToChuc=org_id, 
            maGiaoVien=teacher_id, 
            search=search, 
            skip=skip, 
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
            filters=filters
        )
    elif current_user.vaiTro == "MANAGER":
        # Kiểm tra quyền tổ chức
        if org_id and org_id != current_user.maToChuc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem lớp học từ tổ chức khác"
            )
        classes = await ClassService.get_list(
            db,
            maToChuc=current_user.maToChuc,
            maGiaoVien=teacher_id,
            search=search,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
            filters=filters
        )
    else:  # TEACHER
        classes = await ClassService.get_list(
            db, 
            maGiaoVien=current_user.maNguoiDung, 
            search=search,
            skip=skip, 
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
            filters=filters
        )
    return classes

@router.post("/", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
async def create_class(
    class_create: ClassCreate,
    current_user: User = Depends(check_manager_permission),  # Chỉ manager trở lên
    db: AsyncSession = Depends(get_async_db)
):
    """Tạo lớp học mới"""
    # Auto-set organization for non-admin users
    if current_user.vaiTro == "MANAGER":
        class_create.maToChuc = current_user.maToChuc
    elif current_user.vaiTro == "TEACHER":
        class_create.maToChuc = current_user.maToChuc
        class_create.maGiaoVienChuNhiem = current_user.maNguoiDung
    
    # Kiểm tra quyền tổ chức (chỉ khi đã có maToChuc)
    if current_user.vaiTro != "ADMIN" and hasattr(class_create, 'maToChuc') and class_create.maToChuc != current_user.maToChuc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền tạo lớp học cho tổ chức khác"
        )
    
    new_class = await ClassService.create_class(db, class_create)
    return new_class

@router.get("/{class_id}", response_model=ClassDetail)
async def read_class(
    class_id: int,
    db: AsyncSession = Depends(get_async_db),
    db_class=Depends(check_class_access)
):
    """Lấy thông tin chi tiết lớp học cụ thể"""
    class_detail = await ClassService.get_class_detail(db, class_id)
    return class_detail

@router.put("/{class_id}", response_model=ClassOut)
async def update_class(
    class_id: int,
    class_update: ClassUpdate,
    db: AsyncSession = Depends(get_async_db),
    db_class=Depends(check_class_access)
):
    """Cập nhật thông tin lớp học"""
    updated_class = await ClassService.update_class(db, class_id, class_update)
    return updated_class

@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(
    class_id: int,
    db: AsyncSession = Depends(get_async_db),
    db_class=Depends(check_class_access)
):
    """Xóa lớp học"""
    await ClassService.delete_class(db, class_id)
    return {"message": "Lớp học đã được xóa thành công"}

@router.get("/{class_id}/analytics", response_model=ClassAnalytics)
async def get_class_analytics(
    class_id: int,
    period: Optional[str] = Query("all", description="Khoảng thời gian: all, semester1, semester2, recent"),
    metric: Optional[str] = Query("average", description="Chỉ số: average, pass_rate, participation, improvement"),
    db: AsyncSession = Depends(get_async_db),
    db_class=Depends(check_class_access)
):
    """Lấy thống kê phân tích cho lớp học"""
    filters = AnalyticsFilters(period=period, metric=metric)
    analytics = await ClassAnalyticsService.get_class_analytics(db, class_id, filters)
    return analytics



# NEW ADVANCED ENDPOINTS FOR ADMIN

@router.post("/bulk-operations", response_model=BulkOperationResponse)
async def bulk_operations(
    request: BulkOperationRequest,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Thực hiện thao tác hàng loạt trên nhiều lớp học
    Operations: delete, update_teacher, update_status, move_organization
    """
    result = await ClassService.bulk_operations(db, request.operation, request.class_ids, request.data)
    return result

@router.get("/analytics/dashboard", response_model=DashboardStats)
async def get_dashboard_analytics(
    organization_id: Optional[int] = Query(None, description="Lọc theo tổ chức"),
    period: str = Query("all", description="Khoảng thời gian: all, week, month, semester"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy thống kê tổng quan cho dashboard admin"""
    # Check permissions
    if current_user.vaiTro == "MANAGER" and organization_id != current_user.maToChuc:
        organization_id = current_user.maToChuc
    elif current_user.vaiTro == "TEACHER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem thống kê tổng quan"
        )
    
    dashboard_stats = await ClassService.get_dashboard_stats(db, organization_id)
    return dashboard_stats

@router.get("/export/excel")
async def export_classes_excel(
    org_id: Optional[int] = Query(None, description="Lọc theo tổ chức"),
    cap_hoc: Optional[str] = Query(None, description="Lọc theo cấp học"),
    nam_hoc: Optional[str] = Query(None, description="Lọc theo năm học"),
    trang_thai: Optional[bool] = Query(None, description="Lọc theo trạng thái"),
    current_user: User = Depends(check_manager_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Export danh sách lớp học ra file Excel"""
    # Build filters
    filters = {}
    if cap_hoc:
        filters['capHoc'] = cap_hoc
    if nam_hoc:
        filters['namHoc'] = nam_hoc
    if trang_thai is not None:
        filters['trangThai'] = trang_thai
    
    # Check permissions
    if current_user.vaiTro == "MANAGER":
        org_id = current_user.maToChuc
    
    if org_id:
        filters['maToChuc'] = org_id
    
    excel_file = await ClassService.export_classes_excel(db, filters)
    
    return StreamingResponse(
        BytesIO(excel_file.getvalue()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=danh_sach_lop_hoc.xlsx"}
    )

@router.post("/import/excel", response_model=ImportResult)
async def import_classes_excel(
    file: UploadFile = File(...),
    organization_id: Optional[int] = Query(None, description="ID tổ chức (bắt buộc cho Manager)"),
    current_user: User = Depends(check_manager_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Import danh sách lớp học từ file Excel"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File phải có định dạng Excel (.xlsx hoặc .xls)"
        )
    
    # Check permissions and set organization
    if current_user.vaiTro == "MANAGER":
        organization_id = current_user.maToChuc
    elif current_user.vaiTro == "ADMIN" and not organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin phải chỉ định ID tổ chức"
        )
    
    file_content = await file.read()
    result = await ClassService.import_classes_excel(db, file_content, organization_id)
    
    return result

@router.get("/template/excel")
async def get_import_template():
    """Tải template Excel để import lớp học"""
    import pandas as pd
    
    # Create template data
    template_data = {
        "Tên lớp": ["10A1", "10A2", "11B1"],
        "Cấp học": ["THPT", "THPT", "THPT"],
        "Năm học": ["2024-2025", "2024-2025", "2024-2025"],
        "Mô tả": ["Lớp chuyên Toán", "Lớp chuyên Lý", "Lớp chuyên Hóa"],
        "Mã GVCN": ["", "", ""]
    }
    
    df = pd.DataFrame(template_data)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Template', index=False)
        
        # Add instructions sheet
        instructions = pd.DataFrame({
            "Hướng dẫn sử dụng": [
                "1. Điền thông tin lớp học vào sheet 'Template'",
                "2. Các cột bắt buộc: Tên lớp, Cấp học, Năm học",
                "3. Cấp học: THPT, THCS, TIEU_HOC, TRUONG_DAI_HOC",
                "4. Mã GVCN: để trống nếu chưa có giáo viên chủ nhiệm",
                "5. Lưu file và upload lên hệ thống"
            ]
        })
        instructions.to_excel(writer, sheet_name='Hướng dẫn', index=False)
    
    output.seek(0)
    
    return StreamingResponse(
        BytesIO(output.getvalue()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=template_import_lop_hoc.xlsx"}
    )

@router.post("/templates", response_model=ClassTemplate)
async def create_class_template(
    template_data: Dict[str, Any],
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Tạo template lớp học để sử dụng lại"""
    template = await ClassService.create_class_template(db, template_data)
    return template

@router.get("/statistics/summary", response_model=DashboardStats)
async def get_classes_summary(
    organization_id: Optional[int] = Query(None, description="Lọc theo tổ chức"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy tóm tắt thống kê lớp học"""
    # Check permissions
    if current_user.vaiTro == "MANAGER":
        organization_id = current_user.maToChuc
    elif current_user.vaiTro == "TEACHER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem thống kê tổng quan"
        )
    
    stats = await ClassService.get_dashboard_stats(db, organization_id)
    return stats

@router.get("/analytics/advanced", response_model=ClassAnalyticsResponse)
async def get_advanced_analytics(
    class_id: Optional[int] = Query(None, description="Lọc theo lớp học cụ thể"),
    period: str = Query("all", description="Khoảng thời gian: all, week, month, semester"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy phân tích nâng cao cho lớp học"""
    # Check permissions for specific class
    if class_id and current_user.vaiTro == "TEACHER":
        # Verify teacher has access to this class
        class_detail = await ClassService.get_class_detail(db, class_id)
        if class_detail.maGiaoVienChuNhiem != current_user.maNguoiDung:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem phân tích của lớp học này"
            )
    
    analytics = await ClassService.get_class_analytics(db, class_id, period)
    return analytics

@router.post("/{class_id}/assign-teacher")
async def assign_teacher_to_class(
    class_id: int,
    teacher_assignment: dict,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(check_manager_permission),
    db_class=Depends(check_class_access)
):
    """Phân công giáo viên chủ nhiệm cho lớp học"""
    teacher_id = teacher_assignment.get("teacherId")
    if not teacher_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teacher ID is required"
        )
    
    # Kiểm tra giáo viên có tồn tại và thuộc cùng tổ chức
    from app.services.user_service import UserService
    teacher = await UserService.get_by_id(db, teacher_id)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found"
        )
    
    if teacher.vaiTro != "TEACHER":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a teacher"
        )
    
    # Kiểm tra quyền tổ chức
    if current_user.vaiTro != "ADMIN" and teacher.maToChuc != current_user.maToChuc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot assign teacher from different organization"
        )
    
    # Cập nhật lớp học với giáo viên chủ nhiệm mới
    from app.schemas.class_student import ClassUpdate
    update_data = ClassUpdate(maGiaoVienChuNhiem=teacher_id)
    updated_class = await ClassService.update_class(db, class_id, update_data)
    
    return {
        "success": True,
        "message": f"Đã phân công {teacher.hoTen} làm chủ nhiệm lớp {updated_class.tenLop}",
        "teacher": {
            "id": teacher.maNguoiDung,
            "name": teacher.hoTen,
            "email": teacher.email,
            "phone": teacher.soDienThoai
        },
        "class": {
            "id": updated_class.maLopHoc,
            "name": updated_class.tenLop
        }
    }

@router.get("/{class_id}/students", response_model=List[StudentOut], summary="Lấy danh sách học sinh trong một lớp")
async def get_students_in_class(
    class_id: int,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Lấy danh sách tất cả học sinh thuộc về một lớp học cụ thể.
    - **Yêu cầu**: Người dùng phải là giáo viên.
    - **Phân quyền**: Giáo viên phải được phân công vào lớp học này (sẽ được kiểm tra trong service).
    """
    students = await ClassService.get_students_by_class_id(db, class_id=class_id, teacher_id=current_user.maNguoiDung)
    if students is None:
        raise HTTPException(status_code=403, detail="Không có quyền xem danh sách học sinh của lớp này")
    return students

@router.post("/{class_id}/students/import", response_model=ImportResult)
async def import_students_to_class(
    class_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Import danh sách học sinh từ file Excel vào lớp học cụ thể
    - **Yêu cầu**: Người dùng phải là giáo viên chủ nhiệm của lớp hoặc có quyền manager/admin
    - **File format**: Excel (.xlsx hoặc .xls)
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File phải có định dạng Excel (.xlsx hoặc .xls)"
        )
    
    # Kiểm tra quyền truy cập lớp học
    class_obj = await ClassService.get_by_id(db, class_id)
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lớp học"
        )
    
    has_permission = False
    if current_user.vaiTro == "ADMIN":
        has_permission = True
    elif current_user.vaiTro == "MANAGER" and class_obj.maToChuc == current_user.maToChuc:
        has_permission = True
    elif current_user.vaiTro == "TEACHER" and class_obj.maGiaoVienChuNhiem == current_user.maNguoiDung:
        has_permission = True
    
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền import học sinh cho lớp học này"
        )
    
    file_content = await file.read()
    result = await ClassService.import_students_to_class(db, class_id, file_content)
    
    return result
