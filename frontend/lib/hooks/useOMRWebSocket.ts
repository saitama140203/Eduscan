import { useEffect, useRef, useState, useCallback } from "react"
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/contexts/authContext'
import { toast } from '@/components/ui/use-toast'

interface OMRResult {
  sbd?: string
  exam_code?: string
  answers: Record<string, string>
  score?: number
  total_correct?: number
  total_questions?: number
  student?: {
    maHocSinh: number | null
    hoTen: string | null
    maHocSinhTruong: string | null
  } | null
  aligned_image?: string
  message?: string
  timestamp?: string
}

interface OMRWebSocketData {
  success: boolean
  message?: string
  data?: OMRResult
}

interface UseOMRWebSocketProps {
  examId?: number | null
  templateId?: number | null
  onResult?: (result: OMRWebSocketData) => void
  onResultSaved?: (result: any) => void
}

export const useOMRWebSocket = ({ examId, templateId, onResult, onResultSaved }: UseOMRWebSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<OMRWebSocketData | null>(null);
  const { user } = useAuth()
  
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const onResultSavedRef = useRef(onResultSaved);
  useEffect(() => {
    onResultSavedRef.current = onResultSaved;
  }, [onResultSaved]);

  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('Disconnecting WebSocket...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsScanning(false);
      setIsProcessing(false);
    }
  }, []);

  const connect = useCallback(() => {
    // Ngăn kết nối lại nếu đã kết nối
    if (socketRef.current?.connected) {
      console.log("WebSocket is already connected.");
      return;
    }
    
    const token = getToken();
    if (!token) {
      toast({
        title: "Lỗi xác thực",
        description: "Không tìm thấy token. Vui lòng đăng nhập lại.",
        variant: "destructive",
      });
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const socketUrl = new URL(apiUrl).origin;

    const newSocket = io(socketUrl, {
      path: "/socket.io/",
      auth: {
        token: token
      },
      transports: ['websocket'],
      reconnection: false,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setIsConnected(true);
      toast({ title: "Kết nối thành công", description: "Sẵn sàng bắt đầu quét phiếu" });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      setIsScanning(false);
      setIsProcessing(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      toast({ 
        title: "Lỗi kết nối WebSocket", 
        description: "Không thể kết nối tới server", 
        variant: "destructive" 
      });
    });

    newSocket.on('connected', (data) => {
      console.log('Connected message:', data);
    });

    newSocket.on('scanning_started', (data) => {
      console.log('Scanning started:', data);
      setIsScanning(true);
      toast({ 
        title: "Bắt đầu quét", 
        description: "Phiên quét đã được khởi động. Hãy chụp ảnh phiếu trả lời." 
      });
    });

    newSocket.on('frame_processed', (result: OMRWebSocketData) => {
      console.log('Frame processed:', result);
      setIsProcessing(false);
      setLastResult(result);
      onResultRef.current?.(result);
      
      if (result.success && result.data) {
        toast({
          title: "Xử lý thành công",
          description: `SBD: ${result.data.sbd || 'N/A'} - Điểm: ${result.data.score || 'N/A'}`,
        });
      } else {
        toast({
          title: "Lỗi xử lý",
          description: result.message || "Không thể xử lý phiếu trả lời",
          variant: "destructive",
        });
      }
    });

    newSocket.on('result_saved', (result) => {
      console.log('Result saved:', result);
      onResultSavedRef.current?.(result);
      
      if (result.success) {
        toast({
          title: "Đã lưu kết quả",
          description: "Kết quả chấm điểm đã được lưu vào cơ sở dữ liệu",
        });
      } else {
        toast({
          title: "Lỗi lưu kết quả",
          description: result.message || "Không thể lưu kết quả",
          variant: "destructive",
        });
      }
    });

    newSocket.on('session_ended', (data) => {
      console.log('Session ended:', data);
      setIsScanning(false);
      setIsProcessing(false);
      toast({
        title: "Kết thúc phiên",
        description: data.message || "Phiên chấm bài đã kết thúc",
      });
      disconnect();
    });

    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
      setIsProcessing(false);
      toast({
        title: "Lỗi WebSocket",
        description: error.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    });

    newSocket.on('auth_error', (error) => {
      console.error('Auth error:', error);
      toast({
        title: "Lỗi xác thực",
        description: error.message || "Token không hợp lệ",
        variant: "destructive",
      });
      disconnect();
    });

    socketRef.current = newSocket;

  }, [getToken, disconnect]);

  // Start scanning session
  const startScanning = useCallback(() => {
    const start = () => {
        if (socketRef.current?.connected) {
            console.log('Starting scanning session...', { examId, templateId });
            socketRef.current.emit('start_scanning', {
                exam_id: examId,
                template_id: templateId
            });
        } else {
            // Nếu chưa kết nối, thử lại sau một chút
            setTimeout(start, 100);
        }
    };

    if (!examId || !templateId) {
      toast({
        title: "Không thể bắt đầu",
        description: "Vui lòng chọn Lớp và Mã đề trước.",
        variant: "destructive",
      });
      return;
    }

    // Nếu chưa kết nối, gọi connect() rồi bắt đầu vòng lặp kiểm tra
    if (!socketRef.current?.connected) {
        console.log('Connecting WebSocket before starting scan...');
        connect();
        start();
    } else {
        // Nếu đã kết nối, bắt đầu ngay
        start();
    }
  }, [examId, templateId, connect]);

  // Capture frame and process
  const captureFrame = useCallback((frameData: string) => {
    if (!socketRef.current?.connected || !isScanning) {
      toast({
        title: "Không thể chụp",
        description: "Phiên quét chưa được khởi động",
        variant: "destructive",
      });
      return;
    }

    console.log('Capturing frame for processing...');
    setIsProcessing(true);
    socketRef.current.emit('capture_frame', { frame: frameData });
  }, [isScanning]);

  // Save current result to database
  const saveResult = useCallback((result: OMRResult) => {
    if (!socketRef.current?.connected || !result) {
      toast({
        title: "Không thể lưu",
        description: "Không có kết quả để lưu",
        variant: "destructive",
      });
      return;
    }

    console.log('Saving result to database...', result);
    socketRef.current.emit('save_result', { result });
  }, []);

  // End scanning session
  const endSession = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('Ending scanning session and disconnecting...');
      socketRef.current.emit('end_session');
      // Server sẽ tự ngắt kết nối, nhưng ta cũng chủ động ngắt ở client để chắc chắn
      setTimeout(() => {
        disconnect();
      }, 500);
    }
  }, [disconnect]);

  // Don't auto-connect when component mounts
  // Connection will be initiated manually by the user.
  useEffect(() => {
    // Just cleanup on unmount
    return () => {
      disconnect();
    };
  }, [disconnect]); // Dependency on disconnect ensures it's available for cleanup

  return {
    isConnected,
    isScanning,
    isProcessing,
    lastResult,
    connect,
    disconnect,
    startScanning,
    captureFrame,
    saveResult,
    endSession
  };
};
 