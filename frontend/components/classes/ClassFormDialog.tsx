'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Class, ClassCreate, ClassUpdate } from '@/lib/api/classes';

const formSchema = z.object({
  tenLop: z.string().min(2, 'Tên lớp phải có ít nhất 2 ký tự').max(100),
  maToChuc: z.number().positive('Vui lòng chọn tổ chức'),
  capHoc: z.string().optional(),
  nienKhoa: z.string().optional(),
  giaoVienChuNhiemId: z.number().nullable().optional(),
  moTa: z.string().optional(),
  trangThai: z.boolean().optional(),
});

interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classItem?: Class | null;
  onSubmit: (data: ClassCreate | ClassUpdate) => void;
  organizations?: { maToChuc: number; tenToChuc: string }[];
  teachers?: { maNguoiDung: number; hoTen: string }[];
}

export function ClassFormDialog({
  open,
  onOpenChange,
  classItem,
  onSubmit,
  organizations = [],
  teachers = [],
}: ClassFormDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenLop: '',
      maToChuc: 0,
      capHoc: '',
      nienKhoa: '',
      giaoVienChuNhiemId: null,
      moTa: '',
      trangThai: true,
    },
  });

  useEffect(() => {
    if (classItem) {
      form.reset({
        tenLop: classItem.tenLop,
        maToChuc: classItem.maToChuc,
        capHoc: classItem.capHoc || '',
        nienKhoa: classItem.nienKhoa || '',
        giaoVienChuNhiemId: classItem.giaoVienChuNhiemId ?? null,
        moTa: '', // Nếu cần map classItem.moTa thì sửa lại ở đây
        trangThai: classItem.trangThai,
      });
    } else {
      form.reset({
        tenLop: '',
        maToChuc: 0,
        capHoc: '',
        nienKhoa: '',
        giaoVienChuNhiemId: null,
        moTa: '',
        trangThai: true,
      });
    }
  }, [classItem, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    if (classItem) {
      const updateData: ClassUpdate = {};
      if (values.tenLop !== classItem.tenLop) updateData.tenLop = values.tenLop;
      if (values.capHoc !== classItem.capHoc) updateData.capHoc = values.capHoc;
      // Sửa lỗi: sử dụng namHoc thay vì nienKhoa cho ClassUpdate
      if (values.nienKhoa !== classItem.nienKhoa) updateData.namHoc = values.nienKhoa;
      if (values.giaoVienChuNhiemId !== classItem.giaoVienChuNhiemId) {
        updateData.maGiaoVienChuNhiem = values.giaoVienChuNhiemId || undefined;
      }
      if (values.moTa !== '') updateData.moTa = values.moTa;
      if (values.trangThai !== classItem.trangThai) updateData.trangThai = values.trangThai;

      if (Object.keys(updateData).length > 0) {
        onSubmit(updateData);
      }
    } else {
      const createData: ClassCreate = {
        tenLop: values.tenLop,
        maToChuc: values.maToChuc,
        capHoc: values.capHoc || undefined,
        namHoc: values.nienKhoa || undefined,
        maGiaoVienChuNhiem: values.giaoVienChuNhiemId || undefined,
        moTa: values.moTa || undefined,
      };
      onSubmit(createData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {classItem ? 'Chỉnh sửa lớp học' : 'Tạo lớp học mới'}
          </DialogTitle>
          <DialogDescription>
            {classItem
              ? 'Cập nhật thông tin lớp học'
              : 'Điền thông tin để tạo lớp học mới'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tenLop"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên lớp</FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: 10A1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!classItem && (
              <FormField
                control={form.control}
                name="maToChuc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tổ chức</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn tổ chức" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem
                            key={org.maToChuc}
                            value={org.maToChuc.toString()}
                          >
                            {org.tenToChuc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="Tiểu học">Tiểu học</SelectItem>
                        <SelectItem value="THCS">THCS</SelectItem>
                        <SelectItem value="THPT">THPT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nienKhoa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niên khóa</FormLabel>
                    <FormControl>
                      <Input placeholder="2023-2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="giaoVienChuNhiemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giáo viên chủ nhiệm</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === 'none' ? null : Number(value))
                    }
                    value={field.value ? field.value.toString() : 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn giáo viên" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Chưa phân công</SelectItem>
                      {teachers.map((teacher) => (
                        <SelectItem
                          key={teacher.maNguoiDung}
                          value={teacher.maNguoiDung.toString()}
                        >
                          {teacher.hoTen}
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
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {classItem && (
              <FormField
                control={form.control}
                name="trangThai"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Trạng thái hoạt động</FormLabel>
                      <FormDescription>
                        Lớp học đang hoạt động hay đã ngừng hoạt động
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit">
                {classItem ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}