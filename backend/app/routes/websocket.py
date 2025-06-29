from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer
from typing import Optional, List
import json
import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.auth import get_current_user_websocket, get_user_from_ws_token
from app.services.websocket_service import manager, WebSocketService
from app.models.user import User
from app.db.session import get_async_db
from app.services.omr_service import OMRDatabaseService
import base64

router = APIRouter()
security = HTTPBearer()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_db)
):
    """
    WebSocket endpoint chính.
    - client_id: Một ID duy nhất cho mỗi client (tab trình duyệt).
    - token: JWT token để xác thực người dùng.
    """
    user: Optional[User] = None
    user_info = {"client_id": client_id, "username": "Guest"}
    room = "default" # Phòng mặc định

    if token:
        user = await get_user_from_ws_token(db, token)
    
    if user:
        user_info["user_id"] = user.maNguoiDung
        user_info["username"] = user.hoTen
        user_info["role"] = user.vaiTro
        room = f"user_{user.maNguoiDung}" # Tạo một phòng riêng cho mỗi user

    await manager.connect(websocket, room, user_info)
    
    try:
        while True:
            data = await websocket.receive_text()
            # Xử lý các message từ client nếu cần
            # Ví dụ: tham gia giám sát một kỳ thi
            try:
                message_data = json.loads(data)
                message_type = message_data.get("type")

                if message_type == "join_exam_monitor" and user:
                    exam_id = message_data.get("exam_id")
                    if exam_id:
                        await manager.join_exam_monitor(websocket, exam_id)
                        await manager.send_personal_message({
                            "type": "monitor_joined",
                            "message": f"Bạn đang giám sát kỳ thi {exam_id}"
                        }, websocket)
                
                elif message_type == "capture_frame" and user:
                    frame_data = message_data.get("frame")
                    exam_id = message_data.get("exam_id")
                    
                    if frame_data and exam_id:
                        # Tách header base64
                        try:
                            header, encoded = frame_data.split(",", 1)
                            image_data = base64.b64decode(encoded)
                            
                            # Chạy xử lý OMR trong một task nền
                            asyncio.create_task(
                                OMRDatabaseService.process_single_image_ws(
                                    db=db,
                                    exam_id=exam_id,
                                    image_data=image_data,
                                    scanner_user_id=user.maNguoiDung
                                )
                            )
                        except Exception as e:
                            await WebSocketService.send_omr_progress_update(
                                user_id=user.maNguoiDung,
                                status="error",
                                message=f"Lỗi xử lý ảnh: {str(e)}"
                            )

            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast_to_room({
            "type": "user_left",
            "user": user_info.get("username"),
            "room": room
        }, room)


@router.websocket("/ws/exam/{exam_id}/monitor")
async def exam_monitor_endpoint(
    websocket: WebSocket,
    exam_id: int,
    token: Optional[str] = None
):
    """WebSocket endpoint cho monitoring exam real-time"""
    try:
        # Authenticate user
        if not token:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        user_info = {
            "user_id": 1,
            "username": "teacher",
            "role": "TEACHER",
            "connected_at": datetime.now().isoformat()
        }
        
        # Connect to general room first
        room = f"exam_{exam_id}_monitor"
        await manager.connect(websocket, room, user_info)
        
        # Join exam monitoring
        await manager.join_exam_monitor(websocket, exam_id)
        
        # Send initial exam status
        await manager.send_personal_message({
            "type": "exam_monitor_joined",
            "exam_id": exam_id,
            "message": f"Đã bắt đầu theo dõi bài kiểm tra {exam_id}",
            "monitors_count": manager.get_exam_monitors_count(exam_id)
        }, websocket)
        
        try:
            while True:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Handle exam monitoring messages
                await handle_exam_monitor_message(websocket, exam_id, message_data, user_info)
                
        except WebSocketDisconnect:
            await manager.leave_exam_monitor(websocket, exam_id)
            await manager.disconnect(websocket)
            
    except Exception as e:
        print(f"Exam monitor WebSocket error: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)


async def handle_websocket_message(websocket: WebSocket, room: str, message_data: dict, user_info: dict):
    """Xử lý các message từ WebSocket client"""
    message_type = message_data.get("type")
    
    if message_type == "ping":
        # Heartbeat
        await manager.send_personal_message({
            "type": "pong",
            "timestamp": datetime.now().isoformat()
        }, websocket)
        
    elif message_type == "chat_message":
        # Chat message trong room
        chat_message = {
            "type": "chat_message",
            "user": user_info.get("username"),
            "message": message_data.get("message"),
            "timestamp": datetime.now().isoformat(),
            "room": room
        }
        await manager.broadcast_to_room(chat_message, room)
        
    elif message_type == "get_room_users":
        # Lấy danh sách users trong room
        users = manager.get_room_users(room)
        await manager.send_personal_message({
            "type": "room_users",
            "users": users,
            "count": len(users)
        }, websocket)
        
    elif message_type == "system_stats":
        # Lấy thống kê hệ thống (chỉ admin)
        if user_info.get("role") == "ADMIN":
            stats = manager.get_active_stats()
            await manager.send_personal_message({
                "type": "system_stats",
                "data": stats
            }, websocket)


async def handle_exam_monitor_message(websocket: WebSocket, exam_id: int, message_data: dict, user_info: dict):
    """Xử lý các message cho exam monitoring"""
    message_type = message_data.get("type")
    
    if message_type == "request_exam_stats":
        # Yêu cầu thống kê exam hiện tại
        # TODO: Integrate with ExamService to get real stats
        mock_stats = {
            "total_students": 25,
            "submitted": 18,
            "in_progress": 7,
            "not_started": 0,
            "average_score": 7.2,
            "completion_rate": 72
        }
        
        await manager.send_personal_message({
            "type": "exam_stats",
            "exam_id": exam_id,
            "stats": mock_stats,
            "timestamp": datetime.now().isoformat()
        }, websocket)
        
    elif message_type == "broadcast_announcement":
        # Broadcast thông báo cho tất cả students trong exam
        if user_info.get("role") in ["TEACHER", "ADMIN"]:
            announcement = message_data.get("message")
            await WebSocketService.broadcast_system_announcement(
                f"[Bài kiểm tra {exam_id}] {announcement}",
                priority="high"
            )
            
    elif message_type == "end_exam":
        # Kết thúc exam
        if user_info.get("role") in ["TEACHER", "ADMIN"]:
            await WebSocketService.handle_exam_status_change(
                exam_id, 
                "ket_thuc", 
                user_info
            )


# API endpoints cho WebSocket management
@router.get("/ws/stats")
async def get_websocket_stats():
    """Lấy thống kê WebSocket connections"""
    return manager.get_active_stats()


@router.post("/ws/broadcast")
async def broadcast_message(
    message: str,
    priority: str = "normal",
    target_room: Optional[str] = None
):
    """Broadcast message đến tất cả hoặc room cụ thể"""
    if target_room:
        await manager.broadcast_to_room({
            "type": "admin_broadcast",
            "message": message,
            "priority": priority,
            "timestamp": datetime.now().isoformat()
        }, target_room)
    else:
        await WebSocketService.broadcast_system_announcement(message, priority)
    
    return {"message": "Broadcast sent successfully"}


@router.post("/ws/exam/{exam_id}/notify")
async def send_exam_notification(
    exam_id: int,
    message: str,
    target_users: list[int]
):
    """Gửi notification cho users cụ thể về exam"""
    await WebSocketService.send_exam_reminder(exam_id, message, target_users)
    return {"message": f"Notification sent to {len(target_users)} users"}


@router.get("/ws/exam/{exam_id}/monitors")
async def get_exam_monitors(exam_id: int):
    """Lấy số lượng monitors cho exam"""
    count = manager.get_exam_monitors_count(exam_id)
    return {
        "exam_id": exam_id,
        "monitors_count": count,
        "is_being_monitored": count > 0
    } 