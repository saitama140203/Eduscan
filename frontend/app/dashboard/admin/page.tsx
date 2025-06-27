"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { 
  Users, FileText, Building2, TrendingUp, TrendingDown, Clock, 
  Brain, UserPlus, BarChart3, Settings, CheckCircle, AlertTriangle,
  BookOpen, Target, Database, Zap, Shield, Activity
} from "lucide-react"
import Link from "next/link"
import { apiRequest } from "@/lib/api/base"

// Types based on real database schema
interface AdminStats {
  totalUsers: number
  totalExams: number
  totalOrganizations: number
  totalManagers: number
  totalTeachers: number
  totalClasses: number
  totalStudents: number
  totalAnswerSheets: number
  processedSheets: number
  activeUsers: number
  todayExams: number
  todaySheets: number
  accuracy: number
  averageScore: number
  highestScore: number
  lowestScore: number
  trends: {
    users: number
    exams: number
    organizations: number
    accuracy: number
  }
}

interface RecentActivity {
  id: string
  type: 'exam' | 'user' | 'organization'
  action: string
  user: string
  timestamp: string
  status: 'success' | 'pending' | 'error'
}

interface QuickStat {
  title: string
  value: string
  change: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  description: string
}

const StatCard = ({ stat }: { stat: QuickStat }) => {
  const Icon = stat.icon
  
  const getColorClasses = (color: string) => {
    const colors = {
      blue: "text-blue-600 bg-blue-50 border-blue-200",
      green: "text-green-600 bg-green-50 border-green-200", 
      purple: "text-purple-600 bg-purple-50 border-purple-200",
      orange: "text-orange-600 bg-orange-50 border-orange-200",
      indigo: "text-indigo-600 bg-indigo-50 border-indigo-200",
      red: "text-red-600 bg-red-50 border-red-200"
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-transparent hover:border-l-blue-500">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
        <div className={`p-2 rounded-lg ${getColorClasses(stat.color)}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
        <div className="flex items-center text-xs text-gray-500 mt-1">
          {stat.change >= 0 ? (
            <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
          )}
          <span className={stat.change >= 0 ? "text-green-600" : "text-red-600"}>
            {stat.change >= 0 ? "+" : ""}{stat.change}%
          </span>
          <span className="ml-1">{stat.description}</span>
        </div>
      </CardContent>
    </Card>
  )
}

const ActivityBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-3 w-3 text-green-600" />
    case 'pending':
      return <Clock className="h-3 w-3 text-yellow-600" />
    case 'error':
      return <AlertTriangle className="h-3 w-3 text-red-600" />
    default:
      return null
  }
}

const QuickActionCard = ({ title, description, icon: Icon, href, color }: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
}) => (
  <Link href={href}>
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
      <CardHeader className="space-y-1">
        <div className={`inline-flex p-2 rounded-lg w-fit ${
          color === 'blue' ? 'bg-blue-50 text-blue-600' :
          color === 'green' ? 'bg-green-50 text-green-600' :
          color === 'purple' ? 'bg-purple-50 text-purple-600' :
          'bg-orange-50 text-orange-600'
        }`}>
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
      </CardHeader>
    </Card>
  </Link>
)

const SkeletonCard = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-32" />
    </CardContent>
  </Card>
)

// API functions
const getDashboardStats = (): Promise<AdminStats> => apiRequest('/stats/overview')
const getRecentActivities = (): Promise<RecentActivity[]> => apiRequest('/stats/admin/recent-activities')

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const { toast } = useToast()

  const quickStats = useMemo<QuickStat[]>(() => {
    if (!stats) return []
    
    return [
      {
        title: "Tổng người dùng",
        value: stats.totalUsers.toLocaleString(),
        change: stats.trends.users,
        icon: Users,
        color: "blue",
        description: "so với tháng trước"
      },
      {
        title: "Bài thi đã xử lý",
        value: stats.totalExams.toLocaleString(),
        change: stats.trends.exams,
        icon: FileText,
        color: "green",
        description: "so với tháng trước"
      },
      {
        title: "Tổ chức tham gia",
        value: stats.totalOrganizations.toLocaleString(),
        change: stats.trends.organizations,
        icon: Building2,
        color: "purple",
        description: "trường học đăng ký"
      },
      {
        title: "Người dùng hoạt động",
        value: stats.activeUsers.toLocaleString(),
        change: 15.3,
        icon: TrendingUp,
        color: "orange",
        description: "trong 30 ngày qua"
      },
      {
        title: "Phiếu đã xử lý",
        value: stats.processedSheets.toLocaleString(),
        change: 25.7,
        icon: Database,
        color: "indigo",
        description: `/${stats.totalAnswerSheets} tổng`
      },
      {
        title: "Độ chính xác AI",
        value: `${stats.accuracy}%`,
        change: stats.trends.accuracy,
        icon: Brain,
        color: "red",
        description: "độ tin cậy trung bình"
      }
    ]
  }, [stats])

  const quickActions = useMemo(() => [
    {
      title: "Quản lý người dùng",
      description: "Xem và quản lý tài khoản trong hệ thống",
      icon: Users,
      href: "/dashboard/admin/users",
      color: "blue"
    },
    {
      title: "Quản lý tổ chức",
      description: "Thêm và cập nhật thông tin trường học",
      icon: Building2,
      href: "/dashboard/admin/organizations",
      color: "green"
    },
    {
      title: "Thống kê hệ thống",
      description: "Xem báo cáo chi tiết về hiệu suất",
      icon: BarChart3,
      href: "/dashboard/admin/system-analytics",
      color: "purple"
    },
    {
      title: "Cài đặt hệ thống",
      description: "Cấu hình tham số và bảo mật",
      icon: Settings,
      href: "/dashboard/admin/system-settings",
      color: "orange"
    }
  ], [])

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [dashboardStats, activities] = await Promise.all([
        getDashboardStats(),
        getRecentActivities()
      ])
      
      setStats(dashboardStats)
      setRecentActivities(activities || [])
      
      toast({
        title: "Dữ liệu đã được cập nhật",
        description: "Dashboard hiển thị thông tin mới nhất từ database"
      })
    } catch (error) {
      console.error(`Failed to fetch dashboard data:`, error)
      setRecentActivities([])
      toast({
        title: "Lỗi kết nối",
        description: "Không thể tải dữ liệu từ server",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  useEffect(() => {
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  return (
    <div className="space-y-8 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Quản trị
          </h1>
          <p className="text-gray-600 mt-2">
            Tổng quan hệ thống EduScan với dữ liệu thời gian thực
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchDashboardData} disabled={isLoading}>
            <Activity className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <Link href="/dashboard/admin/system-analytics">
            <Button>
              <BarChart3 className="h-4 w-4 mr-2" />
              Xem báo cáo
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={`skeleton-stat-${i}`} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickStats.map((stat) => (
            <StatCard key={stat.title} stat={stat} />
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-blue-600" />
            Thao tác nhanh
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {quickActions.map((action) => (
              <QuickActionCard key={action.title} {...action} />
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-green-600" />
            Hoạt động gần đây
          </h2>
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={`skeleton-activity-${i}`} className="flex items-start space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                      <div key={`activity-${index}-${activity.id || 'unknown'}-${activity.action?.replace(/\s+/g, '-') || 'action'}`}>
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <ActivityBadge status={activity.status} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {activity.action}
                            </p>
                            <p className="text-xs text-gray-500">
                              {activity.user} • {activity.timestamp}
                            </p>
                          </div>
                        </div>
                        {index < recentActivities.length - 1 && (
                          <Separator className="mt-3" />
                        )}
                      </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Chưa có hoạt động nào
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Database Stats Summary */}
      {stats && !isLoading && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Database className="h-5 w-5 mr-2" />
              Tóm tắt dữ liệu hệ thống
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-blue-600">{stats.totalStudents.toLocaleString()}</div>
                <div className="text-gray-600">Học sinh</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">{stats.totalClasses.toLocaleString()}</div>
                <div className="text-gray-600">Lớp học</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-purple-600">{stats.averageScore.toFixed(1)}</div>
                <div className="text-gray-600">Điểm TB</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-orange-600">{stats.todayExams}</div>
                <div className="text-gray-600">Thi hôm nay</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}