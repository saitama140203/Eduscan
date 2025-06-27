import os
import shutil
import time
from typing import Optional, List
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.models.file import File
from app.models.user import User
from app.models.organization import Organization
from app.core.config import settings
from app.core.config import settings

class FileService:
    """Service để quản lý file trong bảng TAPTIN"""
    
    def __init__(self, db: Session):
        self.db = db
        self.upload_dir = settings.UPLOAD_DIR
        self.ensure_upload_dir()
    
    def ensure_upload_dir(self):
        """Tạo thư mục upload nếu chưa có"""
        if not os.path.exists(self.upload_dir):
            os.makedirs(self.upload_dir, exist_ok=True)
            print(f"✅ Tạo thư mục upload: {os.path.abspath(self.upload_dir)}")
    
    def save_file(
        self,
        file: UploadFile,
        ma_nguoi_dung: int,
        ma_to_chuc: int,
        thuc_the_nguon: str = "TEMPLATE",
        ma_thuc_the_nguon: Optional[int] = None,
        auto_commit: bool = True
    ) -> File:
        """
        Lưu file vào hệ thống và database
        
        Args:
            file: File upload từ FastAPI
            ma_nguoi_dung: ID người dùng upload
            ma_to_chuc: ID tổ chức
            thuc_the_nguon: Loại thực thể nguồn (TEMPLATE, EXAM, etc.)
            ma_thuc_the_nguon: ID của thực thể nguồn
            auto_commit: Tự động commit hay không
        """
        file_path = None
        try:
            # Tạo thư mục con theo thực thể nguồn
            sub_dir = os.path.join(self.upload_dir, thuc_the_nguon.lower())
            if not os.path.exists(sub_dir):
                os.makedirs(sub_dir, exist_ok=True)
                print(f"✅ Tạo thư mục con: {os.path.abspath(sub_dir)}")
            
            # Tạo tên file unique
            file_extension = os.path.splitext(file.filename or "unknown")[1]
            timestamp = int(time.time())
            safe_filename = f"{timestamp}_{file.filename or 'unknown'}"
            file_path = os.path.join(sub_dir, safe_filename)
            
            print(f"📁 Lưu file vào: {os.path.abspath(file_path)}")
            
            # Reset file pointer to beginning
            file.file.seek(0)
            
            # Lưu file vào disk
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Verify file was written
            if not os.path.exists(file_path):
                raise Exception("File không được lưu thành công")
                
            # Lấy thông tin file
            file_size = os.path.getsize(file_path)
            file_type = file.content_type or "application/octet-stream"
            
            print(f"✅ File đã lưu: {file_path} ({file_size} bytes)")
            
            # Tạo record trong database
            db_file = File(
                maNguoiDung=ma_nguoi_dung,
                maToChuc=ma_to_chuc,
                tenTapTin=file.filename,
                duongDan=file_path,
                loaiTapTin=file_type,
                kichThuoc=file_size,
                thucTheNguon=thuc_the_nguon,
                maThucTheNguon=ma_thuc_the_nguon
            )
            
            self.db.add(db_file)
            
            if auto_commit:
                self.db.commit()
                self.db.refresh(db_file)
                print(f"✅ Database record tạo thành công: ID {db_file.maTapTin}")
            else:
                # Flush để có ID nhưng chưa commit
                self.db.flush()
                self.db.refresh(db_file)
                print(f"✅ Database record đã flush: ID {db_file.maTapTin} (chưa commit)")
            
            return db_file
            
        except Exception as e:
            print(f"❌ Lỗi lưu file: {str(e)}")
            # Rollback database nếu có lỗi
            self.db.rollback()
            
            # Xóa file nếu có lỗi database
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"🗑️ Đã xóa file lỗi: {file_path}")
                except:
                    pass
            
            raise HTTPException(status_code=500, detail=f"Lỗi lưu file: {str(e)}")
    
    def get_file_by_id(self, ma_tap_tin: int) -> Optional[File]:
        """Lấy thông tin file theo ID"""
        return self.db.query(File).filter(File.maTapTin == ma_tap_tin).first()
    
    def get_files_by_entity(
        self, 
        thuc_the_nguon: str, 
        ma_thuc_the_nguon: int
    ) -> List[File]:
        """Lấy danh sách file theo thực thể nguồn"""
        return self.db.query(File).filter(
            File.thucTheNguon == thuc_the_nguon,
            File.maThucTheNguon == ma_thuc_the_nguon
        ).all()
    
    def delete_file(self, ma_tap_tin: int, ma_nguoi_dung: int) -> bool:
        """
        Xóa file (chỉ người tạo hoặc admin mới được xóa)
        """
        file_record = self.get_file_by_id(ma_tap_tin)
        if not file_record:
            return False
        
        # Kiểm tra quyền xóa
        user = self.db.query(User).filter(User.maNguoiDung == ma_nguoi_dung).first()
        if not user:
            return False
        
        # Chỉ người tạo hoặc admin mới được xóa
        if file_record.maNguoiDung != ma_nguoi_dung and user.vaiTro != "Admin":
            return False
        
        try:
            # Xóa file vật lý
            if os.path.exists(file_record.duongDan):
                os.remove(file_record.duongDan)
            
            # Xóa record database
            self.db.delete(file_record)
            self.db.commit()
            
            return True
            
        except Exception:
            return False
    
    def get_file_path(self, ma_tap_tin: int) -> Optional[str]:
        """Lấy đường dẫn file để download"""
        file_record = self.get_file_by_id(ma_tap_tin)
        if file_record and os.path.exists(file_record.duongDan):
            return file_record.duongDan
        return None
    
    def get_files_by_user(self, ma_nguoi_dung: int) -> List[File]:
        """Lấy danh sách file của user"""
        return self.db.query(File).filter(File.maNguoiDung == ma_nguoi_dung).all()
    
    def get_files_by_organization(self, ma_to_chuc: int) -> List[File]:
        """Lấy danh sách file của tổ chức"""
        return self.db.query(File).filter(File.maToChuc == ma_to_chuc).all()

# Import time module
import time 