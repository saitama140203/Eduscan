import zipfile
import os

def unzip_file(zip_path, extract_to=None):
    """
    Giải nén file zip
    
    Parameters:
    - zip_path: Đường dẫn đến file zip cần giải nén
    - extract_to: Thư mục đích (nếu None sẽ giải nén vào cùng thư mục với file zip)
    """
    try:

        if extract_to is None:
            extract_to = os.path.dirname(zip_path)
        

        os.makedirs(extract_to, exist_ok=True)

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
            
        print(f"✅ Đã giải nén thành công vào: {extract_to}")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi khi giải nén: {str(e)}")
        return False

# Cách sử dụng
zip_file = "/root/projects/Eduscan/AI/dataset/students-bubble-sheet.v4-lastest.yolov12.zip"  
unzip_file(zip_file)  
