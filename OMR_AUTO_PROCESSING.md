# OMR Auto Processing - Xử lý hoàn toàn tự động 🤖

## Tổng quan

Hệ thống OMR Checker đã được cập nhật để **xử lý hoàn toàn tự động** từ ảnh phiếu trả lời, bao gồm:

✅ **Tự động nhận diện số báo danh** từ ảnh  
✅ **Tự động nhận diện mã đề** từ ảnh  
✅ **Tự động nhận diện đáp án** từ ảnh  
✅ **Tự động match học sinh** theo SBD trong lớp  
✅ **Tự động chấm điểm** theo mã đề tương ứng  

## Luồng xử lý tự động

### 1. **Input: Chỉ cần ảnh + Exam ID**
```bash
POST /api/v1/omr/process-with-exam
- exam_id: ID bài kiểm tra  
- image: File ảnh phiếu trả lời
- template_path: Đường dẫn template OMR
```

### 2. **Bước 1: Nhận diện từ ảnh**
```
🖼️ Ảnh phiếu trả lời
    ↓ [YOLO + Template Processing]
📋 OMR Results:
{
  "sbd": "001234",           ← Tự động nhận diện SBD
  "ma_de": "123",           ← Tự động nhận diện mã đề  
  "q1": "A",                ← Tự động nhận diện đáp án
  "q2": "B", 
  ...
}
```

### 3. **Bước 2: Match học sinh theo SBD**
```python
# Tìm học sinh trong các lớp tham gia bài kiểm tra
# SBD "001234" → tìm học sinh có maHocSinhTruong kết thúc "001234"

SELECT * FROM HOCSINH h
JOIN LOPHOC l ON h.maLopHoc = l.maLopHoc  
JOIN BAIKIEMTRA_LOPHOC bl ON l.maLopHoc = bl.maLopHoc
WHERE bl.maBaiKiemTra = exam_id
  AND h.maHocSinhTruong LIKE '%001234'
  AND h.trangThai = True
```

### 4. **Bước 3: Lấy đáp án theo mã đề**
```python
# Từ database DAPAN với format:
{
  "123": {"q1":"A", "q2":"B", "q3":"D", ...},  ← Mã đề 123
  "456": {"q1":"C", "q2":"D", "q3":"A", ...},  ← Mã đề 456
  "777": {"q1":"A", "q2":"B", "q3":"C", ...}   ← Mã đề 777
}

# Chọn đáp án cho mã đề "123"
```

### 5. **Bước 4: Chấm điểm tự động**
```python
# So sánh đáp án học sinh với đáp án chuẩn
student_answers = {"q1":"A", "q2":"B", "q3":"C", ...}
correct_answers = {"q1":"A", "q2":"B", "q3":"D", ...}  # Mã đề 123

# Kết quả: q1=✅, q2=✅, q3=❌, ...
```

### 6. **Bước 5: Lưu kết quả tự động**
```sql
-- Lưu vào PHIEUTRALOI
INSERT INTO PHIEUTRALOI (maBaiKiemTra, maHocSinh, cauTraLoiJson, ...)

-- Lưu vào KETQUA  
INSERT INTO KETQUA (maBaiKiemTra, maHocSinh, diem, soCauDung, ...)
```

## Format đáp án đa mã đề

### **Database DAPAN.dapAnJson:**
```json
{
  "123": {
    "q1": "A", "q2": "B", "q3": "D", "q4": "C", "q5": "D",
    "q6": "B", "q7": "A", "q8": "C", "q9": "B", "q10": "D",
    "13_a": "T", "13_b": "F", "13_c": "T", "13_d": "F",
    "17_col1": "2", "17_col2": ",", "17_col3": "4", "17_col4": "1"
  },
  "456": {
    "q1": "C", "q2": "D", "q3": "A", "q4": "B", "q5": "A",
    "q6": "C", "q7": "D", "q8": "B", "q9": "D", "q10": "B",
    "13_a": "F", "13_b": "F", "13_c": "T", "13_d": "T",
    "17_col1": "7", "17_col2": ",", "17_col3": "8", "17_col4": "3"
  },
  "777": {
    "q1": "A", "q2": "B", "q3": "C", "q4": "C", "q5": "C",
    "q6": "B", "q7": "C", "q8": "A", "q9": "C", "q10": "A", 
    "13_a": "T", "13_b": "T", "13_c": "F", "13_d": "F",
    "17_col1": "2", "17_col2": ",", "17_col3": "4", "17_col4": "1"
  }
}
```

### **Database DAPAN.diemMoiCauJson:**
```json
{
  "q1": 0.132, "q2": 0.132, "q3": 0.132, "q4": 0.132,
  "q5": 0.132, "q6": 0.132, "q7": 0.132, "q8": 0.132,
  "13_a": 0.132, "13_b": 0.132, "13_c": 0.132, "13_d": 0.132,
  "17_col1": 0.263, "17_col2": 0.263, "17_col3": 0.263, "17_col4": 0.263
}
```

## Các loại câu hỏi được hỗ trợ

### 1. **Multiple Choice Questions (MCQ)**
```json
"q1": "A", "q2": "B", "q3": "C", "q4": "D"
```

### 2. **True/False Questions**  
```json
"13_a": "T", "13_b": "F", "13_c": "T", "13_d": "F"
```

### 3. **Fill-in-the-blank (Number input)**
```json
"17_col1": "2", "17_col2": ",", "17_col3": "4", "17_col4": "1"
```

## Thuật toán nhận diện

### **Nhận diện số báo danh (SBD):**
```python
# Tìm trong các key có thể chứa SBD
sbd_keys = ["sbd", "so_bao_danh", "student_id", "id"]

# Hoặc tìm pattern số trong key tương tự
if "sbd" in key.lower() or "id" in key.lower():
    if value.isdigit():
        sbd = value
```

### **Nhận diện mã đề:**
```python
# Tìm trong các key có thể chứa mã đề
ma_de_keys = ["ma_de", "made", "code", "form_code", "version", 
              "exam_code", "test_code", "variant", "form"]

# Hoặc tìm số 3 chữ số (123, 456, 777)
if value.isdigit() and len(value) == 3:
    ma_de = value
```

### **Mapping SBD → Học sinh:**
```python
# SBD là 6 số cuối của mã học sinh trường
ma_hoc_sinh_truong = "HS2024001234"
sbd = "001234"  # 6 số cuối

# Tìm học sinh có mã kết thúc bằng SBD này
```

## API Usage

### **Xử lý một ảnh:**
```bash
curl -X POST "http://localhost:8000/api/v1/omr/process-with-exam" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "exam_id=1" \
  -F "image=@phieu_traloi.jpg" \
  -F "template_path=app/omr/templates/template_25cau/template.json"
```

### **Response tự động:**
```json
{
  "success": true,
  "file": "phieu_traloi.jpg",
  "exam_id": 1,
  "omr_results": {
    "sbd": "001234",
    "ma_de": "123", 
    "q1": "A", "q2": "B", ...
  },
  "scoring_result": {
    "success": true,
    "student_name": "Nguyễn Văn An",
    "student_code": "HS2024001234",
    "sbd": "001234",
    "ma_de": "123",
    "total_score": 8.5,
    "correct_answers": 25,
    "wrong_answers": 3,
    "blank_answers": 2,
    "percentage": 83.33
  }
}
```

### **Xử lý batch:**
```bash
curl -X POST "http://localhost:8000/api/v1/omr/batch-process-with-exam" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "exam_id=1" \
  -F "images=@phieu1.jpg" \
  -F "images=@phieu2.jpg" \
  -F "images=@phieu3.jpg" \
  -F "template_path=app/omr/templates/template_25cau/template.json"
```

## Template cần thiết

### **Template JSON phải định nghĩa:**
```json
{
  "page_dimensions": [2480, 3508],
  "bubble_dimensions": [32, 32],
  "field_blocks": {
    "sbd": {
      "field_type": "QTYPE_INT",
      "origin": [1520, 360],
      "bubblesGap": 37,
      "labelsGap": 35,
      "fieldLabels": ["0","1","2","3","4","5","6","7","8","9"]
    },
    "ma_de": {
      "field_type": "QTYPE_INT", 
      "origin": [1200, 300],
      "bubblesGap": 37,
      "labelsGap": 35,
      "fieldLabels": ["0","1","2","3","4","5","6","7","8","9"]
    },
    "questions": {
      "field_type": "QTYPE_MCQ_5",
      "origin": [240, 840], 
      "bubblesGap": 37,
      "labelsGap": 48,
      "fieldLabels": ["A","B","C","D","E"]
    }
  }
}
```

## Lợi ích của xử lý tự động

### ✅ **Hoàn toàn tự động**
- Không cần input thủ công số báo danh
- Không cần input thủ công mã đề
- Chỉ cần upload ảnh và chọn bài kiểm tra

### ✅ **Giảm thiểu lỗi**
- Không có lỗi nhập sai SBD/mã đề
- Tự động validation và matching
- Log chi tiết để debug

### ✅ **Xử lý hàng loạt**
- Batch processing nhiều ảnh cùng lúc
- Tự động phân loại theo mã đề
- Thống kê real-time

### ✅ **Linh hoạt cao**
- Hỗ trợ nhiều format template
- Nhiều loại câu hỏi khác nhau  
- Dễ dàng thêm mã đề mới

---

**🎯 Kết luận**: Hệ thống OMR giờ đây đã **hoàn toàn tự động**, chỉ cần đưa ảnh lên là có ngay kết quả chấm điểm chi tiết với số báo danh và mã đề được nhận diện tự động! 