#!/bin/bash

echo "🛑 Dừng EduScan Local Development"
echo "==============================="

# Kill processes based on PID files
if [ -f "logs/frontend-local.pid" ]; then
    kill -9 $(cat logs/frontend-local.pid) 2>/dev/null
    rm logs/frontend-local.pid
fi
if [ -f "logs/backend-local.pid" ]; then
    kill -9 $(cat logs/backend-local.pid) 2>/dev/null
    rm logs/backend-local.pid
fi
if [ -f "logs/omr-local.pid" ]; then
    kill -9 $(cat logs/omr-local.pid) 2>/dev/null
    rm logs/omr-local.pid
fi

# Fallback to kill by port
lsof -t -i:3000 | xargs -r kill -9
lsof -t -i:8000 | xargs -r kill -9
lsof -t -i:8001 | xargs -r kill -9

echo "✅ Đã dừng tất cả các service local." 