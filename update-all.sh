#!/bin/bash

# Script để build và cập nhật cả Frontend và Backend

echo "🚀 Bắt đầu quá trình cập nhật toàn bộ hệ thống EduScan..."
echo "======================================================"

# Dừng script nếu có lỗi
set -e

# Lấy đường dẫn thư mục gốc của dự án
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
echo "📂 Thư mục dự án: $PROJECT_DIR"

# Bước 1: Cập nhật code từ Git
echo ""
# echo "🔄 Bước 1: Kéo code mới nhất từ Git..."
# git pull origin main

# Bước 2: Cập nhật Backend
echo ""
echo "🔧 Bước 2: Cập nhật Backend..."
cd $PROJECT_DIR/backend
echo "   - Kích hoạt môi trường conda 'eduscan'..."
source /root/miniconda3/etc/profile.d/conda.sh
conda activate eduscan
echo "   - Cài đặt Python dependencies..."
pip install -r requirements.txt
echo "   - Chạy database migrations..."
alembic upgrade head

# Bước 3: Cập nhật Frontend
echo ""
echo "🎨 Bước 3: Cập nhật Frontend..."
cd $PROJECT_DIR/frontend
echo "   - Cài đặt Node.js dependencies..."
npm install
echo "   - Build project Next.js..."
npm run build

# Bước 4: Khởi động lại services
echo ""
echo "🚀 Bước 4: Khởi động lại các services..."
sudo systemctl restart eduscan-backend
sudo systemctl restart eduscan-frontend
echo "   - Backend và Frontend đã được khởi động lại."

# Bước 5: Kiểm tra trạng thái
echo ""
echo "✅ Hoàn tất! Kiểm tra trạng thái cuối cùng:"
echo "=========================================="
cd $PROJECT_DIR
./manage-backend.sh status
echo "   - Frontend service:"
sudo systemctl status eduscan-frontend --no-pager

echo ""
echo "🎉 Toàn bộ hệ thống đã được cập nhật thành công!" 