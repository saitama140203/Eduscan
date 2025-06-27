from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.user import User
from app.models.file import File
from app.models.answer_sheet_template import AnswerSheetTemplate
from app.services.file_service import FileService
from app.utils.auth import get_current_user
from app.schemas.file import FileOut, FileUploadRequest, FileUploadResponse

router = APIRouter()

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    thuc_the_nguon: str = "GENERAL",
    ma_thuc_the_nguon: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload file vào hệ thống"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Tên file không được để trống")
    
    # Kiểm tra kích thước file (max 50MB)
    if file.size and file.size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File quá lớn (tối đa 50MB)")
    
    file_service = FileService(db)

    try:
        db_file = file_service.save_file(
            file=file,
            ma_nguoi_dung=current_user.maNguoiDung,
            ma_to_chuc=current_user.maToChuc,
            thuc_the_nguon=thuc_the_nguon,
            ma_thuc_the_nguon=ma_thuc_the_nguon
        )
        
        return FileUploadResponse(
            success=True,
            message="Upload file thành công",
            maTapTin=db_file.maTapTin,
            tenTapTin=db_file.tenTapTin,
            duongDan=db_file.duongDan,
            kichThuoc=db_file.kichThuoc,
            loaiTapTin=db_file.loaiTapTin
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi upload file: {str(e)}")

@router.get("/{ma_tap_tin}/download")
async def download_file(
    ma_tap_tin: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download file theo ID"""
    file_service = FileService(db)
    file_path = file_service.get_file_path(ma_tap_tin)
    
    if not file_path:
        raise HTTPException(status_code=404, detail="File không tồn tại")
    
    # Lấy thông tin file để check quyền
    db_file = file_service.get_file_by_id(ma_tap_tin)
    if not db_file:
        raise HTTPException(status_code=404, detail="File không tồn tại")
    
    # Kiểm tra xem file có thuộc template công khai không
    is_public_template_file = False
    if db_file.thucTheNguon == "TEMPLATE" and db_file.maThucTheNguon:
        template = db.query(AnswerSheetTemplate).filter(AnswerSheetTemplate.maMauPhieu == db_file.maThucTheNguon).first()
        if template and template.laCongKhai:
            is_public_template_file = True

    # Nếu không phải file public, kiểm tra quyền truy cập
    if not is_public_template_file:
        if str(current_user.vaiTro).upper() != "ADMIN" and db_file.maToChuc != current_user.maToChuc:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập file này")
    
    return FileResponse(
        path=file_path,
        filename=db_file.tenTapTin,
        media_type=db_file.loaiTapTin
    )

@router.get("/{ma_tap_tin}/preview")
async def preview_file(
    ma_tap_tin: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Preview file (tương tự download nhưng inline)"""
    file_service = FileService(db)
    file_path = file_service.get_file_path(ma_tap_tin)
    
    if not file_path:
        raise HTTPException(status_code=404, detail="File không tồn tại")
    
    db_file = file_service.get_file_by_id(ma_tap_tin)
    if not db_file:
        raise HTTPException(status_code=404, detail="File không tồn tại")
    
    # Kiểm tra xem file có thuộc template công khai không
    is_public_template_file = False
    if db_file.thucTheNguon == "TEMPLATE" and db_file.maThucTheNguon:
        template = db.query(AnswerSheetTemplate).filter(AnswerSheetTemplate.maMauPhieu == db_file.maThucTheNguon).first()
        if template and template.laCongKhai:
            is_public_template_file = True

    # Nếu không phải file public, kiểm tra quyền truy cập
    if not is_public_template_file:
        if current_user.vaiTro != "Admin" and db_file.maToChuc != current_user.maToChuc:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập file này")
    
    return FileResponse(
        path=file_path,
        filename=db_file.tenTapTin,
        media_type=db_file.loaiTapTin,
        headers={"Content-Disposition": "inline"}
    )

@router.get("/{ma_tap_tin}/info", response_model=FileOut)
async def get_file_info(
    ma_tap_tin: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lấy thông tin file"""
    file_service = FileService(db)
    db_file = file_service.get_file_by_id(ma_tap_tin)
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File không tồn tại")
    
    # Kiểm tra quyền truy cập
    is_public_template_file = False
    if db_file.thucTheNguon == "TEMPLATE" and db_file.maThucTheNguon:
        template = db.query(AnswerSheetTemplate).filter(AnswerSheetTemplate.maMauPhieu == db_file.maThucTheNguon).first()
        if template and template.laCongKhai:
            is_public_template_file = True
            
    if not is_public_template_file:
        if current_user.vaiTro != "Admin" and db_file.maToChuc != current_user.maToChuc:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập file này")
    
    return db_file

@router.delete("/{ma_tap_tin}")
async def delete_file(
    ma_tap_tin: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Xóa file"""
    file_service = FileService(db)
    
    success = file_service.delete_file(ma_tap_tin, current_user.maNguoiDung)
    
    if not success:
        raise HTTPException(
            status_code=404, 
            detail="File không tồn tại hoặc không có quyền xóa"
        )
    
    return {"message": "Xóa file thành công"}

@router.get("/my-files", response_model=List[FileOut])
async def get_my_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lấy danh sách file của user hiện tại"""
    file_service = FileService(db)
    files = file_service.get_files_by_user(current_user.maNguoiDung)
    return files

@router.get("/organization-files", response_model=List[FileOut])
async def get_organization_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lấy danh sách file của tổ chức"""
    if not current_user.maToChuc:
        raise HTTPException(status_code=400, detail="User không thuộc tổ chức nào")
    
    file_service = FileService(db)
    files = file_service.get_files_by_organization(current_user.maToChuc)
    return files
