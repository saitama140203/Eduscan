"use client";

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useExam, useDeleteExam, useUpdateExam, useExamAssignedClasses } from "@/hooks/useExams"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
  ArrowLeft,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
  Clock,
  FileText,
  Target,
  Users,
  BarChart3,
  Settings,
  BookOpen,
  GraduationCap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Eye
} from "lucide-react"

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

export default function ExamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const examId = parseInt(params.examId as string)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Fetch data
  const { data: exam, isLoading, error } = useExam(examId)
  const { data: assignedClasses = [] } = useExamAssignedClasses(examId)
  const deleteExamMutation = useDeleteExam()
  const updateExamMutation = useUpdateExam()

  const handleStatusChange = async (newStatus: 'nhap' | 'xuatBan' | 'dongDaChAm') => {
    updateExamMutation.mutate({
      examId: examId,
      data: { trangThai: newStatus }
    })
  }

  const handleDelete = async () => {
    deleteExamMutation.mutate(examId, {
      onSuccess: () => {
        router.push('/dashboard/admin/exams')
      }
    })
    setShowDeleteDialog(false)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Chưa đặt"
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Đang tải...</span>
        </div>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="container mx-auto py-6">
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="rounded-full bg-red-100 p-3 mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium">Không tìm thấy bài kiểm tra</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Bài kiểm tra không tồn tại hoặc đã bị xóa.
            </p>
            <Button asChild>
              <Link href="/dashboard/admin/exams">
                Quay lại danh sách
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[exam.trangThai]
  const StatusIcon = statusConfig.icon

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/admin/exams">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{exam.tieuDe}</h1>
            <p className="text-muted-foreground">
              Chi tiết bài kiểm tra
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={statusConfig.variant} className="text-sm">
            <StatusIcon className="h-4 w-4 mr-1" />
            {statusConfig.label}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/admin/exams/${examId}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/admin/exams/${examId}/statistics`}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Thống kê
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/admin/exams/${examId}/answers`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Đáp án
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/admin/exams/${examId}/results`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Kết quả
                </Link>
              </DropdownMenuItem>
              {exam.trangThai === 'nhap' && (
                <DropdownMenuItem 
                  onClick={() => handleStatusChange('xuatBan')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Xuất bản
                </DropdownMenuItem>
              )}
              {exam.trangThai === 'xuatBan' && (
                <DropdownMenuItem 
                  onClick={() => handleStatusChange('dongDaChAm')}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Đóng chấm điểm
                </DropdownMenuItem>
              )}
              <Separator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Thông tin cơ bản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tiêu đề</Label>
                  <p className="text-lg font-medium">{exam.tieuDe}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Môn học</Label>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>{exam.monHoc}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Tổ chức</Label>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span>{exam.toChuc?.tenToChuc || "Chưa xác định"}</span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Người tạo</Label>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{exam.nguoiTao?.hoTen || "Chưa xác định"}</span>
                </div>
              </div>

              {exam.moTa && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Mô tả</Label>
                  <p className="text-sm">{exam.moTa}</p>
                </div>
              )}

              <div className="flex items-center gap-4">
                {exam.laDeTongHop && (
                  <Badge variant="outline">Đề tổng hợp</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Exam Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Cài đặt bài kiểm tra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm text-muted-foreground">Ngày thi</p>
                  <p className="font-medium">{formatDate(exam.ngayThi)}</p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-muted-foreground">Thời gian</p>
                  <p className="font-medium">
                    {exam.thoiGianLamBai ? `${exam.thoiGianLamBai} phút` : "Không giới hạn"}
                  </p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <p className="text-sm text-muted-foreground">Số câu hỏi</p>
                  <p className="font-medium">{exam.tongSoCau}</p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <Target className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <p className="text-sm text-muted-foreground">Tổng điểm</p>
                  <p className="font-medium">{exam.tongDiem}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Classes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lớp học được gán ({assignedClasses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignedClasses.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Chưa gán lớp học nào</h3>
                  <p className="text-muted-foreground mb-4">
                    Bài kiểm tra chưa được gán cho lớp học nào
                  </p>
                  <Button asChild>
                    <Link href={`/dashboard/admin/exams/${examId}/assign-classes`}>
                      Gán lớp học
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignedClasses.map((classItem: any) => (
                    <div key={classItem.id} className="border rounded-lg p-4">
                      <h4 className="font-medium">{classItem.tenLop}</h4>
                      <p className="text-sm text-muted-foreground">
                        {classItem.capHoc} - {classItem.namHoc}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        GVCN: {classItem.giaoVienChuNhiem?.hoTen || "Chưa có"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Thao tác nhanh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full justify-start">
                <Link href={`/dashboard/admin/exams/${examId}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/dashboard/admin/exams/${examId}/answers`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Quản lý đáp án
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/dashboard/admin/exams/${examId}/statistics`}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Xem thống kê
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/dashboard/admin/exams/${examId}/results`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Xem kết quả
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin hệ thống</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Mã bài kiểm tra</Label>
                <p className="text-sm font-mono">{exam.maBaiKiemTra}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Thời gian tạo</Label>
                <p className="text-sm">{formatDateTime(exam.thoiGianTao)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Cập nhật lần cuối</Label>
                <p className="text-sm">{formatDateTime(exam.thoiGianCapNhat)}</p>
              </div>
              {exam.mauPhieu && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Mẫu phiếu</Label>
                  <p className="text-sm">{exam.mauPhieu.tenMauPhieu}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bài kiểm tra "{exam.tieuDe}"? 
              Hành động này không thể hoàn tác và sẽ xóa tất cả dữ liệu liên quan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

function Label({ className, children, ...props }: any) {
  return (
    <label className={`text-sm font-medium ${className || ''}`} {...props}>
      {children}
    </label>
  )
} 