"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart
} from "recharts"
import { 
  Users, 
  Building, 
  FileText, 
  GraduationCap,
  Target,
  Brain,
  Clock,
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Scan,
  Camera,
  Upload,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Calendar,
  BookOpen,
  School,
  UserCheck,
  Zap,
  Award,
  Eye,
  Download
} from "lucide-react"
import clsx from "clsx"

// Types for EduScan Analytics
interface EduScanStats {
  overview: {
    totalUsers: number
    totalTeachers: number
    totalManagers: number
    totalAdmins: number
    totalOrganizations: number
    totalExams: number
    totalAnswerSheets: number
    totalScannedToday: number
  }
  accuracy: {
    aiAccuracy: number
    processingSpeed: number
    errorRate: number
    confidenceScore: number
  }
  activity: {
    dailyScanning: Array<{
      date: string
      sheets: number
      exams: number
      accuracy: number
    }>
    userEngagement: Array<{
      date: string
      teachers: number
      managers: number
      admins: number
    }>
    examCreation: Array<{
      month: string
      created: number
      completed: number
    }>
  }
  distribution: {
    usersByRole: Array<{
      role: string
      count: number
      color: string
      percentage: number
    }>
    examsBySubject: Array<{
      subject: string
      count: number
      avgScore: number
    }>
    organizationTypes: Array<{
      type: string
      count: number
      color: string
    }>
    scanningMethods: Array<{
      method: string
      count: number
      percentage: number
      color: string
    }>
  }
  performance: {
    processingTimes: Array<{
      method: string
      avgTime: number
      count: number
    }>
    accuracyTrends: Array<{
      date: string
      accuracy: number
      confidence: number
    }>
    topPerformingSubjects: Array<{
      subject: string
      avgScore: number
      totalExams: number
      accuracy: number
    }>
  }
}

// Mock data for EduScan
const mockEduScanStats: EduScanStats = {
  overview: {
    totalUsers: 15,
    totalTeachers: 12,
    totalManagers: 3,
    totalAdmins: 1,
    totalOrganizations: 15,
    totalExams: 109,
    totalAnswerSheets: 109,
    totalScannedToday: 109
  },
  accuracy: {
    aiAccuracy: 98.7,
    processingSpeed: 2.3,
    errorRate: 1.3,
    confidenceScore: 96.2
  },
  activity: {
    dailyScanning: [
      { date: "2025-06-15", sheets: 10, exams: 11, accuracy: 98.5 },
      { date: "2025-06-16", sheets: 3, exams: 13, accuracy: 98.8 },
      { date: "2025-06-17", sheets: 21, exams: 21, accuracy: 98.2 },

    ],
    userEngagement: [
      { date: "2025-06-15", teachers: 2, managers: 1, admins: 2 },
      { date: "2025-06-16", teachers: 3, managers: 2, admins: 1 },
      { date: "2025-06-17", teachers: 2, managers: 1, admins: 1 }
    ],
    examCreation: [
      { month: "T10", created: 245, completed: 3 },
      { month: "T11", created: 289, completed: 12 },
      { month: "T12", created: 312, completed: 3 },
      { month: "T1", created: 267, completed: 4 },
      { month: "T2", created: 298, completed: 34 },
      { month: "T3", created: 334, completed: 22 }
    ]
  },
  distribution: {
    usersByRole: [
      { role: "Giáo viên", count: 12, color: "#0088FE", percentage: 71.5 },
      { role: "Quản lý", count: 3, color: "#00C49F", percentage: 25.7 },
      { role: "Admin", count: 1, color: "#FFBB28", percentage: 2.8 }
    ],
    examsBySubject: [
      { subject: "Toán học", count: 2, avgScore: 7.8 },
      { subject: "Vật lý", count: 3, avgScore: 7.2 },
      { subject: "Hóa học", count: 44, avgScore: 7.5 },
      { subject: "Sinh học", count: 22, avgScore: 8.1 },
      { subject: "Văn học", count: 1, avgScore: 7.9 },
      { subject: "Tiếng Anh", count: 1, avgScore: 7.6 },
      { subject: "Lịch sử", count: 2, avgScore: 8.0 },
      { subject: "Địa lý", count: 3, avgScore: 7.7 }
    ],
    organizationTypes: [
      { type: "Đại Học", count: 2, color: "#8884D8" },
      { type: "THPT", count: 2, color: "#8884D8" },
      { type: "THCS", count: 1, color: "#82CA9D" },
      { type: "Tiểu học", count: 22, color: "#FFC658" }
    ],
    scanningMethods: [
      { method: "Upload ảnh", count: 22, percentage: 63.4, color: "#0088FE" },
      { method: "Camera realtime", count: 16733, percentage: 36.6, color: "#00C49F" }
    ]
  },
  performance: {
    processingTimes: [
      { method: "Upload ảnh", avgTime: 3.2, count: 28945 },
      { method: "Camera realtime", avgTime: 1.8, count: 16733 }
    ],
    accuracyTrends: [
      { date: "T10", accuracy: 97.8, confidence: 94.2 },
      { date: "T11", accuracy: 98.1, confidence: 95.1 },
      { date: "T12", accuracy: 98.5, confidence: 95.8 },
      { date: "T1", accuracy: 98.7, confidence: 96.2 },
      { date: "T2", accuracy: 98.9, confidence: 96.5 },
      { date: "T3", accuracy: 99.1, confidence: 96.8 }
    ],
    topPerformingSubjects: [
      { subject: "Sinh học", avgScore: 8.1, totalExams: 334, accuracy: 99.2 },
      { subject: "Lịch sử", avgScore: 8.0, totalExams: 245, accuracy: 99.0 },
      { subject: "Văn học", avgScore: 7.9, totalExams: 298, accuracy: 98.8 },
      { subject: "Toán học", avgScore: 7.8, totalExams: 456, accuracy: 98.9 },
      { subject: "Địa lý", avgScore: 7.7, totalExams: 234, accuracy: 98.7 }
    ]
  }
}

// Component for stat cards
const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = "blue",
  trend,
  format = "number"
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  color?: "blue" | "green" | "purple" | "orange" | "red" | "indigo"
  trend?: { value: number; label: string; positive: boolean }
  format?: "number" | "percentage" | "time"
}) => {
  const formatValue = (val: string | number) => {
    if (format === "percentage") return `${val}%`
    if (format === "time") return `${val}s`
    if (typeof val === "number") return val.toLocaleString()
    return val
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300 group cursor-pointer">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-2xl font-bold">{formatValue(value)}</h3>
              {trend && (
                <span className={clsx(
                  "text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1",
                  trend.positive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {trend.positive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {trend.positive ? "+" : ""}{trend.value}% {trend.label}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={clsx(
            "w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300",
            color === "blue" && "bg-blue-100 text-blue-600",
            color === "green" && "bg-green-100 text-green-600",
            color === "purple" && "bg-purple-100 text-purple-600",
            color === "orange" && "bg-orange-100 text-orange-600",
            color === "red" && "bg-red-100 text-red-600",
            color === "indigo" && "bg-indigo-100 text-indigo-600"
          )}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="container mx-auto py-6 max-w-7xl">
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
)

// Main component
export default function EduScanAnalyticsPage() {
  const [eduScanStats, setEduScanStats] = useState<EduScanStats | null>(null)
  const [timeRange, setTimeRange] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { toast } = useToast()

  // Simulate API fetch
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      setEduScanStats(mockEduScanStats)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải dữ liệu'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  // Refresh data
  const refreshData = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
    
    if (!error) {
      toast({
        title: "Làm mới thành công",
        description: "Dữ liệu thống kê đã được cập nhật",
      })
    }
  }, [fetchData, error, toast])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!refreshing) {
        fetchData()
      }
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [refreshing, fetchData])

  // Calculate total engagement
  const totalEngagement = useMemo(() => {
    if (!eduScanStats) return 0
    const latest = eduScanStats.activity.userEngagement[eduScanStats.activity.userEngagement.length - 1]
    return latest ? latest.teachers + latest.managers + latest.admins : 0
  }, [eduScanStats])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!eduScanStats) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Thống kê EduScan</h1>
              <p className="text-muted-foreground">Phân tích hệ thống chấm điểm trắc nghiệm tự động</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
                <SelectItem value="90d">90 ngày</SelectItem>
                <SelectItem value="1y">1 năm</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={refreshData} 
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>

            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Xuất báo cáo
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Hiệu suất
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Hoạt động
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" />
              Phân phối
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Tổng người dùng"
                value={eduScanStats.overview.totalUsers}
                subtitle="Toàn bộ tài khoản hệ thống"
                icon={Users}
                color="blue"
                trend={{ value: 12.5, label: "tháng trước", positive: true }}
              />
              <StatCard
                title="Tổ chức tham gia"
                value={eduScanStats.overview.totalOrganizations}
                subtitle="Trường học đã đăng ký"
                icon={Building}
                color="green"
                trend={{ value: 8.3, label: "tháng trước", positive: true }}
              />
              <StatCard
                title="Bài kiểm tra"
                value={eduScanStats.overview.totalExams}
                subtitle="Tổng số bài kiểm tra"
                icon={FileText}
                color="purple"
                trend={{ value: 15.7, label: "tháng trước", positive: true }}
              />
              <StatCard
                title="Phiếu đã chấm"
                value={eduScanStats.overview.totalAnswerSheets}
                subtitle="Tổng số phiếu trả lời"
                icon={Scan}
                color="orange"
                trend={{ value: 23.4, label: "tháng trước", positive: true }}
              />
            </div>

            {/* Role Distribution & AI Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Giáo viên"
                value={eduScanStats.overview.totalTeachers}
                subtitle="Người dùng chính của hệ thống"
                icon={GraduationCap}
                color="blue"
              />
              <StatCard
                title="Quản lý"
                value={eduScanStats.overview.totalManagers}
                subtitle="Quản lý trường/khối"
                icon={UserCheck}
                color="green"
              />
              <StatCard
                title="Độ chính xác AI"
                value={eduScanStats.accuracy.aiAccuracy}
                subtitle="Tỷ lệ chấm đúng trung bình"
                icon={Brain}
                color="purple"
                format="percentage"
                trend={{ value: 0.3, label: "tháng trước", positive: true }}
              />
              <StatCard
                title="Tốc độ xử lý"
                value={eduScanStats.accuracy.processingSpeed}
                subtitle="Thời gian xử lý trung bình"
                icon={Clock}
                color="indigo"
                format="time"
                trend={{ value: 12, label: "cải thiện", positive: true }}
              />
            </div>

            {/* Today's Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Hoạt động hôm nay
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                      <Scan className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{eduScanStats.overview.totalScannedToday}</p>
                    <p className="text-sm text-muted-foreground">Phiếu đã chấm</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                      <Users className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{totalEngagement}</p>
                    <p className="text-sm text-muted-foreground">Người dùng hoạt động</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
                      <Target className="w-8 h-8 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{eduScanStats.accuracy.confidenceScore}%</p>
                    <p className="text-sm text-muted-foreground">Độ tin cậy AI</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto">
                      <Award className="w-8 h-8 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{(100 - eduScanStats.accuracy.errorRate).toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Tỷ lệ thành công</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Engagement Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng sử dụng hệ thống</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={eduScanStats.activity.userEngagement}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="teachers" 
                      stackId="1" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      name="Giáo viên"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="managers" 
                      stackId="1" 
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      name="Quản lý"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="admins" 
                      stackId="1" 
                      stroke="#ffc658" 
                      fill="#ffc658" 
                      name="Admin"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            {/* AI Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Độ chính xác AI"
                value={eduScanStats.accuracy.aiAccuracy}
                subtitle="Tỷ lệ chấm đúng của AI"
                icon={Brain}
                color="purple"
                format="percentage"
                trend={{ value: 0.3, label: "cải thiện", positive: true }}
              />
              <StatCard
                title="Tốc độ xử lý"
                value={eduScanStats.accuracy.processingSpeed}
                subtitle="Thời gian xử lý trung bình"
                icon={Clock}
                color="blue"
                format="time"
                trend={{ value: 15, label: "nhanh hơn", positive: true }}
              />
              <StatCard
                title="Tỷ lệ lỗi"
                value={eduScanStats.accuracy.errorRate}
                subtitle="Phần trăm lỗi xử lý"
                icon={AlertTriangle}
                color="red"
                format="percentage"
                trend={{ value: 0.2, label: "giảm", positive: true }}
              />
              <StatCard
                title="Độ tin cậy"
                value={eduScanStats.accuracy.confidenceScore}
                subtitle="Mức tin cậy của AI"
                icon={CheckCircle}
                color="green"
                format="percentage"
                trend={{ value: 1.1, label: "tăng", positive: true }}
              />
            </div>

            {/* Accuracy Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng độ chính xác AI</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={eduScanStats.performance.accuracyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="#8884d8" 
                      strokeWidth={3}
                      name="Độ chính xác (%)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="confidence" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Độ tin cậy (%)"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Processing Performance by Method */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hiệu suất theo phương thức</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {eduScanStats.performance.processingTimes.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {item.method === "Upload ảnh" ? (
                              <Upload className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Camera className="w-4 h-4 text-green-600" />
                            )}
                            <span className="font-medium">{item.method}</span>
                          </div>
                          <Badge variant="outline">
                            {item.avgTime}s • {item.count.toLocaleString()} lượt
                          </Badge>
                        </div>
                        <Progress 
                          value={(item.avgTime / 5) * 100} 
                          className="h-2" 
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Performing Subjects */}
              <Card>
                <CardHeader>
                  <CardTitle>Môn học có kết quả tốt nhất</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {eduScanStats.performance.topPerformingSubjects.map((subject, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                            index === 0 && "bg-yellow-500",
                            index === 1 && "bg-gray-400", 
                            index === 2 && "bg-orange-500",
                            index > 2 && "bg-blue-500"
                          )}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{subject.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {subject.totalExams} bài thi
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{subject.avgScore}/10</p>
                          <p className="text-xs text-muted-foreground">{subject.accuracy}% độ chính xác</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            {/* Daily Scanning Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Hoạt động chấm điểm hàng ngày</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={eduScanStats.activity.dailyScanning}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="sheets" fill="#8884d8" name="Phiếu trả lời" />
                    <Bar yAxisId="left" dataKey="exams" fill="#82ca9d" name="Bài kiểm tra" />
                    <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#ff7300" strokeWidth={3} name="Độ chính xác (%)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Exam Creation vs Completion */}
            <Card>
              <CardHeader>
                <CardTitle>Tạo bài thi vs Hoàn thành</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={eduScanStats.activity.examCreation}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="created" fill="#8884d8" name="Đã tạo" />
                    <Bar dataKey="completed" fill="#82ca9d" name="Đã hoàn thành" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Users by Role */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố người dùng theo vai trò</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={eduScanStats.distribution.usersByRole}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ role, percentage }) => `${role}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {eduScanStats.distribution.usersByRole.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Scanning Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Phương thức chấm điểm</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={eduScanStats.distribution.scanningMethods}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ method, percentage }) => `${method}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {eduScanStats.distribution.scanningMethods.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Exams by Subject */}
              <Card>
                <CardHeader>
                  <CardTitle>Bài kiểm tra theo môn học</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={eduScanStats.distribution.examsBySubject}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" name="Số bài thi" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Organization Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân loại tổ chức</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={eduScanStats.distribution.organizationTypes}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, count }) => `${type}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {eduScanStats.distribution.organizationTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}