#!/bin/bash

echo "🚀 Starting EduScan Frontend in Development Mode..."

# Kill any existing Next.js processes
echo "🔄 Stopping existing Next.js processes..."
pkill -f "next dev" 2>/dev/null || true

# Clean cache
echo "🧹 Cleaning cache..."
rm -rf .next node_modules/.cache 2>/dev/null || true

# Wait for cleanup
sleep 2

# Start backend if not running
echo "🔍 Checking backend status..."
if ! curl -s "http://103.67.199.62:8000" > /dev/null 2>&1; then
    echo "⚠️  Backend not running at http://103.67.199.62:8000"
    echo "   Please start backend first: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
else
    echo "✅ Backend is running"
fi

# Start frontend without turbopack (more stable)
echo "🎯 Starting Next.js in stable mode (without Turbopack)..."
echo "   URL: http://103.67.199.62:3000"
echo "   Admin: http://103.67.199.62:3000/dashboard/admin/answer-templates"
echo ""

NODE_ENV=development npm run dev:safe 