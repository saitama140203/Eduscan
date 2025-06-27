"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Calendar, Clock, Hash, Target, FileText, BookOpen } from "lucide-react"
import Link from "next/link"
import { useExam, useUpdateExam } from "@/hooks/useExams"
import { ExamUpdate } from "@/lib/api/exams"

const SUBJECTS = [
  "Toán", "Ngữ văn", "Tiếng Anh", "Vật lý", "Hóa học", "Sinh học", 
  "Lịch sử", "Địa lý", "GDCD", "Tin học", "Thể dục", "Âm nhạc", "Mỹ thuật"
]

export default function EditExamPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const examId = parseInt(params.examId as string)

  const { data: exam, isLoading, error } = useExam(examId)
  const updateExamMutation = useUpdateExam()

  const [formData, setFormData] = useState<ExamUpdate>({
    tieuDe: "",
    monHoc: "",
    ngayThi: "",
    thoiGianLamBai: 60,
    tongSoCau: 40,
    tongDiem: 10,
    moTa: "",
    laDeTongHop: false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load exam data into form when available
  useEffect(() => {
    if (exam) {
      setFormData({
        tieuDe: exam.tieuDe,
        monHoc: exam.monHoc,
        ngayThi: exam.ngayThi || "",
        thoiGianLamBai: exam.thoiGianLamBai,
        tongSoCau: exam.tongSoCau,
        tongDiem: exam.tongDiem,
        moTa: exam.moTa || "",
        laDeTongHop: exam.laDeTongHop
      })
    }
  }, [exam])

  const handleInputChange = (field: keyof ExamUpdate, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.tieuDe?.trim()) {
      newErrors.tieuDe = "Tiêu đề là bắt buộc"
    }

    if (!formData.monHoc) {
      newErrors.monHoc = "Môn học là bắt buộc"
    }

    if ((formData.thoiGianLamBai || 0) <= 0) {
      newErrors.thoiGianLamBai = "Thời gian làm bài phải lớn hơn 0"
    }

    if ((formData.tongSoCau || 0) <= 0) {
      newErrors.tongSoCau = "Tổng số câu phải lớn hơn 0"
    }

    if ((formData.tongDiem || 0) <= 0) {
      newErrors.tongDiem = "Tổng điểm phải lớn hơn 0"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng kiểm tra lại thông tin",
        variant: "destructive"
      })
      return
    }

    try {
      await updateExamMutation.mutateAsync({ examId, data: formData })
      toast({
        title: "Thành công",
        description: "Cập nhật bài kiểm tra thành công"
      })
      router.push(`/dashboard/teacher/exams/${examId}`)
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật bài kiểm tra",
        variant: "destructive"
      })
    }
  }

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

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Không tìm thấy bài kiểm tra</p>
              <p className="text-muted-foreground mb-4">Bài kiểm tra có thể đã bị xóa hoặc bạn không có quyền truy cập</p>
              <Link href="/dashboard/teacher/exams">
                <Button>Quay lại danh sách</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/teacher/exams/${examId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Chỉnh sửa bài kiểm tra</h1>
          <p className="text-muted-foreground">Cập nhật thông tin bài kiểm tra "{exam.tieuDe}"</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Thông tin cơ bản
            </CardTitle>
            <CardDescription>
              Cập nhật thông tin cơ bản về bài kiểm tra
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tieuDe" className="flex items-center">
                  Tiêu đề <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="tieuDe"
                  value={formData.tieuDe}
                  onChange={(e) => handleInputChange("tieuDe", e.target.value)}
                  placeholder="Nhập tiêu đề bài kiểm tra"
                  className={errors.tieuDe ? "border-red-500" : ""}
                />
                {errors.tieuDe && (
                  <p className="text-sm text-red-500">{errors.tieuDe}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="monHoc" className="flex items-center">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Môn học <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select value={formData.monHoc} onValueChange={(value) => handleInputChange("monHoc", value)}>
                  <SelectTrigger className={errors.monHoc ? "border-red-500" : ""}>
                    <SelectValue placeholder="Chọn môn học" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.monHoc && (
                  <p className="text-sm text-red-500">{errors.monHoc}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moTa">Mô tả</Label>
              <Textarea
                id="moTa"
                value={formData.moTa}
                onChange={(e) => handleInputChange("moTa", e.target.value)}
                placeholder="Mô tả về bài kiểm tra (tùy chọn)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Exam Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Cài đặt bài kiểm tra
            </CardTitle>
            <CardDescription>
              Cập nhật cấu hình thông số cho bài kiểm tra
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ngayThi" className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Ngày thi
                </Label>
                <Input
                  id="ngayThi"
                  type="date"
                  value={formData.ngayThi}
                  onChange={(e) => handleInputChange("ngayThi", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thoiGianLamBai" className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Thời gian làm bài (phút) <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="thoiGianLamBai"
                  type="number"
                  min="1"
                  value={formData.thoiGianLamBai}
                  onChange={(e) => handleInputChange("thoiGianLamBai", parseInt(e.target.value) || 0)}
                  className={errors.thoiGianLamBai ? "border-red-500" : ""}
                />
                {errors.thoiGianLamBai && (
                  <p className="text-sm text-red-500">{errors.thoiGianLamBai}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tongSoCau" className="flex items-center">
                  <Hash className="mr-2 h-4 w-4" />
                  Tổng số câu <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="tongSoCau"
                  type="number"
                  min="1"
                  value={formData.tongSoCau}
                  onChange={(e) => handleInputChange("tongSoCau", parseInt(e.target.value) || 0)}
                  className={errors.tongSoCau ? "border-red-500" : ""}
                />
                {errors.tongSoCau && (
                  <p className="text-sm text-red-500">{errors.tongSoCau}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tongDiem" className="flex items-center">
                  <Target className="mr-2 h-4 w-4" />
                  Tổng điểm <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="tongDiem"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formData.tongDiem}
                  onChange={(e) => handleInputChange("tongDiem", parseFloat(e.target.value) || 0)}
                  className={errors.tongDiem ? "border-red-500" : ""}
                />
                {errors.tongDiem && (
                  <p className="text-sm text-red-500">{errors.tongDiem}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="laDeTongHop"
                checked={formData.laDeTongHop}
                onCheckedChange={(checked) => handleInputChange("laDeTongHop", checked)}
              />
              <Label htmlFor="laDeTongHop">Đề tổng hợp</Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/teacher/exams/${examId}`}>
            <Button variant="outline">Hủy</Button>
          </Link>
          <Button 
            type="submit" 
            disabled={updateExamMutation.isPending}
          >
            {updateExamMutation.isPending ? (
              "Đang cập nhật..."
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Cập nhật bài kiểm tra
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
} 