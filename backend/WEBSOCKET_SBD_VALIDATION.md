# 🔍 WebSocket SBD Validation - Hướng dẫn Frontend

## Tổng quan
WebSocket OMR đã được cập nhật để **validation nghiêm ngặt SBD** và **dừng xử lý ngay** nếu không nhận diện được.

## 📡 Các Status WebSocket Mới

### 1. ✅ `recognition_success` - Nhận diện thành công
```json
{
  "status": "recognition_success",
  "message": "✅ Nhận diện thành công SBD: 123456789",
  "details": {
    "recognition_result": "success",
    "detected_sbd": "123456789",
    "detected_ma_de": "001"
  }
}
```

### 2. ❌ `recognition_failed` - Nhận diện thất bại (DỪNG XỬ LÝ)
```json
{
  "status": "recognition_failed", 
  "message": "❌ Không nhận diện được SBD từ phiếu trả lời",
  "details": {
    "recognition_result": "failed",
    "detected_sbd": "unknown",
    "metadata": {"sbd": "unknown", "ma_de": ""},
    "all_omr_fields": ["q1: A", "q2: B", "q3: C", "..."],
    "reason": "SBD không hợp lệ hoặc không rõ ràng",
    "suggestion": "Vui lòng chụp lại ảnh rõ nét hơn, đảm bảo vùng SBD không bị che khuất",
    "help_text": "Tìm hiểu SBD hợp lệ bằng cách gọi API /api/v1/omr/generate-sbd",
    "aligned_image": "data:image/jpeg;base64,..."
  }
}
```

## 🎯 Validation Rules (Backend)

### SBD HỢP LỆ khi:
- ✅ Không null/undefined/empty
- ✅ Không phải "unknown"  
- ✅ Là số (isdigit() = true)
- ✅ Có ít nhất 4 chữ số

### SBD KHÔNG HỢP LỆ khi:
- ❌ null, undefined, empty
- ❌ Giá trị "unknown"
- ❌ Chứa ký tự không phải số
- ❌ Ít hơn 4 chữ số

## 💻 Frontend Integration

```typescript
socket.on('omr_progress', (data) => {
  switch(data.status) {
    case 'recognition_success':
      setDetectedSBD(data.details.detected_sbd);
      setRecognitionStatus('success');
      break;
      
    case 'recognition_failed':
      setRecognitionStatus('failed');
      setErrorDetails(data.details);
      setPreviewImage(data.details.aligned_image);
      setShowRetryButton(true);
      break;
      
    case 'complete':
      setResults(data.details);
      break;
  }
});
```

## 🚀 Benefits
1. **UX tốt hơn**: Người dùng biết ngay khi cần chụp lại
2. **Tiết kiệm tài nguyên**: Không xử lý ảnh không hợp lệ  
3. **Độ chính xác cao**: Chỉ chấm điểm khi SBD rõ ràng
4. **Phản hồi realtime**: Status updates tức thời
