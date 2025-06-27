#!/bin/bash

# Script test hệ thống OMR EduScan

echo "🧪 Script test hệ thống OMR EduScan"
echo "===================================="

# Kiểm tra các service đang chạy
echo "📊 Kiểm tra trạng thái các service..."

# Test Backend API
echo -n "Backend FastAPI (port 8000): "
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ OK"
else
    echo "❌ Không kết nối được"
fi

# Test OMRChecker Service
echo -n "OMRChecker Service (port 8001): "
if curl -s http://localhost:8001/api/omr/health > /dev/null; then
    echo "✅ OK"
else
    echo "❌ Không kết nối được"
fi

# Test Frontend
echo -n "Frontend NextJS (port 3000): "
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ OK"
else
    echo "❌ Không kết nối được"
fi

echo ""
echo "🔧 Kiểm tra cấu hình..."

# Kiểm tra YOLO model
if [ -f "OMRChecker/models/best.pt" ]; then
    echo "✅ YOLO model: OK"
    ls -lh OMRChecker/models/best.pt
else
    echo "❌ YOLO model: Không tìm thấy"
fi

# Kiểm tra templates
if [ -d "OMRChecker/templates" ]; then
    echo "✅ Templates directory: OK"
    echo "   Số lượng templates: $(ls OMRChecker/templates | wc -l)"
else
    echo "❌ Templates directory: Không tìm thấy"
fi

echo ""
echo "🧪 Test API endpoints..."

# Test OMR health endpoint
echo -n "GET /api/omr/health: "
response=$(curl -s http://localhost:8001/api/omr/health 2>/dev/null)
if echo "$response" | grep -q '"status":"healthy"'; then
    echo "✅ OK"
else
    echo "❌ FAIL - Response: $response"
fi

# Test get available models
echo -n "GET /api/v1/omr/models: "
response=$(curl -s http://localhost:8000/api/v1/omr/models 2>/dev/null)
if echo "$response" | grep -q '"success"'; then
    echo "✅ OK"
else
    echo "❌ FAIL - Response: $response"
fi

# Test get templates
echo -n "GET /api/v1/omr/templates: "
response=$(curl -s -H "Authorization: Bearer test" http://localhost:8000/api/v1/omr/templates 2>/dev/null)
if echo "$response" | grep -q '"templates"'; then
    echo "✅ OK"
else
    echo "⚠️  Cần đăng nhập để test"
fi

echo ""
echo "📁 Cấu trúc thư mục..."

# Kiểm tra cấu trúc thư mục quan trọng
dirs=(
    "backend/app/routes"
    "backend/app/services" 
    "frontend/components/omr"
    "frontend/app/dashboard/admin/exams"
    "OMRChecker/app"
    "OMRChecker/models"
    "OMRChecker/templates"
)

for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir"
    else
        echo "❌ $dir - Không tìm thấy"
    fi
done

echo ""
echo "🚀 Hướng dẫn chạy system:"
echo "1. Khởi động Backend: cd backend && python -m uvicorn app.main:app --port 8000 --reload"
echo "2. Khởi động OMRChecker: ./start-omr-service.sh"  
echo "3. Khởi động Frontend: cd frontend && npm run dev"
echo "4. Truy cập: http://localhost:3000"

echo ""
echo "📋 Test URLs:"
echo "- Backend Health: http://localhost:8000/health"
echo "- OMRChecker Health: http://localhost:8001/api/omr/health"
echo "- OMRChecker Docs: http://localhost:8001/docs"
echo "- Frontend: http://localhost:3000"
echo "- Admin Dashboard: http://localhost:3000/dashboard/admin"

echo ""
echo "✅ Test hoàn tất!" 