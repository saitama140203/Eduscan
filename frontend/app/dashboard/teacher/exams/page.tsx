"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Plus, Search, Edit, FileText, Calendar, Clock, Hash, Target, MoreHorizontal, Eye, Trash2, BarChart3 } from "lucide-react"
import Link from "next/link"
import { useExams, useDeleteExam } from "@/hooks/useExams"
import type { Exam } from "@/lib/api/exams"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const EXAM_STATUS_CONFIG = {
  nhap: { label: "Nháp", variant: "secondary" as const },
  xuatBan: { label: "Xuất bản", variant: "default" as const },
  dongDaChAm: { label: "Đóng đã chấm", variant: "outline" as const }
} as const

const SUBJECTS = [
  "Toán", "Ngữ văn", "Tiếng Anh", "Vật lý", "Hóa học", "Sinh học", 
  "Lịch sử", "Địa lý", "GDCD", "Tin học", "Thể dục", "Âm nhạc", "Mỹ thuật"
]

export default function TeacherExamsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [subjectFilter, setSubjectFilter] = useState<string>("all")
  const { toast } = useToast()

  const { data: exams = [], isLoading, error } = useExams()
  const deleteExamMutation = useDeleteExam()

  const filteredExams = exams.filter((exam: Exam) => {
    const matchesSearch = exam.tieuDe.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || exam.trangThai === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: exams.length,
    draft: exams.filter((e: Exam) => e.trangThai === "nhap").length,
    ready: exams.filter((e: Exam) => e.trangThai === "xuatBan").length,
    completed: exams.filter((e: Exam) => e.trangThai === "dongDaChAm").length
  }

  const handleDeleteExam = async (examId: number) => {
    try {
      await deleteExamMutation.mutateAsync(examId)
      toast({ title: "Thành công", description: "Xóa bài kiểm tra thành công" })
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể xóa bài kiểm tra", variant: "destructive" })
    }
  }

  const getStatusBadge = (status: string) => {
    const config = EXAM_STATUS_CONFIG[status as keyof typeof EXAM_STATUS_CONFIG] || EXAM_STATUS_CONFIG.nhap
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Chưa đặt lịch"
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  const ExamSkeleton = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-18" />
          <Skeleton className="h-4 w-14" />
          </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-8" />
        </div>
      </CardContent>
    </Card>
  )

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-red-600 mb-2">Có lỗi xảy ra khi tải dữ liệu</p>
              <Button onClick={() => window.location.reload()}>Thử lại</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Bài kiểm tra</h1>
          <p className="text-muted-foreground">Quản lý các bài kiểm tra của bạn</p>
        </div>
        <Link href="/dashboard/teacher/exams/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
              Tạo bài kiểm tra
            </Button>
        </Link>
                </div>
                
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nháp</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Xuất bản</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ready}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoàn thành</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
                  placeholder="Tìm kiếm bài kiểm tra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
              </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="nhap">Nháp</SelectItem>
            <SelectItem value="xuatBan">Xuất bản</SelectItem>
            <SelectItem value="dongDaChAm">Đóng đã chấm</SelectItem>
          </SelectContent>
        </Select>
      </div>
        </CardContent>
      </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))
        ) : filteredExams.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Chưa có bài kiểm tra nào</p>
                  <p className="text-muted-foreground mb-4">Tạo bài kiểm tra đầu tiên của bạn</p>
                  <Link href="/dashboard/teacher/exams/create">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Tạo bài kiểm tra
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
        </div>
      ) : (
          filteredExams.map((exam: Exam) => (
            <Card key={exam.maBaiKiemTra} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{exam.tieuDe}</CardTitle>
                    <Badge variant="outline">{exam.monHoc}</Badge>
                  </div>
                  {getStatusBadge(exam.trangThai)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    {formatDate(exam.ngayThi)}
                    </div>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    {exam.thoiGianLamBai} phút
                    </div>
                  <div className="flex items-center">
                    <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                    {exam.tongSoCau} câu
                    </div>
                  <div className="flex items-center">
                    <Target className="mr-2 h-4 w-4 text-muted-foreground" />
                    {exam.tongDiem} điểm
                  </div>
                  </div>

                  {exam.moTa && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {exam.moTa}
                    </p>
                  )}

                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Tạo: {formatDate(exam.thoiGianTao)}
                  </span>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                      <Link href={`/dashboard/teacher/exams/${exam.maBaiKiemTra}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                      </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/teacher/exams/${exam.maBaiKiemTra}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                      </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteExam(exam.maBaiKiemTra)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </div>
    </div>
  )
}