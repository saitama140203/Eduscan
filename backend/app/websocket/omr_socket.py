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
from app.omr.template import load_template, get_all_bubbles
from app.models.user import User
from app.models.answer_sheet_template import AnswerSheetTemplate
from app.core.security import verify_token
from ultralytics import YOLO
from app.services.websocket_service import WebSocketService

# Configure logging
logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://103.67.199.62:3000", 
        "http://103.67.199.62:3001", 
        "http://103.67.199.62:3002",
        "https://eduscan.id.vn",
        "https://www.eduscan.id.vn"
    ],
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
    
    async def process_and_score(self, sid: str, exam_id: int, image_data: bytes):
        """
        Quy trình xử lý đầy đủ: gọi OMR-Checker, chấm điểm và gửi cập nhật WS.
        """
        session_info = active_sessions.get(sid)
        if not session_info or not session_info.get('user'):
            logger.error(f"Không tìm thấy session hoặc user cho sid {sid}")
            return

        user = session_info['user']
        scanner_user_id = user.maNguoiDung

        try:
            async with AsyncSessionLocal() as db:
                # Gọi hàm xử lý ảnh từ OMR service, hàm này đã được tích hợp WS
                await OMRDatabaseService.process_single_image_ws(
                    db=db,
                    exam_id=exam_id,
                    image_data=image_data,
                    scanner_user_id=scanner_user_id
                )
        except Exception as e:
            logger.error(f"Lỗi nghiêm trọng trong process_and_score cho sid {sid}: {e}", exc_info=True)
            try:
                # Cố gắng gửi thông báo lỗi cuối cùng cho client
                await WebSocketService.send_omr_progress_update(
                    user_id=scanner_user_id, status="error", message=f"Lỗi hệ thống: {str(e)}"
                )
            except Exception as ws_err:
                logger.error(f"Không thể gửi thông báo lỗi WebSocket: {ws_err}")

    async def capture_and_process_frame(self, frame_data: str, exam_id: int, template_id: int, sid: str) -> Dict[str, Any]:
        """Capture frame, align and process with OMR, with full annotation"""
        try:
            logger.info(f"Processing WebSocket frame for exam {exam_id}, template {template_id}")
            
            async with AsyncSessionLocal() as db:
                template_path = await get_template_path_from_id(template_id, db)
                
                # 🎯 LOAD JSON ANSWER KEYS from DB (similar to omr.py)
                exam_answer_keys = {}
                try:
                    from app.routes.omr import load_json_answer_keys_for_exam
                    exam_answer_keys = await load_json_answer_keys_for_exam(db, exam_id)
                    logger.info(f"WebSocket: Loaded {len(exam_answer_keys)} answer keys.")
                except Exception as e:
                    logger.warning(f"WebSocket: Could not load JSON answer keys: {e}")

                # Decode base64 image and prepare for processing
                image_data = base64.b64decode(frame_data.split(',')[1] if ',' in frame_data else frame_data)
                image = Image.open(io.BytesIO(image_data))
                cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

                # Load OMR components (template, model, aligner)
                template = load_template(template_path)
                yolo_model = YOLO("app/omr/models/best.pt")
                
                aligner = None
                template_dir = os.path.dirname(template_path)
                ref_images = list(Path(template_dir).glob("*.png")) + list(Path(template_dir).glob("*.jpg"))
                if ref_images:
                    aligner = OMRAligner(ref_img_path=str(ref_images[0]))

                # Process in a temporary file
                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                    cv2.imwrite(tmp_file.name, cv_image)
                    
                    try:
                        fname, omr_results, aligned_img = process_single_image(
                            tmp_file.name, template, yolo_model, conf=0.4, aligner=aligner, save_files=False
                        )

                        if "error" in omr_results:
                            raise Exception(omr_results["error"])

                        # --- Annotation Logic (from omr.py) ---
                        annotated_image_base64 = None
                        if aligned_img is not None:
                            try:
                                from app.omr.detection import draw_scoring_overlay
                                bubbles = get_all_bubbles(template)
                                metadata = omr_results.get("_metadata", {})
                                ma_de = metadata.get("ma_de", "") 

                                # Get the correct answer key for the detected ma_de
                                answer_key_for_annotation = {}
                                if ma_de and str(ma_de) in exam_answer_keys:
                                    answer_key_for_annotation = exam_answer_keys[str(ma_de)]
                                
                                # Create a temporary path for the annotated image
                                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as anno_tmp:
                                    draw_scoring_overlay(
                                        aligned_img.copy(), bubbles, omr_results, 
                                        answer_key_for_annotation, anno_tmp.name
                                    )
                                    # Read back and encode
                                    with open(anno_tmp.name, 'rb') as f_anno:
                                        annotated_image_base64 = base64.b64encode(f_anno.read()).decode('utf-8')
                                    os.unlink(anno_tmp.name) # Clean up temp annotated image
                                logger.info("WebSocket: Successfully created annotated image.")

                            except Exception as e:
                                logger.error(f"WebSocket: Annotation drawing failed: {e}")
                                # Fallback to aligned image if annotation fails
                                _, buffer = cv2.imencode('.png', aligned_img)
                                annotated_image_base64 = base64.b64encode(buffer).decode('utf-8')

                        # --- Scoring Logic ---
                        sbd = omr_results.get("_metadata", {}).get("sbd", "")
                        if not sbd:
                            raise Exception("Không thể nhận diện SBD từ phiếu trả lời.")
                        
                        score_result = await OMRDatabaseService.score_omr_result(
                            db=db, exam_id=exam_id, student_answers=omr_results, sbd=sbd, save_to_db=False
                        )

                        if score_result.get("success"):
                            return {
                                "success": True,
                                "data": {
                                    **score_result, # Unpack all scoring results
                                    "aligned_image": f"data:image/jpeg;base64,{annotated_image_base64}" if annotated_image_base64 else None,
                                    "timestamp": datetime.now().isoformat()
                                }
                            }
                        else:
                            # Scoring failed (e.g., student not found)
                             return {
                                "success": True, # The process succeeded, but scoring failed
                                "data": {
                                    "sbd": sbd,
                                    "exam_code": omr_results.get("_metadata", {}).get("ma_de", ""),
                                    "answers": {k: v for k, v in omr_results.items() if not k.startswith('_')},
                                    "score": None,
                                    "message": score_result.get('error', 'Lỗi chấm điểm'),
                                    "aligned_image": f"data:image/jpeg;base64,{annotated_image_base64}" if annotated_image_base64 else None,
                                    "timestamp": datetime.now().isoformat()
                                }
                            }

                    finally:
                        os.unlink(tmp_file.name)

        except Exception as e:
            logger.error(f"Error processing captured frame: {e}", exc_info=True)
            return {"success": False, "message": f"Lỗi xử lý: {str(e)}"}
    
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

@sio.on('capture_frame')
async def on_capture_frame(sid, data):
    """Handler for the 'capture_frame' event from the client."""
    try:
        if sid not in active_sessions or not active_sessions[sid].get('scanning'):
            return await sio.emit('error', {'message': 'Session không hoạt động hoặc chưa bắt đầu.'}, to=sid)
        
        frame_data = data.get('frame')
        exam_id = active_sessions[sid].get('exam_id')
        
        if not frame_data or not exam_id:
            return await sio.emit('error', {'message': 'Dữ liệu ảnh hoặc ID bài thi bị thiếu.'}, to=sid)
            
        # Decode image data
        image_bytes = base64.b64decode(frame_data.split(',')[1])

        # Chạy xử lý trong một task nền để không block server
        asyncio.create_task(omr_handler.process_and_score(sid, exam_id, image_bytes))

    except Exception as e:
        logger.error(f"Lỗi khi xử lý sự kiện capture_frame cho sid {sid}: {e}", exc_info=True)
        await sio.emit('error', {'message': f'Lỗi server: {str(e)}'}, to=sid)

def setup_omr_websocket(app):
    """Setup WebSocket with FastAPI app"""
    import socketio
    # Mount the Socket.IO app
    app.mount("/socket.io", socketio.ASGIApp(sio))
    return app 