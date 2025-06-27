#!/usr/bin/env python3

import requests
import json
import tempfile
import os
from PIL import Image
import io

# OMR Service URL
OMR_URL = "http://localhost:8001"

def create_dummy_image():
    """Tạo ảnh dummy để test"""
    # Tạo ảnh trắng 2084x2947 (A4 size)
    img = Image.new('RGB', (2084, 2947), color='white')
    
    # Lưu vào memory
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='JPEG')
    img_buffer.seek(0)
    
    return img_buffer

def create_dummy_template():
    """Tạo template JSON dummy"""
    template_data = {
        "pageDimensions": [2084, 2947],
        "bubbleDimensions": [45, 45],
        "fieldBlocks": {
            "test_block": {
                "fieldType": "QTYPE_MCQ4",
                "origin": [100, 100],
                "fieldLabels": ["1", "2", "3"],
                "bubblesGap": 60,
                "labelsGap": 60,
                "rows": 3,
                "cols": 4
            }
        }
    }
    
    # Tạo temporary template file
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(template_data, temp_file, indent=2)
    temp_file.close()
    
    return temp_file.name

def test_omr_batch_api():
    """Test OMR batch API directly"""
    try:
        print("Creating test data...")
        
        # Tạo dummy image
        img_buffer = create_dummy_image()
        
        # Tạo template file
        template_path = create_dummy_template()
        
        # Prepare files và data
        files = [
            ('images', ('test_image.jpg', img_buffer, 'image/jpeg'))
        ]
        
        data = {
            'template_path': template_path,
            'yolo_model': 'models/best.pt',
            'confidence': 0.25,
            'auto_align': 'false',
            'answer_key_json': json.dumps({
                "answers": {"1": "A", "2": "B", "3": "C"},
                "scores": {"1": 1.0, "2": 1.0, "3": 1.0}
            })
        }
        
        print("Calling OMR batch API...")
        response = requests.post(
            f"{OMR_URL}/api/v1/omr/batch",
            files=files,
            data=data,
            timeout=30
        )
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Text: {response.text[:500]}...")
        
        if response.status_code == 200:
            print("✅ OMR API call successful!")
            result = response.json()
            print(f"Processed {result.get('processed_count', 0)} images")
            return True
        else:
            print(f"❌ OMR API call failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing OMR API: {e}")
        return False
    finally:
        # Cleanup
        if 'template_path' in locals() and os.path.exists(template_path):
            os.unlink(template_path)

def test_omr_health():
    """Test OMR health endpoint"""
    try:
        response = requests.get(f"{OMR_URL}/api/v1/omr/health")
        print(f"✅ OMR Health: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ OMR Health Error: {e}")
        return False

def main():
    print("=== Testing OMR Service Direct API ===\n")
    
    print("1. Testing OMR Health...")
    if not test_omr_health():
        print("OMR Service is not healthy. Exiting.")
        return
    
    print("\n2. Testing OMR Batch API...")
    test_omr_batch_api()
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    main() 