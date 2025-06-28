import cv2
import os

def sharpen_image_cv(img, strength=1.0):
    blurred = cv2.GaussianBlur(img, (9, 9), 10.0)
    sharpened = cv2.addWeighted(img, 1.0 + strength, blurred, -strength, 0)
    return sharpened

def classify_bubbles_batch(image, bubbles, yolo_model, conf):
    results, rois_batch, valid_bubbles = {}, [], []
    if not bubbles: return results
    h, w = image.shape[:2]
    for bubble in bubbles:
        x1, y1, x2, y2 = [max(0, val) if i < 2 else min(bound, val) for i, (val, bound) in
                          enumerate(zip(bubble['bounds'], [w, h, w, h]))]
        if x2 > x1 and y2 > y1 and (roi := image[y1:y2, x1:x2]).size > 0:
            if len(roi.shape) == 2:
                roi = cv2.cvtColor(roi, cv2.COLOR_GRAY2RGB)
            elif roi.shape[2] == 4:
                roi = cv2.cvtColor(roi, cv2.COLOR_BGRA2BGR)
            roi = cv2.resize(roi, (54, 54))
            rois_batch.append(roi)
            valid_bubbles.append(bubble)
    if not rois_batch: return results
    for i, pred in enumerate(yolo_model(rois_batch, verbose=False, conf=conf)):
        if hasattr(pred, 'boxes') and len(pred.boxes) > 0 and int(pred.boxes.cls[0]) == 0:
            bubble = valid_bubbles[i]
            results.setdefault(bubble['qid'], []).append(bubble['choice'])
    for k in results:
        results[k] = ''.join(sorted(results[k])) if len(results[k]) > 1 else results[k][0]
    return results

def draw_selected_answers(image, bubbles, results, out_path):
    img, lookup = image.copy(), {f"{b['qid']}_{b['choice']}": b for b in bubbles}
    for qid, answer in results.items():
        if isinstance(answer, str):
            for choice in answer:
                if (key := f"{qid}_{choice}") in lookup:
                    x1, y1, x2, y2 = lookup[key]['bounds']
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 3)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    cv2.imwrite(out_path, img)

# def draw_scoring_overlay(image, bubbles, student_results, answer_key, out_path):
#     img = image.copy()
#     lookup = {f"{b['qid']}_{b['choice']}": b for b in bubbles}

#     # Keys đáp án đúng
#     answer_correct_keys = set()
#     for qid, key_ans in answer_key.items():
#         for choice in str(key_ans):
#             answer_correct_keys.add(f"{qid}_{choice}")

#     # Keys học sinh tô
#     student_selected_keys = set()
#     for qid, ans in student_results.items():
#         for choice in str(ans):
#             student_selected_keys.add(f"{qid}_{choice}")

#     for key, b in lookup.items():
#         x1, y1, x2, y2 = b['bounds']
#         if key in answer_correct_keys and key in student_selected_keys:
#             color = (0, 255, 0)   # Đúng: xanh
#         elif key in student_selected_keys and key not in answer_correct_keys:
#             color = (0, 0, 255)   # Tô vào đáp án sai: đỏ

#         else:
#             color = (200,200,200) # Khác: xám nhạt
#         cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

#     os.makedirs(os.path.dirname(out_path), exist_ok=True)
#     cv2.imwrite(out_path, img)
def draw_scoring_overlay(image, bubbles, student_results, answer_key, out_path):
    """
    Vẽ annotation đơn giản với 2 màu:
    - Xanh: Đúng (student chọn + đáp án đúng)
    - Đỏ: Sai (student chọn + đáp án sai)
    """
    img = image.copy()
    lookup = {f"{b['qid']}_{b['choice']}": b for b in bubbles}

    # Tạo sets để lookup nhanh
    answer_correct_keys = set()
    for qid, key_ans in answer_key.items():
        if key_ans:
            for choice in str(key_ans):
                answer_correct_keys.add(f"{qid}_{choice}")

    student_selected_keys = set()
    for qid, ans in student_results.items():
        if ans and not qid.startswith('_'):
            for choice in str(ans):
                student_selected_keys.add(f"{qid}_{choice}")

    # Chỉ 2 màu
    CORRECT_COLOR = (0, 255, 0)      # Xanh - Đúng
    WRONG_COLOR = (0, 0, 255)        # Đỏ - Sai
    
    # Vẽ từng bubble
    for key, bubble in lookup.items():
        x1, y1, x2, y2 = bubble['bounds']
        
        # Chỉ vẽ những bubble student đã chọn
        if key in student_selected_keys:
            if key in answer_correct_keys:
                # Đúng: Xanh
                color = CORRECT_COLOR
                thickness = 3
            else:
                # Sai: Đỏ  
                color = WRONG_COLOR
                thickness = 3
            
            # Vẽ rectangle
            cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness)
            
            # Vẽ checkmark ở center
            center_x = (x1 + x2) // 2
            center_y = (y1 + y2) // 2
            cv2.circle(img, (center_x, center_y), 8, color, -1)
            cv2.putText(img, "✓", (center_x - 4, center_y + 3), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

    # Lưu file
    if out_path:
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        cv2.imwrite(out_path, img)
        
    return img