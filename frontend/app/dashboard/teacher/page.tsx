"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { 
  FileText, Camera, BarChart3, Activity, Users, Clock, CheckCircle, AlertCircle, Calendar, Bell, BookOpen, GraduationCap,
  Scan, Plus, Eye, Download, Filter, ArrowUpRight, ArrowDownRight, Zap, Target, Award, Brain
} from "lucide-react"
import { 
  AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import clsx from "clsx"
import { apiRequest } from '@/lib/api/base'
import { useAuth } from '@/contexts/authContext'
import { Skeleton } from "@/components/ui/skeleton"

// Types
interface QuickStat {
  title: string; value: string; change: number; icon: React.ComponentType<{ className?: string }>; color: string; description: string;
}
interface RecentActivity {
  id: string; type: 'exam' | 'scan' | 'grade'; title: string; description: string; timestamp: string; status: 'success' | 'pending' | 'warning';
}
interface UpcomingExam {
  id: string; title: string; subject: string; date: string; time: string; class: string; studentsCount: number; status: 'scheduled' | 'ready' | 'completed';
}

// Mock Data
const mockClassDistribution = [
  { name: '10A1', students: 35, color: '#3B82F6' }, { name: '10A2', students: 32, color: '#10B981' },
  { name: '10A3', students: 30, color: '#F59E0B' }, { name: '11A1', students: 28, color: '#8B5CF6' }
];
const mockSubjectPerformance = [
  { subject: 'Toán', avg: 8.2, tests: 12 }, { subject: 'Lý', avg: 7.8, tests: 10 },
  { subject: 'Hóa', avg: 8.5, tests: 8 }, { subject: 'Sinh', avg: 7.9, tests: 9 }
];

// API function
const fetchTeacherDashboard = async () => apiRequest('/teacher/dashboard');

// --- Sub-components ---
const StatCard = ({ stat, index }: { stat: QuickStat; index: number }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setMounted(true), index * 100); return () => clearTimeout(timer); }, [index]);
  const isPositive = stat.change >= 0;
  return (
    <Card className={clsx("relative overflow-hidden transition-all duration-500 hover:shadow-lg group cursor-pointer hover:-translate-y-1 hover:scale-[1.02]", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
      <div className={clsx("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300", stat.color === "blue" && "bg-gradient-to-br from-blue-500 to-blue-600", stat.color === "green" && "bg-gradient-to-br from-green-500 to-green-600", stat.color === "purple" && "bg-gradient-to-br from-purple-500 to-purple-600", stat.color === "orange" && "bg-gradient-to-br from-orange-500 to-orange-600", stat.color === "gray" && "bg-gray-200")} />
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              {stat.title !== "Đang tải..." && <div className={clsx("flex items-center text-xs font-medium", isPositive ? "text-green-600" : "text-red-600")}>{isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}{Math.abs(stat.change)}%</div>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </div>
          <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300", stat.color === "blue" && "bg-blue-100 text-blue-600", stat.color === "green" && "bg-green-100 text-green-600", stat.color === "purple" && "bg-purple-100 text-purple-600", stat.color === "orange" && "bg-orange-100 text-orange-600", stat.color === "gray" && "bg-gray-300 text-gray-600")}>
            <stat.icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const QuickActionCard = ({ title, description, icon: Icon, href, color, badge }: { title: string; description: string; icon: React.ComponentType<{ className?: string }>; href: string; color: string; badge?: string }) => (
  <Link href={href}>
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 h-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={clsx("w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300", color === "blue" && "bg-blue-100 text-blue-600", color === "green" && "bg-green-100 text-green-600", color === "purple" && "bg-purple-100 text-purple-600", color === "orange" && "bg-orange-100 text-orange-600")}>
            <Icon className="w-6 h-6" />
          </div>
          {badge && <Badge variant="secondary" className="bg-red-100 text-red-700">{badge}</Badge>}
        </div>
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
      </CardContent>
    </Card>
  </Link>
);

const ActivityItem = ({ activity, index }: { activity: RecentActivity; index: number }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setMounted(true), index * 100); return () => clearTimeout(timer); }, [index]);
  const statusIcons = { success: CheckCircle, pending: Clock, warning: AlertCircle };
  const StatusIcon = statusIcons[activity.status];
  return (
    <div className={clsx("flex items-start gap-4 p-4 rounded-lg border transition-all duration-500 hover:shadow-sm", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")} style={{ transitionDelay: `${index * 100}ms` }}>
      <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center", activity.type === "exam" && "bg-blue-100 text-blue-600", activity.type === "scan" && "bg-green-100 text-green-600", activity.type === "grade" && "bg-purple-100 text-purple-600")}>
        {activity.type === "exam" && <FileText className="w-5 h-5" />}
        {activity.type === "scan" && <Scan className="w-5 h-5" />}
        {activity.type === "grade" && <Award className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{activity.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
            <p className="text-xs text-muted-foreground mt-2">{activity.timestamp}</p>
          </div>
          <Badge className={clsx("border", { "bg-green-100 text-green-700 border-green-200": activity.status === 'success', "bg-yellow-100 text-yellow-700 border-yellow-200": activity.status === 'pending', "bg-red-100 text-red-700 border-red-200": activity.status === 'warning' })}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {activity.status === "success" && "Hoàn thành"}
            {activity.status === "pending" && "Đang xử lý"}
            {activity.status === "warning" && "Cần chú ý"}
          </Badge>
        </div>
      </div>
    </div>
  );
};

const ExamCard = ({ exam }: { exam: UpcomingExam }) => (
  <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1">
    <CardContent className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2"><h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{exam.title}</h3><Badge variant="outline" className="text-xs">{exam.subject}</Badge></div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{exam.date} • {exam.time}</div>
            <div className="flex items-center gap-2"><Users className="w-4 h-4" />{exam.class} • {exam.studentsCount} học sinh</div>
          </div>
        </div>
        <Badge className={clsx({ "bg-yellow-100 text-yellow-700": exam.status === "scheduled", "bg-green-100 text-green-700": exam.status === "ready", "bg-blue-100 text-blue-700": exam.status === "completed" })}>{exam.status === "scheduled" && "Đã lên lịch"}{exam.status === "ready" && "Sẵn sàng"}{exam.status === "completed" && "Hoàn thành"}</Badge>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1"><Eye className="w-4 h-4 mr-2" />Xem chi tiết</Button>
        {exam.status === "ready" && <Button size="sm" className="flex-1"><Scan className="w-4 h-4 mr-2" />Bắt đầu quét</Button>}
      </div>
    </CardContent>
  </Card>
);

const DashboardSkeleton = () => (
  <div className="container mx-auto py-6 max-w-7xl space-y-6">
    <div className="flex items-center gap-4"><Skeleton className="h-16 w-16 rounded-full" /><div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-5 w-48" /></div></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton className="h-80 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
      </div>
      <div className="space-y-6"><Skeleton className="h-96 rounded-xl" /></div>
    </div>
  </div>
);

// --- Main Component ---
export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const { data: dashboardData, isLoading, error } = useQuery({ queryKey: ['teacherDashboard'], queryFn: fetchTeacherDashboard, staleTime: 5 * 60 * 1000 });

  const teacherStats = useMemo<QuickStat[]>(() => {
    if (isLoading || !dashboardData?.stats) {
      return Array(4).fill(null).map(() => ({ title: "Đang tải...", value: "...", change: 0, icon: Activity, color: "gray", description: "..." }));
    }
    return [
      { title: "Tổng học sinh", value: dashboardData.stats.totalStudents?.toString() || "0", change: dashboardData.stats.studentGrowth || 0, icon: Users, color: "blue", description: "Tất cả lớp đang dạy" },
      { title: "Bài thi tháng này", value: dashboardData.stats.totalExamsThisMonth?.toString() || "0", change: dashboardData.stats.examGrowth || 0, icon: FileText, color: "green", description: "Đã tổ chức" },
      { title: "Điểm trung bình", value: dashboardData.stats.averageScore?.toFixed(1) || "N/A", change: dashboardData.stats.scoreChange || 0, icon: Target, color: "purple", description: "Tất cả môn học" },
      { title: "Độ chính xác AI", value: `${dashboardData.stats.aiAccuracy || 99.1}%`, change: dashboardData.stats.accuracyChange || 0, icon: Brain, color: "orange", description: "Quét phiếu trả lời" }
    ];
  }, [dashboardData, isLoading]);

  const quickActions = useMemo(() => [
    { title: "Quét phiếu trả lời", description: "Sử dụng AI để quét và chấm điểm tự động", icon: Camera, href: "/dashboard/teacher/scan", color: "blue", badge: "HOT" },
    { title: "Tạo bài kiểm tra", description: "Tạo đề thi mới và thiết lập phiếu trả lời", icon: Plus, href: "/dashboard/teacher/exams/create", color: "green" },
    { title: "Xem thống kê", description: "Phân tích kết quả học tập chi tiết", icon: BarChart3, href: "/dashboard/teacher/analytics", color: "purple" },
    { title: "Quản lý lớp học", description: "Xem danh sách học sinh và thông tin lớp", icon: BookOpen, href: "/dashboard/teacher/classes", color: "orange" }
  ], []);

  const recentActivities: RecentActivity[] = useMemo(() => dashboardData?.activities || [], [dashboardData]);
  const upcomingExams: UpcomingExam[] = useMemo(() => dashboardData?.upcomingExams || [], [dashboardData]);
  const performanceChartData = useMemo(() => dashboardData?.performanceData || [], [dashboardData]);
  
  if (isLoading) return <DashboardSkeleton />;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-96"><AlertCircle className="w-16 h-16 text-red-500 mb-4" /><h2 className="text-xl font-semibold">Không thể tải dữ liệu</h2><p className="text-muted-foreground">Đã có lỗi xảy ra. Vui lòng thử lại sau.</p></div>
  );

  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-4 ring-blue-100">
            <AvatarImage src={user?.anhDaiDienUrl || undefined} />
            <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">{user?.hoTen?.charAt(0)?.toUpperCase() || 'G'}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chào mừng trở lại, {user?.hoTen || 'Giáo viên'}!</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />{user?.chuyenMon || 'Giáo viên'} - {user?.organization?.tenToChuc || 'Trường học'}
              <span className="text-gray-300">•</span><span className="text-green-600 font-medium">{new Date().toLocaleDateString('vi-VN')}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="relative"><Bell className="w-4 h-4 mr-2" />Thông báo<Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">3</Badge></Button>
          <Button asChild><Link href="/dashboard/teacher/scan"><Zap className="w-4 h-4 mr-2" />Quét ngay</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {teacherStats.map((stat, index) => <StatCard key={stat.title + index} stat={stat} index={index} />)}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold text-gray-900">Thao tác nhanh</h2><Link href="/dashboard/teacher" className="text-sm text-blue-600 hover:text-blue-700">Xem tất cả →</Link></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{quickActions.map((action) => <QuickActionCard key={action.title} {...action} />)}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Hiệu suất học tập</CardTitle><CardDescription>Điểm trung bình theo tháng</CardDescription></div>
              <div className="flex gap-2"><Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />Lọc</Button><Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Xuất</Button></div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceChartData}>
                  <defs><linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="month" /><YAxis domain={[0, 10]} />
                  <Tooltip formatter={(value: number, name: string) => [name === 'score' ? `${value} điểm` : `${value} học sinh`, name === 'score' ? 'Điểm TB' : 'Số HS']} />
                  <Area type="monotone" dataKey="score" stroke="#3B82F6" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Phân bố lớp học</CardTitle><CardDescription>Số lượng học sinh mỗi lớp</CardDescription></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie data={mockClassDistribution} dataKey="students" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                      {mockClassDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-4">
                  {mockClassDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name} ({item.students})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Thành tích môn học</CardTitle><CardDescription>Điểm trung bình các môn</CardDescription></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsBarChart data={mockSubjectPerformance}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="subject" /><YAxis domain={[0, 10]} />
                    <Tooltip formatter={(value: number) => [`${value} điểm`, 'Điểm TB']} /><Bar dataKey="avg" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Hoạt động gần đây</CardTitle></CardHeader>
            <CardContent className="space-y-4">{recentActivities.map((activity, index) => <ActivityItem key={activity.id} activity={activity} index={index} />)}</CardContent>
          </Card>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold text-gray-900">Bài kiểm tra sắp tới</h2><Link href="/dashboard/teacher/exams" className="text-sm text-blue-600 hover:text-blue-700">Xem tất cả →</Link></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{upcomingExams.map((exam) => <ExamCard key={exam.id} exam={exam} />)}</div>
      </div>
    </div>
  )
}