# OMR Checker - Tích hợp Database hoàn thành! 🎉

## Tổng quan

OMR Checker đã được **tích hợp hoàn toàn với database Eduscan**! Bây giờ hệ thống có thể:

✅ **Chấm điểm từ đáp án trong database** (JSON format)  
✅ **Tạo số báo danh từ 6 số cuối của mã học sinh trường**  
✅ **Tự động lưu kết quả vào database**  
✅ **Không cần server riêng biệt trên port 8001**  

## Luồng xử lý mới

### 1. **Chuẩn bị đáp án trong Database**
```sql
-- Bảng DAPAN chứa đáp án cho bài kiểm tra
INSERT INTO DAPAN (maBaiKiemTra, dapAnJson, diemMoiCauJson) VALUES (
    1, -- ID bài kiểm tra
    '{"1":"A","2":"B","3":"C","4":"D","5":"A"}', -- Đáp án đúng
    '{"1":2.0,"2":2.0,"3":2.0,"4":2.0,"5":2.0}' -- Điểm mỗi câu
);
```

### 2. **Số báo danh tự động**
- **Input**: Mã học sinh trường như `"HS2024001234"`
- **Output**: SBD là 6 số cuối: `"001234"`
- **Logic**: `maHocSinhTruong[-6:]`

### 3. **API Endpoints mới**

#### **POST /api/v1/omr/process-with-exam**
Xử lý một ảnh OMR với tích hợp database:
```bash
curl -X POST "http://localhost:8000/api/v1/omr/process-with-exam" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "exam_id=1" \
  -F "image=@phieu_traloi.jpg" \
  -F "template_path=app/omr/templates/template_25cau/template.json"
```

#### **POST /api/v1/omr/batch-process-with-exam**
Xử lý batch nhiều ảnh OMR:
```bash
curl -X POST "http://localhost:8000/api/v1/omr/batch-process-with-exam" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "exam_id=1" \
  -F "images=@phieu1.jpg" \
  -F "images=@phieu2.jpg" \
  -F "template_path=app/omr/templates/template_25cau/template.json"
```

#### **GET /api/v1/omr/exam-stats/{exam_id}**
Lấy thống kê OMR cho bài kiểm tra:
```json
{
  "success": true,
  "stats": {
    "exam_id": 1,
    "total_students": 30,
    "scanned_students": 25,
    "completed_students": 23,
    "pending_students": 7,
    "completion_rate": 76.67,
    "average_score": 7.2
  }
}
```

#### **POST /api/v1/omr/generate-sbd**
Tạo mapping số báo danh cho học sinh:
```json
{
  "success": true,
  "exam_id": 1,
  "total_students": 30,
  "sbd_mapping": [
    {
      "student_id": 123,
      "student_name": "Nguyễn Văn An",
      "student_code": "HS2024001234",
      "class_name": "12A1",
      "sbd": "001234"
    }
  ]
}
```

## Database Schema

### **Bảng DAPAN** (Answer Key)
```sql
maDapAn         BIGINT PRIMARY KEY
maBaiKiemTra    BIGINT FOREIGN KEY -> BAIKIEMTRA
dapAnJson       JSONB  -- {"1":"A","2":"B","3":"C",...}
diemMoiCauJson  JSONB  -- {"1":1.0,"2":1.0,"3":1.0,...}
```

### **Bảng PHIEUTRALOI** (Answer Sheet)
```sql
maPhieuTraLoi   BIGINT PRIMARY KEY
maBaiKiemTra    BIGINT FOREIGN KEY -> BAIKIEMTRA
maHocSinh       BIGINT FOREIGN KEY -> HOCSINH
cauTraLoiJson   JSONB  -- {"1":"A","2":"B","3":"C",...}
urlHinhAnh      STRING -- Đường dẫn ảnh gốc
daXuLyHoanTat   BOOLEAN
```

### **Bảng KETQUA** (Result)
```sql
maKetQua        BIGINT PRIMARY KEY
maPhieuTraLoi   BIGINT FOREIGN KEY -> PHIEUTRALOI
maBaiKiemTra    BIGINT FOREIGN KEY -> BAIKIEMTRA
maHocSinh       BIGINT FOREIGN KEY -> HOCSINH
diem            DECIMAL(5,2)
soCauDung       INTEGER
soCauSai        INTEGER
soCauChuaTraLoi INTEGER
chiTietJson     JSONB  -- Chi tiết từng câu
```

## Service Classes

### **OMRDatabaseService**
Class chính xử lý tích hợp database:

```python
# Lấy đáp án từ database
answer_key, score_key = await OMRDatabaseService.get_answer_key_from_db(db, exam_id)

# Tìm học sinh theo SBD
student = await OMRDatabaseService.find_student_by_sbd(db, exam_id, sbd)

# Chấm điểm và lưu kết quả
result = await OMRDatabaseService.score_omr_result(
    db, exam_id, student_answers, sbd, image_path, scanner_user_id
)

# Xử lý batch
batch_result = await OMRDatabaseService.batch_score_omr_results(
    db, exam_id, batch_results, scanner_user_id
)
```

## Ví dụ Complete Workflow

### Bước 1: Tạo bài kiểm tra và đáp án
```python
# Tạo bài kiểm tra
exam = Exam(
    tieuDe="Kiểm tra Toán học",
    tongSoCau=10,
    tongDiem=10.0
)

# Tạo đáp án
answer = Answer(
    maBaiKiemTra=exam.maBaiKiemTra,
    dapAnJson={"1":"A","2":"B","3":"C","4":"D","5":"A","6":"B","7":"C","8":"D","9":"A","10":"B"},
    diemMoiCauJson={"1":1.0,"2":1.0,"3":1.0,"4":1.0,"5":1.0,"6":1.0,"7":1.0,"8":1.0,"9":1.0,"10":1.0}
)
```

### Bước 2: Upload và xử lý ảnh OMR
```bash
curl -X POST "http://localhost:8000/api/v1/omr/process-with-exam" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "exam_id=1" \
  -F "image=@phieu_sbd_001234.jpg" \
  -F "template_path=app/omr/templates/template_10cau/template.json"
```

### Bước 3: Kết quả tự động lưu
```json
{
  "success": true,
  "scoring_result": {
    "student_name": "Nguyễn Văn An",
    "student_code": "HS2024001234", 
    "sbd": "001234",
    "total_score": 8.0,
    "correct_answers": 8,
    "wrong_answers": 1,
    "blank_answers": 1,
    "percentage": 80.0
  }
}
```

## Lợi ích của tích hợp Database

### ✅ **Đơn giản hóa kiến trúc**
- Không cần server riêng biệt
- Tất cả trong một backend FastAPI

### ✅ **Quản lý tập trung**
- Đáp án lưu trong database
- Kết quả tự động sync
- Thống kê real-time

### ✅ **Linh hoạt cao**
- Đáp án có thể thay đổi easily
- Điểm số linh hoạt cho từng câu
- Support nhiều format template

### ✅ **Bảo mật tốt hơn**
- Đáp án không lưu file
- Authentication integrated
- Audit trail đầy đủ

## Cấu hình template cần thiết

### Template JSON cần có:
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

## Next Steps

1. **✅ OMR tích hợp database hoàn thành**
2. **🔄 Test với dữ liệu thực tế**
3. **📊 Tích hợp báo cáo và thống kê**
4. **🎨 Cập nhật UI frontend**
5. **📱 Mobile app support**

---

**🎯 Kết luận**: OMR Checker đã được tích hợp thành công với database Eduscan, cung cấp giải pháp chấm điểm hoàn toàn tự động với số báo danh thông minh và lưu trữ kết quả real-time! 