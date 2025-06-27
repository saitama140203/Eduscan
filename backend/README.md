# EduScan API

Backend API cho hệ thống quét và chấm điểm bài thi trắc nghiệm EduScan

## Tính năng chính

- Đăng ký, đăng nhập, xác thực JWT
- Phân quyền người dùng (`Admin`, `Manager`, `Teacher`)
- Quản lý tổ chức, lớp học
- Quản lý đề thi, phiếu trả lời
- Scan và chấm điểm bài thi (YOLOv8 + OpenCV)
- Xem kết quả và thống kê

## Cài đặt

### Yêu cầu

- Python 3.11+
- PostgreSQL 15+

### Các bước cài đặt

1. Clone repository

```
git clone <repository-url>
cd AI/backend
```

2. Tạo môi trường ảo

```
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. Cài đặt dependencies

```
pip install -r requirements.txt
```

4. Tạo file `.env` với nội dung:

```
# Database settings
DATABASE_URL=postgresql://username:password@localhost:5432/eduscan

# JWT settings
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALGORITHM=HS256

# Application settings
APP_NAME=EduScan
DEBUG=True

# File Storage
UPLOAD_DIR=./uploads
```

5. Tạo cơ sở dữ liệu PostgreSQL

```
createdb eduscan
```

6. Chạy ứng dụng

```
python run.py
```

Truy cập API docs tại: http://103.67.199.62:8000/api/v1/api/docs

## API Endpoints

### Authentication

- POST `/api/v1/auth/register` - Đăng ký tài khoản mới
- POST `/api/v1/auth/login` - Đăng nhập và lấy token
- POST `/api/v1/auth/login-email` - Đăng nhập với email/password
- GET `/api/v1/auth/me` - Lấy thông tin người dùng hiện tại
- POST `/api/v1/auth/change-password` - Đổi mật khẩu

### Users

- GET `/api/v1/users` - Lấy danh sách người dùng
- POST `/api/v1/users` - Tạo người dùng mới
- GET `/api/v1/users/{user_id}` - Lấy thông tin người dùng
- PUT `/api/v1/users/{user_id}` - Cập nhật thông tin người dùng
- DELETE `/api/v1/users/{user_id}` - Xóa người dùng

### Organizations

- GET `/api/v1/organizations` - Lấy danh sách tổ chức
- POST `/api/v1/organizations` - Tạo tổ chức mới
- GET `/api/v1/organizations/{org_id}` - Lấy thông tin tổ chức
- PUT `/api/v1/organizations/{org_id}` - Cập nhật thông tin tổ chức
- DELETE `/api/v1/organizations/{org_id}` - Xóa tổ chức

### Classes

- GET `/api/v1/classes` - Lấy danh sách lớp học
- POST `/api/v1/classes` - Tạo lớp học mới
- GET `/api/v1/classes/{class_id}` - Lấy thông tin chi tiết lớp học
- PUT `/api/v1/classes/{class_id}` - Cập nhật thông tin lớp học
- DELETE `/api/v1/classes/{class_id}` - Xóa/vô hiệu hóa lớp học

### Students

- GET `/api/v1/students/class/{class_id}` - Lấy danh sách học sinh theo lớp
- POST `/api/v1/students` - Tạo học sinh mới
- POST `/api/v1/students/batch` - Tạo nhiều học sinh cùng lúc
- GET `/api/v1/students/{student_id}` - Lấy thông tin học sinh
- PUT `/api/v1/students/{student_id}` - Cập nhật thông tin học sinh
- DELETE `/api/v1/students/{student_id}` - Xóa học sinh
- POST `/api/v1/students/transfer` - Chuyển học sinh sang lớp mới

## License

MIT 