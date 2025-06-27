"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Ban, 
  CheckCircle, 
  XCircle,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  Settings,
  Download,
  Upload
} from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

interface SecurityEvent {
  id: number
  type: 'login_failed' | 'suspicious_activity' | 'password_change' | 'permission_change' | 'data_access'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId: number
  userName: string
  description: string
  ipAddress: string
  userAgent: string
  timestamp: string
  status: 'pending' | 'resolved' | 'ignored'
}

interface SecurityPolicy {
  id: string
  name: string
  description: string
  enabled: boolean
  value: string | number | boolean
  category: 'authentication' | 'authorization' | 'data' | 'network'
}

interface ActiveSession {
  id: string
  userId: number
  userName: string
  ipAddress: string
  userAgent: string
  location: string
  loginTime: string
  lastActivity: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  isCurrentSession: boolean
}

const SECURITY_POLICIES: SecurityPolicy[] = [
  {
    id: 'password_min_length',
    name: 'Độ dài mật khẩu tối thiểu',
    description: 'Số ký tự tối thiểu cho mật khẩu',
    enabled: true,
    value: 8,
    category: 'authentication'
  },
  {
    id: 'password_require_special',
    name: 'Yêu cầu ký tự đặc biệt',
    description: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt',
    enabled: true,
    value: true,
    category: 'authentication'
  },
  {
    id: 'session_timeout',
    name: 'Thời gian timeout session',
    description: 'Thời gian tự động đăng xuất (phút)',
    enabled: true,
    value: 60,
    category: 'authentication'
  },
  {
    id: 'max_login_attempts',
    name: 'Số lần đăng nhập tối đa',
    description: 'Số lần đăng nhập sai trước khi khóa tài khoản',
    enabled: true,
    value: 5,
    category: 'authentication'
  },
  {
    id: 'two_factor_required',
    name: 'Bắt buộc xác thực 2 yếu tố',
    description: 'Yêu cầu 2FA cho tất cả người dùng',
    enabled: false,
    value: false,
    category: 'authentication'
  },
  {
    id: 'ip_whitelist_enabled',
    name: 'Whitelist IP',
    description: 'Chỉ cho phép truy cập từ IP được phép',
    enabled: false,
    value: false,
    category: 'network'
  },
  {
    id: 'audit_log_retention',
    name: 'Thời gian lưu audit log',
    description: 'Số ngày lưu trữ audit log',
    enabled: true,
    value: 90,
    category: 'data'
  }
]

export default function SecurityPage() {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [policies, setPolicies] = useState<SecurityPolicy[]>(SECURITY_POLICIES)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('events')
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [eventDialog, setEventDialog] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSecurityData()
  }, [])

  const fetchSecurityData = async () => {
    setIsLoading(true)
    try {
      // Mock data
      const mockEvents: SecurityEvent[] = [
        {
          id: 1,
          type: 'login_failed',
          severity: 'medium',
          userId: 123,
          userName: 'john.doe@example.com',
          description: 'Đăng nhập thất bại 3 lần liên tiếp',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          timestamp: '2024-01-15T10:30:00Z',
          status: 'pending'
        },
        {
          id: 2,
          type: 'suspicious_activity',
          severity: 'high',
          userId: 456,
          userName: 'admin@example.com',
          description: 'Truy cập từ địa điểm bất thường (Nga)',
          ipAddress: '185.220.101.42',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          timestamp: '2024-01-15T09:15:00Z',
          status: 'pending'
        },
        {
          id: 3,
          type: 'data_access',
          severity: 'critical',
          userId: 789,
          userName: 'teacher@example.com',
          description: 'Tải xuống dữ liệu học sinh số lượng lớn',
          ipAddress: '10.0.0.50',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          timestamp: '2024-01-15T08:45:00Z',
          status: 'resolved'
        }
      ]

      const mockSessions: ActiveSession[] = [
        {
          id: 'sess_1',
          userId: 1,
          userName: 'Admin User',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          location: 'Hà Nội, Việt Nam',
          loginTime: '2024-01-15T08:00:00Z',
          lastActivity: '2024-01-15T10:30:00Z',
          deviceType: 'desktop',
          isCurrentSession: true
        },
        {
          id: 'sess_2',
          userId: 2,
          userName: 'Manager User',
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          location: 'TP.HCM, Việt Nam',
          loginTime: '2024-01-15T09:30:00Z',
          lastActivity: '2024-01-15T10:25:00Z',
          deviceType: 'mobile',
          isCurrentSession: false
        }
      ]

      setSecurityEvents(mockEvents)
      setActiveSessions(mockSessions)
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu bảo mật",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePolicyChange = (policyId: string, field: string, value: any) => {
    setPolicies(prev => prev.map(policy => 
      policy.id === policyId 
        ? { ...policy, [field]: value }
        : policy
    ))
    
    toast({
      title: "Đã cập nhật chính sách",
      description: "Thay đổi sẽ có hiệu lực ngay lập tức"
    })
  }

  const handleEventAction = (eventId: number, action: 'resolve' | 'ignore') => {
    setSecurityEvents(prev => prev.map(event =>
      event.id === eventId
        ? { ...event, status: action === 'resolve' ? 'resolved' : 'ignored' }
        : event
    ))
    
    toast({
      title: action === 'resolve' ? "Đã giải quyết sự kiện" : "Đã bỏ qua sự kiện"
    })
  }

  const handleTerminateSession = (sessionId: string) => {
    setActiveSessions(prev => prev.filter(session => session.id !== sessionId))
    toast({
      title: "Đã kết thúc phiên",
      description: "Người dùng sẽ bị đăng xuất"
    })
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login_failed': return <Lock size={16} className="text-red-600" />
      case 'suspicious_activity': return <AlertTriangle size={16} className="text-orange-600" />
      case 'password_change': return <Key size={16} className="text-blue-600" />
      case 'permission_change': return <Shield size={16} className="text-purple-600" />
      case 'data_access': return <Eye size={16} className="text-green-600" />
      default: return <AlertTriangle size={16} className="text-gray-600" />
    }
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop': return <Monitor size={16} />
      case 'mobile': return <Smartphone size={16} />
      case 'tablet': return <Smartphone size={16} />
      default: return <Monitor size={16} />
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Quản lý bảo mật</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 animate-pulse rounded" />
                    <div className="h-8 bg-gray-200 animate-pulse rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quản lý bảo mật</h1>
          <p className="text-muted-foreground">Giám sát và quản lý bảo mật hệ thống</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSecurityData}>
            <RefreshCw size={16} className="mr-2" />
            Làm mới
          </Button>
          <Button>
            <Download size={16} className="mr-2" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sự kiện bảo mật</p>
                <p className="text-2xl font-bold">{securityEvents.filter(e => e.status === 'pending').length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Chờ xử lý</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phiên hoạt động</p>
                <p className="text-2xl font-bold">{activeSessions.length}</p>
              </div>
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Đang trực tuyến</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Chính sách</p>
                <p className="text-2xl font-bold">{policies.filter(p => p.enabled).length}/{policies.length}</p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Đang kích hoạt</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mức độ bảo mật</p>
                <p className="text-2xl font-bold text-green-600">Cao</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Hệ thống an toàn</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="events">Sự kiện bảo mật</TabsTrigger>
          <TabsTrigger value="sessions">Phiên hoạt động</TabsTrigger>
          <TabsTrigger value="policies">Chính sách</TabsTrigger>
          <TabsTrigger value="monitoring">Giám sát</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Sự kiện bảo mật gần đây</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loại</TableHead>
                    <TableHead>Mức độ</TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEventIcon(event.type)}
                          <span className="capitalize">{event.type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(event.severity)}>
                          {event.severity === 'critical' ? 'Nghiêm trọng' :
                           event.severity === 'high' ? 'Cao' :
                           event.severity === 'medium' ? 'Trung bình' : 'Thấp'}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.userName}</TableCell>
                      <TableCell className="max-w-xs truncate">{event.description}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          event.status === 'pending' ? 'destructive' :
                          event.status === 'resolved' ? 'default' : 'secondary'
                        }>
                          {event.status === 'pending' ? 'Chờ xử lý' :
                           event.status === 'resolved' ? 'Đã giải quyết' : 'Đã bỏ qua'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedEvent(event)
                              setEventDialog(true)
                            }}
                          >
                            <Eye size={14} />
                          </Button>
                          {event.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleEventAction(event.id, 'resolve')}
                              >
                                <CheckCircle size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleEventAction(event.id, 'ignore')}
                              >
                                <XCircle size={14} />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Phiên đăng nhập hoạt động</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Thiết bị</TableHead>
                    <TableHead>Địa điểm</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Đăng nhập</TableHead>
                    <TableHead>Hoạt động cuối</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{session.userName}</div>
                          {session.isCurrentSession && (
                            <Badge variant="outline" className="text-xs">Phiên hiện tại</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(session.deviceType)}
                          <span className="capitalize">{session.deviceType}</span>
                        </div>
                      </TableCell>
                      <TableCell>{session.location}</TableCell>
                      <TableCell className="font-mono text-sm">{session.ipAddress}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(session.loginTime), 'dd/MM HH:mm', { locale: vi })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(session.lastActivity), 'dd/MM HH:mm', { locale: vi })}
                      </TableCell>
                      <TableCell>
                        {!session.isCurrentSession && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleTerminateSession(session.id)}
                          >
                            <Ban size={14} className="mr-1" />
                            Kết thúc
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <div className="space-y-6">
            {['authentication', 'authorization', 'data', 'network'].map(category => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">
                    {category === 'authentication' ? 'Xác thực' :
                     category === 'authorization' ? 'Phân quyền' :
                     category === 'data' ? 'Dữ liệu' : 'Mạng'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {policies.filter(p => p.category === category).map(policy => (
                      <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={policy.enabled}
                              onCheckedChange={(checked) => handlePolicyChange(policy.id, 'enabled', checked)}
                            />
                            <div>
                              <h4 className="font-medium">{policy.name}</h4>
                              <p className="text-sm text-muted-foreground">{policy.description}</p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          {typeof policy.value === 'boolean' ? (
                            <Badge variant={policy.value ? 'default' : 'secondary'}>
                              {policy.value ? 'Bật' : 'Tắt'}
                            </Badge>
                          ) : (
                            <Input
                              type={typeof policy.value === 'number' ? 'number' : 'text'}
                              value={policy.value}
                              onChange={(e) => handlePolicyChange(
                                policy.id, 
                                'value', 
                                typeof policy.value === 'number' ? parseInt(e.target.value) : e.target.value
                              )}
                              className="w-20 text-center"
                              disabled={!policy.enabled}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monitoring">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Giám sát thời gian thực</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Đăng nhập thất bại (24h)</span>
                    <Badge variant="secondary">12</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Hoạt động đáng ngờ</span>
                    <Badge variant="destructive">2</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Truy cập từ IP mới</span>
                    <Badge variant="secondary">5</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Thay đổi quyền</span>
                    <Badge variant="default">3</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cảnh báo bảo mật</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Mật khẩu yếu</h4>
                      <p className="text-sm text-yellow-700">15 người dùng đang sử dụng mật khẩu yếu</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle size={16} className="text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800">Truy cập bất thường</h4>
                      <p className="text-sm text-red-700">Phát hiện truy cập từ địa điểm lạ</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Event Detail Dialog */}
      <Dialog open={eventDialog} onOpenChange={setEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết sự kiện bảo mật</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Loại sự kiện</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getEventIcon(selectedEvent.type)}
                    <span>{selectedEvent.type.replace('_', ' ')}</span>
                  </div>
                </div>
                <div>
                  <Label>Mức độ nghiêm trọng</Label>
                  <div className="mt-1">
                    <Badge className={getSeverityColor(selectedEvent.severity)}>
                      {selectedEvent.severity}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Người dùng</Label>
                  <p className="mt-1">{selectedEvent.userName}</p>
                </div>
                <div>
                  <Label>Thời gian</Label>
                  <p className="mt-1">
                    {format(new Date(selectedEvent.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                  </p>
                </div>
                <div>
                  <Label>IP Address</Label>
                  <p className="mt-1 font-mono">{selectedEvent.ipAddress}</p>
                </div>
                <div>
                  <Label>Trạng thái</Label>
                  <div className="mt-1">
                    <Badge variant={
                      selectedEvent.status === 'pending' ? 'destructive' :
                      selectedEvent.status === 'resolved' ? 'default' : 'secondary'
                    }>
                      {selectedEvent.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label>Mô tả</Label>
                <p className="mt-1">{selectedEvent.description}</p>
              </div>
              <div>
                <Label>User Agent</Label>
                <p className="mt-1 text-sm font-mono break-all">{selectedEvent.userAgent}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialog(false)}>
              Đóng
            </Button>
            {selectedEvent?.status === 'pending' && (
              <>
                <Button 
                  variant="default"
                  onClick={() => {
                    handleEventAction(selectedEvent.id, 'resolve')
                    setEventDialog(false)
                  }}
                >
                  Giải quyết
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => {
                    handleEventAction(selectedEvent.id, 'ignore')
                    setEventDialog(false)
                  }}
                >
                  Bỏ qua
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 