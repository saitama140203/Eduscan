#!/usr/bin/env python3

import requests
import json
import time
from io import BytesIO
from PIL import Image

# URLs
BACKEND_URL = "http://localhost:8000"

def create_dummy_image():
    """Tạo ảnh dummy"""
    img = Image.new('RGB', (2084, 2947), color='white')
    img_buffer = BytesIO()
    img.save(img_buffer, format='JPEG')
    img_buffer.seek(0)
    return img_buffer

def create_admin_user():
    """Tạo admin user để test"""
    try:
        admin_data = {
            "email": "test_admin@example.com",
            "password": "test123",
            "hoTen": "Test Admin",
            "vaiTro": "ADMIN",
            "soDienThoai": "0123456789"
        }
        
        response = requests.post(f"{BACKEND_URL}/api/v1/admin/users", json=admin_data)
        print(f"Create admin response: {response.status_code}")
        if response.status_code in [200, 201, 409]:  # 409 = already exists
            return True
        return False
    except Exception as e:
        print(f"Error creating admin: {e}")
        return False

def login_admin():
    """Login with admin user"""
    try:
        login_data = {
            "email": "test_admin@example.com",
            "password": "test123"
        }
        
        response = requests.post(f"{BACKEND_URL}/api/v1/auth/login", data=login_data)
        print(f"Login response: {response.status_code}")
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            print(f"✅ Login successful: {token[:20]}...")
            return token
        else:
            print(f"❌ Login failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"Login error: {e}")
        return None

def test_omr_with_minimal_data(token):
    """Test OMR endpoint with minimal valid data to trigger error"""
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Test với data không đầy đủ để trigger validation hoặc processing error
        test_data = {
            "exam_id": 1,
            "template_id": 1,
            "class_id": 1
        }
        
        print("Testing OMR process-single endpoint...")
        response = requests.post(
            f"{BACKEND_URL}/api/v1/omr/process-single",
            headers=headers,
            json=test_data
        )
        
        print(f"OMR Response Status: {response.status_code}")
        print(f"OMR Response: {response.text}")
        
        return response.status_code, response.text
        
    except Exception as e:
        print(f"❌ OMR test error: {e}")
        return None, str(e)

def test_omr_batch_with_files(token):
    """Test OMR batch endpoint with actual files"""
    try:
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        # Prepare multipart data
        img_buffer = create_dummy_image()
        
        files = {
            'images': ('test_image.jpg', img_buffer, 'image/jpeg')
        }
        
        data = {
            'exam_id': 1,
            'template_id': 1,
            'class_id': 1,
            'auto_align': False
        }
        
        print("Testing OMR process-batch endpoint...")
        response = requests.post(
            f"{BACKEND_URL}/api/v1/omr/process-batch",
            headers=headers,
            files=files,
            data=data
        )
        
        print(f"Batch OMR Response Status: {response.status_code}")
        print(f"Batch OMR Response: {response.text}")
        
        return response.status_code, response.text
        
    except Exception as e:
        print(f"❌ Batch OMR test error: {e}")
        return None, str(e)

def main():
    print("=== Full Integration Test ===\n")
    
    print("1. Testing backend connectivity...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/auth/me")
        print(f"✅ Backend is accessible (status: {response.status_code})")
    except Exception as e:
        print(f"❌ Backend not accessible: {e}")
        return
    
    print("\n2. Creating test admin user...")
    create_admin_user()
    
    print("\n3. Logging in...")
    token = login_admin()
    if not token:
        print("Cannot proceed without valid token")
        return
    
    print("\n4. Testing OMR single endpoint...")
    status, response = test_omr_with_minimal_data(token)
    
    print("\n5. Testing OMR batch endpoint...")
    batch_status, batch_response = test_omr_batch_with_files(token)
    
    print("\n=== Test Summary ===")
    print(f"Single OMR: {status}")
    print(f"Batch OMR: {batch_status}")
    
    if "str' object is not callable" in str(response) or "str' object is not callable" in str(batch_response):
        print("🔍 Found 'str' object is not callable error!")
    else:
        print("ℹ️ No 'str' object is not callable error found")

if __name__ == "__main__":
    main() 