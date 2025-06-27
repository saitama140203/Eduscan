/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreateClass } from "@/hooks/useClasses";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useTeachers } from "@/hooks/useUsers";
import { ClassCreate } from "@/lib/api/classes";
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
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, BookOpen, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  tenLop: z.string().min(1, "Tên lớp học là bắt buộc"),
  maToChuc: z.number().min(1, "Tổ chức là bắt buộc"),
  capHoc: z.string().optional(),
  namHoc: z.string().optional(),
  maGiaoVienChuNhiem: z.number().optional(),
  moTa: z.string().optional(),
});

export default function AdminCreateClassPage() {
  const router = useRouter();
  const createClassMutation = useCreateClass();
  
  const { data: organizations = [], isLoading: orgLoading, error: orgError } = useOrganizations();
  const { data: teachers = [], isLoading: teachersLoading, error: teachersError } = useTeachers(undefined, 0, 100);

  // Debug logging
  console.log('Organizations:', { organizations, isLoading: orgLoading, error: orgError });
  console.log('Teachers:', { teachers, isLoading: teachersLoading, error: teachersError });

  const form = useForm<ClassCreate>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenLop: "",
      maToChuc: 0,
      capHoc: "",
      namHoc: new Date().getFullYear().toString(),
      maGiaoVienChuNhiem: undefined,
      moTa: "",
    },
  });

  // Watch maToChuc để filter giáo viên theo tổ chức
  const selectedOrgId = form.watch("maToChuc");

  // Filter giáo viên theo tổ chức đã chọn
  const filteredTeachers = useMemo(() => {
    if (!selectedOrgId || selectedOrgId === 0) return [];
    return (teachers || []).filter((teacher: any) => teacher.maToChuc === selectedOrgId);
  }, [teachers, selectedOrgId]);

  // Reset giáo viên khi đổi tổ chức
  useEffect(() => {
    if (selectedOrgId && selectedOrgId !== 0) {
      form.setValue("maGiaoVienChuNhiem", undefined);
    }
  }, [selectedOrgId, form]);

  const onSubmit = async (values: ClassCreate) => {
    try {
      await createClassMutation.mutateAsync(values);
      router.push("/dashboard/admin/classes");
    } catch (error) {
      console.error("Failed to create class:", error);
    }
  };

  if (orgLoading || teachersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
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
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Tạo lớp học mới
            </h1>
            <p className="text-gray-600">
              Thêm lớp học mới vào hệ thống
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin lớp học</CardTitle>
          <CardDescription>
            Điền đầy đủ thông tin để tạo lớp học mới
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <FormField
                  control={form.control}
                  name="maToChuc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tổ chức *</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? String(field.value) : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn tổ chức" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {organizations?.filter(org => org?.id).map((org) => (
                            <SelectItem key={`org-${org.id}`} value={String(org.id)}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="capHoc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cấp học</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                render={({ field }) => {
                  const hasSelectedOrg = selectedOrgId && selectedOrgId !== 0;
                  return (
                    <FormItem>
                      <FormLabel>Giáo viên chủ nhiệm</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                        value={field.value ? String(field.value) : "none"}
                        disabled={!hasSelectedOrg}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !hasSelectedOrg 
                                ? "Vui lòng chọn tổ chức trước" 
                                : "Chọn giáo viên chủ nhiệm"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Chưa chọn</SelectItem>
                          {filteredTeachers.map((teacher: any) => (
                            <SelectItem key={teacher.maNguoiDung} value={String(teacher.maNguoiDung)}>
                              {teacher.hoTen} ({teacher.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {!hasSelectedOrg && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Chọn tổ chức trước để hiển thị danh sách giáo viên
                        </p>
                      )}
                      {hasSelectedOrg && filteredTeachers.length === 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Không có giáo viên nào trong tổ chức này
                        </p>
                      )}
                    </FormItem>
                  )
                }}
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
                  disabled={createClassMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {createClassMutation.isPending ? "Đang tạo..." : "Tạo lớp học"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 