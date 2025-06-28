"""WebSocket module for real-time OMR processing"""

from .omr_socket import sio, setup_omr_websocket
 
__all__ = ["sio", "setup_omr_websocket"] 