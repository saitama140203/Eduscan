"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useClass, useDeleteClass } from "@/hooks/useClasses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, BookOpen, Users, Calendar, Settings, BarChart3,
  Edit, Trash2, MoreVertical, AlertTriangle, CheckCircle2,
  Building, User, Clock, Eye, Plus
} from "lucide-react";

export default function AdminClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const classId = Number(params.id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: classData, isLoading } = useClass(classId);
  const deleteClassMutation = useDeleteClass();

  const handleDelete = async () => {
    try {
      await deleteClassMutation.mutateAsync(classId);
      router.push("/dashboard/admin/classes");
    } catch (error) {
      console.error("Failed to delete class:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Đang tải thông tin lớp học...</p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy lớp học</h3>
        <p className="text-gray-500">Lớp học không tồn tại hoặc đã bị xóa.</p>
        <Button className="mt-4" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/admin/classes")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{classData.tenLop}</h1>
              <p className="text-gray-600">{classData.tenToChuc}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/admin/classes/${classId}/edit`)}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Chỉnh sửa
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`/dashboard/admin/classes/${classId}/analytics`)}
                className="flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Phân tích
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/dashboard/admin/classes/${classId}/settings`)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Cài đặt
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Xóa lớp học
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status & Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Trạng thái</p>
                <div className="flex items-center gap-2 mt-1">
                  {classData.trangThai ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-medium">Hoạt động</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-red-600 font-medium">Không hoạt động</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Số học sinh</p>
                <p className="text-2xl font-bold text-blue-600">{classData.total_students || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ngày tạo</p>
                <p className="text-sm text-gray-900">
                  {new Date(classData.thoiGianTao).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Thao tác nhanh</CardTitle>
          <CardDescription>
            Các tính năng quản lý lớp học
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center gap-2"
              onClick={() => router.push(`/dashboard/admin/classes/${classId}/analytics`)}
            >
              <BarChart3 className="w-6 h-6 text-orange-600" />
              <span>Phân tích</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center gap-2"
              onClick={() => router.push(`/dashboard/admin/classes/${classId}/settings`)}
            >
              <Settings className="w-6 h-6 text-gray-600" />
              <span>Cài đặt</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center gap-2"
              onClick={() => router.push(`/dashboard/admin/classes/${classId}/students`)}
            >
              <Users className="w-6 h-6 text-blue-600" />
              <span>Học sinh</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center gap-2"
              onClick={() => router.push(`/dashboard/admin/classes/${classId}/edit`)}
            >
              <Edit className="w-6 h-6 text-green-600" />
              <span>Chỉnh sửa</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Class Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin chi tiết</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Tên lớp</p>
                <p className="font-medium">{classData.tenLop}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cấp học</p>
                <p className="font-medium">{classData.capHoc || "Chưa xác định"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Năm học</p>
                <p className="font-medium">{classData.namHoc || "Chưa xác định"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Giáo viên chủ nhiệm</p>
                <p className="font-medium">{classData.tenGiaoVienChuNhiem || "Chưa phân công"}</p>
              </div>
            </div>

            {classData.moTa && (
              <div>
                <p className="text-sm text-gray-600">Mô tả</p>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {classData.moTa}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin tổ chức</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-md">
              <Building className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">{classData.tenToChuc}</p>
                <p className="text-sm text-blue-600">Tổ chức quản lý</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">Thời gian</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>Tạo: {new Date(classData.thoiGianTao).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>Cập nhật: {new Date(classData.thoiGianCapNhat).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Xác nhận xóa lớp học
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa lớp học "{classData.tenLop}"? 
              Hành động này không thể hoàn tác và sẽ xóa tất cả dữ liệu liên quan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteClassMutation.isPending}
            >
              {deleteClassMutation.isPending ? "Đang xóa..." : "Xóa lớp học"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 