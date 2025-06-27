#!/usr/bin/env python3

import requests
import json

# Backend URLs
BACKEND_URL = "http://localhost:8000"
OMR_URL = "http://localhost:8001"

def test_omr_connection():
    """Test direct connection to OMR service"""
    try:
        response = requests.get(f"{OMR_URL}/api/v1/omr/health")
        print(f"✅ OMR Health Check: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ OMR Service Error: {e}")
        return False

def test_backend_login():
    """Test backend login and get token"""
    try:
        # Test login with admin user (assuming it exists)
        login_data = {
            "email": "admin@example.com",
            "password": "admin123"
        }
        
        response = requests.post(f"{BACKEND_URL}/api/v1/auth/login", data=login_data)
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            print(f"✅ Backend Login Success: {token[:20]}...")
            return token
        else:
            print(f"❌ Backend Login Failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Backend Login Error: {e}")
        return None

def test_omr_endpoint_with_auth(token):
    """Test OMR endpoint với authentication"""
    try:
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        # Test with minimal data (should fail due to missing files but with proper error)
        response = requests.post(
            f"{BACKEND_URL}/api/v1/omr/process-single", 
            headers=headers,
            json={"test": "data"}
        )
        
        print(f"OMR Endpoint Response ({response.status_code}): {response.text}")
        
        # Expect validation error, not internal server error
        if response.status_code == 422:  # Validation error
            print("✅ OMR Endpoint accessible with proper validation")
            return True
        elif response.status_code == 500:
            print("❌ Still getting 500 Internal Server Error")
            return False
        else:
            print(f"⚠️ Unexpected response code: {response.status_code}")
            return True
            
    except Exception as e:
        print(f"❌ OMR Endpoint Test Error: {e}")
        return False

def main():
    print("=== Testing EduScan OMR Integration ===\n")
    
    # Test 1: OMR Service Health
    print("1. Testing OMR Service Connection...")
    if not test_omr_connection():
        print("OMR Service is not running. Please start it first.")
        return
    
    print("\n2. Testing Backend Authentication...")
    token = test_backend_login()
    if not token:
        print("Backend authentication failed. Cannot test OMR integration.")
        return
    
    print("\n3. Testing OMR Integration with Authentication...")
    test_omr_endpoint_with_auth(token)
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    main() 