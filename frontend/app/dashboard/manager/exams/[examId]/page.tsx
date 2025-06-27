"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useExams } from "@/hooks/useExams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  Hash, 
  Target,
  FileText,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  Eye,
  CheckCircle,
  Send,
  Check
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const EXAM_STATUS_CONFIG = {
  nhap: { label: "Nháp", variant: "secondary" as const, color: "bg-gray-100 text-gray-800", icon: Edit },
  xuatBan: { label: "Đã xuất bản", variant: "default" as const, color: "bg-blue-100 text-blue-800", icon: Send },
  xuat_ban: { label: "Đã xuất bản", variant: "default" as const, color: "bg-blue-100 text-blue-800", icon: Send },
  dongDaChAm: { label: "Đã đóng & chấm", variant: "outline" as const, color: "bg-green-100 text-green-800", icon: Check },
  hoan_thanh: { label: "Hoàn thành", variant: "outline" as const, color: "bg-green-100 text-green-800", icon: Check }
} as const;

export default function ManagerExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const examId = parseInt(params.examId as string);

  const { data: exams = [], isLoading, error } = useExams();
  const exam = exams.find((e: any) => e.maBaiKiemTra === examId);
  
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleStatusChange = async (newStatus: 'xuatBan' | 'xuat_ban' | 'hoan_thanh') => {
    setIsActionLoading(true);
    try {
      // API call to update status
      toast({
        title: "Thành công",
        description: `Bài thi đã được chuyển sang trạng thái: ${EXAM_STATUS_CONFIG[newStatus]?.label}.`,
      });
    } catch (err) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái bài thi. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteExam = async () => {
    setIsActionLoading(true);
    try {
      // API call to delete exam
      toast({
        title: "Thành công",
        description: "Xóa bài kiểm tra thành công"
      });
      router.push("/dashboard/manager/exams");
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa bài kiểm tra. Có thể bài thi đã có kết quả.",
        variant: "destructive"
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = EXAM_STATUS_CONFIG[status as keyof typeof EXAM_STATUS_CONFIG] || EXAM_STATUS_CONFIG.nhap;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="mr-2 h-4 w-4" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Chưa đặt lịch";
    try {
      return new Date(dateString).toLocaleDateString("vi-VN", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      });
    } catch {
      return "Ngày không hợp lệ";
    }
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "Không xác định";
    try {
      return new Date(dateString).toLocaleString("vi-VN");
    } catch {
      return "Thời gian không hợp lệ";
    }
  };
  
  // Loading State
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-20" />
          <div className="flex-1">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Error State
  if (error || !exam) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Lỗi</h2>
          <p className="text-muted-foreground mb-4">
            {error?.message || "Không tìm thấy bài kiểm tra"}
          </p>
          <Link href="/dashboard/manager/exams">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại danh sách
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/manager/exams">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{exam.tieuDe}</h1>
            {getStatusBadge(exam.trangThai)}
          </div>
          <p className="text-muted-foreground">Chi tiết bài kiểm tra</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Thông tin cơ bản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Môn học
                  </div>
                  <Badge variant="outline" className="text-base">
                    {exam.monHoc}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    Ngày thi
                  </div>
                  <p className="font-medium">{formatDate(exam.ngayThi)}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" />
                    Thời gian làm bài
                  </div>
                  <p className="font-medium">{exam.thoiGianLamBai} phút</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Hash className="mr-2 h-4 w-4" />
                    Tổng số câu
                  </div>
                  <p className="font-medium">{exam.tongSoCau} câu</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Target className="mr-2 h-4 w-4" />
                    Tổng điểm
                  </div>
                  <p className="font-medium">{exam.tongDiem} điểm</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Settings className="mr-2 h-4 w-4" />
                    Loại đề
                  </div>
                  <Badge variant={exam.laDeTongHop ? "default" : "secondary"}>
                    {exam.laDeTongHop ? "Đề tổng hợp" : "Đề thường"}
                  </Badge>
                </div>
              </div>

              {exam.moTa && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Mô tả</div>
                  <p className="text-sm bg-muted p-3 rounded-md">{exam.moTa}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned Classes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Lớp học được gán
              </CardTitle>
              <CardDescription>
                Danh sách các lớp học được gán bài kiểm tra này
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <p>Chưa có lớp học nào được gán</p>
                <Button variant="outline" className="mt-4" size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  Gán lớp học
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin hệ thống</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Mã bài kiểm tra:</span>
                <span className="font-mono text-sm">{exam.maBaiKiemTra}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Người tạo:</span>
                <span className="text-sm">ID: {exam.maNguoiTao}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Thời gian tạo:</span>
                <span className="text-sm">{formatDateTime(exam.thoiGianTao)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cập nhật lần cuối:</span>
                <span className="text-sm">{formatDateTime(exam.thoiGianCapNhat)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Hành động</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(['nhap', 'draft'].includes(exam.trangThai)) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      <Send className="mr-2 h-4 w-4" /> 
                      Xuất bản bài thi
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xác nhận xuất bản?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Sau khi xuất bản, bạn có thể gán bài thi cho các lớp học. Bạn vẫn có thể chỉnh sửa thông tin và đáp án.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleStatusChange('xuatBan')} 
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? "Đang xử lý..." : "Xuất bản"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <Link href={`/dashboard/manager/exams/${examId}/edit`} className="w-full block">
                <Button variant="outline" className="w-full">
                  <Edit className="mr-2 h-4 w-4" /> 
                  Chỉnh sửa
                </Button>
              </Link>

              <Link href={`/dashboard/manager/exams/${examId}/answers`} className="w-full block">
                <Button variant="outline" className="w-full">
                  <CheckCircle className="mr-2 h-4 w-4" /> 
                  Quản lý đáp án
                </Button>
              </Link>

              <Link href={`/dashboard/manager/exams/${examId}/assign`} className="w-full block">
                <Button variant="outline" className="w-full" disabled={exam.trangThai === 'nhap'}>
                  <Users className="mr-2 h-4 w-4" /> 
                  Gán cho lớp học
                </Button>
              </Link>

              <Link href={`/dashboard/manager/exams/${examId}/results`} className="w-full block">
                <Button variant="outline" className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" /> 
                  Xem kết quả
                </Button>
              </Link>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> 
                    Xóa bài kiểm tra
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc muốn xóa bài thi "{exam.tieuDe}"? Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteExam} 
                      className="bg-red-600 hover:bg-red-700" 
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? "Đang xóa..." : "Xóa"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Status Management */}
          {!(['hoan_thanh', 'dongDaChAm'].includes(exam.trangThai)) && (
            <Card>
              <CardHeader>
                <CardTitle>Quản lý trạng thái</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(['xuatBan', 'xuat_ban'].includes(exam.trangThai)) && (
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => handleStatusChange('nhap' as any)}
                      disabled={isActionLoading}
                    >
                      Chuyển về nháp
                    </Button>
                    <Button 
                      className="w-full" 
                      variant="default"
                      onClick={() => handleStatusChange('hoan_thanh')}
                      disabled={isActionLoading}
                    >
                      Đánh dấu hoàn thành
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 