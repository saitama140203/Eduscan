"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { 
  Users, 
  BookOpen, 
  FileSpreadsheet, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Target,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Eye,
  Plus,
  RefreshCw
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { apiRequest } from "@/lib/api/base"
import { statsApi } from '@/lib/api/stats'

// Types
interface ManagerStats {
  classes: number
  teachers: number
  exams: number
  students: number
  averageScore?: number | null
}

interface RecentActivity {
  id: number
  type: 'teacher' | 'class' | 'exam' | 'student'
  title: string
  description: string
  timestamp: string
  status?: 'success' | 'warning' | 'error'
}

interface QuickStats {
  label: string
  value: string
  change: number
  trend: 'up' | 'down' | 'stable'
  icon: any
}

// API functions moved to lib/api/stats.ts

export default function ManagerDashboardPage() {
  const [stats, setStats] = useState<ManagerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)

  // Fetch data from API
  const fetchDashboardData = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true)
      else if (!stats) setLoading(true)

      setActivitiesLoading(true)

      const [dashboardStats, activities] = await Promise.all([
        statsApi.getManagerOverview(),
        statsApi.getRecentActivities(),
      ])
      
      setStats(dashboardStats)
      setRecentActivities(activities || [])
      
      if (showToast) {
        toast({
          title: "Thành công",
          description: "Dữ liệu đã được cập nhật",
        })
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu dashboard",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setActivitiesLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const mainStats = stats ? [
    {
      label: 'Tổng giáo viên',
      value: stats.teachers.toString(),
      icon: Users
    },
    {
      label: 'Tổng học sinh',
      value: stats.students.toString(),
      icon: BookOpen
    },
    {
      label: 'Điểm trung bình',
      value: stats.averageScore ? stats.averageScore.toFixed(1) : 'N/A',
      icon: BarChart3
    },
    {
      label: 'Tổng lớp học',
      value: stats.classes.toString(),
      icon: Target
    }
  ] : []

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />
      default:
        return <Target className="h-3 w-3 text-blue-600" />
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'teacher':
        return <Users className="h-4 w-4 text-blue-600" />
      case 'class':
        return <BookOpen className="h-4 w-4 text-green-600" />
      case 'exam':
        return <FileSpreadsheet className="h-4 w-4 text-purple-600" />
      case 'student':
        return <Award className="h-4 w-4 text-orange-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-600" />
      case 'error':
        return <AlertTriangle className="h-3 w-3 text-red-600" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tổng quan Quản lý</h1>
          <p className="text-muted-foreground mt-1">
            Dashboard tổng quan cho quản lý tổ chức giáo dục
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/manager/reports">
              <BarChart3 className="h-4 w-4 mr-2" />
              Xem báo cáo
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/manager/teachers">
              <Plus className="h-4 w-4 mr-2" />
              Thêm giáo viên
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mainStats?.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  Dữ liệu được cập nhật tự động
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Performance Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Hiệu suất Giáo viên</CardTitle>
            <CardDescription>Tỷ lệ giáo viên đang hoạt động</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Đang hoạt động</span>
                <span className="text-sm text-muted-foreground">{stats?.teachers || 0}/{stats?.teachers || 0}</span>
              </div>
              <Progress value={95} className="h-2" />
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>95% hoạt động</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tiến độ Bài thi</CardTitle>
            <CardDescription>Tỷ lệ hoàn thành bài thi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Đã hoàn thành</span>
                <span className="text-sm text-muted-foreground">{Math.floor((stats?.exams || 0) * 0.85)}/{stats?.exams || 0}</span>
              </div>
              <Progress value={85} className="h-2" />
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>85% hoàn thành</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thống kê nhanh</CardTitle>
            <CardDescription>Tổng quan hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Lớp học</span>
                <span className="font-medium">{stats?.classes || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Bài thi</span>
                <span className="font-medium">{stats?.exams || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Điểm TB</span>
                <span className="font-medium">{stats?.averageScore ? stats.averageScore.toFixed(1) : '0'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Hoạt động gần đây</CardTitle>
          <CardDescription>Các sự kiện và thay đổi mới nhất trong hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card">
                <div className="mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{activity.title}</p>
                    {getStatusBadge(activity.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <Link href="/dashboard/manager/reports">
                <Eye className="h-4 w-4 mr-2" />
                Xem tất cả hoạt động
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Thao tác nhanh</CardTitle>
          <CardDescription>Các chức năng thường dùng</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-16 flex-col gap-2" asChild>
              <Link href="/dashboard/manager/teachers">
                <Users className="h-6 w-6" />
                <span>Quản lý Giáo viên</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2" asChild>
              <Link href="/dashboard/manager/classes">
                <BookOpen className="h-6 w-6" />
                <span>Quản lý Lớp học</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2" asChild>
              <Link href="/dashboard/manager/exams">
                <FileSpreadsheet className="h-6 w-6" />
                <span>Quản lý Bài thi</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2" asChild>
              <Link href="/dashboard/manager/students">
                <Award className="h-6 w-6" />
                <span>Quản lý Học sinh</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
