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

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.services.omr_service import OMRDatabaseService
from app.omr.main_pipeline import process_single_image_with_aligned
from app.omr.template import load_template
from app.models.user import User
from app.core.security import verify_token

# Configure logging
logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=["http://localhost:3000", "http://localhost:3001", "http://103.67.199.62:3000", "http://103.67.199.62:3001", "http://103.67.199.62:3002"],
    logger=True,
    engineio_logger=True
)

# Store active sessions
active_sessions: Dict[str, Dict[str, Any]] = {}

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
            
            # Load template file
            template_path = f"/root/projects/Eduscan/backend/OMRChecker/templates/template_{template_id}.json"
            if not os.path.exists(template_path):
                logger.error(f"Template file not found: {template_path}")
                return {
                    "success": False,
                    "message": f"Template file not found: template_{template_id}.json"
                }
            
            # Process with OMR pipeline
            from ultralytics import YOLO
            
            # Load template and model
            template = load_template(template_path)
            yolo_model = YOLO("app/omr/models/yolo_v8_bubble_detection.pt")
            
            result = None
            aligned_image_base64 = None
            
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                cv2.imwrite(tmp_file.name, cv_image)
                try:
                    # Process image with alignment
                    fname, omr_results, aligned_image = process_single_image_with_aligned(
                        tmp_file.name, 
                        template, 
                        yolo_model, 
                        conf=0.25,
                        aligner=None,
                        save_files=False,
                        return_aligned_image=True
                    )
                    
                    # Convert aligned image to base64
                    if aligned_image is not None:
                        _, buffer = cv2.imencode('.png', aligned_image)
                        aligned_image_base64 = base64.b64encode(buffer).decode('utf-8')
                    
                    # Format result
                    if "error" not in omr_results:
                        result = {
                            'answers': {k: v for k, v in omr_results.items() if not k.startswith('_')},
                            'sbd': omr_results.get('_metadata', {}).get('sbd'),
                            'exam_code': omr_results.get('_metadata', {}).get('ma_de'),
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
            
            # Get answer key and score
            async with AsyncSessionLocal() as db:
                answer_key = await self.omr_service.get_answer_key_from_db(db, exam_id)
                
                if not answer_key:
                    logger.warning(f"No answer key found for exam {exam_id}")
                    return {
                        "success": True,
                        "data": {
                            "sbd": result.get('sbd'),
                            "exam_code": result.get('exam_code'),
                            "answers": result.get('answers', {}),
                            "score": None,
                            "message": "Không tìm thấy đáp án",
                            "aligned_image": f"data:image/png;base64,{aligned_image_base64}" if aligned_image_base64 else None,
                            "timestamp": datetime.now().isoformat()
                        }
                    }
                
                # Extract exam code from result
                exam_code = result.get('exam_code', '123')
                
                if exam_code not in answer_key:
                    logger.warning(f"Exam code {exam_code} not found in answer key")
                    return {
                        "success": True,
                        "data": {
                            "sbd": result.get('sbd'),
                            "exam_code": exam_code,
                            "answers": result.get('answers', {}),
                            "score": None,
                            "message": f"Mã đề {exam_code} không có trong đáp án",
                            "aligned_image": f"data:image/png;base64,{aligned_image_base64}" if aligned_image_base64 else None,
                            "timestamp": datetime.now().isoformat()
                        }
                    }
                
                # Score the result
                score_result = await self.omr_service.score_omr_result(
                    db=db,
                    omr_result=result,
                    exam_id=exam_id,
                    answer_key=answer_key,
                    save_to_db=False  # Don't save automatically on capture
                )
                
                logger.info(f"Scoring complete: score={score_result.get('score')}")
                
                return {
                    "success": True,
                    "data": {
                        "sbd": result.get('sbd'),
                        "exam_code": exam_code,
                        "answers": result.get('answers', {}),
                        "score": score_result.get('score'),
                        "total_correct": score_result.get('total_correct'),
                        "total_questions": score_result.get('total_questions'),
                        "student": score_result.get('student'),
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
                # Prepare OMR result format
                omr_result = {
                    'sbd': result_data.get('sbd'),
                    'exam_code': result_data.get('exam_code'),
                    'answers': result_data.get('answers', {})
                }
                
                # Get answer key
                answer_key = await self.omr_service.get_answer_key_from_db(db, exam_id)
                
                # Score and save
                saved_result = await self.omr_service.score_omr_result(
                    db=db,
                    omr_result=omr_result,
                    exam_id=exam_id,
                    answer_key=answer_key,
                    save_to_db=True
                )
                
                logger.info(f"Result saved successfully with ID: {saved_result.get('result_id')}")
                
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
        
        logger.info(f"Capturing and processing frame for sid {sid}")
        
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
        
        logger.info(f"Saving result for sid {sid}")
        
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
            logger.info(f"Ending session for sid {sid}")
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