import json
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid
from pathlib import Path

from app.core.security import get_password_hash
from app.services.user_service import UserService
from sqlalchemy.ext.asyncio import AsyncSession

class FilePasswordResetService:
    """
    Service để quản lý yêu cầu reset password bằng file JSON
    An toàn và không ảnh hưởng đến database hiện tại
    """
    
    def __init__(self):
        self.requests_dir = Path("data/password_requests")
        self.requests_dir.mkdir(parents=True, exist_ok=True)
        self.requests_file = self.requests_dir / "requests.json"
    
    def _load_requests(self) -> List[Dict[str, Any]]:
        """Đọc danh sách yêu cầu từ file"""
        if not self.requests_file.exists():
            return []
        
        try:
            with open(self.requests_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    
    def _save_requests(self, requests: List[Dict[str, Any]]):
        """Lưu danh sách yêu cầu vào file"""
        try:
            with open(self.requests_file, 'w', encoding='utf-8') as f:
                json.dump(requests, f, ensure_ascii=False, indent=2, default=str)
        except IOError as e:
            raise Exception(f"Không thể lưu yêu cầu: {str(e)}")
    
    async def create_request(
        self, 
        db: AsyncSession,
        user_id: int, 
        reason: Optional[str] = None
    ) -> str:
        """Tạo yêu cầu reset password mới"""
        
        # Kiểm tra user có tồn tại không
        user = await UserService.get_by_id(db, user_id)
        if not user:
            raise ValueError("Người dùng không tồn tại")
        
        requests = self._load_requests()
        
        # Kiểm tra xem user có yêu cầu pending nào không
        pending_requests = [
            req for req in requests 
            if req['maNguoiDung'] == user_id and req['trangThai'] == 'PENDING'
        ]
        
        if pending_requests:
            raise ValueError("Bạn đã có yêu cầu đang chờ xử lý")
        
        # Tạo yêu cầu mới
        request_id = str(uuid.uuid4())
        new_request = {
            'maYeuCau': request_id,
            'maNguoiDung': user_id,
            'hoTenNguoiYeuCau': user.hoTen,
            'emailNguoiYeuCau': user.email,
            'vaiTroNguoiYeuCau': user.vaiTro,
            'lyDo': reason,
            'trangThai': 'PENDING',
            'maAdminXuLy': None,
            'hoTenAdminXuLy': None,
            'ghiChuAdmin': None,
            'thoiGianTao': datetime.now().isoformat(),
            'thoiGianXuLy': None
        }
        
        requests.append(new_request)
        self._save_requests(requests)
        
        return request_id
    
    def get_requests_with_pagination(
        self,
        page: int = 1,
        size: int = 10,
        status_filter: Optional[str] = None
    ) -> tuple[List[Dict[str, Any]], int]:
        """Lấy danh sách yêu cầu với phân trang"""
        
        requests = self._load_requests()
        
        # Lọc theo trạng thái nếu có
        if status_filter:
            requests = [req for req in requests if req['trangThai'] == status_filter]
        
        # Sắp xếp theo thời gian tạo (mới nhất trước)
        requests.sort(key=lambda x: x['thoiGianTao'], reverse=True)
        
        total = len(requests)
        
        # Phân trang
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        paginated_requests = requests[start_idx:end_idx]
        
        return paginated_requests, total
    
    async def update_request(
        self,
        db: AsyncSession,
        request_id: str,
        admin_id: int,
        status: str,
        admin_note: Optional[str] = None
    ) -> Dict[str, Any]:
        """Admin cập nhật trạng thái yêu cầu"""
        
        # Lấy thông tin admin
        admin = await UserService.get_by_id(db, admin_id)
        if not admin:
            raise ValueError("Admin không tồn tại")
        
        requests = self._load_requests()
        
        # Tìm yêu cầu
        request_idx = None
        for i, req in enumerate(requests):
            if req['maYeuCau'] == request_id:
                request_idx = i
                break
        
        if request_idx is None:
            raise ValueError("Không tìm thấy yêu cầu")
        
        request = requests[request_idx]
        
        if request['trangThai'] != 'PENDING':
            raise ValueError("Yêu cầu đã được xử lý")
        
        # Cập nhật yêu cầu
        request['trangThai'] = status
        request['maAdminXuLy'] = admin_id
        request['hoTenAdminXuLy'] = admin.hoTen
        request['ghiChuAdmin'] = admin_note
        request['thoiGianXuLy'] = datetime.now().isoformat()
        
        # Nếu approved, reset password của user
        if status == 'APPROVED':
            await self._reset_user_password(db, request['maNguoiDung'])
        
        self._save_requests(requests)
        
        return request
    
    async def _reset_user_password(self, db: AsyncSession, user_id: int):
        """Reset password của user về mặc định"""
        
        # Tạo mật khẩu mặc định
        default_password = "123456"
        hashed_password = get_password_hash(default_password)
        
        # Cập nhật mật khẩu
        user = await UserService.get_by_id(db, user_id)
        if user:
            await UserService.update_password(db, user_id, hashed_password)
    
    def get_user_requests(self, user_id: int) -> List[Dict[str, Any]]:
        """Lấy danh sách yêu cầu của một user"""
        
        requests = self._load_requests()
        user_requests = [
            req for req in requests 
            if req['maNguoiDung'] == user_id
        ]
        
        # Sắp xếp theo thời gian tạo (mới nhất trước)
        user_requests.sort(key=lambda x: x['thoiGianTao'], reverse=True)
        
        return user_requests
    
    def get_pending_count(self) -> int:
        """Đếm số yêu cầu đang chờ xử lý"""
        requests = self._load_requests()
        return len([req for req in requests if req['trangThai'] == 'PENDING']) 