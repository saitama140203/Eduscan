from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os
from dotenv import load_dotenv

# Cố gắng tải biến môi trường từ file .env nếu có
load_dotenv()

# Đường dẫn gốc của thư mục backend (AI/backend)
BACKEND_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Settings(BaseSettings):
    APP_NAME: str = "EduScan AI"
    API_PREFIX: str = "/api"
    DEBUG: bool = False

    # Database settings - sẽ được cung cấp bởi Docker environment hoặc .env_backend cho local
    DATABASE_URL: Optional[str] = None 

    # Upload directory - Optimized storage structure
    # Production: /var/lib/eduscan/uploads (mounted as volume)
    # Development: backend/uploads (local development)
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(BACKEND_ROOT_DIR, "uploads"))
    
    # OMR data directory
    OMR_DATA_DIR: str = os.getenv("OMR_DATA_DIR", os.path.join(BACKEND_ROOT_DIR, "..", "OMRChecker"))
    STORAGE_PATH: str = os.getenv("STORAGE_PATH", os.path.join(OMR_DATA_DIR, "storage"))
    # OMR Service URL - for Docker containers
    OMR_API_URL: str = "http://localhost:8001"

    # JWT Settings - Nên được đặt trong file .env ở thư mục gốc của dự án hoặc .env_backend
    SECRET_KEY: str = "please_change_me_in_production_env_file"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 # Ví dụ: 60 phút

    # Pydantic V2: model_config
    # Ưu tiên đọc từ biến môi trường, sau đó mới đến file .env này (nếu có)
    # File .env này thường dành cho phát triển cục bộ không dùng Docker
    model_config = SettingsConfigDict(
        env_file=os.path.join(BACKEND_ROOT_DIR, ".env_backend"), 
        env_file_encoding='utf-8', 
        extra='ignore'
    )

settings = Settings()

# Đảm bảo thư mục upload tồn tại khi ứng dụng khởi tạo (nếu chạy không qua Docker build step)
# Khi chạy với Docker, Dockerfile có thể đảm nhận việc này, hoặc entrypoint.
# Tuy nhiên, để an toàn, có thể kiểm tra và tạo ở đây.
# if not os.path.exists(settings.UPLOAD_DIR):
#     try:
#         os.makedirs(settings.UPLOAD_DIR)
#     except OSError as e:
#         print(f"Error creating UPLOAD_DIR {settings.UPLOAD_DIR}: {e}")
#         # Có thể raise lỗi ở đây nếu thư mục upload là bắt buộc 
