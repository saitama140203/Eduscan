from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import select, create_engine, func
from fastapi import HTTPException, status, UploadFile
from typing import List, Optional
import json
import os
import shutil
import time

from app.models.answer_sheet_template import AnswerSheetTemplate
from app.models.file import File
from app.schemas.answer_sheet_template import (
    AnswerSheetTemplateCreate,
    AnswerSheetTemplateUpdate,
    AnswerSheetTemplateOut,
    FileUploadResponse,
    TemplateFileInfo,
    FileInfo,
)
from app.services.file_service import FileService
from app.core.config import settings

class AnswerSheetTemplateService:
    @staticmethod
    async def get_list(db: AsyncSession, maToChuc: Optional[int] = None) -> List[AnswerSheetTemplateOut]:
        stmt = select(AnswerSheetTemplate)
        if maToChuc:
            stmt = stmt.where(AnswerSheetTemplate.maToChuc == maToChuc)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_template(db: AsyncSession, template_id: int) -> AnswerSheetTemplate:
        template = await db.get(AnswerSheetTemplate, template_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        return template

    @staticmethod
    async def create_template(db: AsyncSession, template_in: AnswerSheetTemplateCreate) -> AnswerSheetTemplate:
        template = AnswerSheetTemplate(**template_in.dict())
        db.add(template)
        await db.commit()
        await db.refresh(template)
        return template

    @staticmethod
    async def update_template(db: AsyncSession, template_id: int, template_upd: AnswerSheetTemplateUpdate) -> AnswerSheetTemplate:
        template = await AnswerSheetTemplateService.get_template(db, template_id)
        for attr, value in template_upd.dict(exclude_unset=True).items():
            setattr(template, attr, value)
        await db.commit()
        await db.refresh(template)
        return template

    @staticmethod
    def _get_file_info_from_template(template: AnswerSheetTemplate) -> Optional[dict]:
        """Extract file info from cauTrucJson"""
        if template.cauTrucJson and isinstance(template.cauTrucJson, dict):
            return template.cauTrucJson.get('fileInfo')
        return None

    @staticmethod
    def _update_file_info_in_template(template: AnswerSheetTemplate, file_info: dict):
        """Update file info in template cauTrucJson"""
        if not template.cauTrucJson:
            template.cauTrucJson = {}
        
        # Ensure fileInfo structure exists
        if "fileInfo" not in template.cauTrucJson:
            template.cauTrucJson["fileInfo"] = {}
        
        # Update with comprehensive file information
        template.cauTrucJson["fileInfo"].update({
            "maTapTin": file_info.get("maTapTin"),
            "tenFileGoc": file_info.get("tenFileGoc"),
            "kichThuocFile": file_info.get("kichThuocFile"),
            "loaiFile": file_info.get("loaiFile"),
            "uploadDate": int(time.time()),
            "status": "uploaded"
        })
        
        # Ensure fileTypes structure exists for tracking multiple file types
        if "fileTypes" not in template.cauTrucJson:
            template.cauTrucJson["fileTypes"] = {}
        
        # Determine file type based on content type
        content_type = file_info.get("loaiFile", "")
        if "image" in content_type:
            template.cauTrucJson["fileTypes"]["templateImage"] = {
                "maTapTin": file_info.get("maTapTin"),
                "tenFileGoc": file_info.get("tenFileGoc"),
                "kichThuocFile": file_info.get("kichThuocFile"),
                "loaiFile": file_info.get("loaiFile"),
                "purpose": "Ảnh chuẩn để căn chỉnh và nhận dạng khi chấm bài",
                "uploaded": True,
                "uploadDate": int(time.time()),
                "storagePath": f"{settings.OMR_DATA_DIR}/templates/template_{template.maMauPhieu}/template_{template.maMauPhieu}.{file_info.get('tenFileGoc', '').split('.')[-1] if '.' in file_info.get('tenFileGoc', '') else 'png'}",
                "omrDirectory": f"{settings.OMR_DATA_DIR}/templates/template_{template.maMauPhieu}/"
            }
        elif "pdf" in content_type:
            template.cauTrucJson["fileTypes"]["templatePdf"] = {
                "maTapTin": file_info.get("maTapTin"),
                "tenFileGoc": file_info.get("tenFileGoc"),
                "kichThuocFile": file_info.get("kichThuocFile"),
                "loaiFile": file_info.get("loaiFile"),
                "purpose": "File PDF mẫu để giáo viên tải về và in",
                "uploaded": True,
                "uploadDate": int(time.time()),
                "storagePath": f"app/uploads/template/{file_info.get('tenFileGoc')}",
                "downloadUrl": f"/api/v1/answer-templates/{template.maMauPhieu}/download-pdf"
            }
        
        # Track overall upload status
        uploaded_types = [k for k, v in template.cauTrucJson["fileTypes"].items() if v.get("uploaded")]
        template.cauTrucJson["uploadStatus"] = {
            "totalTypes": 3,  # Image, PDF, OMR Config
            "uploadedTypes": len(uploaded_types),
            "completeness": len(uploaded_types) / 3 * 100,
            "lastUpdate": int(time.time()),
            "isComplete": len(uploaded_types) >= 3,  # Add this line
            "missingTypes": [
                t for t in ["templateImage", "templatePdf", "omrConfig"] 
                if t not in uploaded_types
            ]
        }
        
        print(f"📝 Updated template file info: {uploaded_types} ({len(uploaded_types)}/3 files)")

    @staticmethod
    async def delete_template(db: AsyncSession, template_id: int, ma_nguoi_dung: int) -> None:
        template = await AnswerSheetTemplateService.get_template(db, template_id)
        
        # Kiểm tra xem có bài kiểm tra nào đang sử dụng template này không
        from sqlalchemy import select, text
        from app.models.exam import Exam
        
        # Đếm số bài kiểm tra sử dụng template này
        count_stmt = select(func.count(Exam.maBaiKiemTra)).where(Exam.maMauPhieu == template_id)
        result = await db.execute(count_stmt)
        exam_count = result.scalar()
        
        if exam_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Không thể xóa template này vì có {exam_count} bài kiểm tra đang sử dụng. Vui lòng xóa hoặc thay đổi template của các bài kiểm tra trước."
            )
        
        # Delete associated files from TAPTIN using async approach
        file_info = AnswerSheetTemplateService._get_file_info_from_template(template)
        if file_info and file_info.get('maTapTin'):
            # Delete file record from database
            file_id = file_info['maTapTin']
            file_record = await db.get(File, file_id)
            if file_record:
                # Delete physical file
                if os.path.exists(file_record.duongDan):
                    try:
                        os.remove(file_record.duongDan)
                        print(f"🗑️ Đã xóa file vật lý: {file_record.duongDan}")
                    except Exception as e:
                        print(f"⚠️ Không thể xóa file vật lý: {e}")
                
                # Delete database record
                await db.delete(file_record)
                print(f"🗑️ Đã xóa file record: ID {file_id}")
        
        await db.delete(template)
        await db.commit()

    @staticmethod
    async def upload_template_file(
        db: AsyncSession, 
        template_id: int, 
        file: UploadFile,
        ma_nguoi_dung: int,
        ma_to_chuc: int
    ) -> FileUploadResponse:
        """Upload file mẫu phiếu trả lời với async handling"""
        template = await AnswerSheetTemplateService.get_template(db, template_id)
        
        # Xóa file cũ nếu có - using async approach
        old_file_info = AnswerSheetTemplateService._get_file_info_from_template(template)
        if old_file_info and old_file_info.get('maTapTin'):
            # Delete old file record from database
            old_file_id = old_file_info['maTapTin']
            old_file_record = await db.get(File, old_file_id)
            if old_file_record:
                # Delete physical file
                if os.path.exists(old_file_record.duongDan):
                    try:
                        os.remove(old_file_record.duongDan)
                        print(f"🗑️ Đã xóa file cũ: {old_file_record.duongDan}")
                    except Exception as e:
                        print(f"⚠️ Không thể xóa file cũ: {e}")
                
                # Delete database record
                await db.delete(old_file_record)
                print(f"🗑️ Đã xóa file record cũ: ID {old_file_id}")
        
        # Save file directly without using FileService to avoid sync/async mix
        upload_dir = settings.UPLOAD_DIR
        sub_dir = os.path.join(upload_dir, "template")
        if not os.path.exists(sub_dir):
            os.makedirs(sub_dir, exist_ok=True)
        
        # Create unique filename
        timestamp = int(time.time())
        safe_filename = f"{timestamp}_{file.filename or 'unknown'}"
        file_path = os.path.join(sub_dir, safe_filename)
        

        
        try:
            # Reset file pointer and save to disk
            file.file.seek(0)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            if not os.path.exists(file_path):
                raise Exception("File không được lưu thành công")
            
            file_size = os.path.getsize(file_path)
            file_type = file.content_type or "application/octet-stream"
            

            
            # Create database record using async session
            db_file = File(
                maNguoiDung=ma_nguoi_dung,
                maToChuc=ma_to_chuc,
                tenTapTin=file.filename,
                duongDan=file_path,
                loaiTapTin=file_type,
                kichThuoc=file_size,
                thucTheNguon="TEMPLATE",
                maThucTheNguon=template_id
            )
            
            db.add(db_file)
            await db.flush()  # Get ID without commit
            await db.refresh(db_file)
            
            print(f"✅ Database record tạo thành công: ID {db_file.maTapTin}")
            
            # Create new file info for cauTrucJson
            new_file_info = {
                "maTapTin": db_file.maTapTin,
                "tenFileGoc": file.filename,
                "kichThuocFile": file.size,
                "loaiFile": file.content_type
            }
            
            # Update template with new file info
            AnswerSheetTemplateService._update_file_info_in_template(template, new_file_info)
            
            await db.commit()
            await db.refresh(template)
            
            return FileUploadResponse(
                success=True,
                message="File uploaded successfully",
                fileUrl=f"/api/v1/files/{db_file.maTapTin}/download",
                previewUrl=f"/api/v1/files/{db_file.maTapTin}/preview",
                cloudFileId=str(db_file.maTapTin),
                fileName=file.filename or "",
                fileSize=file.size or 0,
                fileType=file.content_type or ""
            )
            
        except Exception as e:
            print(f"❌ Lỗi lưu file: {str(e)}")
            await db.rollback()
            
            # Cleanup file on error
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"🗑️ Đã xóa file lỗi: {file_path}")
                except:
                    pass
            
            raise HTTPException(status_code=500, detail=f"Lỗi lưu file: {str(e)}")

    @staticmethod
    async def upload_template_complete(
        db: AsyncSession, 
        template_id: int, 
        template_image: UploadFile,
        template_config: UploadFile,
        ma_nguoi_dung: int,
        ma_to_chuc: int
    ) -> dict:
        """Upload cả file ảnh template và file cấu hình OMR cùng lúc"""
        import json
        template = await AnswerSheetTemplateService.get_template(db, template_id)
        
        # Parse và validate JSON config trước
        try:
            template_config.file.seek(0)
            config_content = await template_config.read()
            omr_config = json.loads(config_content.decode('utf-8'))
            
            # Validate required fields
            required_fields = ["pageDimensions", "bubbleDimensions", "fieldBlocks"]
            for field in required_fields:
                if field not in omr_config:
                    raise HTTPException(status_code=400, detail=f"Thiếu trường bắt buộc trong JSON config: {field}")
            
            print(f"✅ OMR config validated: {len(omr_config['fieldBlocks'])} fieldBlocks")
            
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"File JSON không hợp lệ: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Lỗi xử lý file config: {str(e)}")
        
        # Reset template_image pointer
        template_image.file.seek(0)
        
        # Upload image file và lấy thông tin
        image_response = await AnswerSheetTemplateService.upload_template_file(
            db, template_id, template_image, ma_nguoi_dung, ma_to_chuc
        )
        
        # Lưu OMR config vào thư mục OMRChecker/templates/
        import os
        omr_templates_dir = f"{settings.OMR_DATA_DIR}/templates/template_{template_id}"
        os.makedirs(omr_templates_dir, exist_ok=True)
        
        # Lưu file template.json
        config_path = os.path.join(omr_templates_dir, "template.json")
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(omr_config, f, ensure_ascii=False, indent=2)
        
        # Copy ảnh template vào thư mục OMR
        image_file_info = AnswerSheetTemplateService._get_file_info_from_template(template)
        if image_file_info and image_file_info.get('maTapTin'):
            file_record = await db.get(File, image_file_info['maTapTin'])
            if file_record and os.path.exists(file_record.duongDan):
                # Copy với tên chuẩn
                image_filename = f"template_{template_id}.png"
                omr_image_path = os.path.join(omr_templates_dir, image_filename)
                import shutil
                shutil.copy2(file_record.duongDan, omr_image_path)
                
                # Update reference trong preProcessors nếu có
                if "preProcessors" in omr_config:
                    for processor in omr_config["preProcessors"]:
                        if processor.get("name") == "AdvancedFeatureAlignment":
                            processor["options"]["reference"] = image_filename
                    
                    # Re-save config với reference updated
                    with open(config_path, 'w', encoding='utf-8') as f:
                        json.dump(omr_config, f, ensure_ascii=False, indent=2)
        
        # Cập nhật cauTrucJson với OMR config
        current_structure = template.cauTrucJson or {}
        current_structure["omrConfig"] = omr_config
        current_structure["omrTemplatePath"] = config_path
        current_structure["omrImagePath"] = omr_image_path if 'omr_image_path' in locals() else None
        
        template.cauTrucJson = current_structure
        await db.commit()
        await db.refresh(template)
        
        print(f"✅ Template complete upload: Image + OMR config saved to {omr_templates_dir}")
        
        return {
            "success": True,
            "message": "Upload hoàn tất! Đã lưu cả file ảnh template và cấu hình OMR",
            "image_info": image_response.dict(),
            "omr_config_path": config_path,
            "omr_image_path": omr_image_path if 'omr_image_path' in locals() else None,
            "fieldBlocks_count": len(omr_config['fieldBlocks'])
        }

    @staticmethod
    async def get_template_file_info(db: AsyncSession, template_id: int) -> TemplateFileInfo:
        """Lấy thông tin file của template"""
        template = await AnswerSheetTemplateService.get_template(db, template_id)
        
        file_info = AnswerSheetTemplateService._get_file_info_from_template(template)
        
        download_url = None
        preview_url = None
        if file_info and file_info.get('maTapTin'):
            ma_tap_tin = file_info['maTapTin']
            download_url = f"/api/v1/files/{ma_tap_tin}/download"
            preview_url = f"/api/v1/files/{ma_tap_tin}/preview"
        
        return TemplateFileInfo(
            maMauPhieu=template.maMauPhieu,
            tenMauPhieu=template.tenMauPhieu,
            urlFileMau=download_url,
            urlFilePreview=preview_url,
            tenFileGoc=file_info.get('tenFileGoc') if file_info else None,
            downloadUrl=download_url
        )

    @staticmethod
    async def get_public_templates(db: AsyncSession) -> List[AnswerSheetTemplateOut]:
        """Lấy danh sách template công khai"""
        stmt = select(AnswerSheetTemplate).where(AnswerSheetTemplate.laCongKhai == True)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_default_templates(db: AsyncSession) -> List[AnswerSheetTemplateOut]:
        """Lấy danh sách template mặc định"""
        stmt = select(AnswerSheetTemplate).where(AnswerSheetTemplate.laMacDinh == True)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_templates_by_organization(db: AsyncSession, ma_to_chuc: int) -> List[AnswerSheetTemplateOut]:
        """Lấy danh sách template của tổ chức"""
        stmt = select(AnswerSheetTemplate).where(AnswerSheetTemplate.maToChuc == ma_to_chuc)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_templates_by_creator(db: AsyncSession, ma_nguoi_tao: int) -> List[AnswerSheetTemplateOut]:
        """Lấy danh sách template của người tạo"""
        stmt = select(AnswerSheetTemplate).where(AnswerSheetTemplate.maNguoiTao == ma_nguoi_tao)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def search_templates(
        db: AsyncSession, 
        keyword: Optional[str] = None,
        ma_to_chuc: Optional[int] = None,
        la_cong_khai: Optional[bool] = None,
        la_mac_dinh: Optional[bool] = None
    ) -> List[AnswerSheetTemplateOut]:
        """Tìm kiếm template theo từ khóa và bộ lọc"""
        stmt = select(AnswerSheetTemplate)
        
        if keyword:
            stmt = stmt.where(AnswerSheetTemplate.tenMauPhieu.ilike(f"%{keyword}%"))
        
        if ma_to_chuc is not None:
            stmt = stmt.where(AnswerSheetTemplate.maToChuc == ma_to_chuc)
        
        if la_cong_khai is not None:
            stmt = stmt.where(AnswerSheetTemplate.laCongKhai == la_cong_khai)
        
        if la_mac_dinh is not None:
            stmt = stmt.where(AnswerSheetTemplate.laMacDinh == la_mac_dinh)
        
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def duplicate_template(
        db: AsyncSession, 
        template_id: int, 
        new_name: str,
        ma_nguoi_tao: int,
        ma_to_chuc: int
    ) -> AnswerSheetTemplate:
        """Nhân bản template"""
        original_template = await AnswerSheetTemplateService.get_template(db, template_id)
        
        # Tạo template mới với thông tin từ template gốc
        new_template_data = {
            "tenMauPhieu": new_name,
            "soCauHoi": original_template.soCauHoi,
            "soLuaChonMoiCau": original_template.soLuaChonMoiCau,
            "khoGiay": original_template.khoGiay,
            "coTuLuan": original_template.coTuLuan,
            "coThongTinHocSinh": original_template.coThongTinHocSinh,
            "coLogo": original_template.coLogo,
            "cauTrucJson": original_template.cauTrucJson.copy() if original_template.cauTrucJson else {},
            "cssFormat": original_template.cssFormat,
            "maNguoiTao": ma_nguoi_tao,
            "maToChuc": ma_to_chuc,
            "laCongKhai": False,  # Template sao chép mặc định là private
            "laMacDinh": False
        }
        
        # Xóa thông tin file khỏi template sao chép (file không được sao chép)
        if new_template_data["cauTrucJson"] and "fileInfo" in new_template_data["cauTrucJson"]:
            del new_template_data["cauTrucJson"]["fileInfo"]
        
        new_template = AnswerSheetTemplate(**new_template_data)
        db.add(new_template)
        await db.commit()
        await db.refresh(new_template)
        
        return new_template

    @staticmethod
    async def toggle_template_visibility(
        db: AsyncSession, 
        template_id: int, 
        la_cong_khai: bool
    ) -> AnswerSheetTemplate:
        """Thay đổi trạng thái công khai của template"""
        template = await AnswerSheetTemplateService.get_template(db, template_id)
        template.laCongKhai = la_cong_khai
        await db.commit()
        await db.refresh(template)
        return template

    @staticmethod
    async def set_default_template(
        db: AsyncSession, 
        template_id: int, 
        la_mac_dinh: bool
    ) -> AnswerSheetTemplate:
        """Đặt template làm mặc định"""
        template = await AnswerSheetTemplateService.get_template(db, template_id)
        
        # Nếu đặt làm mặc định, bỏ mặc định của các template khác trong cùng tổ chức
        if la_mac_dinh:
            stmt = select(AnswerSheetTemplate).where(
                AnswerSheetTemplate.maToChuc == template.maToChuc,
                AnswerSheetTemplate.laMacDinh == True
            )
            result = await db.execute(stmt)
            existing_defaults = result.scalars().all()
            
            for existing_template in existing_defaults:
                existing_template.laMacDinh = False
        
        template.laMacDinh = la_mac_dinh
        await db.commit()
        await db.refresh(template)
        return template

    @staticmethod
    async def get_template_statistics(db: AsyncSession, template_id: int) -> dict:
        """Lấy thống kê sử dụng template"""
        template = await AnswerSheetTemplateService.get_template(db, template_id)
        
        # TODO: Thêm logic đếm số lần sử dụng template trong exams
        # Hiện tại trả về thống kê cơ bản
        stats = {
            "maMauPhieu": template.maMauPhieu,
            "tenMauPhieu": template.tenMauPhieu,
            "soCauHoi": template.soCauHoi,
            "soLuaChonMoiCau": template.soLuaChonMoiCau,
            "laCongKhai": template.laCongKhai,
            "laMacDinh": template.laMacDinh,
            "thoiGianTao": template.thoiGianTao,
            "thoiGianCapNhat": template.thoiGianCapNhat,
            "coFile": bool(AnswerSheetTemplateService._get_file_info_from_template(template)),
            # TODO: Thêm các thống kê khác
            "soLanSuDung": 0,  # Placeholder
            "soBaiKiemTra": 0,  # Placeholder
        }
        
        return stats

    @staticmethod
    async def validate_template_structure(template_data: dict) -> dict:
        """Validate cấu trúc template"""
        errors = []
        warnings = []
        
        # Kiểm tra các trường bắt buộc
        required_fields = ["tenMauPhieu", "soCauHoi", "soLuaChonMoiCau"]
        for field in required_fields:
            if not template_data.get(field):
                errors.append(f"Thiếu trường bắt buộc: {field}")
        
        # Kiểm tra logic nghiệp vụ
        if template_data.get("soCauHoi", 0) <= 0:
            errors.append("Số lượng câu phải lớn hơn 0")
        
        if template_data.get("soLuaChonMoiCau", 0) <= 0:
            errors.append("Số lượng đáp án phải lớn hơn 0")
        
        if template_data.get("soCauHoi", 0) > 200:
            warnings.append("Số lượng câu quá lớn (>200), có thể ảnh hưởng hiệu suất")
        
        if template_data.get("soLuaChonMoiCau", 0) > 10:
            warnings.append("Số lượng đáp án quá lớn (>10), có thể gây khó khăn cho học sinh")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }

    @staticmethod
    def _update_omr_config_in_template(template: AnswerSheetTemplate, omr_config: dict, config_path: str, omr_image_path: str = None):
        """Update OMR config info in template cauTrucJson"""
        if not template.cauTrucJson:
            template.cauTrucJson = {}
        
        # Ensure fileTypes structure exists
        if "fileTypes" not in template.cauTrucJson:
            template.cauTrucJson["fileTypes"] = {}
        
        # Update OMR config information
        template.cauTrucJson["fileTypes"]["omrConfig"] = {
            "purpose": "Cấu trúc template định nghĩa vùng nhận dạng OMR",
            "uploaded": True,
            "uploadDate": int(time.time()),
            "storagePath": config_path,
                            "omrDirectory": f"{settings.OMR_DATA_DIR}/templates/template_{template.maMauPhieu}/",
            "configData": {
                "pageDimensions": omr_config.get("pageDimensions"),
                "bubbleDimensions": omr_config.get("bubbleDimensions"),
                "fieldBlocksCount": len(omr_config.get("fieldBlocks", {})),
                "hasPreProcessors": "preProcessors" in omr_config,
                "customLabels": omr_config.get("customLabels", {})
            }
        }
        
        # Update overall OMR configuration
        template.cauTrucJson["omrConfig"] = omr_config
        template.cauTrucJson["omrTemplatePath"] = config_path
        
        if omr_image_path:
            template.cauTrucJson["omrImagePath"] = omr_image_path
            # Update templateImage info - both files now in same directory
            if "templateImage" in template.cauTrucJson["fileTypes"]:
                template.cauTrucJson["fileTypes"]["templateImage"]["storagePath"] = omr_image_path
                template.cauTrucJson["fileTypes"]["templateImage"]["omrDirectory"] = f"{settings.OMR_DATA_DIR}/templates/template_{template.maMauPhieu}/"
        
        # Update upload status
        uploaded_types = [k for k, v in template.cauTrucJson["fileTypes"].items() if v.get("uploaded")]
        template.cauTrucJson["uploadStatus"] = {
            "totalTypes": 3,  # Image, PDF, OMR Config
            "uploadedTypes": len(uploaded_types),
            "completeness": len(uploaded_types) / 3 * 100,
            "lastUpdate": int(time.time()),
            "isComplete": len(uploaded_types) >= 3,
            "missingTypes": [
                t for t in ["templateImage", "templatePdf", "omrConfig"] 
                if t not in uploaded_types
            ]
        }
        
        print(f"📝 Updated OMR config info: {len(omr_config.get('fieldBlocks', {}))} fieldBlocks, Complete: {len(uploaded_types)}/3")
