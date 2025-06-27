"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useExamMonitor } from "@/hooks/useWebSocket"
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Megaphone,
  StopCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Activity
} from "lucide-react"

interface ExamMonitorProps {
  examId: number
  examTitle: string
  examDuration: number
  totalStudents: number
}

export default function ExamMonitor({ 
  examId, 
  examTitle, 
  examDuration, 
  totalStudents 
}: ExamMonitorProps) {
  const { toast } = useToast()
  const [announcementText, setAnnouncementText] = useState("")
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false)
  
  const {
    isConnected,
    isConnecting,
    isMonitoring,
    examStats,
    submissions,
    connectionState,
    broadcastAnnouncement,
    endExam,
    refreshStats
  } = useExamMonitor(examId)

  const handleSendAnnouncement = () => {
    if (!announcementText.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập nội dung thông báo",
        variant: "destructive"
      })
      return
    }

    broadcastAnnouncement(announcementText)
    setAnnouncementText("")
    setIsAnnouncementDialogOpen(false)
    
    toast({
      title: "Thành công",
      description: "Đã gửi thông báo đến tất cả học sinh"
    })
  }

  const handleEndExam = () => {
    if (confirm("Bạn có chắc chắn muốn kết thúc bài kiểm tra?")) {
      endExam()
      toast({
        title: "Thành công",
        description: "Đã kết thúc bài kiểm tra"
      })
    }
  }

  const getConnectionStatusBadge = () => {
    switch (connectionState) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><Wifi className="h-3 w-3 mr-1" />Đã kết nối</Badge>
      case 'connecting':
        return <Badge className="bg-yellow-100 text-yellow-800"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Đang kết nối</Badge>
      case 'disconnected':
        return <Badge className="bg-gray-100 text-gray-800"><WifiOff className="h-3 w-3 mr-1" />Ngắt kết nối</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Lỗi kết nối</Badge>
      default:
        return <Badge variant="secondary">Không xác định</Badge>
    }
  }

  const completionRate = examStats ? Math.round((examStats.submitted / examStats.total_students) * 100) : 0
  const averageScore = examStats?.average_score || 0

  return (
    <div className="space-y-6">
      {/* Header với connection status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Theo dõi bài kiểm tra</h2>
          <p className="text-muted-foreground">{examTitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {getConnectionStatusBadge()}
          <Button variant="outline" size="sm" onClick={refreshStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Real-time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{examStats?.total_students || totalStudents}</p>
                <p className="text-sm text-muted-foreground">Tổng học sinh</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{examStats?.submitted || 0}</p>
                <p className="text-sm text-muted-foreground">Đã nộp bài</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{examStats?.in_progress || 0}</p>
                <p className="text-sm text-muted-foreground">Đang làm bài</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{averageScore.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Điểm TB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Tiến độ bài kiểm tra</CardTitle>
          <CardDescription>
            Tỷ lệ hoàn thành: {completionRate}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={completionRate} className="h-3" />
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="font-medium text-green-600">{examStats?.submitted || 0}</p>
                <p className="text-muted-foreground">Đã nộp</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-orange-600">{examStats?.in_progress || 0}</p>
                <p className="text-muted-foreground">Đang làm</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-600">{examStats?.not_started || 0}</p>
                <p className="text-muted-foreground">Chưa bắt đầu</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Nộp bài gần đây</CardTitle>
          <CardDescription>
            Danh sách học sinh vừa nộp bài (real-time)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length > 0 ? (
            <div className="space-y-3">
              {submissions.slice(-5).reverse().map((submission, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">Học sinh #{submission.student_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(submission.submission_time).toLocaleTimeString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{submission.score}/10</p>
                    <p className="text-sm text-muted-foreground">
                      {submission.correct_answers}/{submission.total_questions} đúng
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <p>Chưa có học sinh nào nộp bài</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Control Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Điều khiển bài kiểm tra</CardTitle>
          <CardDescription>
            Các thao tác quản lý trong quá trình thi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!isConnected}>
                  <Megaphone className="h-4 w-4 mr-2" />
                  Gửi thông báo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gửi thông báo</DialogTitle>
                  <DialogDescription>
                    Thông báo sẽ được gửi đến tất cả học sinh đang làm bài
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="announcement">Nội dung thông báo</Label>
                    <Textarea
                      id="announcement"
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      placeholder="Nhập nội dung thông báo..."
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleSendAnnouncement} className="flex-1">
                      Gửi thông báo
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAnnouncementDialogOpen(false)}
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant="destructive" 
              onClick={handleEndExam}
              disabled={!isConnected}
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Kết thúc bài thi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status Details */}
      {!isConnected && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Mất kết nối real-time</p>
                <p className="text-sm">
                  Một số tính năng có thể không hoạt động. Hệ thống đang tự động thử kết nối lại.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 