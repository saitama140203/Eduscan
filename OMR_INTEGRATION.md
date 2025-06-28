# OMR Checker - Database Integration hoàn thành! 🎉

## Tổng quan

OMR Checker đã được **tích hợp hoàn toàn với database Eduscan**! Bây giờ hệ thống có thể:

✅ **Chấm điểm từ đáp án trong database** (JSON format)  
✅ **Tạo số báo danh từ 6 số cuối của mã học sinh trường**  
✅ **Tự động lưu kết quả vào database**  
✅ **Không cần server riêng biệt trên port 8001**

## Các thay đổi đã thực hiện

### 1. Cấu trúc thư mục mới
```
backend/
├── app/
│   ├── omr/                    # 🆕 Thư mục OMR tích hợp
│   │   ├── __init__.py
│   │   ├── alignment.py        # Logic căn chỉnh ảnh
│   │   ├── detection.py        # YOLO detection logic
│   │   ├── main_pipeline.py    # Pipeline xử lý chính
│   │   ├── template.py         # Template handling
│   │   ├── score.py           # Scoring logic
│   │   ├── models/            # YOLO models
│   │   ├── templates/         # OMR templates
│   │   ├── answers/           # Answer keys
│   │   └── src/               # Các utility functions
│   ├── routes/
│   │   └── omr.py             # 🆕 OMR API endpoints
│   └── ...
```

### 2. Dependencies đã thêm
Các package sau đã được thêm vào `requirements.txt`:
```txt
# OMR Checker dependencies
opencv-contrib-python==4.8.1.78
opencv-python==4.8.1.78
ultralytics>=8.0.0
scikit-image==0.21.0
scipy==1.11.1
matplotlib==3.7.2
tqdm==4.67.1
rich==13.0.0
colorlog==6.7.0
```

### 3. API Endpoints mới
OMR Checker hiện có sẵn các endpoints sau trong backend chính:

#### Core OMR Endpoints (`/api/v1/omr/`)
- `POST /omr/upload` - Upload và xử lý một ảnh OMR
- `POST /omr/batch` - Xử lý batch nhiều ảnh OMR  
- `POST /omr/preview` - Preview template với sample image
- `GET /omr/models` - Lấy danh sách YOLO models
- `GET /omr/templates` - Lấy danh sách templates
- `GET /omr/health` - Health check

#### Existing OMR Endpoints (đã có từ trước)
- `POST /answer-templates/{template_id}/omr-config`
- `GET /answer-templates/{template_id}/omr-preview`
- `POST /omr/process-single`
- `POST /omr/process-batch`
- `GET /omr/export-excel/{exam_id}`
- và nhiều endpoint khác...

## Cách sử dụng

### 1. Khởi động backend (port 8000)
```bash
cd backend/
conda activate eduscan
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Sử dụng OMR API
```bash
# Test health check
curl -X GET "http://localhost:8000/api/v1/omr/health"

# Upload và xử lý ảnh OMR
curl -X POST "http://localhost:8000/api/v1/omr/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@path/to/image.jpg" \
  -F "template_path=app/omr/templates/your_template/template.json" \
  -F "auto_align=true"
```

### 3. Frontend Integration
Frontend có thể gọi trực tiếp đến các endpoint OMR thông qua backend chính:
```javascript
// Thay vì gọi đến localhost:8001
const response = await fetch('/api/v1/omr/upload', {
  method: 'POST',
  body: formData
});
```

## Lợi ích của việc tích hợp

### ✅ Ưu điểm
1. **Đơn giản hóa kiến trúc**: Chỉ cần 1 server backend thay vì 2
2. **Quản lý dễ dàng**: Tất cả API trong một nơi
3. **Authentication thống nhất**: Sử dụng chung hệ thống auth
4. **Deployment đơn giản**: Chỉ cần deploy 1 service
5. **Logging tập trung**: Tất cả logs ở một nơi
6. **Shared resources**: Chia sẻ database, cache, config

### 🔄 So sánh trước và sau

#### Trước (Kiến trúc cũ):
```
Frontend ↔ Backend (8000) ↔ Database
    ↕
OMR Server (8001)
```

#### Sau (Kiến trúc mới):
```
Frontend ↔ Backend (8000) ↔ Database
           ↕
         OMR Module (tích hợp)
```

## Lưu ý kỹ thuật

### Authentication
Tất cả OMR endpoints đều yêu cầu authentication và phân quyền:
- **ADMIN**: Full access
- **MANAGER**: Access trong organization
- **TEACHER**: Access cơ bản

### Error Handling
OMR endpoints sử dụng chung error handling của backend:
- Lỗi 401: Unauthorized
- Lỗi 403: Forbidden  
- Lỗi 422: Validation Error
- Lỗi 500: Internal Server Error

### File Processing
- Chỉ chấp nhận file: PNG, JPG, JPEG
- Giới hạn batch: tối đa 50 ảnh/lần
- Tự động dọn dẹp file tạm sau xử lý

## Migration từ hệ thống cũ

Nếu frontend đang sử dụng OMR server riêng biệt:

1. **Thay đổi base URL**:
   ```javascript
   // Cũ
   const omrBaseUrl = 'http://localhost:8001';
   
   // Mới  
   const omrBaseUrl = 'http://localhost:8000/api/v1/omr';
   ```

2. **Thêm Authentication headers**:
   ```javascript
   const response = await fetch('/api/v1/omr/upload', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}` // 🆕 Bắt buộc
     },
     body: formData
   });
   ```

## Troubleshooting

### Lỗi thường gặp

1. **Import Error**: 
   ```bash
   conda activate eduscan
   pip install opencv-contrib-python==4.8.1.78 ultralytics
   ```

2. **Template not found**:
   - Kiểm tra đường dẫn template trong `app/omr/templates/`
   - Đảm bảo file `template.json` tồn tại

3. **Model not found**:
   - Kiểm tra file YOLO model trong `app/omr/models/`
   - Download model nếu cần: `app/omr/models/best.pt`

### Debug
Bật debug logging trong FastAPI:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Kết luận

🎉 **OMR Checker đã được tích hợp thành công vào backend chính!**

- ✅ Không cần chạy server port 8001 nữa
- ✅ Tất cả chức năng OMR có sẵn qua `/api/v1/omr/*`
- ✅ Authentication và authorization thống nhất
- ✅ Kiến trúc đơn giản và dễ maintain

Giờ đây bạn có thể tận hưởng hệ thống OMR hoàn chính với kiến trúc gọn gàng và hiệu quả! 