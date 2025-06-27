import { useEffect, useRef, useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

interface WebSocketMessage {
  type: string
  data?: any
  timestamp?: string
  [key: string]: any
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  reconnectAttempts?: number
  reconnectInterval?: number
  heartbeatInterval?: number
}

interface UseWebSocketReturn {
  isConnected: boolean
  isConnecting: boolean
  sendMessage: (message: WebSocketMessage) => void
  disconnect: () => void
  reconnect: () => void
  lastMessage: WebSocketMessage | null
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error'
}

export function useWebSocket(
  url: string | null,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts = 3,
    reconnectInterval = 3000,
    heartbeatInterval = 30000
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectCountRef = useRef(0)
  const { toast } = useToast()

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }
  }, [])

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
    }
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
        startHeartbeat() // Schedule next heartbeat
      }
    }, heartbeatInterval)
  }, [heartbeatInterval])

  const connect = useCallback(() => {
    if (!url || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setIsConnecting(true)
    setConnectionState('connecting')
    cleanup()

    try {
      // Add token to WebSocket URL
      const token = localStorage.getItem('token')
      const wsUrl = token ? `${url}?token=${token}` : url
      
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        setConnectionState('connected')
        reconnectCountRef.current = 0
        
        startHeartbeat()
        onConnect?.()
        
        toast({
          title: "Kết nối thành công",
          description: "Đã kết nối real-time",
          duration: 2000
        })
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)
          
          // Handle pong response
          if (message.type === 'pong') {
            return // Don't pass pong to user handler
          }
          
          onMessage?.(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      wsRef.current.onclose = (event) => {
        setIsConnected(false)
        setIsConnecting(false)
        setConnectionState('disconnected')
        cleanup()
        
        onDisconnect?.()

        // Auto-reconnect if not manually closed
        if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++
          
          toast({
            title: "Mất kết nối",
            description: `Đang thử kết nối lại... (${reconnectCountRef.current}/${reconnectAttempts})`,
            variant: "destructive",
            duration: 3000
          })
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          setConnectionState('error')
          toast({
            title: "Không thể kết nối",
            description: "Đã thử kết nối lại nhiều lần. Vui lòng tải lại trang.",
            variant: "destructive",
            duration: 5000
          })
        }
      }

      wsRef.current.onerror = (error) => {
        setConnectionState('error')
        onError?.(error)
        console.error('WebSocket error:', error)
      }

    } catch (error) {
      setIsConnecting(false)
      setConnectionState('error')
      console.error('Error creating WebSocket:', error)
    }
  }, [url, onMessage, onConnect, onDisconnect, onError, reconnectAttempts, reconnectInterval, cleanup, startHeartbeat, toast])

  const disconnect = useCallback(() => {
    cleanup()
    reconnectCountRef.current = reconnectAttempts // Prevent auto-reconnect
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }
    
    setIsConnected(false)
    setIsConnecting(false)
    setConnectionState('disconnected')
  }, [cleanup, reconnectAttempts])

  const reconnect = useCallback(() => {
    disconnect()
    reconnectCountRef.current = 0
    setTimeout(connect, 100)
  }, [disconnect, connect])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
        toast({
          title: "Lỗi gửi tin nhắn",
          description: "Không thể gửi tin nhắn real-time",
          variant: "destructive"
        })
      }
    } else {
      console.warn('WebSocket is not connected')
      toast({
        title: "Chưa kết nối",
        description: "Vui lòng đợi kết nối được thiết lập",
        variant: "destructive"
      })
    }
  }, [toast])

  // Connect when URL is provided
  useEffect(() => {
    if (url) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [url]) // Only depend on URL

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [cleanup])

  return {
    isConnected,
    isConnecting,
    sendMessage,
    disconnect,
    reconnect,
    lastMessage,
    connectionState
  }
}

// Hook chuyên dụng cho exam monitoring
export function useExamMonitor(examId: number | null) {
  const [examStats, setExamStats] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)

  const wsUrl = examId ? `wss://103.67.199.62/ws/exam/${examId}/monitor` : null

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'exam_monitor_joined':
        setIsMonitoring(true)
        break
        
      case 'exam_stats':
        setExamStats(message.stats)
        break
        
      case 'exam_update':
        if (message.data?.type === 'student_submitted') {
          setSubmissions(prev => [...prev, message.data])
        } else if (message.data?.type === 'statistics_update') {
          setExamStats(message.data.statistics)
        }
        break
        
      case 'status_changed':
        // Handle exam status changes
        break
    }
  }, [])

  const {
    isConnected,
    isConnecting,
    sendMessage,
    connectionState
  } = useWebSocket(wsUrl, {
    onMessage: handleMessage,
    onConnect: () => {
      // Request initial stats when connected
      sendMessage({ type: 'request_exam_stats' })
    }
  })

  const broadcastAnnouncement = useCallback((message: string) => {
    sendMessage({
      type: 'broadcast_announcement',
      message
    })
  }, [sendMessage])

  const endExam = useCallback(() => {
    sendMessage({
      type: 'end_exam'
    })
  }, [sendMessage])

  return {
    isConnected,
    isConnecting,
    isMonitoring,
    examStats,
    submissions,
    connectionState,
    broadcastAnnouncement,
    endExam,
    refreshStats: () => sendMessage({ type: 'request_exam_stats' })
  }
} 