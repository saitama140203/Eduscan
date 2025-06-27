# WebSocket Service

from fastapi import WebSocket
from typing import Dict, List, Optional, Set
import json
import asyncio
from datetime import datetime


class ConnectionManager:
    """Quản lý WebSocket connections"""
    
    def __init__(self):
        # Lưu trữ active connections theo room
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Lưu trữ thông tin user cho mỗi connection
        self.connection_users: Dict[WebSocket, dict] = {}
        # Lưu trữ exam monitors
        self.exam_monitors: Dict[int, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, room: str, user_info: dict):
        """Kết nối WebSocket và thêm vào room"""
        await websocket.accept()
        
        if room not in self.active_connections:
            self.active_connections[room] = []
        
        self.active_connections[room].append(websocket)
        self.connection_users[websocket] = user_info
        
        # Thông báo user đã join room
        await self.broadcast_to_room({
            "type": "user_joined",
            "user": user_info.get("username"),
            "room": room,
            "timestamp": datetime.now().isoformat()
        }, room, exclude=websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Ngắt kết nối WebSocket"""
        # Tìm và xóa connection khỏi tất cả rooms
        for room, connections in self.active_connections.items():
            if websocket in connections:
                connections.remove(websocket)
                
                # Thông báo user đã leave room
                user_info = self.connection_users.get(websocket, {})
                asyncio.create_task(self.broadcast_to_room({
                    "type": "user_left",
                    "user": user_info.get("username"),
                    "room": room,
                    "timestamp": datetime.now().isoformat()
                }, room))
        
        # Xóa khỏi exam monitors
        for exam_id, monitors in self.exam_monitors.items():
            monitors.discard(websocket)
        
        # Xóa user info
        if websocket in self.connection_users:
            del self.connection_users[websocket]
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Gửi message cho một connection cụ thể"""
        try:
            await websocket.send_text(json.dumps(message, ensure_ascii=False))
        except Exception as e:
            print(f"Error sending personal message: {e}")
    
    async def broadcast_to_room(self, message: dict, room: str, exclude: Optional[WebSocket] = None):
        """Broadcast message cho tất cả connections trong room"""
        if room not in self.active_connections:
            return
        
        connections = self.active_connections[room].copy()
        for connection in connections:
            if exclude and connection == exclude:
                continue
            try:
                await connection.send_text(json.dumps(message, ensure_ascii=False))
            except Exception as e:
                print(f"Error broadcasting to room {room}: {e}")
                # Xóa connection bị lỗi
                self.active_connections[room].remove(connection)
    
    async def broadcast_to_all(self, message: dict):
        """Broadcast message cho tất cả connections"""
        for room in self.active_connections:
            await self.broadcast_to_room(message, room)
    
    def get_room_users(self, room: str) -> List[dict]:
        """Lấy danh sách users trong room"""
        if room not in self.active_connections:
            return []
        
        users = []
        for connection in self.active_connections[room]:
            user_info = self.connection_users.get(connection, {})
            if user_info:
                users.append({
                    "username": user_info.get("username"),
                    "role": user_info.get("role"),
                    "connected_at": user_info.get("connected_at")
                })
        return users
    
    def get_active_stats(self) -> dict:
        """Lấy thống kê connections hiện tại"""
        total_connections = sum(len(connections) for connections in self.active_connections.values())
        return {
            "total_connections": total_connections,
            "total_rooms": len(self.active_connections),
            "rooms": {room: len(connections) for room, connections in self.active_connections.items()},
            "exam_monitors": {exam_id: len(monitors) for exam_id, monitors in self.exam_monitors.items()}
        }
    
    async def join_exam_monitor(self, websocket: WebSocket, exam_id: int):
        """Thêm connection vào exam monitoring"""
        if exam_id not in self.exam_monitors:
            self.exam_monitors[exam_id] = set()
        self.exam_monitors[exam_id].add(websocket)
    
    async def leave_exam_monitor(self, websocket: WebSocket, exam_id: int):
        """Xóa connection khỏi exam monitoring"""
        if exam_id in self.exam_monitors:
            self.exam_monitors[exam_id].discard(websocket)
    
    def get_exam_monitors_count(self, exam_id: int) -> int:
        """Lấy số lượng monitors cho exam"""
        return len(self.exam_monitors.get(exam_id, set()))


class WebSocketService:
    """Service class cho các WebSocket operations"""
    
    @staticmethod
    async def broadcast_system_announcement(message: str, priority: str = "normal"):
        """Broadcast thông báo hệ thống"""
        announcement = {
            "type": "system_announcement",
            "message": message,
            "priority": priority,
            "timestamp": datetime.now().isoformat()
        }
        await manager.broadcast_to_all(announcement)
    
    @staticmethod
    async def send_exam_reminder(exam_id: int, message: str, target_users: List[int]):
        """Gửi reminder về exam cho users cụ thể"""
        # TODO: Implement logic để tìm connections của target_users
        # Hiện tại chỉ broadcast cho tất cả
        reminder = {
            "type": "exam_reminder",
            "exam_id": exam_id,
            "message": message,
            "target_users": target_users,
            "timestamp": datetime.now().isoformat()
        }
        await manager.broadcast_to_all(reminder)
    
    @staticmethod
    async def handle_exam_status_change(exam_id: int, status: str, user_info: dict):
        """Xử lý thay đổi trạng thái exam"""
        status_message = {
            "type": "exam_status_change",
            "exam_id": exam_id,
            "status": status,
            "changed_by": user_info.get("username"),
            "timestamp": datetime.now().isoformat()
        }
        
        # Gửi cho exam monitors
        if exam_id in manager.exam_monitors:
            for monitor_ws in manager.exam_monitors[exam_id]:
                await manager.send_personal_message(status_message, monitor_ws)


# Tạo instance global của ConnectionManager
manager = ConnectionManager()
