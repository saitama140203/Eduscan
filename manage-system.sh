#!/bin/bash

# Script quản lý toàn bộ hệ thống EduScan (Backend & Frontend)

# --- Hàm hiển thị cách sử dụng ---
usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|update}"
    echo "  - start:   Bắt đầu chạy tất cả các dịch vụ (frontend, backend, nginx)."
    echo "  - stop:    Dừng tất cả các dịch vụ."
    echo "  - restart: Khởi động lại tất cả các dịch vụ."
    echo "  - status:  Kiểm tra trạng thái của tất cả các dịch vụ."
    echo "  - logs [service]: Xem logs. 'service' có thể là 'backend' hoặc 'frontend'."
    echo "  - update:  Chạy script update-all.sh để cập nhật toàn bộ hệ thống."
    exit 1
}

# --- Case chính để xử lý các lệnh ---
case "$1" in
    start)
        echo "🚀 Đang khởi động các dịch vụ..."
        sudo systemctl start eduscan-backend
        sudo systemctl start eduscan-frontend
        sudo systemctl start nginx
        echo "✅ Các dịch vụ đã được khởi động."
        ;;
    stop)
        echo "🛑 Đang dừng các dịch vụ..."
        sudo systemctl stop eduscan-frontend
        sudo systemctl stop eduscan-backend
        # Không dừng nginx để có thể hiển thị trang lỗi nếu cần
        echo "✅ Frontend và Backend đã được dừng."
        ;;
    restart)
        echo "🔄 Đang khởi động lại các dịch vụ..."
        sudo systemctl restart eduscan-backend
        sudo systemctl restart eduscan-frontend
        sudo systemctl restart nginx
        echo "✅ Các dịch vụ đã được khởi động lại."
        ;;
    status)
        echo "📊 Trạng thái dịch vụ Backend:"
        sudo systemctl status eduscan-backend --no-pager
        echo ""
        echo "📊 Trạng thái dịch vụ Frontend:"
        sudo systemctl status eduscan-frontend --no-pager
        echo ""
        echo "📊 Trạng thái dịch vụ Nginx:"
        sudo systemctl status nginx --no-pager
        ;;
    logs)
        if [ "$2" == "backend" ]; then
            sudo journalctl -u eduscan-backend -f
        elif [ "$2" == "frontend" ]; then
            sudo journalctl -u eduscan-frontend -f
        else
            echo "Lỗi: Vui lòng chỉ định service để xem logs: 'backend' hoặc 'frontend'."
            echo "Ví dụ: $0 logs backend"
        fi
        ;;
    update)
        echo "🚀 Chạy script cập nhật hệ thống..."
        ./update-all.sh
        ;;
    *)
        usage
        ;;
esac 