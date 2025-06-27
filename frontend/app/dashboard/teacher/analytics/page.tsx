"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useWebSocket } from "@/hooks/useWebSocket"
import AdvancedAnalytics from "@/components/analytics/AdvancedAnalytics"
import ExamMonitor from "@/components/exam/ExamMonitor"
import NotificationCenter from "@/components/notifications/NotificationCenter"
import { 
  BarChart3, 
  Activity, 
  Users, 
  TrendingUp, 
  Clock, 
  Target,
  Zap,
  Brain,
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  Filter,
  Search,
  Calendar,
  Eye
} from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  totalExams: number
  activeExams: number
  totalStudents: number
  averageScore: number
  completionRate: number
  onlineUsers: number
}

interface RecentActivity {
  id: string
  type: 'exam_created' | 'exam_completed' | 'student_submitted' | 'system_update'
  title: string
  description: string
  timestamp: string
  examId?: number
  userId?: number
}

export default function AnalyticsDashboard() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [selectedExam, setSelectedExam] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateRange, setDateRange] = useState("7d")
  const { toast } = useToast()

  // WebSocket connection for real-time dashboard updates
  const wsUrl = "wss://103.67.199.62/ws/dashboard"
  
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'stats_update':
        setDashboardStats(message.data)
        break
      case 'activity_update':
        setRecentActivities(prev => [message.data, ...prev.slice(0, 9)])
        break
      case 'exam_status_change':
        toast({
          title: "Cập nhật bài kiểm tra",
          description: `Bài kiểm tra ${message.data.examTitle} đã ${message.data.status}`,
        })
        break
    }
  }

  const { isConnected, connectionState } = useWebSocket(wsUrl, {
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      toast({
        title: "Kết nối thành công",
        description: "Dashboard đã kết nối real-time",
        duration: 2000
      })
    }
  })

  useEffect(() => {
    fetchDashboardData()
  }, [dateRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockStats: DashboardStats = {
        totalExams: 45,
        activeExams: 3,
        totalStudents: 1250,
        averageScore: 7.4,
        completionRate: 92,
        onlineUsers: 28
      }
      
      const mockActivities: RecentActivity[] = [
        {
          id: '1',
          type: 'student_submitted',
          title: 'Học sinh nộp bài',
          description: 'Nguyễn Văn A đã nộp bài kiểm tra Toán học',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          examId: 1,
          userId: 123
        },
        {
          id: '2',
          type: 'exam_created',
          title: 'Tạo bài kiểm tra mới',
          description: 'Bài kiểm tra Vật lý kỳ 1 đã được tạo',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          examId: 2
        },
        {
          id: '3',
          type: 'exam_completed',
          title: 'Hoàn thành bài kiểm tra',
          description: 'Bài kiểm tra Hóa học đã kết thúc với 98% tham gia',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          examId: 3
        },
        {
          id: '4',
          type: 'system_update',
          title: 'Cập nhật hệ thống',
          description: 'Đã cập nhật tính năng chấm điểm tự động',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
        }
      ]
      
      setDashboardStats(mockStats)
      setRecentActivities(mockActivities)
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu dashboard",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'exam_created':
        return <BarChart3 className="h-4 w-4 text-blue-500" />
      case 'exam_completed':
        return <Target className="h-4 w-4 text-green-500" />
      case 'student_submitted':
        return <Users className="h-4 w-4 text-purple-500" />
      case 'system_update':
        return <Zap className="h-4 w-4 text-orange-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getConnectionBadge = () => {
    switch (connectionState) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><Wifi className="h-3 w-3 mr-1" />Trực tuyến</Badge>
      case 'connecting':
        return <Badge className="bg-yellow-100 text-yellow-800"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Đang kết nối</Badge>
      case 'disconnected':
        return <Badge className="bg-gray-100 text-gray-800"><WifiOff className="h-3 w-3 mr-1" />Ngoại tuyến</Badge>
      default:
        return <Badge variant="secondary">Không xác định</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Phân tích và theo dõi real-time</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Phân tích và theo dõi real-time</p>
        </div>
        
        <div className="flex items-center gap-3">
          {getConnectionBadge()}
          <NotificationCenter userId={1} userRole="TEACHER" />
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.totalExams}</p>
                  <p className="text-sm text-muted-foreground">Tổng bài kiểm tra</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.activeExams}</p>
                  <p className="text-sm text-muted-foreground">Đang diễn ra</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.totalStudents}</p>
                  <p className="text-sm text-muted-foreground">Tổng học sinh</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.averageScore.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Điểm TB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-500" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.completionRate}%</p>
                  <p className="text-sm text-muted-foreground">Tỷ lệ hoàn thành</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.onlineUsers}</p>
                  <p className="text-sm text-muted-foreground">Đang online</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="analytics">Phân tích nâng cao</TabsTrigger>
          <TabsTrigger value="monitoring">Theo dõi real-time</TabsTrigger>
          <TabsTrigger value="activities">Hoạt động</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activities */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Hoạt động gần đây</CardTitle>
                <CardDescription>Các sự kiện mới nhất trong hệ thống</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.timestamp).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      {activity.examId && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/teacher/exams/${activity.examId}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Thao tác nhanh</CardTitle>
                <CardDescription>Các chức năng thường dùng</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" asChild>
                  <Link href="/dashboard/teacher/exams">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Tạo bài kiểm tra
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/teacher/students">
                    <Users className="h-4 w-4 mr-2" />
                    Quản lý học sinh
                  </Link>
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Xuất báo cáo
                </Button>
                <Button variant="outline" className="w-full">
                  <Brain className="h-4 w-4 mr-2" />
                  AI Insights
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="exam-select">Chọn bài kiểm tra để phân tích</Label>
              <Select value={selectedExam?.toString() || ""} onValueChange={(value) => setSelectedExam(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bài kiểm tra..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Kiểm tra Toán học kỳ 1</SelectItem>
                  <SelectItem value="2">Kiểm tra Vật lý</SelectItem>
                  <SelectItem value="3">Kiểm tra Hóa học</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date-range">Khoảng thời gian</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 ngày</SelectItem>
                  <SelectItem value="30d">30 ngày</SelectItem>
                  <SelectItem value="90d">90 ngày</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedExam ? (
            <AdvancedAnalytics examId={selectedExam} />
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Chọn bài kiểm tra</h3>
                <p className="text-muted-foreground">
                  Vui lòng chọn một bài kiểm tra để xem phân tích chi tiết
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="monitor-exam">Chọn bài kiểm tra để theo dõi</Label>
              <Select value={selectedExam?.toString() || ""} onValueChange={(value) => setSelectedExam(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bài kiểm tra đang diễn ra..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Kiểm tra Toán học kỳ 1 (Đang diễn ra)</SelectItem>
                  <SelectItem value="2">Kiểm tra Vật lý (Sắp bắt đầu)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedExam ? (
            <ExamMonitor 
              examId={selectedExam}
              examTitle="Kiểm tra Toán học kỳ 1"
              examDuration={90}
              totalStudents={30}
            />
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Chọn bài kiểm tra để theo dõi</h3>
                <p className="text-muted-foreground">
                  Vui lòng chọn một bài kiểm tra đang diễn ra để theo dõi real-time
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Tìm kiếm hoạt động..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Lọc
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Thời gian
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lịch sử hoạt động</CardTitle>
              <CardDescription>Tất cả các hoạt động trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities
                  .filter(activity => 
                    activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    activity.description.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{activity.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                        {activity.examId && (
                          <Button variant="link" size="sm" className="p-0 h-auto mt-2" asChild>
                            <Link href={`/dashboard/teacher/exams/${activity.examId}`}>
                              Xem chi tiết →
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 