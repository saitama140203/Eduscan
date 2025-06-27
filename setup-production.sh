#!/bin/bash

# Script thiết lập EduScan Production với domain eduscan.id.vn - v2

echo "🚀 Thiết lập EduScan Production v2"
echo "================================"
echo "Domain: eduscan.id.vn"
echo ""

# Dừng các services cũ nếu có
sudo systemctl stop eduscan-backend eduscan-omr eduscan-frontend nginx 2>/dev/null
sudo systemctl disable eduscan-backend eduscan-omr eduscan-frontend 2>/dev/null

# Cài đặt Certbot nếu chưa có
if ! command -v certbot &> /dev/null; then
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Bước 1: Tạo cấu hình Nginx chỉ với HTTP (port 80)
echo "🔧 Bước 1: Tạo cấu hình Nginx tạm thời cho HTTP..."
sudo tee /etc/nginx/sites-available/eduscan > /dev/null << 'EOF'
server {
    listen 80;
    server_name eduscan.id.vn www.eduscan.id.vn;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 404; # Tạm thời chặn các request khác
    }
}
EOF

# Tạo thư mục cho certbot challenge
sudo mkdir -p /var/www/certbot

# Enable site và disable default
sudo ln -sf /etc/nginx/sites-available/eduscan /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test và restart Nginx
echo "🔄 Khởi động lại Nginx với cấu hình HTTP..."
sudo nginx -t && sudo systemctl restart nginx

# Bước 2: Lấy chứng chỉ SSL
echo "🔐 Bước 2: Lấy chứng chỉ SSL từ Let's Encrypt..."
echo "⚠️  LƯU Ý: DNS phải đã trỏ đúng về server này!"
echo "Certbot sẽ tự động sửa file cấu hình Nginx để bật HTTPS."

sudo certbot --nginx -d eduscan.id.vn -d www.eduscan.id.vn --non-interactive --agree-tos -m "your-email@example.com" --redirect

# Bước 3: Cập nhật lại cấu hình Nginx đầy đủ
echo "🔧 Bước 3: Cập nhật cấu hình Nginx đầy đủ cho Reverse Proxy..."
sudo tee /etc/nginx/sites-available/eduscan > /dev/null << 'EOF'
server {
    listen 80;
    server_name eduscan.id.vn www.eduscan.id.vn;
    # Chuyển hướng bởi Certbot
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name eduscan.id.vn www.eduscan.id.vn;

    # SSL - Certbot đã thêm
    ssl_certificate /etc/letsencrypt/live/eduscan.id.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/eduscan.id.vn/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Locations
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8000/api/v1/;
    }
    
    location /api/omr/ {
        proxy_pass http://127.0.0.1:8001/api/omr/;
    }
}
EOF

# Test và restart Nginx lần cuối
echo "🔄 Khởi động lại Nginx với cấu hình production..."
sudo nginx -t && sudo systemctl restart nginx

# Bước 4: Tạo systemd services
echo "🔧 Bước 4: Tạo systemd services..."

# Backend service
sudo tee /etc/systemd/system/eduscan-backend.service > /dev/null << 'EOF'
[Unit]
Description=EduScan Backend FastAPI
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/projects/Eduscan/backend
Environment="PATH=/root/projects/Eduscan/backend/venv/bin"
ExecStart=/root/projects/Eduscan/backend/venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# OMRChecker service
sudo tee /etc/systemd/system/eduscan-omr.service > /dev/null << 'EOF'
[Unit]
Description=EduScan OMRChecker Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/projects/Eduscan/OMRChecker
Environment="PATH=/root/projects/Eduscan/OMRChecker/venv/bin"
ExecStart=/root/projects/Eduscan/OMRChecker/venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
sudo tee /etc/systemd/system/eduscan-frontend.service > /dev/null << 'EOF'
[Unit]
Description=EduScan Frontend NextJS
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/projects/Eduscan/frontend
Environment="NODE_ENV=production"
Environment="NEXT_PUBLIC_API_URL=https://eduscan.id.vn/api/v1"
Environment="NEXT_PUBLIC_OMR_API_BASE_URL=https://eduscan.id.vn/api/omr"
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Bước 5: Build frontend cho production
echo "🏗️ Bước 5: Build frontend cho production..."
cd /root/projects/Eduscan/frontend
npm run build

# Bước 6: Enable và start services
echo "🚀 Bước 6: Khởi động services..."
sudo systemctl daemon-reload
sudo systemctl enable eduscan-backend eduscan-omr eduscan-frontend
sudo systemctl start eduscan-backend eduscan-omr eduscan-frontend

echo ""
echo "✅ Hoàn tất! Kiểm tra status:"
echo "================================"
sudo systemctl status eduscan-backend --no-pager
echo ""
sudo systemctl status eduscan-omr --no-pager
echo ""
sudo systemctl status eduscan-frontend --no-pager
echo ""

echo "🌐 Truy cập hệ thống tại:"
echo "   https://eduscan.id.vn"
echo ""
echo "📋 Quản lý services:"
echo "   sudo systemctl status eduscan-backend"
echo "   sudo systemctl status eduscan-omr"
echo "   sudo systemctl status eduscan-frontend"
echo ""
echo "📝 Xem logs:"
echo "   sudo journalctl -u eduscan-backend -f"
echo "   sudo journalctl -u eduscan-omr -f"
echo "   sudo journalctl -u eduscan-frontend -f" 