import os
import traceback
import cv2
from glob import glob
from pathlib import Path
import multiprocessing
from concurrent.futures import ThreadPoolExecutor, as_completed
from ultralytics import YOLO
import pandas as pd
from .template import load_template, get_all_bubbles
from .detection import classify_bubbles_batch, draw_selected_answers, draw_scoring_overlay
from .src.utils.extract_special_code import extract_special_code
from .src.utils.group_answers import group_answers, group_scores
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# 1. Import aligner gốc
from .src.processors.AdvancedFeatureAlignment import AdvancedFeatureAlignment

# 2. MockConfig tối thiểu cho aligner
class MockConfig:
    class Dimensions:
        processing_width = 2084
        processing_height = 2947
    class Outputs:
        show_image_level = 0

    def __init__(self, width=2084, height=2947, debug=False):
        self.dimensions = self.Dimensions()
        self.dimensions.processing_width = width
        self.dimensions.processing_height = height
        self.outputs = self.Outputs()
        self.outputs.show_image_level = 3 if debug else 0

class OMRAligner:
    def __init__(self, ref_img_path, method='ORB', max_features=5000, good_match_percent=0.2, debug=False):
        self.config = MockConfig(width=2084, height=2947, debug=debug)
        
        # Auto-find reference image in template directory
        if ref_img_path.endswith('.json'):
            template_dir = os.path.dirname(ref_img_path)
            # Look for common reference image patterns
            ref_patterns = ['*.png', '*.jpg', '*.jpeg']
            ref_img_found = None
            for pattern in ref_patterns:
                ref_files = glob(os.path.join(template_dir, pattern))
                if ref_files:
                    ref_img_found = ref_files[0]  # Take first match
                    break
            
            if ref_img_found:
                ref_img_path = ref_img_found
                logging.info(f"Auto-detected reference image: {ref_img_path}")
            else:
                raise FileNotFoundError(f"No reference image found in template directory: {template_dir}")
        
        options = {
            "reference": ref_img_path,
            "featureType": method,
            "maxFeatures": max_features,
            "goodMatchPercent": good_match_percent,
            "resizeTemplate": False
        }
        self.aligner = AdvancedFeatureAlignment(
            options=options,
            tuning_config=self.config,
            relative_dir=Path(".")
        )

    def align(self, image):
        aligned = self.aligner.apply_filter(image, "")
        return aligned if aligned is not None else image

    def cleanup(self):
        pass

# --------- CHẤM ĐIỂM THEO ĐIỂM TỪ EXCEL ---------
def scoring_by_key(student_results, answer_key, score_key):
    correct, total, total_score = 0, 0, 0.0
    details = []
    for qid, ans in answer_key.items():
        stu_ans = student_results.get(qid, None)
        is_correct = (stu_ans == ans)
        score = score_key.get(qid, 1.0) if is_correct else 0.0
        details.append((qid, stu_ans, ans, is_correct, score))
        total += 1
        if is_correct:
            correct += 1
            total_score += score
    return total_score, correct, total, details

# -------------------------------------------------

def process_single_image(img_path, template, yolo_model, conf, aligner=None, answer_key_excel=None, save_files=False):
    """
    Xử lý một ảnh OMR với tối ưu hóa và loại bỏ các công việc thừa
    """
    aligned_image_to_return = None
    try:
        # 1. Kiểm tra file ảnh
        if not os.path.exists(img_path):
            logging.error(f"Image file not found: {img_path}")
            return os.path.basename(img_path), {}, None
        
        # Bỏ qua kiểm tra header của file, tin tưởng vào cv2.imread
        
        # 2. Đọc ảnh
        image = cv2.imread(img_path)
        if image is None:
            logging.warning(f"Could not read image {img_path}")
            return os.path.basename(img_path), {}, None

        processing_image = image.copy()

        # 3. Alignment (nếu có)
        if aligner:
            logging.info(f"-> Aligning image: {os.path.basename(img_path)}")
            try:
                aligned_image = aligner.align(image)
                if aligned_image is not None:
                    if save_files:
                        fname_base = os.path.splitext(os.path.basename(img_path))[0]
                        input_dir = os.path.dirname(img_path)
                        aligned_dir = os.path.join(input_dir, "aligned_results")
                        os.makedirs(aligned_dir, exist_ok=True)
                        aligned_out_path = os.path.join(aligned_dir, f"{fname_base}_aligned.jpg")
                        cv2.imwrite(aligned_out_path, aligned_image)

                    # Làm nét ảnh sau khi align
                    blurred = cv2.GaussianBlur(aligned_image, (9, 9), 10.0)
                    sharpened = cv2.addWeighted(aligned_image, 1.0 + 1.2, blurred, -1.2, 0)
                    processing_image = sharpened
                    aligned_image_to_return = sharpened.copy()
                else:
                    aligned_image_to_return = image.copy()
            except Exception as e:
                aligned_image_to_return = image.copy()
        else:
            aligned_image_to_return = image.copy()

        # 4. Xử lý OMR detection
        bubbles = get_all_bubbles(template)
        results = classify_bubbles_batch(processing_image, bubbles, yolo_model, conf)

        fname = os.path.splitext(os.path.basename(img_path))[0]
        
        # 5. Extract special codes (SBD, mã đề)
        sbd = extract_special_code(results, "sbd")
        ma_de = extract_special_code(results, "mdt")
        results["_metadata"] = {
            "sbd": sbd,
            "ma_de": ma_de,
            "filename": fname,
            "total_questions": len([k for k in results.keys() if not k.startswith("_")])
        }

        # Đảm bảo aligned_image_to_return được khởi tạo
        if 'sharpened' in locals():
            aligned_image_to_return = sharpened
        elif 'image' in locals():
            aligned_image_to_return = image

        return fname, results, aligned_image_to_return
        
    except Exception as e:
        logging.exception(f"FATAL ERROR processing {img_path}: {e}")
        # Luôn trả về 3 giá trị, giá trị cuối là None khi có lỗi
        return os.path.basename(img_path), {"error": str(e)}, None

def process_single_image_with_aligned(img_path, template, yolo_model, conf, aligner=None, answer_key_excel=None, save_files=False, return_aligned_image=True):
    """
    Xử lý một ảnh OMR với tối ưu hóa và có thể trả về ảnh đã align
    
    Args:
        img_path: Đường dẫn ảnh
        template: Template OMR
        yolo_model: YOLO model
        conf: Confidence threshold
        aligner: OMR aligner (optional)
        answer_key_excel: File Excel đáp án (optional, deprecated)
        save_files: Có lưu file CSV và ảnh kết quả không (default: False)
        return_aligned_image: Có trả về ảnh đã align không (default: False)
        
    Returns:
        Tuple(filename, results_dict, aligned_image) nếu return_aligned_image=True
        Tuple(filename, results_dict) nếu return_aligned_image=False
    """
    try:
        # 1. Kiểm tra file ảnh
        if not os.path.exists(img_path):
            logging.error(f"Image file not found: {img_path}")
            result = (os.path.basename(img_path), {})
            return result + (None,) if return_aligned_image else result
            
        # Kiểm tra magic bytes để đảm bảo là file ảnh hợp lệ
        try:
            with open(img_path, 'rb') as f:
                header = f.read(8)
                if not (header.startswith(b'\xff\xd8\xff') or  # JPEG
                       header.startswith(b'\x89PNG\r\n\x1a\n') or  # PNG
                       header.startswith(b'BM')):  # BMP
                    logging.error(f"File {img_path} is not a valid image file")
                    result = (os.path.basename(img_path), {})
                    return result + (None,) if return_aligned_image else result
        except Exception as e:
            logging.error(f"Error checking image file format: {e}")
            result = (os.path.basename(img_path), {})
            return result + (None,) if return_aligned_image else result
        
        # 2. Đọc ảnh
        image = cv2.imread(img_path)
        if image is None:
            logging.warning(f"Could not read image {img_path}")
            result = (os.path.basename(img_path), {})
            return result + (None,) if return_aligned_image else result

        # 3. Alignment (nếu có)
        aligned_image = None
        processing_image = image.copy()
        
        if aligner:
            logging.info(f"-> Aligning image: {os.path.basename(img_path)}")
            try:
                aligned_image = aligner.align(image)
                if aligned_image is not None:
                    # Chỉ lưu aligned image nếu save_files=True
                    if save_files:
                        fname = os.path.splitext(os.path.basename(img_path))[0]
                        input_dir = os.path.dirname(img_path)
                        aligned_dir = os.path.join(input_dir, "aligned_results")
                        os.makedirs(aligned_dir, exist_ok=True)
                        aligned_out_path = os.path.join(aligned_dir, f"{fname}_aligned.jpg")
                        cv2.imwrite(aligned_out_path, aligned_image)
                    
                    # Apply sharpening
                    blurred = cv2.GaussianBlur(aligned_image, (9, 9), 10.0)
                    sharpened = cv2.addWeighted(aligned_image, 1.0 + 1.2, blurred, -1.2, 0)
                    processing_image = sharpened
                    
                    # Lưu aligned image để return nếu cần
                    if return_aligned_image:
                        aligned_image = sharpened.copy()
                else:
                    logging.warning(f"Alignment failed for {img_path}, using original image")
                    aligned_image = image.copy() if return_aligned_image else None
            except Exception as e:
                logging.warning(f"Alignment failed, using original image: {e}")
                aligned_image = image.copy() if return_aligned_image else None
        else:
            # No alignment requested
            aligned_image = image.copy() if return_aligned_image else None

        # 4. Xử lý OMR detection trên processing_image
        bubbles = get_all_bubbles(template)
        results = classify_bubbles_batch(processing_image, bubbles, yolo_model, conf)

        fname = os.path.splitext(os.path.basename(img_path))[0]
        
        # 5. Extract special codes (SBD, mã đề)
        sbd = extract_special_code(results, "sbd")
        ma_de = extract_special_code(results, "mdt")
        
        # Thêm metadata vào results
        results["_metadata"] = {
            "sbd": sbd,
            "ma_de": ma_de,
            "filename": fname,
            "total_questions": len([k for k in results.keys() if not k.startswith("_")]),
            "alignment_performed": aligner is not None,
            "alignment_success": aligned_image is not None and aligner is not None
        }

        result = (fname, results)
        return result + (aligned_image,) if return_aligned_image else result
        
    except Exception as e:
        logging.exception(f"FATAL ERROR processing {img_path}: {e}")
        error_result = (os.path.basename(img_path), {"error": str(e)})
        return error_result + (None,) if return_aligned_image else error_result

def process_multiple_images_optimized(
    image_paths,
    template,
    yolo_model,
    conf=0.25,
    aligner=None,
    base_output_dir=None,
    save_intermediate_files=False
):
    """
    Xử lý nhiều ảnh OMR với quản lý file tối ưu
    
    Args:
        image_paths: List đường dẫn ảnh
        template: Template OMR
        yolo_model: YOLO model  
        conf: Confidence threshold
        aligner: OMR aligner (optional)
        base_output_dir: Thư mục gốc để lưu kết quả (optional)
        save_intermediate_files: Có lưu file trung gian không
        
    Returns:
        Dict kết quả với thông tin quản lý file
    """
    try:
        import time
        from datetime import datetime
        
        start_time = time.time()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Tạo thư mục output nếu cần
        if base_output_dir and save_intermediate_files:
            batch_dir = os.path.join(base_output_dir, f"omr_batch_{timestamp}")
            os.makedirs(batch_dir, exist_ok=True)
            logging.info(f"Created batch directory: {batch_dir}")
        else:
            batch_dir = None
        
        # Process từng ảnh
        batch_results = {}
        successful = 0
        failed = 0
        
        for i, img_path in enumerate(image_paths):
            try:
                logging.info(f"Processing image {i+1}/{len(image_paths)}: {os.path.basename(img_path)}")
                
                # Đối với batch processing, thường không cần lưu file trung gian
                fname, result, _ = process_single_image(
                    img_path, template, yolo_model, conf, aligner, 
                    answer_key_excel=None, save_files=save_intermediate_files
                )
                
                if "error" not in result:
                    successful += 1
                    # Thêm thông tin batch vào metadata
                    if "_metadata" not in result:
                        result["_metadata"] = {}
                    result["_metadata"]["batch_info"] = {
                        "batch_id": timestamp,
                        "image_index": i,
                        "original_path": img_path
                    }
                else:
                    failed += 1
                
                batch_results[fname] = result
                
            except Exception as e:
                failed += 1
                batch_results[f"error_{i}"] = {"error": str(e), "original_path": img_path}
                logging.error(f"Error processing {img_path}: {e}")
        
        # Tạo summary
        processing_time = time.time() - start_time
        summary = {
            "batch_id": timestamp,
            "total_images": len(image_paths),
            "successful": successful,
            "failed": failed,
            "processing_time_seconds": round(processing_time, 2),
            "average_time_per_image": round(processing_time / len(image_paths), 2) if image_paths else 0,
            "output_directory": batch_dir,
            "save_intermediate_files": save_intermediate_files
        }
        
        # Lưu batch summary nếu cần
        if batch_dir and save_intermediate_files:
            summary_file = os.path.join(batch_dir, "batch_summary.json")
            import json
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "summary": summary,
                    "results": batch_results
                }, f, ensure_ascii=False, indent=2)
            logging.info(f"Batch summary saved: {summary_file}")
        
        logging.info(f"Batch processing completed: {successful}/{len(image_paths)} successful")
        
        return {
            "success": True,
            "summary": summary,
            "results": batch_results
        }
        
    except Exception as e:
        logging.error(f"Batch processing failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "summary": {"failed": len(image_paths) if 'image_paths' in locals() else 0}
        }

def yolo_omr_batch_parallel(args):
    answer_key_excel = getattr(args, "answer_key_excel", None)
    template = load_template(args.template)
    logging.info(f"Using template: {args.template}")

    yolo_model = YOLO(args.yolo_model)
    logging.info(f"Loading YOLO model: {args.yolo_model}")

    aligner = None
    if getattr(args, 'auto_align', False):
        if not args.align_reference:
            raise ValueError("--align-reference is required when --auto-align is enabled.")

        width, height = template.page_dimensions if hasattr(template, "page_dimensions") else (2084, 2947)
        aligner = OMRAligner(
            ref_img_path=args.align_reference,
            method=getattr(args, 'align_method', 'ORB'),
            max_features=5000,
            good_match_percent=0.2,
            debug=getattr(args, 'align_debug', False)
        )

    img_files = sorted([f for ext in ["*.jpg", "*.jpeg", "*.png"] for f in glob(os.path.join(args.input_dir, ext))])
    if not img_files:
        logging.warning(f"No image files (.jpg, .jpeg, .png) found in the directory: {args.input_dir}")
        return

    num_workers = args.workers if hasattr(args, "workers") and args.workers else min(multiprocessing.cpu_count(), len(img_files), 8)
    logging.info(f"Found {len(img_files)} images. Processing with {num_workers} workers...")

    import time
    start_time = time.time()
    try:
        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures = {
                executor.submit(process_single_image, img_path, template, yolo_model, args.conf, aligner, answer_key_excel): img_path
                for img_path in img_files}
            for i, future in enumerate(as_completed(futures)):
                fname, _ = future.result()
                logging.info(f"({i + 1}/{len(img_files)}) Processed: {fname}")
    finally:
        if aligner and hasattr(aligner, 'cleanup'):
            aligner.cleanup()

    total_time = time.time() - start_time
    logging.info("\n========================================")
    logging.info("           PROCESSING COMPLETE          ")
    logging.info("========================================")
    logging.info(f"Total images: {len(img_files)} | Total time: {total_time:.2f}s")
    if img_files: logging.info(f"Average time/image: {total_time / len(img_files):.2f}s")
    logging.info(f"Results saved in subdirectories inside: {args.input_dir}")