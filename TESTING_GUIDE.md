# Hướng dẫn Test Hệ thống OMR Eduscan

## Tổng quan
Hệ thống OMR (Optical Mark Recognition) đã được tích hợp hoàn toàn vào backend Eduscan. Không cần chạy server riêng biệt trên port 8001 nữa.

## Chuẩn bị Test

### 1. Khởi động hệ thống
```bash
# Terminal 1: Backend
cd /root/projects/Eduscan/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend  
cd /root/projects/Eduscan/frontend
npm run dev
```

### 2. Kiểm tra services
- Backend: http://localhost:8000/docs
- Frontend: http://localhost:3000
- OMR Health: http://localhost:8000/api/v1/omr/health

### 3. File ảnh test
Đã tạo ảnh OMR test tại: `/tmp/test_omr.png`
- SBD: 123456 (6 số cuối sẽ được dùng để tìm học sinh)
- Mã đề: 123
- 20 câu trả lời theo pattern A-B-C-D-A-B...

## Các bước Test với Frontend

### Bước 1: Đăng nhập
1. Mở http://localhost:3000
2. Đăng nhập với tài khoản:
   - Email: `teacher@test.com`
   - Password: `test123456`
   (Đã tạo sẵn với API register)

### Bước 2: Vào trang OMR Scanner
1. Điều hướng tới: http://localhost:3000/dashboard/teacher/scan
2. Sẽ thấy giao diện OMR Scanner với các bước:
   - Chọn lớp học
   - Chọn mã đề  
   - Chọn phương thức (Upload/Camera)
   - Upload và chấm điểm

### Bước 3: Test với Data có sẵn
⚠️ **Lưu ý**: Hiện tại cần có data trong database:
- Lớp học với học sinh
- Bài kiểm tra với đáp án
- Template OMR

Nếu chưa có data, hệ thống sẽ hiển thị "Chưa chọn" cho các dropdown.

## Tính năng đã Test

### ✅ Backend Integration
- [x] OMR routes tích hợp vào `/api/v1/omr/`
- [x] Database service cho scoring
- [x] SBD mapping từ mã học sinh trường
- [x] Health check endpoint
- [x] Authentication middleware

### ✅ Frontend Updates  
- [x] API client updated to use new endpoints
- [x] UI/UX components hoạt động tốt
- [x] File upload interface
- [x] Results display
- [x] Stats dashboard

### ⚠️ Cần Data Test
Để test đầy đủ, cần:
1. **Lớp học** với học sinh có `maHocSinhTruong` chứa "123456"
2. **Bài kiểm tra** với:
   - Template OMR (đã có sẵn trong `app/omr/templates/`)
   - Đáp án JSON format:
     ```json
     {
       "dapAnJson": {
         "123": {"q1": "A", "q2": "B", "q3": "C", ...}
       },
       "diemMoiCauJson": {"q1": 0.5, "q2": 0.5, ...}
     }
     ```

## Test Cases

### Test Case 1: Health Check
```bash
curl http://localhost:8000/api/v1/omr/health
```
**Expected**: Status 200 với thông tin service

### Test Case 2: Templates List (requires auth)
```bash
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/omr/templates
```
**Expected**: List các templates có sẵn

### Test Case 3: Upload OMR Image (requires auth + data)
1. Chọn lớp học
2. Chọn bài kiểm tra
3. Upload `/tmp/test_omr.png`
4. Xem kết quả chấm điểm

## Endpoints OMR

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/omr/health` | Health check |
| GET | `/api/v1/omr/templates` | List templates |
| GET | `/api/v1/omr/models` | List YOLO models |
| POST | `/api/v1/omr/process-with-exam` | Process single image |
| POST | `/api/v1/omr/batch-process-with-exam` | Process multiple images |
| GET | `/api/v1/omr/exam-stats/{exam_id}` | Get exam statistics |
| GET | `/api/v1/omr/export-excel/{exam_id}` | Export results to Excel |

## Templates có sẵn
```
app/omr/templates/
├── 12-2/
├── 12-4/
├── 20-4-4/          # Template tốt cho test
├── 40-8/
├── template_11/
└── ...
```

## Database Schema được sử dụng

### Bảng chính:
- `LOPHOC`: Lớp học
- `HOCSINH`: Học sinh (với `maHocSinhTruong`)
- `BAIKIEMTRA`: Bài kiểm tra (với `maMauPhieu`)
- `DAPAN`: Đáp án JSON
- `PHIEUTRALOI`: Câu trả lời học sinh
- `KETQUA`: Kết quả chấm điểm

## Cách tạo Test Data

Có thể tạo data test bằng cách:

1. **Qua Frontend**: Tạo lớp học, học sinh, bài kiểm tra
2. **Qua API**: POST endpoints để tạo data
3. **SQL Script**: Insert trực tiếp vào database

## Troubleshooting

### Backend không khởi động
- Kiểm tra DATABASE_URL trong `.env`
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra dependencies: `pip install -r requirements.txt`

### Frontend không kết nối
- Kiểm tra API base URL trong frontend config
- Kiểm tra CORS settings
- Kiểm tra authentication token

### OMR không hoạt động
- Kiểm tra templates folder: `app/omr/templates/`
- Kiểm tra YOLO models: `app/omr/models/`
- Kiểm tra file permissions
- Xem logs backend cho chi tiết lỗi

## Kết quả Test mong đợi

Khi upload `/tmp/test_omr.png` với data đầy đủ:
- SBD "123456" khớp với học sinh
- Mã đề "123" tìm được đáp án
- 20 câu được chấm tự động
- Điểm tính theo đúng công thức
- Kết quả lưu vào database
- Hiển thị kết quả và thống kê

---

**Tích hợp hoàn tất!** 🎉
Hệ thống OMR giờ đây là một phần không thể tách rời của Eduscan, không cần server riêng biệt. 