from fastapi import APIRouter, Depends, status, UploadFile, File, Form, Query, HTTPException
from fastapi.responses import RedirectResponse, FileResponse
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
import os
import json
import time
import shutil
import logging
from sqlalchemy.orm.attributes import flag_modified
import uuid
from datetime import datetime, timezone

from app.db.session import get_async_db
from app.services.answer_sheet_template_service import AnswerSheetTemplateService
from app.schemas.answer_sheet_template import (
    AnswerSheetTemplateCreate,
    AnswerSheetTemplateUpdate,
    AnswerSheetTemplateOut,
    FileUploadResponse,
    TemplateFileInfo,
    TemplateSearchRequest,
    TemplateDuplicateRequest,
    TemplateStatistics,
    TemplateValidationResponse,
    TemplateVisibilityRequest,
    TemplateDefaultRequest,
    TemplateBulkDeleteRequest,
    TemplateBulkResponse,
)
from app.models.user import User
from app.models.file import File as FileModel
from app.utils.auth import check_admin_permission, check_teacher_permission
from app.services.omr_service import get_omr_service
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/answer-templates", tags=["answer_templates"])


@router.get("/", response_model=List[AnswerSheetTemplateOut])
async def read_templates(
    ma_to_chuc: Optional[int] = None, 
    current_user: User = Depends(check_teacher_permission), 
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy danh sách template (Teacher/Manager/Admin có thể xem)"""
    # Nếu là Admin, có thể xem tất cả
    if current_user.vaiTro == "ADMIN":
        return await AnswerSheetTemplateService.get_list(db, ma_to_chuc)
    
    # Nếu là Manager hoặc Teacher, xem templates của tổ chức mình + system templates (maToChuc=None) + public templates
    templates = await AnswerSheetTemplateService.get_list(db, current_user.maToChuc)
    try:
        # Lấy system templates (Admin tạo cho tất cả - maToChuc=None)
        system_templates = await AnswerSheetTemplateService.get_list(db, None)
        
        # Lấy public templates từ các tổ chức khác
        public_templates = await AnswerSheetTemplateService.get_public_templates(db)
        
        # Merge và loại bỏ duplicates based on maMauPhieu
        template_ids = {t.maMauPhieu for t in templates}
        unique_system = [t for t in system_templates if t.maMauPhieu not in template_ids]
        template_ids.update(t.maMauPhieu for t in unique_system)
        unique_public = [t for t in public_templates if t.maMauPhieu not in template_ids]
        
        all_templates = templates + unique_system + unique_public
        return all_templates
    except:
        # Fallback nếu có lỗi
        return templates

@router.post("/", response_model=AnswerSheetTemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template(
    template: AnswerSheetTemplateCreate, 
    current_user: User = Depends(check_admin_permission), 
    db: AsyncSession = Depends(get_async_db)
):
    """Tạo template mới"""
    # Validate dữ liệu trước khi tạo
    validation = await AnswerSheetTemplateService.validate_template_structure(template.dict())
    if not validation["valid"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Dữ liệu không hợp lệ: {', '.join(validation['errors'])}"
        )
    
    # Set creator info
    template.maNguoiTao = current_user.maNguoiDung
    
    # Logic tạo template theo role
    if str(current_user.vaiTro).upper() == "ADMIN":
        # Admin tạo template hệ thống (maToChuc = None) - tất cả đều xem được
        template.maToChuc = None
    else:
        # Non-admin user tạo cho tổ chức của mình
        template.maToChuc = current_user.maToChuc
    
    return await AnswerSheetTemplateService.create_template(db, template)

@router.post("/create-with-files", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_template_with_files(
    tenMauPhieu: str = Form(...),
    soCauHoi: int = Form(...),
    soLuaChonMoiCau: int = Form(4),
    khoGiay: str = Form("A4"),
    coTuLuan: bool = Form(False),
    coThongTinHocSinh: bool = Form(True),
    coLogo: bool = Form(False),
    laCongKhai: bool = Form(False),
    laMacDinh: bool = Form(False),
    template_image: UploadFile = File(..., description="File ảnh template để căn chỉnh và chấm bài (.png/.jpg)"),
    template_config: UploadFile = File(..., description="File cấu hình OMR (template.json)"), 
    template_pdf: UploadFile = File(..., description="File PDF mẫu để giáo viên in (.pdf)"),
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Tạo template mới với đầy đủ 3 file:
    1. Template Image: Ảnh để căn chỉnh và chấm bài tự động
    2. Template Config: File JSON cấu hình OMR 
    3. Template PDF: File PDF để giáo viên tải về và in
    """
    try:
        # Validate files
        # 1. Validate template image
        if template_image.content_type not in ["image/png", "image/jpeg", "image/jpg"]:
            raise HTTPException(status_code=400, detail="File ảnh template phải là PNG hoặc JPG")
        if template_image.size > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail="File ảnh template không được vượt quá 10MB")
        
        # 2. Validate template config
        if not template_config.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="File cấu hình OMR phải là JSON")
        if template_config.size > 1 * 1024 * 1024:  # 1MB
            raise HTTPException(status_code=400, detail="File JSON không được vượt quá 1MB")
        
        # 3. Validate template PDF
        if template_pdf.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="File mẫu in phải là PDF")
        if template_pdf.size > 50 * 1024 * 1024:  # 50MB
            raise HTTPException(status_code=400, detail="File PDF không được vượt quá 50MB")

        # Parse và validate JSON config
        template_config.file.seek(0)
        config_content = await template_config.read()
        try:
            omr_config = json.loads(config_content.decode('utf-8'))
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"File JSON không hợp lệ: {str(e)}")
        
        # Validate required OMR fields
        required_fields = ["pageDimensions", "bubbleDimensions", "fieldBlocks"]
        missing_fields = [field for field in required_fields if field not in omr_config]
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"File JSON thiếu các trường bắt buộc: {', '.join(missing_fields)}"
            )

        logger.info(f"Validated OMR config: {len(omr_config['fieldBlocks'])} fieldBlocks")

        # Xác định maToChuc trước
        if str(current_user.vaiTro).upper() == "ADMIN":
            # Admin tạo template hệ thống (maToChuc = None) - tất cả đều xem được
            ma_to_chuc = None
        else:
            # Non-admin user tạo cho tổ chức của mình
            ma_to_chuc = current_user.maToChuc

        # Tạo template cơ bản
        template_data = AnswerSheetTemplateCreate(
            tenMauPhieu=tenMauPhieu,
            soCauHoi=soCauHoi,
            soLuaChonMoiCau=soLuaChonMoiCau,
            khoGiay=khoGiay,
            coTuLuan=coTuLuan,
            coThongTinHocSinh=coThongTinHocSinh,
            coLogo=coLogo,
            laCongKhai=laCongKhai,
            laMacDinh=laMacDinh,
            maNguoiTao=current_user.maNguoiDung,
            maToChuc=ma_to_chuc
        )
        
        new_template = await AnswerSheetTemplateService.create_template(db, template_data)
        
        template_id = new_template.maMauPhieu
        print(f"✅ Created basic template: ID {template_id}")

        try:
            # Reset file pointers
            template_image.file.seek(0)
            template_pdf.file.seek(0)

            # Upload template image (cho chấm bài)
            print("📤 Uploading template image...")
            image_response = await AnswerSheetTemplateService.upload_template_file(
                db, template_id, template_image, current_user.maNguoiDung, ma_to_chuc
            )
            print(f"✅ Template image uploaded: {image_response}")

            # Upload template PDF (cho in ấn)
            print("📤 Uploading template PDF...")
            pdf_response = await AnswerSheetTemplateService.upload_template_file(
                db, template_id, template_pdf, current_user.maNguoiDung, ma_to_chuc
            )
            print(f"✅ Template PDF uploaded: {pdf_response}")

            # Lưu OMR config vào thư mục templates/
            # Lưu OMR config vào thư mục OMRChecker/templates/
            print("💾 Saving OMR configuration...")
            omr_templates_dir = f"${settings.OMR_DATA_DIR}/templates/template_{template_id}"
            os.makedirs(omr_templates_dir, exist_ok=True)
            
            # Lưu file template.json
            config_path = os.path.join(omr_templates_dir, "template.json")
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(omr_config, f, ensure_ascii=False, indent=2)
            print(f"✅ OMR config saved: {config_path}")

            # Copy ảnh template vào thư mục OMR với tên chuẩn
            print("🖼️ Copying template image to OMR directory...")
            updated_template = await AnswerSheetTemplateService.get_template(db, template_id)
            image_file_info = AnswerSheetTemplateService._get_file_info_from_template(updated_template)
            
            if image_file_info and image_file_info.get('maTapTin'):
                file_record = await db.get(FileModel, image_file_info['maTapTin'])
                if file_record and os.path.exists(file_record.duongDan):
                    # Copy với tên chuẩn
                    image_filename = f"template_{template_id}.png"
                    omr_image_path = os.path.join(omr_templates_dir, image_filename)
                    shutil.copy2(file_record.duongDan, omr_image_path)
                    print(f"✅ Template image copied to OMR: {omr_image_path}")
                    
                    # Update reference trong preProcessors nếu có
                    if "preProcessors" in omr_config:
                        for processor in omr_config["preProcessors"]:
                            if processor.get("name") == "AdvancedFeatureAlignment":
                                processor["options"]["reference"] = image_filename
                        
                        # Re-save config với reference updated
                        with open(config_path, 'w', encoding='utf-8') as f:
                            json.dump(omr_config, f, ensure_ascii=False, indent=2)
                        print("✅ Updated OMR config with image reference")

            # Cập nhật OMR config information với function chuyên dụng
            omr_image_path_local = omr_image_path if 'omr_image_path' in locals() else None
            AnswerSheetTemplateService._update_omr_config_in_template(
                updated_template, omr_config, config_path, omr_image_path_local
            )
            
            # Báo cho SQLAlchemy rằng trường JSON đã bị thay đổi
            flag_modified(updated_template, "cauTrucJson")
            
            await db.commit()
            await db.refresh(updated_template)
            
            print(f"✅ Template created successfully with all 3 files:")
            print(f"   📸 Template Image: {image_file_info.get('tenFileGoc', 'Unknown')}")
            print(f"   📄 Template PDF: {pdf_response.get('tenFileGoc', 'Unknown')}")
            print(f"   ⚙️ OMR Config: template.json")
            print(f"   📁 OMR Directory: {omr_templates_dir}")

            return {
                "success": True,
                "message": "Template đã được tạo thành công với đầy đủ 3 file!",
                "template": {
                    "id": template_id,
                    "name": tenMauPhieu,
                    "files": {
                        "templateImage": {
                            "name": image_file_info.get('tenFileGoc', 'Unknown'),
                            "purpose": "Căn chỉnh và chấm bài tự động",
                            "size": template_image.size
                        },
                        "templatePdf": {
                            "name": template_pdf.filename,
                            "purpose": "File mẫu để giáo viên in",
                            "size": template_pdf.size
                        },
                        "omrConfig": {
                            "name": "template.json",
                            "purpose": "Cấu hình vùng nhận dạng OMR",
                            "fieldBlocks": len(omr_config['fieldBlocks'])
                        }
                    }
                },
                "omrDirectory": omr_templates_dir
            }

        except Exception as e:
            # Rollback: xóa template nếu upload files thất bại
            logger.error(f"Error during file upload, rolling back template {template_id}")
            try:
                await AnswerSheetTemplateService.delete_template(db, template_id, current_user.maNguoiDung)
            except Exception as delete_exc:
                logger.error(f"Failed to rollback template {template_id}: {delete_exc}")
            
            raise HTTPException(status_code=500, detail=f"Lỗi upload files: {str(e)}")

    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"Unexpected error in create_template_with_files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi tạo template: {str(e)}")

@router.post("/create-with-pdf", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_template_with_pdf(
    tenMauPhieu: str = Form(...),
    soCauHoi: int = Form(...),
    soLuaChonMoiCau: int = Form(4),
    khoGiay: str = Form("A4"),
    coTuLuan: bool = Form(False),
    coThongTinHocSinh: bool = Form(True),
    coLogo: bool = Form(False),
    laCongKhai: bool = Form(False),
    laMacDinh: bool = Form(False),
    template_pdf: UploadFile = File(..., description="File PDF template để in"),
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Tạo template mới chỉ với file PDF
    Ảnh template và JSON config sẽ được upload sau ở bước cấu hình OMR
    """
    try:
        # Validate PDF file
        if template_pdf.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="File template phải là PDF")
        if template_pdf.size > 50 * 1024 * 1024:  # 50MB
            raise HTTPException(status_code=400, detail="File PDF không được vượt quá 50MB")

        print(f"✅ Validated PDF: {template_pdf.filename} ({template_pdf.size} bytes)")

        # Xác định maToChuc trước
        if str(current_user.vaiTro).upper() == "ADMIN":
            # Admin tạo template hệ thống (maToChuc = None) - tất cả đều xem được
            ma_to_chuc = None
        else:
            # Non-admin user tạo cho tổ chức của mình
            ma_to_chuc = current_user.maToChuc

        # Tạo template cơ bản
        template_data = AnswerSheetTemplateCreate(
            tenMauPhieu=tenMauPhieu,
            soCauHoi=soCauHoi,
            soLuaChonMoiCau=soLuaChonMoiCau,
            khoGiay=khoGiay,
            coTuLuan=coTuLuan,
            coThongTinHocSinh=coThongTinHocSinh,
            coLogo=coLogo,
            laCongKhai=laCongKhai,
            laMacDinh=laMacDinh,
            maNguoiTao=current_user.maNguoiDung,
            maToChuc=ma_to_chuc
        )
        
        new_template = await AnswerSheetTemplateService.create_template(db, template_data)
        
        template_id = new_template.maMauPhieu
        print(f"✅ Created basic template: ID {template_id}")

        # Upload PDF file
        print("📤 Uploading template PDF...")
        pdf_response = await AnswerSheetTemplateService.upload_template_file(
            db, template_id, template_pdf, current_user.maNguoiDung, ma_to_chuc
        )
        print(f"✅ Template PDF uploaded: {pdf_response}")

        # Cập nhật cauTrucJson với thông tin PDF
        updated_template = await AnswerSheetTemplateService.get_template(db, template_id)
        current_structure = updated_template.cauTrucJson or {}
        current_structure["fileTypes"] = {
            "templatePdf": {
                "purpose": "File mẫu để giáo viên in",
                "fileInfo": pdf_response,
                "uploaded": True
            },
            "templateImage": {
                "purpose": "Ảnh để căn chỉnh và chấm bài",
                "uploaded": False
            },
            "omrConfig": {
                "purpose": "Cấu hình vùng nhận dạng OMR", 
                "uploaded": False
            }
        }
        
        updated_template.cauTrucJson = current_structure
        await db.commit()
        await db.refresh(updated_template)
        
        print(f"✅ Template created successfully with PDF:")
        print(f"   📄 Template PDF: {template_pdf.filename}")
        print(f"   ⚠️  OMR Config: Chưa có (cần upload sau)")

        return {
            "success": True,
            "message": "Template đã được tạo thành công! Hãy vào Edit để cấu hình OMR.",
            "template": {
                "id": template_id,
                "name": tenMauPhieu,
                "pdfFile": {
                    "name": template_pdf.filename,
                    "size": template_pdf.size,
                    "uploaded": True
                },
                "omrConfigured": False,
                "nextStep": "Vào Edit → OMR Config để upload ảnh template và JSON config"
            },
            "redirectUrl": f"/dashboard/admin/answer-templates/{template_id}/edit"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in create_template_with_pdf: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi tạo template: {str(e)}")

@router.get("/{template_id}", response_model=AnswerSheetTemplateOut)
async def get_template(
    template_id: int, 
    current_user: User = Depends(check_teacher_permission), 
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy thông tin template theo ID"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền truy cập
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maToChuc != current_user.maToChuc and 
        template.maToChuc is not None and  # System templates (maToChuc=None) accessible to all
        not template.laCongKhai):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập template này")
    
    return template

@router.put("/{template_id}", response_model=AnswerSheetTemplateOut)
async def update_template(
    template_id: int, 
    template_update: AnswerSheetTemplateUpdate, 
    current_user: User = Depends(check_admin_permission), 
    db: AsyncSession = Depends(get_async_db)
):
    """Cập nhật template"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền sửa
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maNguoiTao != current_user.maNguoiDung):
        raise HTTPException(status_code=403, detail="Chỉ người tạo hoặc Admin mới có thể sửa template")
    
    # Validate dữ liệu nếu có thay đổi cấu trúc
    if any([template_update.soCauHoi, template_update.soLuaChonMoiCau, template_update.tenMauPhieu]):
        update_data = template_update.dict(exclude_unset=True)
        # Merge với dữ liệu hiện tại để validate
        current_data = {
            "tenMauPhieu": template.tenMauPhieu,
            "soCauHoi": template.soCauHoi,
            "soLuaChonMoiCau": template.soLuaChonMoiCau
        }
        current_data.update(update_data)
        
        validation = await AnswerSheetTemplateService.validate_template_structure(current_data)
        if not validation["valid"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Dữ liệu không hợp lệ: {', '.join(validation['errors'])}"
            )
    
    return await AnswerSheetTemplateService.update_template(db, template_id, template_update)

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int, 
    current_user: User = Depends(check_admin_permission), 
    db: AsyncSession = Depends(get_async_db)
):
    """Xóa template"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền xóa
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maNguoiTao != current_user.maNguoiDung):
        raise HTTPException(status_code=403, detail="Chỉ người tạo hoặc Admin mới có thể xóa template")
    
    await AnswerSheetTemplateService.delete_template(db, template_id, current_user.maNguoiDung)
    return {"message": "deleted"}

# ========== SEARCH & FILTER ==========

@router.post("/search", response_model=List[AnswerSheetTemplateOut])
async def search_templates(
    search_request: TemplateSearchRequest,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Tìm kiếm template với bộ lọc"""
    # Giới hạn tìm kiếm theo quyền
    if str(current_user.vaiTro).upper() != "ADMIN":
        search_request.ma_to_chuc = current_user.maToChuc
    
    return await AnswerSheetTemplateService.search_templates(
        db,
        keyword=search_request.keyword,
        ma_to_chuc=search_request.ma_to_chuc,
        la_cong_khai=search_request.la_cong_khai,
        la_mac_dinh=search_request.la_mac_dinh
    )

@router.get("/public", response_model=List[AnswerSheetTemplateOut])
async def get_public_templates(
    current_user: User = Depends(check_teacher_permission), 
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy danh sách template công khai"""
    return await AnswerSheetTemplateService.get_public_templates(db)

@router.get("/default", response_model=List[AnswerSheetTemplateOut])
async def get_default_templates(
    current_user: User = Depends(check_teacher_permission), 
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy danh sách template mặc định"""
    return await AnswerSheetTemplateService.get_default_templates(db)

@router.get("/organization/{ma_to_chuc}", response_model=List[AnswerSheetTemplateOut])
async def get_templates_by_organization(
    ma_to_chuc: int,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy template của tổ chức"""
    # Kiểm tra quyền truy cập
    if str(current_user.vaiTro).upper() != "ADMIN" and current_user.maToChuc != ma_to_chuc:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập template của tổ chức khác")
    
    return await AnswerSheetTemplateService.get_templates_by_organization(db, ma_to_chuc)

@router.get("/my-templates", response_model=List[AnswerSheetTemplateOut])
async def get_my_templates(
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy template của tôi"""
    return await AnswerSheetTemplateService.get_templates_by_creator(db, current_user.maNguoiDung)

# ========== FILE OPERATIONS ==========

@router.post("/{template_id}/upload", response_model=FileUploadResponse)
async def upload_template_file(
    template_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Upload file mẫu phiếu trả lời"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền upload - case insensitive for role
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maNguoiTao != current_user.maNguoiDung):
        raise HTTPException(status_code=403, detail="Chỉ người tạo hoặc Admin mới có thể upload file")
    
    # Kiểm tra loại file
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file PDF hoặc hình ảnh")
    
    # Kiểm tra kích thước file (max 10MB)
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File quá lớn (tối đa 10MB)")
    
    return await AnswerSheetTemplateService.upload_template_file(
        db, template_id, file, current_user.maNguoiDung, template.maToChuc
    )

@router.post("/{template_id}/upload-complete", response_model=dict)
async def upload_template_complete(
    template_id: int,
    template_image: UploadFile = File(..., description="File ảnh template (.png/.jpg)"),
    template_config: UploadFile = File(..., description="File cấu hình OMR (template.json)"),
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Hoàn thiện template với ảnh template và JSON config
    Endpoint này sử dụng sau khi đã upload PDF ở bước tạo template
    """
    print(f"🎯 UPLOAD-COMPLETE: Received request for template {template_id}")
    print(f"👤 User: {current_user.hoTen} (ID: {current_user.maNguoiDung})")
    print(f"🖼️ Image: {template_image.filename} ({template_image.size} bytes)")
    print(f"📄 Config: {template_config.filename} ({template_config.size} bytes)")
    
    try:
        template = await AnswerSheetTemplateService.get_template(db, template_id)
        
        # Kiểm tra quyền sửa
        if (str(current_user.vaiTro).upper() != "ADMIN" and 
            template.maNguoiTao != current_user.maNguoiDung):
            raise HTTPException(status_code=403, detail="Chỉ người tạo hoặc Admin mới có thể cấu hình template")
        
        # Validate template image
        if template_image.content_type not in ["image/png", "image/jpeg", "image/jpg"]:
            raise HTTPException(status_code=400, detail="File ảnh template phải là PNG hoặc JPG")
        if template_image.size > 20 * 1024 * 1024:  # 20MB
            raise HTTPException(status_code=400, detail="File ảnh template không được vượt quá 20MB")
        
        # Validate template config JSON
        if not template_config.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="File cấu hình OMR phải là JSON (.json)")
        if template_config.size > 2 * 1024 * 1024:  # 2MB
            raise HTTPException(status_code=400, detail="File JSON không được vượt quá 2MB")
        
        # Parse và validate JSON config
        template_config.file.seek(0)
        config_content = await template_config.read()
        try:
            omr_config = json.loads(config_content.decode('utf-8'))
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"File JSON không hợp lệ: {str(e)}")
        
        # Validate required OMR fields
        required_fields = ["pageDimensions", "bubbleDimensions", "fieldBlocks"]
        missing_fields = [field for field in required_fields if field not in omr_config]
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"File JSON thiếu các trường bắt buộc: {', '.join(missing_fields)}"
            )
        
        # Validate fieldBlocks structure
        if not isinstance(omr_config.get("fieldBlocks"), dict):
            raise HTTPException(status_code=400, detail="fieldBlocks phải là object")
        
        print(f"✅ Validated files for template {template_id}")
        print(f"   📸 Image: {template_image.filename} ({template_image.size} bytes)")
        print(f"   ⚙️ Config: {template_config.filename} ({template_config.size} bytes)")
        
        # Reset file pointers
        template_image.file.seek(0)
        
        # Tạo OMR directory và lưu cả 2 files trong đó
        print("💾 Setting up OMR configuration...")
        omr_templates_dir = f"${settings.OMR_DATA_DIR}/templates/template_{template_id}"
        os.makedirs(omr_templates_dir, exist_ok=True)
        
        # Lưu ảnh template trực tiếp vào OMR directory
        print("🖼️ Saving template image to OMR directory...")
        image_extension = template_image.filename.split('.')[-1].lower()
        template_image_filename = f"template_{template_id}.{image_extension}"
        target_image_path = os.path.join(omr_templates_dir, template_image_filename)
        
        # Reset file pointer and save image
        template_image.file.seek(0)
        image_content = await template_image.read()
        with open(target_image_path, 'wb') as f:
            f.write(image_content)
        print(f"✅ Template image saved: {target_image_path}")
        
        # Lưu file template.json trong cùng thư mục
        config_path = os.path.join(omr_templates_dir, "template.json")
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(omr_config, f, ensure_ascii=False, indent=2)
        print(f"✅ OMR config saved: {config_path}")
        
        # Tạo file info cho ảnh template (không lưu vào uploads nữa)
        image_file_size = len(image_content)
        image_response = type('ImageResponse', (), {
            'maTapTin': None,  # Không lưu vào database
            'tenFileGoc': template_image.filename,
            'kichThuocFile': image_file_size,
            'loaiFile': template_image.content_type
        })()
        
        # Cập nhật cauTrucJson với thông tin đầy đủ
        print("📝 Updating template structure...")
        updated_template = await AnswerSheetTemplateService.get_template(db, template_id)
        
        # Cập nhật thông tin file image và config riêng biệt
        print("📝 Updating template with image and config info...")
        
        # Đảm bảo cấu trúc fileTypes tồn tại
        if not updated_template.cauTrucJson:
            updated_template.cauTrucJson = {}
        if "fileTypes" not in updated_template.cauTrucJson:
            updated_template.cauTrucJson["fileTypes"] = {}
        
        # Cập nhật thông tin image template
        updated_template.cauTrucJson["fileTypes"]["templateImage"] = {
            "maTapTin": image_response.maTapTin,
            "tenFileGoc": image_response.tenFileGoc,
            "kichThuocFile": image_response.kichThuocFile,
            "loaiFile": image_response.loaiFile,
            "purpose": "Ảnh chuẩn để căn chỉnh và nhận dạng khi chấm bài",
            "uploaded": True,
            "uploadDate": int(time.time()),
            "storagePath": target_image_path,
            "omrDirectory": omr_templates_dir
        }
        
        # Cập nhật thông tin OMR config bằng helper function
        AnswerSheetTemplateService._update_omr_config_in_template(
            updated_template, omr_config, config_path, target_image_path
        )
        
        # Báo cho SQLAlchemy rằng trường JSON đã bị thay đổi
        flag_modified(updated_template, "cauTrucJson")
        
        await db.commit()
        await db.refresh(updated_template)
        
        upload_status = updated_template.cauTrucJson.get("uploadStatus", {})
        
        print(f"✅ Template {template_id} upload complete. Status: {upload_status.get('completeness')}%")
        
        return {
            "success": True,
            "message": "Template đã được cấu hình OMR thành công!" if upload_status.get('isComplete') else "Đã upload thêm file cho template",
            "template_id": template_id,
            "upload_status": upload_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in upload_template_complete: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi hoàn thiện template: {str(e)}")

@router.get("/{template_id}/file-status", response_model=dict)
async def get_template_file_status(
    template_id: int,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Kiểm tra trạng thái đầy đủ của 3 file template bắt buộc"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền truy cập
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maToChuc != current_user.maToChuc and 
        template.maToChuc is not None and  # System templates (maToChuc=None) accessible to all
        not template.laCongKhai):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập template này")
    
    file_status = {
        "template_id": template_id,
        "template_name": template.tenMauPhieu,
        "files": {
            "pdf": {
                "name": "File PDF Template",
                "purpose": "Để giáo viên tải về và in ra cho học sinh làm",
                "required": True,
                "uploaded": False,
                "file_info": None
            },
            "image": {
                "name": "Ảnh Template",
                "purpose": "Ảnh chuẩn để căn chỉnh và nhận dạng khi chấm bài",
                "required": True,
                "uploaded": False,
                "file_info": None
            },
            "json": {
                "name": "File JSON Config",
                "purpose": "Cấu trúc template định nghĩa vùng nhận dạng OMR",
                "required": True,
                "uploaded": False,
                "file_info": None
            }
        }
    }
    
    # Kiểm tra cauTrucJson
    print(f"🔍 DEBUG Template {template_id} file status check:")
    print(f"📄 cauTrucJson exists: {bool(template.cauTrucJson)}")
    if template.cauTrucJson:
        print(f"📁 fileTypes exists: {'fileTypes' in template.cauTrucJson}")
        if "fileTypes" in template.cauTrucJson:
            file_types = template.cauTrucJson["fileTypes"]
            print(f"📊 fileTypes keys: {list(file_types.keys())}")
            for file_type, info in file_types.items():
                print(f"   - {file_type}: uploaded={info.get('uploaded', False)}")
    
    if template.cauTrucJson and "fileTypes" in template.cauTrucJson:
        file_types = template.cauTrucJson["fileTypes"]
        
        # Kiểm tra PDF file
        if "templatePdf" in file_types and file_types["templatePdf"].get("uploaded", False):
            file_status["files"]["pdf"]["uploaded"] = True
            file_status["files"]["pdf"]["file_info"] = {
                "tenFileGoc": file_types["templatePdf"].get("tenFileGoc"),
                "kichThuocFile": file_types["templatePdf"].get("kichThuocFile"),
                "loaiFile": file_types["templatePdf"].get("loaiFile"),
                "uploadDate": file_types["templatePdf"].get("uploadDate"),
                "storagePath": file_types["templatePdf"].get("storagePath")
            }
        
        # Kiểm tra Image file
        if "templateImage" in file_types and file_types["templateImage"].get("uploaded", False):
            file_status["files"]["image"]["uploaded"] = True
            file_status["files"]["image"]["file_info"] = {
                "tenFileGoc": file_types["templateImage"].get("tenFileGoc"),
                "kichThuocFile": file_types["templateImage"].get("kichThuocFile"),
                "loaiFile": file_types["templateImage"].get("loaiFile"),
                "uploadDate": file_types["templateImage"].get("uploadDate"),
                "storagePath": file_types["templateImage"].get("storagePath")
            }
        
        # Kiểm tra JSON config
        if "omrConfig" in file_types and file_types["omrConfig"].get("uploaded", False):
            file_status["files"]["json"]["uploaded"] = True
            file_status["files"]["json"]["file_info"] = {
                "configData": file_types["omrConfig"].get("configData"),
                "uploadDate": file_types["omrConfig"].get("uploadDate"),
                "storagePath": file_types["omrConfig"].get("storagePath")
            }
    
    # Tính toán completeness
    uploaded_files = sum(1 for f in file_status["files"].values() if f["uploaded"])
    total_required = sum(1 for f in file_status["files"].values() if f["required"])
    
    file_status["completeness"] = {
        "uploaded_count": uploaded_files,
        "required_count": total_required,
        "percentage": round((uploaded_files / total_required) * 100, 1),
        "is_complete": uploaded_files == total_required
    }
    
    # Đưa ra hướng dẫn bước tiếp theo
    missing_files = [f["name"] for f in file_status["files"].values() if f["required"] and not f["uploaded"]]
    
    if missing_files:
        file_status["next_steps"] = {
            "message": "Template chưa hoàn thiện. Cần upload thêm:",
            "missing_files": missing_files,
            "suggestion": "Vào tab 'OMR Config' để upload file còn thiếu"
        }
    else:
        file_status["next_steps"] = {
            "message": "Template đã hoàn thiện đầy đủ 3 file!",
            "missing_files": [],
            "suggestion": "Có thể sử dụng Preview và Process OMR"
        }
    
    return file_status

@router.get("/{template_id}/file-info", response_model=TemplateFileInfo)
async def get_template_file_info(
    template_id: int,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy thông tin file của template"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền truy cập
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maToChuc != current_user.maToChuc and 
        template.maToChuc is not None and  # System templates (maToChuc=None) accessible to all
        not template.laCongKhai):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập template này")
    
    return await AnswerSheetTemplateService.get_template_file_info(db, template_id)

@router.get("/{template_id}/download")
async def download_template_file(
    template_id: int,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Download file mẫu phiếu trả lời"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền truy cập
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maToChuc != current_user.maToChuc and 
        template.maToChuc is not None and  # System templates (maToChuc=None) accessible to all
        not template.laCongKhai):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập template này")
    
    file_info = await AnswerSheetTemplateService.get_template_file_info(db, template_id)
    
    if not file_info.downloadUrl:
        raise HTTPException(status_code=404, detail="Template chưa có file")
    
    # Redirect to download URL
    return RedirectResponse(url=file_info.downloadUrl)

# ========== ADVANCED OPERATIONS ==========

@router.post("/{template_id}/duplicate", response_model=AnswerSheetTemplateOut)
async def duplicate_template(
    template_id: int,
    duplicate_request: TemplateDuplicateRequest,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Nhân bản template"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền truy cập template gốc
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maToChuc != current_user.maToChuc and 
        not template.laCongKhai):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập template này")
    
    return await AnswerSheetTemplateService.duplicate_template(
        db, template_id, duplicate_request.new_name, 
        current_user.maNguoiDung, current_user.maToChuc
    )

@router.patch("/{template_id}/visibility", response_model=AnswerSheetTemplateOut)
async def toggle_template_visibility(
    template_id: int,
    visibility_request: TemplateVisibilityRequest,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Thay đổi trạng thái công khai của template"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền thay đổi
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maNguoiTao != current_user.maNguoiDung):
        raise HTTPException(status_code=403, detail="Chỉ người tạo hoặc Admin mới có thể thay đổi trạng thái")
    
    return await AnswerSheetTemplateService.toggle_template_visibility(
        db, template_id, visibility_request.la_cong_khai
    )

@router.patch("/{template_id}/default", response_model=AnswerSheetTemplateOut)
async def set_default_template(
    template_id: int,
    default_request: TemplateDefaultRequest,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Đặt template làm mặc định"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Chỉ Admin hoặc Manager mới có thể đặt template mặc định
    if str(current_user.vaiTro).upper() not in ["ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Chỉ Admin hoặc Manager mới có thể đặt template mặc định")
    
    # Manager chỉ có thể đặt template của tổ chức mình
    if str(current_user.vaiTro).upper() == "MANAGER" and template.maToChuc != current_user.maToChuc:
        raise HTTPException(status_code=403, detail="Không có quyền thay đổi template của tổ chức khác")
    
    return await AnswerSheetTemplateService.set_default_template(
        db, template_id, default_request.la_mac_dinh
    )

@router.get("/{template_id}/statistics", response_model=TemplateStatistics)
async def get_template_statistics(
    template_id: int,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy thống kê sử dụng template"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền truy cập
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maToChuc != current_user.maToChuc and 
        not template.laCongKhai):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập template này")
    
    return await AnswerSheetTemplateService.get_template_statistics(db, template_id)

@router.post("/{template_id}/validate", response_model=TemplateValidationResponse)
async def validate_specific_template(
    template_id: int,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Convert template object to dict for validation
    template_data = {
        "tenMauPhieu": template.tenMauPhieu,
        "soCauHoi": template.soCauHoi,
        "soLuaChonMoiCau": template.soLuaChonMoiCau,
        "khoGiay": template.khoGiay,
        "coTuLuan": template.coTuLuan,
        "coThongTinHocSinh": template.coThongTinHocSinh,
        "coLogo": template.coLogo,
        "laCongKhai": template.laCongKhai,
        "laMacDinh": template.laMacDinh
    }
    
    return await AnswerSheetTemplateService.validate_template_structure(template_data)

# ========== BULK OPERATIONS ==========

@router.post("/bulk-delete", response_model=TemplateBulkResponse)
async def bulk_delete_templates(
    bulk_request: TemplateBulkDeleteRequest,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Xóa nhiều template cùng lúc"""
    processed_count = 0
    failed_count = 0
    errors = []
    
    for template_id in bulk_request.template_ids:
        try:
            template = await AnswerSheetTemplateService.get_template(db, template_id)
            
            # Kiểm tra quyền xóa
            if (str(current_user.vaiTro).upper() != "ADMIN" and 
                template.maNguoiTao != current_user.maNguoiDung):
                errors.append(f"Template {template_id}: Không có quyền xóa")
                failed_count += 1
                continue
            
            await AnswerSheetTemplateService.delete_template(db, template_id, current_user.maNguoiDung)
            processed_count += 1
            
        except Exception as e:
            errors.append(f"Template {template_id}: {str(e)}")
            failed_count += 1
    
    return TemplateBulkResponse(
        success=failed_count == 0,
        message=f"Đã xử lý {processed_count} template, {failed_count} lỗi",
        processed_count=processed_count,
        failed_count=failed_count,
        errors=errors
    )

# ========== OMR INTEGRATION ==========

@router.post("/{template_id}/omr-config", response_model=dict)
async def configure_omr_template(
    template_id: int,
    omr_config: dict,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Cấu hình OMR cho template"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền sửa
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maNguoiTao != current_user.maNguoiDung):
        raise HTTPException(status_code=403, detail="Chỉ người tạo hoặc Admin mới có thể cấu hình OMR")
    
    # Validate OMR config
    validation = await get_omr_service().validate_template(omr_config)
    if not validation["valid"]:
        raise HTTPException(
            status_code=400,
            detail=f"OMR config không hợp lệ: {', '.join(validation['errors'])}"
        )
    
    # Convert và lưu OMR template
    omr_template = await get_omr_service().convert_eduscan_template_to_omr(omr_config)
    template_path = await get_omr_service().save_omr_template(template_id, omr_template)
    
    # Cập nhật cauTrucJson với OMR config
    current_structure = template.cauTrucJson or {}
    current_structure["omrConfig"] = omr_config
    current_structure["omrTemplatePath"] = template_path
    
    update_data = AnswerSheetTemplateUpdate(cauTrucJson=current_structure)
    await AnswerSheetTemplateService.update_template(db, template_id, update_data)
    
    return {
        "message": "OMR configuration saved successfully",
        "template_path": template_path,
        "validation": validation
    }

@router.get("/{template_id}/omr-preview", response_model=dict)
async def preview_omr_template_info(
    template_id: int,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Preview OMR template info (không cần upload file)"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền truy cập
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maToChuc != current_user.maToChuc and 
        not template.laCongKhai):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập template này")
    
    # Kiểm tra có OMR config không
    has_cau_truc_json = template.cauTrucJson is not None
    has_omr_config = has_cau_truc_json and "omrConfig" in template.cauTrucJson
    
    if not has_omr_config:
        return {
            "template_id": template_id,
            "template_name": template.tenMauPhieu,
            "has_cau_truc_json": has_cau_truc_json,
            "has_omr_config": False,
            "message": "Template chưa được cấu hình OMR"
        }
    
    # Gọi OMRService để preview template
    try:
        result = await get_omr_service().preview_template(template_id)
        result.update({
            "template_id": template_id,
            "template_name": template.tenMauPhieu,
            "has_omr_config": True
        })
        return result
    except Exception as e:
        logger.error(f"Error previewing template {template_id}: {str(e)}")
        return {
            "template_id": template_id,
            "template_name": template.tenMauPhieu,
            "has_omr_config": True,
            "error": str(e),
            "message": f"Lỗi khi preview template: {str(e)}"
        }

@router.post("/{template_id}/omr-preview", response_model=dict)
async def preview_omr_template_with_image(
    template_id: int,
    sample_image: UploadFile = File(..., description="Ảnh mẫu để preview OMR template"),
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Preview OMR template với sample image (POST để upload file)"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền truy cập
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maToChuc != current_user.maToChuc and 
        not template.laCongKhai):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập template này")
    
    # Kiểm tra có OMR config không
    has_cau_truc_json = template.cauTrucJson is not None
    has_omr_config = has_cau_truc_json and "omrConfig" in template.cauTrucJson
    
    if not has_omr_config:
        return {
            "template_id": template_id,
            "template_name": template.tenMauPhieu,
            "has_omr_config": False,
            "sample_image_received": sample_image.filename if sample_image else None,
            "message": "Template chưa được cấu hình OMR"
        }
    
    # Gọi OMRService để preview template với sample image
    try:
        result = await get_omr_service().preview_template(template_id, sample_image)
        result.update({
            "template_id": template_id,
            "template_name": template.tenMauPhieu,
            "has_omr_config": True,
            "sample_image_received": sample_image.filename if sample_image else None,
            "sample_image_size": sample_image.size if sample_image else None
        })
        return result
    except Exception as e:
        logger.error(f"Error previewing template {template_id} with image: {str(e)}")
        return {
            "template_id": template_id,
            "template_name": template.tenMauPhieu,
            "has_omr_config": True,
            "sample_image_received": sample_image.filename if sample_image else None,
            "error": str(e),
            "message": f"Lỗi khi preview template với ảnh: {str(e)}"
        }

@router.post("/{template_id}/process-omr", response_model=dict)
async def process_omr_images(
    template_id: int,
    exam_id: int = Form(...),
    images: List[UploadFile] = File(...),
    yolo_model: str = Form("models/best.pt"),
    confidence: float = Form(0.25),
    auto_align: bool = Form(True),
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Xử lý batch OMR images - Requires Authentication"""
    return await process_omr_images_real(
        template_id=template_id,
        exam_id=exam_id,
        images=images,
        yolo_model=yolo_model,
        confidence=confidence,
        auto_align=auto_align,
        current_user=current_user,
        db=db
    )

# TEST ENDPOINT - NO AUTHENTICATION REQUIRED
@router.post("/{template_id}/process-omr-test", response_model=dict, include_in_schema=False)
async def process_omr_images_test(
    template_id: int,
    exam_id: int = Form(...),
    images: List[UploadFile] = File(...),
    yolo_model: str = Form("models/best.pt"),
    confidence: float = Form(0.25),
    auto_align: bool = Form(True),
    db: AsyncSession = Depends(get_async_db)
):
    """Xử lý batch OMR images - TEST VERSION (No Auth)"""
    try:
        # Mock response for testing
        return {
            "success": True,
            "message": "Mock OMR processing completed successfully",
            "template_id": template_id,
            "exam_id": exam_id,
            "processed_images": len(images),
            "results": [
                {
                    "id": str(uuid.uuid4()),
                    "studentId": f"HS{i+1:03d}",
                    "score": 85 + (i * 2),
                    "percentage": 85.0 + (i * 2.0),
                    "answers": ["A", "B", "C", "D"] * 5,
                    "correctAnswers": 17 + i,
                    "wrongAnswers": 2,
                    "blankAnswers": 1 - i if i == 0 else 0,
                    "scanTime": datetime.now(timezone.utc).isoformat(),
                    "confidence": 0.95,
                }
                for i in range(min(len(images), 5))
            ],
            "processing_time": "2.34s",
            "yolo_model": yolo_model,
            "confidence_threshold": confidence,
            "auto_align": auto_align,
            "status": "completed",
            "note": "This is a test endpoint for development purposes"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Test endpoint error",
            "template_id": template_id,
            "exam_id": exam_id
        }

async def process_omr_images_real(
    template_id: int,
    exam_id: int,
    images: List[UploadFile],
    yolo_model: str,
    confidence: float,
    auto_align: bool,
    current_user: User,
    db: AsyncSession
):
    """Original OMR processing logic"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền truy cập
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maToChuc != current_user.maToChuc and 
        not template.laCongKhai):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập template này")
    
    # Kiểm tra có OMR config không
    if not template.cauTrucJson or "omrConfig" not in template.cauTrucJson:
        raise HTTPException(status_code=400, detail="Template chưa được cấu hình OMR")
    
    # Xử lý OMR
    result = await get_omr_service().process_omr_images(
        db=db,
        exam_id=exam_id,
        template_id=template_id,
        images=images,
        yolo_model=yolo_model,
        confidence=confidence,
        auto_align=auto_align
    )
    
    return result

@router.get("/omr/models", response_model=List[dict])
async def get_omr_models(
    current_user: User = Depends(check_teacher_permission)
):
    """Lấy danh sách YOLO models có sẵn"""
    return await get_omr_service().get_available_models()

@router.get("/{template_id}/download-pdf")
async def download_template_pdf(
    template_id: int,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Download file PDF template để in"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền truy cập
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maToChuc != current_user.maToChuc and 
        not template.laCongKhai):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập template này")
    
    # Tìm file PDF trong cauTrucJson
    if not template.cauTrucJson or "fileTypes" not in template.cauTrucJson:
        raise HTTPException(status_code=404, detail="Template chưa có file PDF")
    
    pdf_info = template.cauTrucJson["fileTypes"].get("templatePdf")
    if not pdf_info:
        raise HTTPException(status_code=404, detail="Template không có file PDF")
    
    # Lấy file record từ database
    file_info = pdf_info.get("fileInfo", {})
    if not file_info.get("maTapTin"):
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin file PDF")
    
    file_record = await db.get(FileModel, file_info["maTapTin"])
    if not file_record or not os.path.exists(file_record.duongDan):
        raise HTTPException(status_code=404, detail="File PDF không tồn tại")
    
    return FileResponse(
        file_record.duongDan,
        media_type="application/pdf",
        filename=f"{template.tenMauPhieu}_template.pdf"
    )

@router.get("/{template_id}/file-details", response_model=dict)
async def get_template_file_details(
    template_id: int,
    current_user: User = Depends(check_teacher_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Lấy thông tin chi tiết về tất cả các file đã upload cho template"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    # Kiểm tra quyền truy cập
    if (str(current_user.vaiTro).upper() != "ADMIN" and 
        template.maToChuc != current_user.maToChuc and 
        not template.laCongKhai):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập template này")
    
    if not template.cauTrucJson:
        return {
            "template_id": template_id,
            "template_name": template.tenMauPhieu,
            "files": {},
            "upload_status": {
                "completeness": 0,
                "uploaded_count": 0,
                "total_files": 3,
                "is_complete": False
            }
        }
    
    file_types = template.cauTrucJson.get("fileTypes", {})
    upload_status = template.cauTrucJson.get("uploadStatus", {})
    
    # Detailed file information
    file_details = {}
    
    for file_type, info in file_types.items():
        file_details[file_type] = {
            "purpose": info.get("purpose", ""),
            "uploaded": info.get("uploaded", False),
            "upload_date": info.get("uploadDate"),
            "storage_info": {
                "backend_path": info.get("storagePath", ""),
                "omr_path": info.get("omrCopyPath", ""),
                "download_url": info.get("downloadUrl", "")
            },
            "file_info": {
                "name": info.get("tenFileGoc", ""),
                "size": info.get("kichThuocFile", 0),
                "type": info.get("loaiFile", ""),
                "database_id": info.get("maTapTin")
            }
        }
        
        # Add specific config data for OMR
        if file_type == "omrConfig" and "configData" in info:
            file_details[file_type]["config_summary"] = info["configData"]
    
    return {
        "template_id": template_id,
        "template_name": template.tenMauPhieu,
        "files": file_details,
        "upload_status": {
            "completeness": upload_status.get("completeness", 0),
            "uploaded_count": upload_status.get("uploadedTypes", 0),
            "total_files": upload_status.get("totalTypes", 3),
            "is_complete": upload_status.get("isComplete", False),
            "missing_types": upload_status.get("missingTypes", []),
            "last_update": upload_status.get("lastUpdate")
        },
        "storage_locations": {
            "backend_uploads": "/backend/app/uploads/template/",
            "omr_templates": f"/backend/${settings.OMR_DATA_DIR}/templates/template_{template_id}/",
            "database_table": "TAPTIN"
        }
    }

# ========== PUBLIC ENDPOINTS (NO AUTHENTICATION) ==========

@router.get("/public/{template_id}/preview-pdf", include_in_schema=False)
async def public_preview_template_pdf(
    template_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Preview file PDF template công khai - không cần authentication"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    if not template.laCongKhai and not template.laMacDinh:
        raise HTTPException(status_code=403, detail="Template này không công khai")
    
    if not template.cauTrucJson or "fileTypes" not in template.cauTrucJson:
        raise HTTPException(status_code=404, detail="Template chưa có file PDF")
    
    pdf_info = template.cauTrucJson["fileTypes"].get("templatePdf")
    if not pdf_info or not pdf_info.get("uploaded"):
        raise HTTPException(status_code=404, detail="Template không có file PDF hoặc chưa được upload")
    
    ma_tap_tin = pdf_info.get("maTapTin")
    if not ma_tap_tin:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin mã tệp tin của file PDF")

    file_record = await db.get(FileModel, ma_tap_tin)
    if not file_record or not os.path.exists(file_record.duongDan):
        raise HTTPException(status_code=404, detail="File PDF không tồn tại trên server")
    
    return FileResponse(
        file_record.duongDan,
        media_type="application/pdf",
        filename=f"{template.tenMauPhieu}_preview.pdf",
        headers={"Content-Disposition": "inline"}
    )

@router.get("/public/{template_id}/download-pdf", include_in_schema=False)
async def public_download_template_pdf(
    template_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Download file PDF template công khai - không cần authentication"""
    template = await AnswerSheetTemplateService.get_template(db, template_id)
    
    if not template.laCongKhai and not template.laMacDinh:
        raise HTTPException(status_code=403, detail="Template này không công khai")
    
    if not template.cauTrucJson or "fileTypes" not in template.cauTrucJson:
        raise HTTPException(status_code=404, detail="Template chưa có file PDF")
    
    pdf_info = template.cauTrucJson["fileTypes"].get("templatePdf")
    if not pdf_info or not pdf_info.get("uploaded"):
        raise HTTPException(status_code=404, detail="Template không có file PDF hoặc chưa được upload")
        
    ma_tap_tin = pdf_info.get("maTapTin")
    if not ma_tap_tin:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin mã tệp tin của file PDF")

    file_record = await db.get(FileModel, ma_tap_tin)
    if not file_record or not os.path.exists(file_record.duongDan):
        raise HTTPException(status_code=404, detail="File PDF không tồn tại trên server")
    
    return FileResponse(
        file_record.duongDan,
        media_type="application/pdf",
        filename=f"{template.tenMauPhieu}_template.pdf"
    )
