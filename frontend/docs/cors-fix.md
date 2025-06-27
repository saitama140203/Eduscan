# Hướng dẫn sửa lỗi CORS trong FastAPI Backend

## Vấn đề

Khi frontend (Next.js) gửi request với `credentials: 'include'` đến backend (FastAPI), trình duyệt sẽ chặn request nếu backend đang cấu hình CORS với `Access-Control-Allow-Origin: *`. Điều này xảy ra vì theo quy định của CORS, khi sử dụng `credentials: 'include'`, backend phải chỉ định chính xác origin, không được sử dụng wildcard (`*`).

## Giải pháp

Cập nhật cấu hình CORS trong FastAPI backend như sau:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Danh sách các origin được phép
origins = [
    "http://localhost:3000",    # Next.js frontend dev server
    "http://localhost:3001",    # Next.js frontend alternate port
    "http://192.168.1.6:3000",  # Next.js frontend trên local network
    "http://192.168.1.6:3001",  # Next.js frontend trên local network (alternate port)
    # Thêm domain sản phẩm của bạn ở đây
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Thay vì ["*"]
    allow_credentials=True,      # Quan trọng: cho phép gửi cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Vị trí file cần sửa

Tìm file `main.py` hoặc file nơi bạn cấu hình CORS middleware trong backend FastAPI của bạn. Thông thường file này nằm ở:

```
AI/backend/app/main.py
```

## Kiểm tra

Sau khi sửa, khởi động lại backend server và thử đăng nhập lại từ frontend. Lỗi CORS sẽ không còn xuất hiện. 