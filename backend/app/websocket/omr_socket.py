"""WebSocket handler for real-time OMR processing"""

import socketio
import asyncio
import base64
import io
import json
import logging
import os
import tempfile
from typing import Dict, Any, Optional
from datetime import datetime
import numpy as np
from PIL import Image
import cv2
from sqlalchemy import select
from pathlib import Path

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.services.omr_service import OMRDatabaseService
from app.omr.main_pipeline import process_single_image, OMRAligner
from app.omr.template import load_template
from app.models.user import User
from app.models.answer_sheet_template import AnswerSheetTemplate
from app.core.security import verify_token

# Configure logging
logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=["http://localhost:3000", "http://localhost:3001", "http://103.67.199.62:3000", "http://103.67.199.62:3001", "http://103.67.199.62:3002"],
    logger=False,
    engineio_logger=False, 
)

# Store active sessions
active_sessions: Dict[str, Dict[str, Any]] = {}

async def get_template_path_from_id(template_id: int, db) -> str:
    """
    Lấy đường dẫn template vật lý từ ID mẫu phiếu bằng cách đọc `cauTrucJson`.
    """
    template_obj = await db.get(AnswerSheetTemplate, template_id)
    if not template_obj:
        raise Exception(f"Không tìm thấy Mẫu phiếu với ID: {template_id}")

    if not template_obj.cauTrucJson:
        raise Exception(f"Mẫu phiếu ID {template_id} không có cấu trúc OMR (cauTrucJson).")

    try:
        # cauTrucJson có thể là dict hoặc chuỗi JSON
        config = json.loads(template_obj.cauTrucJson) if isinstance(template_obj.cauTrucJson, str) else template_obj.cauTrucJson

        omr_config = config.get("fileTypes", {}).get("omrConfig", {})
        old_path_str = omr_config.get("storagePath")

        if not old_path_str:
            raise ValueError("Không tìm thấy 'storagePath' trong cauTrucJson.fileTypes.omrConfig")
            
        # Đường dẫn trong DB có thể chứa tiền tố '$' hoặc trỏ đến cấu trúc cũ
        if old_path_str.startswith('$'):
            old_path_str = old_path_str[1:]
        
        # Trích xuất tên thư mục template từ đường dẫn cũ (ví dụ: 'template_1')
        template_folder_name = Path(old_path_str).parent.name
        
        base_template_dir = Path("/root/projects/Eduscan/backend/OMRChecker/templates")
        new_template_path = base_template_dir / template_folder_name / "template.json"
        
        if not new_template_path.exists():
            raise Exception(
                f"File template không tồn tại tại đường dẫn mong muốn: {new_template_path}. Dữ liệu trong DB có thể đã cũ."
            )
            
        return str(new_template_path)

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.error(f"Lỗi khi xử lý cauTrucJson cho template ID {template_id}: {e}")
        raise Exception(f"Cấu trúc OMR (cauTrucJson) của mẫu phiếu ID {template_id} bị lỗi: {e}")

class OMRWebSocketHandler:
    """Handler for real-time OMR processing via WebSocket"""
    
    def __init__(self):
        self.omr_service = OMRDatabaseService()
        
    async def authenticate_user(self, token: str) -> Optional[User]:
        """Authenticate user from JWT token"""
        try:
            logger.info(f"Authenticating token: {token[:20]}...")
            payload = verify_token(token, "access")
            logger.info(f"Token payload: {payload}")
            user_id = payload.get("user_id")
            if not user_id:
                logger.warning("Token payload does not contain 'user_id'.")
                return None
                
            async with AsyncSessionLocal() as db:
                user = await db.execute(select(User).filter(User.maNguoiDung == int(user_id)))
                user = user.scalar_one_or_none()
                if not user:
                    logger.warning(f"User with id {user_id} not found in database.")
                else:
                    logger.info(f"User {user_id} authenticated successfully: {user.email}")
                return user
        except Exception as e:
            logger.error(f"Authentication error: {e}", exc_info=True)
            return None
    
    async def capture_and_process_frame(self, frame_data: str, exam_id: int, template_id: int, sid: str) -> Dict[str, Any]:
        """Capture frame, align and process with OMR"""
        try:
            logger.info(f"Processing captured frame for exam {exam_id}, template {template_id}")
            
            # Decode base64 image
            image_data = base64.b64decode(frame_data.split(',')[1] if ',' in frame_data else frame_data)
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Get template path using proper function like omr.py
            async with AsyncSessionLocal() as db:
                template_path = await get_template_path_from_id(template_id, db)
            
            if not os.path.exists(template_path):
                logger.error(f"Template file not found: {template_path}")
                return {
                    "success": False,
                    "message": f"Template file not found: template_{template_id}.json"
                }
            
            # Process with OMR pipeline - use same approach as omr.py
            from ultralytics import YOLO
            
            # Load template and model
            template = load_template(template_path)
            yolo_model = YOLO("/root/projects/Eduscan/backend/OMRChecker/models/best.pt")
            
            # Create aligner like in omr.py
            aligner = None
            auto_align = True  # Enable alignment for WebSocket processing
            if auto_align:
                template_dir = os.path.dirname(template_path)
                ref_images = list(Path(template_dir).glob("*.png")) + list(Path(template_dir).glob("*.jpg"))
                if ref_images:
                    ref_img_path = str(ref_images[0])
                    aligner = OMRAligner(
                        ref_img_path=ref_img_path,
                        method='ORB',
                        max_features=5000,
                        good_match_percent=0.2,
                        debug=False
                    )
                    # logger.info(f"Created aligner with reference: {ref_images[0]}")
            
            result = None
            aligned_image_base64 = None
            
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                cv2.imwrite(tmp_file.name, cv_image)
                try:
                    # Use process_single_image like in omr.py instead of process_single_image_with_aligned
                    fname, omr_results, aligned_image = process_single_image(
                        tmp_file.name, 
                        template, 
                        yolo_model, 
                        conf=0.25,
                        aligner=aligner,
                        answer_key_excel=None,  # Don't use Excel
                        save_files=False  # Don't save intermediate files
                    )
                    
                    # Convert aligned image to base64 if available
                    if aligned_image is not None:
                        _, buffer = cv2.imencode('.png', aligned_image)
                        aligned_image_base64 = base64.b64encode(buffer).decode('utf-8')
                    
                    # Format result - extract metadata like in omr.py
                    if "error" not in omr_results:
                        metadata = omr_results.get("_metadata", {})
                        sbd = metadata.get("sbd", "")
                        ma_de = metadata.get("ma_de", "")
                        
                        # Fallback SBD detection like in omr.py
                        if not sbd:
                            sbd_keys = ["sbd", "so_bao_danh", "student_id", "id"]
                            for key in sbd_keys:
                                if key in omr_results and omr_results[key]:
                                    sbd = str(omr_results[key])
                                    break
                            
                            # Try to find in key patterns
                            if not sbd:
                                for key, value in omr_results.items():
                                    if "sbd" in key.lower() or "id" in key.lower():
                                        if value and str(value).isdigit():
                                            sbd = str(value)
                                            break
                        
                        # Fallback mã đề detection
                        if not ma_de:
                            for key, value in omr_results.items():
                                if "mdt" in key.lower() or "made" in key.lower():
                                    if value and str(value).isdigit():
                                        ma_de = str(value)
                                        break
                        
                        # Filter out metadata for clean answers
                        answers = {k: v for k, v in omr_results.items() if not k.startswith('_')}
                        
                        result = {
                            'answers': answers,
                            'sbd': sbd,
                            'exam_code': ma_de,
                            'aligned_image': aligned_image_base64
                        }
                        logger.info(f"OMR processing successful: SBD={result.get('sbd')}, answers={len(result.get('answers', {}))}")
                    else:
                        logger.error(f"OMR processing error: {omr_results}")
                        
                finally:
                    # Clean up temp file
                    os.unlink(tmp_file.name)
            
            if not result:
                return {
                    "success": False,
                    "message": "Không thể nhận dạng phiếu trả lời"
                }
            
            # Extract required data for scoring
            sbd = result.get('sbd', '')
            student_answers = result.get('answers', {})
            ma_de = result.get('exam_code', '')
            
            if not sbd:
                return {
                    "success": False,
                    "message": "Không thể nhận diện số báo danh từ phiếu trả lời"
                }
            
            # Score using OMRDatabaseService with correct signature
            async with AsyncSessionLocal() as db:
                score_result = await OMRDatabaseService.score_omr_result(
                    db=db,
                    exam_id=exam_id,
                    student_answers=student_answers,
                    sbd=sbd,
                    image_path=tmp_file.name if 'tmp_file' in locals() else None,
                    scanner_user_id=None,  # WebSocket doesn't track scanner
                    save_to_db=False  # Don't save automatically on capture
                )
                
                logger.info(f"Scoring complete: {score_result}")
                
                if score_result.get("success"):
                    return {
                        "success": True,
                        "data": {
                            "sbd": sbd,
                            "exam_code": ma_de,
                            "answers": student_answers,
                            "score": score_result.get('total_score'),
                            "total_correct": score_result.get('correct_answers'),
                            "total_questions": score_result.get('total_questions'),
                            "student_name": score_result.get('student_name'),
                            "aligned_image": f"data:image/png;base64,{aligned_image_base64}" if aligned_image_base64 else None,
                            "timestamp": datetime.now().isoformat()
                        }
                    }
                else:
                    return {
                        "success": True,
                        "data": {
                            "sbd": sbd,
                            "exam_code": ma_de,
                            "answers": student_answers,
                            "score": None,
                            "message": score_result.get('error', 'Lỗi chấm điểm'),
                            "aligned_image": f"data:image/png;base64,{aligned_image_base64}" if aligned_image_base64 else None,
                            "timestamp": datetime.now().isoformat()
                        }
                    }
                
        except Exception as e:
            logger.error(f"Error processing captured frame: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Lỗi xử lý: {str(e)}"
            }
    
    async def save_result(self, result_data: Dict[str, Any], exam_id: int) -> Dict[str, Any]:
        """Save the captured result to database"""
        try:
            logger.info(f"Saving result to database for exam {exam_id}")
            async with AsyncSessionLocal() as db:
                # Extract data from result_data
                sbd = result_data.get('sbd', '')
                exam_code = result_data.get('exam_code', '')
                student_answers = result_data.get('answers', {})
                
                if not sbd or not student_answers:
                    return {
                        "success": False,
                        "message": "Dữ liệu không đầy đủ để lưu kết quả"
                    }
                
                # Save result using OMRDatabaseService with correct signature
                saved_result = await OMRDatabaseService.score_omr_result(
                    db=db,
                    exam_id=exam_id,
                    student_answers=student_answers,
                    sbd=sbd,
                    image_path=None,  # No image path for save operation
                    scanner_user_id=None,  # WebSocket doesn't track scanner
                    save_to_db=True
                )
                
                logger.info(f"Result saved successfully: {saved_result}")
                
                return {
                    "success": True,
                    "data": saved_result
                }
                
        except Exception as e:
            logger.error(f"Error saving result: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Lỗi lưu kết quả: {str(e)}"
            }

# Create handler instance
omr_handler = OMRWebSocketHandler()

# Socket.IO event handlers
@sio.event
async def connect(sid, environ, auth):
    """Handle client connection"""
    logger.info(f"Client {sid} connected, attempting authentication.")
    
    if not auth or 'token' not in auth or not auth['token']:
        logger.warning(f"No auth token provided for sid {sid}. Disconnecting.")
        await sio.emit('auth_error', {'message': 'Authentication token not provided.'}, to=sid)
        return await sio.disconnect(sid)

    user = await omr_handler.authenticate_user(auth['token'])
    if user:
        logger.info(f"Authentication successful for sid {sid}, user: {user.email}")
        active_sessions[sid] = {
            'user': user,
            'connected_at': datetime.now(),
            'exam_id': None,
            'template_id': None,
            'scanning': False
        }
        await sio.emit('connected', {'message': 'Kết nối thành công'}, to=sid)
    else:
        logger.warning(f"Authentication failed for sid {sid}. Disconnecting.")
        await sio.emit('auth_error', {'message': 'Invalid authentication token.'}, to=sid)
        return await sio.disconnect(sid)

@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"Client {sid} disconnected")
    if sid in active_sessions:
        del active_sessions[sid]

@sio.event
async def start_scanning(sid, data):
    """Start scanning session when user clicks start button"""
    try:
        exam_id = data.get('exam_id')
        template_id = data.get('template_id')
        
        if not exam_id or not template_id:
            await sio.emit('error', {'message': 'Thiếu mã bài kiểm tra hoặc template'}, to=sid)
            return
        
        if sid in active_sessions:
            active_sessions[sid]['exam_id'] = exam_id
            active_sessions[sid]['template_id'] = template_id
            active_sessions[sid]['scanning'] = True
            
        logger.info(f"Started scanning session for sid {sid}, exam {exam_id}, template {template_id}")
        
        await sio.emit('scanning_started', {
            'message': 'Bắt đầu quét',
            'exam_id': exam_id,
            'template_id': template_id
        }, to=sid)
        
    except Exception as e:
        logger.error(f"Error starting scan: {e}")
        await sio.emit('error', {'message': str(e)}, to=sid)

@sio.event
async def capture_frame(sid, data):
    """Capture frame and process with OMR when user clicks capture button"""
    try:
        if sid not in active_sessions or not active_sessions[sid].get('scanning'):
            await sio.emit('error', {'message': 'Session không hoạt động'}, to=sid)
            return
        
        frame_data = data.get('frame')
        exam_id = active_sessions[sid].get('exam_id')
        template_id = active_sessions[sid].get('template_id')
        
        if not frame_data or not exam_id or not template_id:
            await sio.emit('error', {'message': 'Dữ liệu không đầy đủ'}, to=sid)
            return
        
        # logger.info(f"Capturing and processing frame for sid {sid}")
        
        # Process frame with alignment and OMR
        result = await omr_handler.capture_and_process_frame(frame_data, exam_id, template_id, sid)
        
        # Emit result back to client
        await sio.emit('frame_processed', result, to=sid)
        
    except Exception as e:
        logger.error(f"Error capturing frame: {e}")
        await sio.emit('error', {'message': str(e)}, to=sid)

@sio.event
async def save_result(sid, data):
    """Save the processed result to database"""
    try:
        if sid not in active_sessions:
            await sio.emit('error', {'message': 'Session không hợp lệ'}, to=sid)
            return
        
        exam_id = active_sessions[sid].get('exam_id')
        result_data = data.get('result')
        
        if not exam_id or not result_data:
            await sio.emit('error', {'message': 'Dữ liệu không hợp lệ'}, to=sid)
            return
        
        # logger.info(f"Saving result for sid {sid}")
        
        # Save result to database
        save_result = await omr_handler.save_result(result_data, exam_id)
        
        # Emit save result
        await sio.emit('result_saved', save_result, to=sid)
        
    except Exception as e:
        logger.error(f"Error saving result: {e}")
        await sio.emit('error', {'message': str(e)}, to=sid)

@sio.event
async def end_session(sid):
    """End scanning session and disconnect"""
    try:
        if sid in active_sessions:
            # logger.info(f"Ending session for sid {sid}")
            active_sessions[sid]['scanning'] = False
            
        await sio.emit('session_ended', {
            'message': 'Đã kết thúc phiên chấm bài'
        }, to=sid)
        
        # Disconnect client
        await sio.disconnect(sid)
        
    except Exception as e:
        logger.error(f"Error ending session: {e}")
        await sio.emit('error', {'message': str(e)}, to=sid)

def setup_omr_websocket(app):
    """Setup WebSocket with FastAPI app"""
    import socketio
    # Mount the Socket.IO app
    app.mount("/socket.io", socketio.ASGIApp(sio))
    return app 