"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Users, 
  Award,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  Brain,
  Clock
} from "lucide-react"

interface AnalyticsData {
  examId: number
  examTitle: string
  totalStudents: number
  averageScore: number
  passRate: number
  completionTime: number
  difficultyLevel: string
  scoreDistribution: Array<{
    range: string
    count: number
    percentage: number
  }>
  questionAnalysis: Array<{
    questionNumber: number
    correctRate: number
    averageTime: number
    difficulty: 'easy' | 'medium' | 'hard'
    topic: string
  }>
  performanceTrends: Array<{
    date: string
    averageScore: number
    passRate: number
    participationRate: number
  }>
  classComparison: Array<{
    className: string
    averageScore: number
    passRate: number
    studentCount: number
  }>
  timeAnalysis: Array<{
    timeRange: string
    submissionCount: number
    averageScore: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AdvancedAnalytics({ examId }: { examId: number }) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'score' | 'time' | 'difficulty'>('score')
  const [comparisonPeriod, setComparisonPeriod] = useState<'week' | 'month' | 'quarter'>('month')

  useEffect(() => {
    fetchAnalyticsData()
  }, [examId])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockData: AnalyticsData = {
        examId,
        examTitle: "Kiểm tra Toán học kỳ 1",
        totalStudents: 120,
        averageScore: 7.2,
        passRate: 85,
        completionTime: 65,
        difficultyLevel: "medium",
        scoreDistribution: [
          { range: "0-2", count: 2, percentage: 1.7 },
          { range: "2-4", count: 8, percentage: 6.7 },
          { range: "4-6", count: 25, percentage: 20.8 },
          { range: "6-8", count: 45, percentage: 37.5 },
          { range: "8-10", count: 40, percentage: 33.3 }
        ],
        questionAnalysis: [
          { questionNumber: 1, correctRate: 95, averageTime: 45, difficulty: 'easy', topic: 'Đại số' },
          { questionNumber: 2, correctRate: 88, averageTime: 60, difficulty: 'easy', topic: 'Hình học' },
          { questionNumber: 3, correctRate: 72, averageTime: 90, difficulty: 'medium', topic: 'Đại số' },
          { questionNumber: 4, correctRate: 65, averageTime: 120, difficulty: 'medium', topic: 'Giải tích' },
          { questionNumber: 5, correctRate: 45, averageTime: 180, difficulty: 'hard', topic: 'Giải tích' },
          { questionNumber: 6, correctRate: 38, averageTime: 200, difficulty: 'hard', topic: 'Hình học' }
        ],
        performanceTrends: [
          { date: '2024-01-01', averageScore: 6.8, passRate: 78, participationRate: 95 },
          { date: '2024-01-08', averageScore: 7.1, passRate: 82, participationRate: 97 },
          { date: '2024-01-15', averageScore: 7.2, passRate: 85, participationRate: 98 },
          { date: '2024-01-22', averageScore: 7.4, passRate: 87, participationRate: 96 },
          { date: '2024-01-29', averageScore: 7.2, passRate: 85, participationRate: 99 }
        ],
        classComparison: [
          { className: "12A1", averageScore: 7.8, passRate: 92, studentCount: 30 },
          { className: "12A2", averageScore: 7.2, passRate: 85, studentCount: 28 },
          { className: "12A3", averageScore: 6.9, passRate: 79, studentCount: 32 },
          { className: "12A4", averageScore: 7.5, passRate: 88, studentCount: 30 }
        ],
        timeAnalysis: [
          { timeRange: "0-30 phút", submissionCount: 15, averageScore: 8.2 },
          { timeRange: "30-60 phút", submissionCount: 45, averageScore: 7.5 },
          { timeRange: "60-90 phút", submissionCount: 40, averageScore: 7.0 },
          { timeRange: "90+ phút", submissionCount: 20, averageScore: 6.2 }
        ]
      }
      
      setAnalyticsData(mockData)
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const difficultyDistribution = useMemo(() => {
    if (!analyticsData) return []
    
    const distribution = analyticsData.questionAnalysis.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(distribution).map(([difficulty, count]) => ({
      difficulty,
      count,
      percentage: Math.round((count / analyticsData.questionAnalysis.length) * 100)
    }))
  }, [analyticsData])

  const topicPerformance = useMemo(() => {
    if (!analyticsData) return []
    
    const topics = analyticsData.questionAnalysis.reduce((acc, q) => {
      if (!acc[q.topic]) {
        acc[q.topic] = { total: 0, correct: 0, count: 0 }
      }
      acc[q.topic].total += 100
      acc[q.topic].correct += q.correctRate
      acc[q.topic].count += 1
      return acc
    }, {} as Record<string, { total: number, correct: number, count: number }>)
    
    return Object.entries(topics).map(([topic, data]) => ({
      topic,
      averageCorrectRate: Math.round(data.correct / data.count),
      questionCount: data.count
    }))
  }, [analyticsData])

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p>Không thể tải dữ liệu phân tích</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header với key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{analyticsData.totalStudents}</p>
                <p className="text-sm text-muted-foreground">Tổng học sinh</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{analyticsData.averageScore.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Điểm trung bình</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{analyticsData.passRate}%</p>
                <p className="text-sm text-muted-foreground">Tỷ lệ đạt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{analyticsData.completionTime}p</p>
                <p className="text-sm text-muted-foreground">Thời gian TB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="questions">Phân tích câu hỏi</TabsTrigger>
          <TabsTrigger value="performance">Hiệu suất</TabsTrigger>
          <TabsTrigger value="comparison">So sánh</TabsTrigger>
          <TabsTrigger value="insights">Thông tin chi tiết</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Phân bố điểm số</CardTitle>
                <CardDescription>Biểu đồ phân bố điểm của học sinh</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [value, name === 'count' ? 'Số học sinh' : 'Tỷ lệ %']}
                    />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Difficulty Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Phân bố độ khó</CardTitle>
                <CardDescription>Tỷ lệ câu hỏi theo mức độ khó</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={difficultyDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ difficulty, percentage }) => `${difficulty}: ${percentage}%`}
                    >
                      {difficultyDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng hiệu suất</CardTitle>
              <CardDescription>Biến động điểm số và tỷ lệ đạt theo thời gian</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={analyticsData.performanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Area yAxisId="left" type="monotone" dataKey="participationRate" fill="#8884d8" fillOpacity={0.3} />
                  <Bar yAxisId="right" dataKey="passRate" fill="#82ca9d" />
                  <Line yAxisId="left" type="monotone" dataKey="averageScore" stroke="#ff7300" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          {/* Question Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Phân tích từng câu hỏi</CardTitle>
              <CardDescription>Tỷ lệ đúng và thời gian trung bình cho mỗi câu</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={analyticsData.questionAnalysis}>
                  <CartesianGrid />
                  <XAxis dataKey="averageTime" name="Thời gian (giây)" />
                  <YAxis dataKey="correctRate" name="Tỷ lệ đúng (%)" />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value, name) => [
                      name === 'correctRate' ? `${value}%` : `${value}s`,
                      name === 'correctRate' ? 'Tỷ lệ đúng' : 'Thời gian TB'
                    ]}
                    labelFormatter={(label) => `Câu ${label}`}
                  />
                  <Scatter dataKey="correctRate" fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Topic Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Hiệu suất theo chủ đề</CardTitle>
              <CardDescription>Tỷ lệ đúng trung bình cho mỗi chủ đề</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topicPerformance} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="topic" type="category" width={100} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Tỷ lệ đúng TB']} />
                  <Bar dataKey="averageCorrectRate" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Time vs Score Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Phân tích thời gian làm bài</CardTitle>
              <CardDescription>Mối quan hệ giữa thời gian và điểm số</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.timeAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeRange" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="averageScore" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          {/* Class Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>So sánh giữa các lớp</CardTitle>
              <CardDescription>Hiệu suất của các lớp học</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={analyticsData.classComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="className" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="averageScore" fill="#8884d8" />
                  <Line yAxisId="right" type="monotone" dataKey="passRate" stroke="#82ca9d" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin chi tiết & Khuyến nghị</CardTitle>
              <CardDescription>Phân tích tự động và đề xuất cải thiện</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Điểm mạnh
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Tỷ lệ đạt cao (85%) cho thất lượng giảng dạy tốt
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Câu hỏi cơ bản có tỷ lệ đúng cao (&gt;90%)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Thời gian làm bài hợp lý (65 phút TB)
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Cần cải thiện
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      Câu hỏi khó có tỷ lệ đúng thấp (dưới 50%)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      Chủ đề Giải tích cần ôn tập thêm
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      Một số học sinh làm bài quá nhanh
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Khuyến nghị</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Tăng cường bài tập về Giải tích cho lớp</li>
                  <li>• Xem xét lại độ khó của câu 5 và 6</li>
                  <li>• Tổ chức buổi ôn tập cho nhóm học sinh yếu</li>
                  <li>• Khuyến khích học sinh dành thời gian kiểm tra lại bài</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 