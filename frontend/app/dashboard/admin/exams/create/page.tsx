"use client";

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useCreateExam } from "@/hooks/useExams"
import { useOrganizations } from "@/hooks/useOrganizations"
import { useAnswerTemplates } from "@/hooks/useAnswerTemplates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { ArrowLeft, Save, Loader2, FileText, Calendar, Clock, Target } from "lucide-react"
import type { ExamCreate } from "@/lib/api/exams"

const examSchema = z.object({
  tieuDe: z.string().min(1, "Tiêu đề là bắt buộc").max(255, "Tiêu đề không được quá 255 ký tự"),
  monHoc: z.string().min(1, "Môn học là bắt buộc").max(100, "Môn học không được quá 100 ký tự"),
  moTa: z.string().optional(),
  maToChuc: z.number().min(1, "Vui lòng chọn tổ chức"),
  maMauPhieu: z.number().optional(),
  ngayThi: z.string().optional(),
  thoiGianLamBai: z.number().min(1, "Thời gian làm bài phải lớn hơn 0").optional(),
  tongSoCau: z.number().min(1, "Số câu hỏi phải lớn hơn 0"),
  tongDiem: z.number().min(0.1, "Tổng điểm phải lớn hơn 0").max(100, "Tổng điểm không được quá 100"),
  laDeTongHop: z.boolean().default(false),
  trangThai: z.enum(['nhap', 'xuatBan', 'dongDaChAm']).default('nhap'),
})

type ExamFormData = z.infer<typeof examSchema>

const SUBJECTS = [
  "Toán học",
  "Ngữ văn", 
  "Tiếng Anh",
  "Vật lý",
  "Hóa học",
  "Sinh học",
  "Lịch sử",
  "Địa lý",
  "Giáo dục công dân",
  "Tin học",
  "Thể dục",
  "Âm nhạc",
  "Mỹ thuật"
]

export default function CreateExamPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Fetch data
  const { data: organizations = [], isLoading: isLoadingOrgs } = useOrganizations()
  const { data: templates = [] } = useAnswerTemplates()
  const createExamMutation = useCreateExam()

  const form = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      tieuDe: "",
      monHoc: "",
      moTa: "",
      maToChuc: undefined,
      maMauPhieu: undefined,
      ngayThi: "",
      thoiGianLamBai: 60,
      tongSoCau: 50,
      tongDiem: 10,
      laDeTongHop: false,
      trangThai: 'nhap',
    },
  })

  const onSubmit = async (data: ExamFormData) => {
    setIsSubmitting(true)
    try {
      const examData: ExamCreate = {
        ...data,
        ngayThi: data.ngayThi || undefined,
        thoiGianLamBai: data.thoiGianLamBai || undefined,
      }

      const result = await createExamMutation.mutateAsync(examData)
      router.push(`/dashboard/admin/exams/${result.maBaiKiemTra}`)
    } catch (error) {
      console.error("Error creating exam:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/admin/exams">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Tạo bài kiểm tra mới</h1>
          <p className="text-muted-foreground">
            Tạo bài kiểm tra mới cho hệ thống
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <FormField
                  control={form.control}
                  name="tieuDe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tiêu đề bài kiểm tra <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ví dụ: Kiểm tra Toán học kỳ 1"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monHoc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Môn học <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn môn học" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SUBJECTS.map(subject => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="maToChuc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tổ chức <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                      disabled={isLoadingOrgs}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn tổ chức" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {organizations.map(org => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            {org.name}
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
                name="maMauPhieu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mẫu phiếu trả lời</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn mẫu phiếu (không bắt buộc)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Không sử dụng mẫu phiếu</SelectItem>
                        {templates.map(template => (
                          <SelectItem key={template.maMauPhieu} value={template.maMauPhieu.toString()}>
                            {template.tenMauPhieu} ({template.soCauHoi} câu - {template.khoGiay})
                            {template.urlFileMau && " 📄"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Chọn mẫu phiếu trả lời có sẵn hoặc để trống để tạo sau
                    </FormDescription>
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
                        placeholder="Mô tả chi tiết về bài kiểm tra..."
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Mô tả chi tiết về nội dung, yêu cầu của bài kiểm tra
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="ngayThi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Ngày thi
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Để trống nếu chưa xác định
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thoiGianLamBai"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Thời gian làm bài (phút)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="1"
                          placeholder="60"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tongSoCau"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Số câu hỏi <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="1"
                          placeholder="50"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tongDiem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tổng điểm <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                          placeholder="10"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                    <FormItem>
                      <FormLabel>Trạng thái</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn trạng thái" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="nhap">Nháp</SelectItem>
                          <SelectItem value="xuatBan">Xuất bản</SelectItem>
                          <SelectItem value="dongDaChAm">Đóng đã chấm</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Nháp: Chưa công bố, Xuất bản: Có thể làm bài, Đóng đã chấm: Hoàn thành
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="laDeTongHop"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Đề tổng hợp
                      </FormLabel>
                      <FormDescription>
                        Bài kiểm tra bao gồm nhiều chủ đề hoặc môn học
                      </FormDescription>
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
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/dashboard/admin/exams">
                Hủy
              </Link>
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || createExamMutation.isPending}
            >
              {isSubmitting || createExamMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Tạo bài kiểm tra
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
