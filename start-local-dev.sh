#!/bin/bash

# Script khởi động môi trường development local - v4 (Conda)

echo "🚀 Khởi động EduScan Local Development (Conda: eduscan)"
echo "====================================================="

# Dọn dẹp các process cũ
./stop-local-dev.sh
sleep 1
mkdir -p logs

# Function để cài đặt và khởi động service Python với môi trường Conda
start_python_service() {
    local service_dir=$1
    local port=$2
    local log_file=$3
    local pid_file=$4
    local service_name=$5

    echo "📡 Khởi động $service_name (port $port)..."
    cd "$service_dir"
    
    # Cài đặt dependencies vào môi trường Conda 'eduscan'
    echo "📦 Cài đặt dependencies cho $service_name..."
    conda run -n eduscan pip install -r requirements.txt
    
    # Khởi động service bằng python từ môi trường conda
    echo "🌟 Chạy $service_name..."
    conda run -n eduscan python -m uvicorn app.main:app --host 0.0.0.0 --port "$port" --reload > "../logs/$log_file" 2>&1 &
    echo $! > "../logs/$pid_file"
    cd ..
}

# 1. Backend FastAPI
start_python_service "backend" 8000 "backend-local.log" "backend-local.pid" "Backend"

# 2. OMRChecker Service
start_python_service "OMRChecker" 8001 "omr-local.log" "omr-local.pid" "OMRChecker"

# 3. Frontend NextJS
echo "🎨 Khởi động Frontend (port 3000)..."
cd frontend
npm run dev > ../logs/frontend-local.log 2>&1 &
echo $! > ../logs/frontend-local.pid
cd ..

sleep 8
echo ""
echo "✅ Hoàn tất! Hệ thống local đang chạy."
echo "====================================="
echo "🌐 Frontend:      http://localhost:3000"
echo "📊 Backend Docs:  http://localhost:8000/docs"
echo "🛠️ OMR Docs:      http://localhost:8001/docs"
echo ""
echo "🛑 Để dừng, chạy: ./stop-local-dev.sh" 