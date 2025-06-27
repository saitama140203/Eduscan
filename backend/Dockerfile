# Chọn Python base image
FROM python:3.11-slim

# Ngăn Python ghi file .pyc (tùy chọn, tốt cho dev)
ENV PYTHONDONTWRITEBYTECODE 1
# Đảm bảo output của Python không bị buffer (quan trọng cho logs trong Docker)
ENV PYTHONUNBUFFERED 1

# Đặt thư mục làm việc trong container
WORKDIR /app

# Cài đặt các dependencies hệ thống nếu cần (ví dụ: build-essential cho một số thư viện)
# RUN apt-get update && apt-get install -y --no-install-recommends build-essential

# Sao chép requirements.txt trước để tận dụng Docker layer caching
COPY requirements.txt requirements.txt

# Cài đặt Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn ứng dụng vào thư mục làm việc trong container
COPY . .

# (Tùy chọn) Tạo thư mục uploads nếu ứng dụng của bạn ghi file vào đó
# RUN mkdir -p /app/uploads # Đảm bảo đường dẫn này khớp với UPLOAD_DIR của bạn

# Mở port mà ứng dụng FastAPI sẽ lắng nghe (ví dụ: 8000)
EXPOSE 8000

# Thêm quyền thực thi cho entrypoint script
RUN chmod +x /app/entrypoint.sh

# Đặt entrypoint script sẽ được chạy khi container khởi động
ENTRYPOINT ["/app/entrypoint.sh"]

# CMD mặc định có thể bị override bởi entrypoint hoặc docker-compose
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 