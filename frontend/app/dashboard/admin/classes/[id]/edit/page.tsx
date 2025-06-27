"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useClass, useUpdateClass } from "@/hooks/useClasses";
import { useTeachers } from "@/hooks/useUsers";
import { useOrganizations } from "@/hooks/useOrganizations";
import { ClassUpdate } from "@/lib/api/classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Edit, Save, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User } from "@/lib/api/users";

const formSchema = z.object({
  tenLop: z.string().min(1, "Tên lớp học là bắt buộc"),
  capHoc: z.string().optional(),
  namHoc: z.string().optional(),
  maGiaoVienChuNhiem: z.number().optional(),
  moTa: z.string().optional(),
  trangThai: z.boolean().optional(),
});

export default function AdminEditClassPage() {
  const router = useRouter();
  const params = useParams();
  const classId = Number(params.id);

  const { data: classData, isLoading: classLoading } = useClass(classId);
  const { data: teachers = [], isLoading: teachersLoading } = useTeachers(undefined, 0, 100);
  const updateClassMutation = useUpdateClass();

  const form = useForm<ClassUpdate>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenLop: "",
      capHoc: "",
      namHoc: "",
      maGiaoVienChuNhiem: undefined,
      moTa: "",
      trangThai: true,
    },
  });

  useEffect(() => {
    if (classData) {
      form.reset({
        tenLop: classData.tenLop,
        capHoc: classData.capHoc || "",
        namHoc: classData.namHoc || "",
        maGiaoVienChuNhiem: classData.maGiaoVienChuNhiem,
        moTa: classData.moTa || "",
        trangThai: classData.trangThai,
      });
    }
  }, [classData, form]);

  const onSubmit = async (values: ClassUpdate) => {
    try {
      await updateClassMutation.mutateAsync({ classId, data: values });
      router.push(`/dashboard/admin/classes/${classId}`);
    } catch (error) {
      console.error("Failed to update class:", error);
    }
  };

  if (classLoading || teachersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy lớp học</h3>
        <p className="text-gray-500">Lớp học không tồn tại hoặc đã bị xóa.</p>
        <Button className="mt-4" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Edit className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Chỉnh sửa lớp học
            </h1>
            <p className="text-gray-600">
              Cập nhật thông tin lớp {classData.tenLop}
            </p>
          </div>
        </div>
      </div>

      {/* Class Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-600 font-medium">Tổ chức:</span>
              <span className="ml-2 text-blue-900">{classData.tenToChuc}</span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Học sinh:</span>
              <span className="ml-2 text-blue-900">{classData.total_students || 0}</span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Trạng thái:</span>
              <span className={`ml-2 ${classData.trangThai ? 'text-green-600' : 'text-red-600'}`}>
                {classData.trangThai ? 'Hoạt động' : 'Không hoạt động'}
              </span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Cấp học:</span>
              <span className="ml-2 text-blue-900">{classData.capHoc || 'N/A'}</span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Giáo viên chủ nhiệm:</span>
              <span className="ml-2 text-blue-900">
                {teachers.find((t: User) => t.maNguoiDung === classData.maGiaoVienChuNhiem)?.hoTen || 'Chưa phân công'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin lớp học</CardTitle>
          <CardDescription>
            Cập nhật thông tin chi tiết của lớp học
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="tenLop"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên lớp học *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên lớp học" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="capHoc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cấp học</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn cấp học" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="THPT">THPT</SelectItem>
                          <SelectItem value="THCS">THCS</SelectItem>
                          <SelectItem value="TIEU_HOC">Tiểu học</SelectItem>
                          <SelectItem value="TRUONG_DAI_HOC">Đại học</SelectItem>
                        </SelectContent>
                      </Select>
                      {classData.capHoc && !["THPT", "THCS", "TIEU_HOC", "TRUONG_DAI_HOC"].includes(classData.capHoc) && (
                        <p className="text-sm text-red-500 mt-1">
                          Lưu ý: Cấp học hiện tại "{classData.capHoc}" không nằm trong các lựa chọn hợp lệ. Vui lòng chọn lại.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="namHoc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Năm học</FormLabel>
                      <FormControl>
                        <Input placeholder="2024-2025" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="maGiaoVienChuNhiem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Users className="w-4 h-4 inline mr-2" />
                      Giáo viên chủ nhiệm
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                      value={field.value ? String(field.value) : "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn giáo viên chủ nhiệm" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Chưa chọn</SelectItem>
                        {teachers.map((teacher: User) => (
                          <SelectItem key={teacher.maNguoiDung} value={String(teacher.maNguoiDung)}>
                            {teacher.hoTen} ({teacher.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="moTa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Nhập mô tả về lớp học..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trangThai"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Trạng thái hoạt động
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Lớp học có đang hoạt động không
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={updateClassMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateClassMutation.isPending ? "Đang cập nhật..." : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 