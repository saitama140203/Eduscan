"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useWebSocket } from "@/hooks/useWebSocket"
import { 
  Bell, 
  BellRing, 
  Check, 
  X, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Clock,
  Trash2,
  Mail,
  Settings
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'exam_reminder' | 'system_announcement'
  title: string
  message: string
  timestamp: string
  isRead: boolean
  priority: 'low' | 'normal' | 'high' | 'urgent'
  actionUrl?: string
  examId?: number
  metadata?: Record<string, any>
}

interface NotificationCenterProps {
  userId: number
  userRole: string
}

export default function NotificationCenter({ userId, userRole }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all')
  const { toast } = useToast()

  // WebSocket connection for real-time notifications
  const wsUrl = `wss://103.67.199.62/ws/notifications_${userId}`
  
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'notification') {
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: message.data.type || 'info',
        title: message.data.title,
        message: message.data.message,
        timestamp: message.timestamp,
        isRead: false,
        priority: message.data.priority || 'normal',
        actionUrl: message.data.actionUrl,
        examId: message.data.examId,
        metadata: message.data.metadata
      }
      
      setNotifications(prev => [newNotification, ...prev])
      
      // Show toast for high priority notifications
      if (newNotification.priority === 'high' || newNotification.priority === 'urgent') {
        toast({
          title: newNotification.title,
          description: newNotification.message,
          variant: newNotification.type === 'error' ? 'destructive' : 'default',
          duration: newNotification.priority === 'urgent' ? 10000 : 5000
        })
      }
      
      // Play notification sound for urgent notifications
      if (newNotification.priority === 'urgent') {
        playNotificationSound()
      }
    }
  }, [toast])

  const { isConnected } = useWebSocket(wsUrl, {
    onMessage: handleWebSocketMessage
  })

  useEffect(() => {
    loadNotifications()
  }, [userId])

  const loadNotifications = async () => {
    try {
      // Mock data - replace with actual API call
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'exam_reminder',
          title: 'Nhắc nhở bài kiểm tra',
          message: 'Bài kiểm tra Toán học sẽ bắt đầu trong 30 phút',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          isRead: false,
          priority: 'high',
          examId: 1
        },
        {
          id: '2',
          type: 'success',
          title: 'Chấm điểm hoàn thành',
          message: 'Đã chấm xong 25 bài kiểm tra Văn học',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          isRead: true,
          priority: 'normal'
        },
        {
          id: '3',
          type: 'system_announcement',
          title: 'Thông báo hệ thống',
          message: 'Hệ thống sẽ bảo trì từ 22:00 - 23:00 tối nay',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          isRead: false,
          priority: 'normal'
        },
        {
          id: '4',
          type: 'warning',
          title: 'Cảnh báo',
          message: 'Có 3 học sinh chưa nộp bài kiểm tra',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          isRead: true,
          priority: 'normal'
        }
      ]
      
      setNotifications(mockNotifications)
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const playNotificationSound = () => {
    // Create audio context for notification sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (error) {
      console.log('Could not play notification sound:', error)
    }
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    )
  }

  const markAsUnread = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: false } : n
      )
    )
  }

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <X className="h-4 w-4 text-red-500" />
      case 'exam_reminder':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'system_announcement':
        return <Info className="h-4 w-4 text-purple-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityBadge = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Khẩn cấp</Badge>
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">Quan trọng</Badge>
      case 'low':
        return <Badge variant="secondary">Thấp</Badge>
      default:
        return null
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead
      case 'important':
        return notification.priority === 'high' || notification.priority === 'urgent'
      default:
        return true
    }
  })

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Thông báo</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Trực tuyến" : "Ngoại tuyến"}
              </Badge>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Filter tabs */}
          <div className="flex gap-2 mt-4">
            <Button 
              variant={filter === 'all' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setFilter('all')}
            >
              Tất cả ({notifications.length})
            </Button>
            <Button 
              variant={filter === 'unread' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Chưa đọc ({unreadCount})
            </Button>
            <Button 
              variant={filter === 'important' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setFilter('important')}
            >
              Quan trọng
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6">
          <Separator />
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="px-6 py-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <Check className="h-3 w-3 mr-1" />
                Đánh dấu tất cả đã đọc
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                <Trash2 className="h-3 w-3 mr-1" />
                Xóa tất cả
              </Button>
            </div>
          </div>
        )}

        {/* Notifications list */}
        <ScrollArea className="flex-1 px-6 pb-6">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Không có thông báo nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              {getPriorityBadge(notification.priority)}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(notification.timestamp), { 
                                addSuffix: true, 
                                locale: vi 
                              })}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (notification.isRead) {
                                    markAsUnread(notification.id)
                                  } else {
                                    markAsRead(notification.id)
                                  }
                                }}
                              >
                                {notification.isRead ? (
                                  <Mail className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNotification(notification.id)
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 