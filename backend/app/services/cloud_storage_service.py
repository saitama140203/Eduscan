import os
import io
import uuid
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException

# Optional imports - only import if available
try:
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

try:
    import boto3
    from botocore.exceptions import ClientError
    AWS_AVAILABLE = True
except ImportError:
    AWS_AVAILABLE = False

class CloudStorageService:
    """Service để quản lý upload file lên cloud storage"""
    
    def __init__(self):
        self.google_drive_service = None
        self.s3_client = None
        self._init_services()
    
    def _init_services(self):
        """Khởi tạo các cloud services"""
        try:
            # Google Drive API setup
            if GOOGLE_AVAILABLE and os.getenv("GOOGLE_DRIVE_ENABLED", "false").lower() == "true":
                self._init_google_drive()
            
            # AWS S3 setup
            if AWS_AVAILABLE and os.getenv("AWS_S3_ENABLED", "false").lower() == "true":
                self._init_aws_s3()
        except Exception as e:
            print(f"Warning: Cloud storage initialization failed: {e}")
    
    def _init_google_drive(self):
        """Khởi tạo Google Drive service"""
        try:
            if not GOOGLE_AVAILABLE:
                print("Google API client not available. Install with: pip install google-api-python-client google-auth")
                return
            # Cần setup Google Drive API credentials
            # Tạm thời mock để demo
            pass
        except Exception as e:
            print(f"Google Drive init failed: {e}")
    
    def _init_aws_s3(self):
        """Khởi tạo AWS S3 client"""
        try:
            if not AWS_AVAILABLE:
                print("AWS SDK not available. Install with: pip install boto3")
                return
                
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                region_name=os.getenv("AWS_REGION", "us-east-1")
            )
        except Exception as e:
            print(f"AWS S3 init failed: {e}")
    
    async def upload_template_file(
        self, 
        file: UploadFile, 
        template_id: int,
        provider: str = "local"
    ) -> Tuple[str, str, str]:
        """
        Upload template file to cloud storage
        Returns: (file_url, preview_url, cloud_file_id)
        """
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Validate file type
        allowed_types = [
            "application/pdf",
            "application/msword", 
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/jpeg",
            "image/png"
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"File type {file.content_type} not allowed"
            )
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1]
        unique_filename = f"template_{template_id}_{uuid.uuid4().hex}.{file_extension}"
        
        # Read file content
        file_content = await file.read()
        
        if provider == "google_drive":
            if not GOOGLE_AVAILABLE:
                raise HTTPException(status_code=400, detail="Google Drive not available. Please use local storage.")
            return await self._upload_to_google_drive(unique_filename, file_content, file.content_type)
        elif provider == "aws_s3":
            if not AWS_AVAILABLE:
                raise HTTPException(status_code=400, detail="AWS S3 not available. Please use local storage.")
            return await self._upload_to_s3(unique_filename, file_content, file.content_type)
        else:
            return await self._upload_to_local(unique_filename, file_content)
    
    async def _upload_to_google_drive(
        self, 
        filename: str, 
        content: bytes, 
        content_type: str
    ) -> Tuple[str, str, str]:
        """Upload to Google Drive"""
        try:
            # Mock implementation - cần setup Google Drive API thật
            file_id = f"gdrive_{uuid.uuid4().hex}"
            file_url = f"https://drive.google.com/file/d/{file_id}/view"
            preview_url = f"https://drive.google.com/file/d/{file_id}/preview"
            
            return file_url, preview_url, file_id
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Google Drive upload failed: {e}")
    
    async def _upload_to_s3(
        self, 
        filename: str, 
        content: bytes, 
        content_type: str
    ) -> Tuple[str, str, str]:
        """Upload to AWS S3"""
        try:
            bucket_name = os.getenv("AWS_S3_BUCKET", "eduscan-templates")
            key = f"templates/{filename}"
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=bucket_name,
                Key=key,
                Body=content,
                ContentType=content_type,
                ACL='public-read'
            )
            
            file_url = f"https://{bucket_name}.s3.amazonaws.com/{key}"
            preview_url = file_url  # S3 có thể view trực tiếp
            
            return file_url, preview_url, key
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"S3 upload failed: {e}")
    
    async def _upload_to_local(
        self, 
        filename: str, 
        content: bytes
    ) -> Tuple[str, str, str]:
        """Upload to local storage (for development)"""
        try:
            # Tạo thư mục uploads nếu chưa có
            upload_dir = "uploads/templates"
            os.makedirs(upload_dir, exist_ok=True)
            
            file_path = os.path.join(upload_dir, filename)
            
            # Lưu file
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Generate URLs
            base_url = os.getenv("BASE_URL", "http://103.67.199.62:8000/api/v1")
            file_url = f"{base_url}/uploads/templates/{filename}"
            preview_url = file_url
            
            return file_url, preview_url, filename
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Local upload failed: {e}")
    
    async def delete_file(self, cloud_file_id: str, provider: str = "local"):
        """Delete file from cloud storage"""
        try:
            if provider == "google_drive":
                if GOOGLE_AVAILABLE:
                    # Delete from Google Drive
                    pass
            elif provider == "aws_s3":
                if AWS_AVAILABLE and self.s3_client:
                    bucket_name = os.getenv("AWS_S3_BUCKET", "eduscan-templates")
                    self.s3_client.delete_object(Bucket=bucket_name, Key=cloud_file_id)
            else:
                # Delete from local
                file_path = f"uploads/templates/{cloud_file_id}"
                if os.path.exists(file_path):
                    os.remove(file_path)
        except Exception as e:
            print(f"File deletion failed: {e}")
    
    def generate_download_url(self, cloud_file_id: str, provider: str = "local") -> str:
        """Generate download URL for file"""
        if provider == "google_drive":
            return f"https://drive.google.com/uc?export=download&id={cloud_file_id}"
        elif provider == "aws_s3":
            bucket_name = os.getenv("AWS_S3_BUCKET", "eduscan-templates")
            return f"https://{bucket_name}.s3.amazonaws.com/{cloud_file_id}"
        else:
            base_url = os.getenv("BASE_URL", "http://103.67.199.62:8000/api/v1")
            return f"{base_url}/uploads/templates/{cloud_file_id}"

# Singleton instance
cloud_storage_service = CloudStorageService() 