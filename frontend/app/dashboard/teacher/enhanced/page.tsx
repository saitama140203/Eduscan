"use client"

import { useState, useEffect, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useWebSocket } from "@/hooks/useWebSocket"
import DashboardBuilder from "@/components/dashboard/DashboardBuilder"
import MobileNavigation from "@/components/mobile/MobileNavigation"
import LazyLoadWrapper, { SkeletonCard, SkeletonStats, withLazyLoading } from "@/components/performance/LazyLoadWrapper"
import AdvancedSearch from "@/components/search/AdvancedSearch"
import AdvancedAnalytics from "@/components/analytics/AdvancedAnalytics"
import ExamMonitor from "@/components/exam/ExamMonitor"
import NotificationCenter from "@/components/notifications/NotificationCenter"
import { 
  BarChart3, 
  Users, 
  FileText, 
  Target, 
  TrendingUp, 
  Activity,
  Settings,
  Layout,
  Search,
  Bell,
  Plus,
  Eye,
  Calendar,
  BookOpen,
  Camera,
  Zap,
  Brain,
  Smartphone,
  Monitor,
  Palette,
  Gauge,
  Filter,
  Star,
  Clock,
  Award,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Wifi,
  WifiOff
} from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  totalExams: number
  activeExams: number
  totalStudents: number
  averageScore: number
  completionRate: number
  onlineUsers: number
  weeklyGrowth: {
    exams: number
    students: number
    score: number
  }
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color: string
  badge?: number
  isNew?: boolean
}

interface RecentActivity {
  id: string
  type: 'exam_created' | 'exam_completed' | 'student_submitted' | 'system_update'
  title: string
  description: string
  timestamp: string
  user?: string
  examId?: number
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'create_exam',
    title: 'Tạo bài kiểm tra',
    description: 'Tạo bài kiểm tra mới với AI',
    icon: <FileText className="h-6 w-6" />,
    href: '/dashboard/teacher/exams/new',
    color: 'bg-blue-500',
    isNew: true
  },
  {
    id: 'scan_papers',
    title: 'Quét bài thi',
    description: 'Quét và chấm điểm tự động',
    icon: <Camera className="h-6 w-6" />,
    href: '/dashboard/teacher/scan',
    color: 'bg-green-500'
  },
  {
    id: 'view_analytics',
    title: 'Phân tích nâng cao',
    description: 'Xem báo cáo chi tiết',
    icon: <BarChart3 className="h-6 w-6" />,
    href: '/dashboard/teacher/analytics',
    color: 'bg-purple-500'
  },
  {
    id: 'manage_students',
    title: 'Quản lý học sinh',
    description: 'Thêm, sửa thông tin học sinh',
    icon: <Users className="h-6 w-6" />,
    href: '/dashboard/teacher/students',
    color: 'bg-orange-500',
    badge: 3
  },
  {
    id: 'ai_insights',
    title: 'AI Insights',
    description: 'Khuyến nghị từ AI',
    icon: <Brain className="h-6 w-6" />,
    href: '/dashboard/teacher/ai-insights',
    color: 'bg-pink-500',
    isNew: true
  },
  {
    id: 'calendar',
    title: 'Lịch thi',
    description: 'Xem lịch thi sắp tới',
    icon: <Calendar className="h-6 w-6" />,
    href: '/dashboard/teacher/calendar',
    color: 'bg-cyan-500'
  }
]

// Lazy loaded components
const LazyAnalytics = withLazyLoading(AdvancedAnalytics, { 
  placeholder: <SkeletonCard />,
  threshold: 0.1 
})

const LazyExamMonitor = withLazyLoading(ExamMonitor, { 
  placeholder: <SkeletonCard />,
  threshold: 0.1 
})

export default function EnhancedTeacherDashboard() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // WebSocket for real-time updates
  const wsUrl = "wss://103.67.199.62/ws/teacher_dashboard"
  
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'stats_update':
        setDashboardStats(message.data)
        break
      case 'activity_update':
        setRecentActivities(prev => [message.data, ...prev.slice(0, 9)])
        break
      case 'notification':
        toast({
          title: message.data.title,
          description: message.data.message,
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
    
    // Detect mobile/desktop
    const checkViewMode = () => {
      setViewMode(window.innerWidth < 768 ? 'mobile' : 'desktop')
    }
    
    checkViewMode()
    window.addEventListener('resize', checkViewMode)
    
    return () => window.removeEventListener('resize', checkViewMode)
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const mockStats: DashboardStats = {
        totalExams: 45,
        activeExams: 3,
        totalStudents: 1250,
        averageScore: 7.4,
        completionRate: 92,
        onlineUsers: 28,
        weeklyGrowth: {
          exams: 12,
          students: 8,
          score: 5
        }
      }
      
      const mockActivities: RecentActivity[] = [
        {
          id: '1',
          type: 'student_submitted',
          title: 'Học sinh nộp bài',
          description: 'Nguyễn Văn A đã nộp bài kiểm tra Toán học',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          user: 'Nguyễn Văn A',
          examId: 1
        },
        {
          id: '2',
          type: 'exam_created',
          title: 'Tạo bài kiểm tra mới',
          description: 'Bài kiểm tra Vật lý kỳ 1 đã được tạo',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          user: 'Giáo viên',
          examId: 2
        },
        {
          id: '3',
          type: 'exam_completed',
          title: 'Hoàn thành bài kiểm tra',
          description: 'Bài kiểm tra Hóa học đã kết thúc với 98% tham gia',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          examId: 3
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

  const getConnectionBadge = () => {
    switch (connectionState) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><Wifi className="h-3 w-3 mr-1" />Online</Badge>
      case 'connecting':
        return <Badge className="bg-yellow-100 text-yellow-800">Connecting...</Badge>
      case 'disconnected':
        return <Badge className="bg-gray-100 text-gray-800"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'exam_created':
        return <FileText className="h-4 w-4 text-blue-500" />
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

  const StatCard = ({ title, value, subtitle, icon, growth, color }: any) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <div className={`p-3 rounded-full ${color}`}>
              {icon}
            </div>
          </div>
          
          {growth !== undefined && (
            <div className="mt-4 flex items-center gap-1">
              {growth > 0 ? (
                <ArrowUp className="h-3 w-3 text-green-500" />
              ) : (
                <ArrowDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs font-medium ${growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {Math.abs(growth)}%
              </span>
              <span className="text-xs text-muted-foreground">so với tuần trước</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Enhanced Dashboard</h1>
            <p className="text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        </div>
        <SkeletonStats />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mobile Navigation */}
      {viewMode === 'mobile' && (
        <MobileNavigation userRole="TEACHER" notifications={5} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1 
            className="text-3xl font-bold"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Enhanced Dashboard
          </motion.h1>
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            Dashboard nâng cao với AI và real-time
          </motion.p>
        </div>
        
        <div className="flex items-center gap-3">
          {getConnectionBadge()}
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          
          <NotificationCenter userId={1} userRole="TEACHER" />
          
          <Button
            variant={isCustomizing ? 'default' : 'outline'}
            onClick={() => setIsCustomizing(!isCustomizing)}
          >
            <Layout className="h-4 w-4 mr-2" />
            Customize
          </Button>
        </div>
      </div>

      {/* Advanced Search */}
      <LazyLoadWrapper threshold={0.1}>
        <AdvancedSearch
          placeholder="Tìm kiếm bài kiểm tra, học sinh, kết quả..."
          onSearch={(query, filters, sort) => {
            setSearchQuery(query)
            console.log('Search:', { query, filters, sort })
          }}
          showSuggestions={true}
          showFilters={true}
          showSort={true}
          showSavedSearches={true}
        />
      </LazyLoadWrapper>

      {/* Stats Overview */}
      {dashboardStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <StatCard
              title="Tổng bài kiểm tra"
              value={dashboardStats.totalExams}
              subtitle="Đã tạo"
              icon={<FileText className="h-5 w-5 text-white" />}
              growth={dashboardStats.weeklyGrowth.exams}
              color="bg-blue-500"
            />
            
            <StatCard
              title="Đang diễn ra"
              value={dashboardStats.activeExams}
              subtitle="Bài thi"
              icon={<Activity className="h-5 w-5 text-white" />}
              color="bg-green-500"
            />
            
            <StatCard
              title="Tổng học sinh"
              value={dashboardStats.totalStudents.toLocaleString()}
              subtitle="Đã đăng ký"
              icon={<Users className="h-5 w-5 text-white" />}
              growth={dashboardStats.weeklyGrowth.students}
              color="bg-purple-500"
            />
            
            <StatCard
              title="Điểm trung bình"
              value={dashboardStats.averageScore.toFixed(1)}
              subtitle="Tất cả bài thi"
              icon={<Target className="h-5 w-5 text-white" />}
              growth={dashboardStats.weeklyGrowth.score}
              color="bg-orange-500"
            />
            
            <StatCard
              title="Tỷ lệ hoàn thành"
              value={`${dashboardStats.completionRate}%`}
              subtitle="Bài kiểm tra"
              icon={<Award className="h-5 w-5 text-white" />}
              color="bg-cyan-500"
            />
            
            <StatCard
              title="Đang online"
              value={dashboardStats.onlineUsers}
              subtitle="Người dùng"
              icon={<Wifi className="h-5 w-5 text-white" />}
              color="bg-emerald-500"
            />
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="analytics">Phân tích</TabsTrigger>
          <TabsTrigger value="monitoring">Theo dõi</TabsTrigger>
          <TabsTrigger value="builder">Dashboard Builder</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Thao tác nhanh</CardTitle>
                <CardDescription>Các chức năng thường dùng</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {QUICK_ACTIONS.map((action, index) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link href={action.href}>
                        <Card className="cursor-pointer hover:shadow-md transition-shadow relative">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${action.color}`}>
                                {action.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm">{action.title}</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {action.description}
                                </p>
                              </div>
                            </div>
                            
                            {action.badge && (
                              <Badge 
                                variant="destructive" 
                                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                              >
                                {action.badge}
                              </Badge>
                            )}
                            
                            {action.isNew && (
                              <Badge 
                                className="absolute -top-1 -right-1 bg-green-500"
                              >
                                New
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <LazyLoadWrapper>
              <Card>
                <CardHeader>
                  <CardTitle>Hoạt động gần đây</CardTitle>
                  <CardDescription>Các sự kiện mới nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <AnimatePresence>
                      {recentActivities.map((activity, index) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{activity.title}</h4>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {new Date(activity.timestamp).toLocaleString('vi-VN')}
                              </span>
                            </div>
                          </div>
                          {activity.examId && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/teacher/exams/${activity.examId}`}>
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </LazyLoadWrapper>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <LazyAnalytics examId={1} />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <LazyExamMonitor 
            examId={1}
            examTitle="Kiểm tra Toán học kỳ 1"
            examDuration={90}
            totalStudents={30}
          />
        </TabsContent>

        <TabsContent value="builder" className="space-y-6">
          <LazyLoadWrapper>
            <DashboardBuilder />
          </LazyLoadWrapper>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Page Load Time</span>
                    <Badge variant="secondary">1.2s</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Response</span>
                    <Badge variant="secondary">245ms</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">WebSocket Latency</span>
                    <Badge variant="secondary">12ms</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Memory Usage</span>
                    <Badge variant="secondary">45MB</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  User Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Accessibility Score</span>
                    <Badge className="bg-green-500">98/100</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mobile Friendly</span>
                    <Badge className="bg-green-500">100%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SEO Score</span>
                    <Badge className="bg-green-500">95/100</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">PWA Ready</span>
                    <Badge className="bg-green-500">Yes</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Optimizations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Lazy Loading</span>
                    <Badge className="bg-green-500">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Code Splitting</span>
                    <Badge className="bg-green-500">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Image Optimization</span>
                    <Badge className="bg-green-500">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Caching</span>
                    <Badge className="bg-green-500">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating Action Button for Mobile */}
      {viewMode === 'mobile' && (
        <motion.div
          className="fixed bottom-20 right-4 z-40"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
          >
            <Button
              size="lg"
              className="w-14 h-14 rounded-full shadow-lg"
              asChild
            >
              <Link href="/dashboard/teacher/exams/new">
                <Plus className="h-6 w-6" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
} 