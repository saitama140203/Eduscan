'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { useCreateClass } from '@/hooks/useManagerClasses';

// Form validation schema
const createClassSchema = z.object({
  tenLop: z.string().min(1, 'Tên lớp không được để trống').max(50, 'Tên lớp không được quá 50 ký tự'),
  capHoc: z.string().optional(),
  namHoc: z.string().optional(),
  moTa: z.string().max(500, 'Mô tả không được quá 500 ký tự').optional(),
});

type CreateClassFormData = z.infer<typeof createClassSchema>;

export default function CreateClassPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // React Query hooks
  const createClassMutation = useCreateClass();

  // Form setup
  const form = useForm<CreateClassFormData>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      tenLop: '',
      capHoc: '',
      namHoc: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      moTa: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: CreateClassFormData) => {
    setIsSubmitting(true);
    try {
      await createClassMutation.mutateAsync(data);
      router.push('/dashboard/manager/classes');
    } catch (error) {
      console.error('Error creating class:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current year options
  const getCurrentYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return [
      `${currentYear}-${currentYear + 1}`,
      `${currentYear - 1}-${currentYear}`,
      `${currentYear + 1}-${currentYear + 2}`,
    ];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tạo lớp học mới</h1>
          <p className="text-muted-foreground">
            Tạo lớp học mới trong tổ chức của bạn
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin lớp học</CardTitle>
              <CardDescription>
                Nhập thông tin cơ bản cho lớp học mới
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Class Name */}
                  <FormField
                    control={form.control}
                    name="tenLop"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên lớp *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ví dụ: 10A1, 11B2, 12C3..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Tên lớp học (bắt buộc)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Grade Level */}
                  <FormField
                    control={form.control}
                    name="capHoc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cấp học</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn cấp học" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="THPT">THPT (Lớp 10-12)</SelectItem>
                            <SelectItem value="THCS">THCS (Lớp 6-9)</SelectItem>
                            <SelectItem value="TIEU_HOC">Tiểu học (Lớp 1-5)</SelectItem>
                            <SelectItem value="TRUONG_DAI_HOC">Đại học</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Cấp học của lớp
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Academic Year */}
                  <FormField
                    control={form.control}
                    name="namHoc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Năm học</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn năm học" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getCurrentYearOptions().map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Năm học của lớp
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="moTa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Mô tả thêm về lớp học..."
                            className="min-h-20"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Mô tả chi tiết về lớp học (không bắt buộc)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || createClassMutation.isPending}
                      className="flex-1"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSubmitting || createClassMutation.isPending ? 'Đang tạo...' : 'Tạo lớp học'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => router.back()}
                      disabled={isSubmitting || createClassMutation.isPending}
                    >
                      Hủy
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">💡 Mẹo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>Tên lớp:</strong> Nên đặt theo quy ước của trường (VD: 10A1, 11B2)
              </div>
              <div>
                <strong>Giáo viên chủ nhiệm:</strong> Có thể phân công sau khi tạo lớp
              </div>
              <div>
                <strong>Năm học:</strong> Mặc định là năm học hiện tại
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">⚡ Thao tác nhanh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => router.push('/dashboard/manager/classes')}
              >
                📋 Quản lý lớp học
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => router.push('/dashboard/manager/teachers')}
              >
                👨‍🏫 Quản lý giáo viên
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => router.push('/dashboard/manager/students')}
              >
                👥 Quản lý học sinh
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 