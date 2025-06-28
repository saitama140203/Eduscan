"use client";

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useExams, useDeleteExam, useUpdateExam } from "@/hooks/useExams"
import { useOrganizations } from "@/hooks/useOrganizations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  FileText,
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  Clock,
  Users,
  BarChart3,
  MoreVertical,
  Eye,
  Settings,
  TrendingUp,
  BookOpen,
  GraduationCap,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react"
import type { Exam } from "@/lib/api/exams"

const STATUS_CONFIG = {
  nhap: { 
    label: "Nháp", 
    variant: "secondary" as const, 
    color: "bg-gray-100 text-gray-800",
    icon: AlertCircle
  },
  xuatBan: { 
    label: "Xuất bản", 
    variant: "default" as const, 
    color: "bg-blue-100 text-blue-800",
    icon: CheckCircle
  },
  dongDaChAm: { 
    label: "Đóng đã chấm", 
    variant: "outline" as const, 
    color: "bg-green-100 text-green-800",
    icon: XCircle
  }
}

export default function AdminExamsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [orgFilter, setOrgFilter] = useState("all")
  const [deleteExamId, setDeleteExamId] = useState<number | null>(null)

  // Fetch data
  const { data: exams = [], isLoading, error } = useExams()
  const { data: organizations = [] } = useOrganizations()
  const deleteExamMutation = useDeleteExam()
  const updateExamMutation = useUpdateExam()

  // Filter and search exams
  const filteredExams = useMemo(() => {
    let filtered = exams

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(exam => 
        exam.tieuDe.toLowerCase().includes(searchLower) ||
        exam.monHoc.toLowerCase().includes(searchLower) ||
        (exam.moTa && exam.moTa.toLowerCase().includes(searchLower)) ||
        (exam.nguoiTao?.hoTen && exam.nguoiTao.hoTen.toLowerCase().includes(searchLower)) ||
        (exam.toChuc?.tenToChuc && exam.toChuc.tenToChuc.toLowerCase().includes(searchLower))
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(exam => exam.trangThai === statusFilter)
    }

    // Subject filter
    if (subjectFilter !== "all") {
      filtered = filtered.filter(exam => exam.monHoc === subjectFilter)
    }

    // Organization filter
    if (orgFilter !== "all") {
      filtered = filtered.filter(exam => exam.maToChuc === parseInt(orgFilter))
    }

    return filtered
  }, [exams, searchTerm, statusFilter, subjectFilter, orgFilter])

  // Get unique subjects
  const subjects = useMemo(() => 
    Array.from(new Set(exams.map(exam => exam.monHoc))).sort()
  , [exams])

  const handleStatusChange = async (examId: number, newStatus: 'nhap' | 'xuatBan' | 'dongDaChAm') => {
    updateExamMutation.mutate({
      examId: examId,
      data: { trangThai: newStatus }
    })
  }

  const handleDelete = async (examId: number) => {
    deleteExamMutation.mutate(examId)
    setDeleteExamId(null)
  }

  const getStatistics = () => {
    const total = exams.length
    const byStatus = exams.reduce((acc, exam) => {
      acc[exam.trangThai] = (acc[exam.trangThai] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      nhap: byStatus.nhap || 0,
      xuatBan: byStatus.xuatBan || 0,
      dongDaChAm: byStatus.dongDaChAm || 0,
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Chưa đặt"
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN')
  }

  const stats = getStatistics()

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="rounded-full bg-red-100 p-3 mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium">Lỗi tải dữ liệu</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Không thể tải danh sách bài kiểm tra. Vui lòng thử lại.
            </p>
            <Button onClick={() => window.location.reload()}>
              Thử lại
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Bài kiểm tra</h1>
          <p className="text-muted-foreground">
            Quản lý tất cả bài kiểm tra trong hệ thống
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/exams/create">
            <Plus className="h-4 w-4 mr-2" />
            Tạo bài kiểm tra
          </Link>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số bài kiểm tra</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nháp</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.nhap}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã xuất bản</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.xuatBan}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã hoàn thành</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.dongDaChAm}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Tìm kiếm</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Tìm theo tên, môn học..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="nhap">Nháp</SelectItem>
                  <SelectItem value="xuatBan">Đã xuất bản</SelectItem>
                  <SelectItem value="dongDaChAm">Đã hoàn thành</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Môn học</Label>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn môn học" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tổ chức</Label>
              <Select value={orgFilter} onValueChange={setOrgFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tổ chức" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exams List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Danh sách bài kiểm tra ({filteredExams.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Đang tải...</span>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Không có bài kiểm tra nào</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" || subjectFilter !== "all" || orgFilter !== "all"
                  ? "Không tìm thấy bài kiểm tra phù hợp với bộ lọc"
                  : "Chưa có bài kiểm tra nào được tạo"
                }
              </p>
              {!searchTerm && statusFilter === "all" && subjectFilter === "all" && orgFilter === "all" && (
                <Button asChild>
                  <Link href="/dashboard/admin/exams/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo bài kiểm tra đầu tiên
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExams.map((exam) => {
                const statusConfig = STATUS_CONFIG[exam.trangThai]
                const StatusIcon = statusConfig.icon

                return (
                  <Card key={exam.maBaiKiemTra} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">
                            {exam.tieuDe}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={statusConfig.variant} className="text-xs">
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            {exam.laDeTongHop && (
                              <Badge variant="outline" className="text-xs">
                                Đề tổng hợp
                              </Badge>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/admin/exams/${exam.maBaiKiemTra}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Xem chi tiết
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/admin/exams/${exam.maBaiKiemTra}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Chỉnh sửa
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/admin/exams/${exam.maBaiKiemTra}/statistics`}>
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Thống kê
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/admin/exams/${exam.maBaiKiemTra}/answers`}>
                                <Settings className="h-4 w-4 mr-2" />
                                Đáp án
                              </Link>
                            </DropdownMenuItem>
                            {exam.trangThai === 'nhap' && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(exam.maBaiKiemTra, 'xuatBan')}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Xuất bản
                              </DropdownMenuItem>
                            )}
                            {exam.trangThai === 'xuatBan' && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(exam.maBaiKiemTra, 'dongDaChAm')}
                              >
                                <Target className="h-4 w-4 mr-2" />
                                Đóng chấm điểm
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => setDeleteExamId(exam.maBaiKiemTra)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            {exam.monHoc}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {exam.tongSoCau} câu
                          </div>
                        </div>

                        {exam.ngayThi && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(exam.ngayThi)}
                          </div>
                        )}

                        {exam.thoiGianLamBai && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {exam.thoiGianLamBai} phút
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <GraduationCap className="h-4 w-4" />
                          {exam.toChuc?.tenToChuc || "Chưa xác định"}
                        </div>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          Tạo bởi: {exam.nguoiTao?.hoTen || "Chưa xác định"}
                        </div>

                        {exam.moTa && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {exam.moTa}
                          </p>
                        )}

                        <div className="text-xs text-muted-foreground">
                          Cập nhật: {formatDateTime(exam.thoiGianCapNhat)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteExamId} onOpenChange={() => setDeleteExamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bài kiểm tra này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteExamId && handleDelete(deleteExamId)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteExamMutation.isPending}
            >
              {deleteExamMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
