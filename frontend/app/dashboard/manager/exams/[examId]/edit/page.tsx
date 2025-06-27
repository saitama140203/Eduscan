"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useExams } from "@/hooks/useExams";
import { useAuth } from "@/contexts/authContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Calendar, Clock, Hash, Target } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ExamUpdate } from "@/lib/api/exams";

const SUBJECTS = [
  "Toán", "Ngữ văn", "Tiếng Anh", "Vật lý", "Hóa học", "Sinh học", 
  "Lịch sử", "Địa lý", "GDCD", "Tin học", "Thể dục", "Âm nhạc", "Mỹ thuật"
];

export default function ManagerEditExamPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const examId = parseInt(params.examId as string);

  const { data: exam, isLoading, error } = useExams(examId);
  const { updateExam } = useExams();

  const [formData, setFormData] = useState<Partial<ExamUpdate>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when exam loads
  useEffect(() => {
    if (exam) {
      setFormData({
        tieuDe: exam.tieuDe,
        monHoc: exam.monHoc,
        moTa: exam.moTa || "",
        ngayThi: exam.ngayThi || "",
        thoiGianLamBai: exam.thoiGianLamBai || 60,
        tongSoCau: exam.tongSoCau,
        tongDiem: exam.tongDiem,
        laDeTongHop: exam.laDeTongHop || false,
      });
    }
  }, [exam]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.tieuDe?.trim()) {
      newErrors.tieuDe = "Tiêu đề là bắt buộc";
    }

    if (!formData.monHoc) {
      newErrors.monHoc = "Môn học là bắt buộc";
    }

    if (!formData.tongSoCau || formData.tongSoCau < 1) {
      newErrors.tongSoCau = "Số câu hỏi phải lớn hơn 0";
    }

    if (!formData.tongDiem || formData.tongDiem < 0) {
      newErrors.tongDiem = "Tổng điểm phải lớn hơn hoặc bằng 0";
    }

    if (formData.thoiGianLamBai && formData.thoiGianLamBai < 1) {
      newErrors.thoiGianLamBai = "Thời gian làm bài phải lớn hơn 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateExam.mutateAsync({ examId, data: formData });
      toast.success("Cập nhật bài kiểm tra thành công!");
      router.push(`/dashboard/manager/exams/${examId}`);
    } catch (error: any) {
      console.error("Error updating exam:", error);
      toast.error(error.message || "Có lỗi xảy ra khi cập nhật bài kiểm tra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ExamUpdate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-20 bg-gray-200 rounded"></div>
            <div className="h-8 w-64 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/manager/exams/${examId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Chỉnh sửa bài kiểm tra</h1>
          <p className="text-muted-foreground">
            Cập nhật thông tin bài kiểm tra
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Thông tin cơ bản
            </CardTitle>
            <CardDescription>
              Cập nhật thông tin cơ bản về bài kiểm tra
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tieuDe">
                  Tiêu đề bài kiểm tra <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tieuDe"
                  value={formData.tieuDe || ""}
                  onChange={(e) => handleInputChange("tieuDe", e.target.value)}
                  placeholder="Nhập tiêu đề bài kiểm tra"
                  className={errors.tieuDe ? "border-red-500" : ""}
                />
                {errors.tieuDe && (
                  <p className="text-sm text-red-500">{errors.tieuDe}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="monHoc">
                  Môn học <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.monHoc || ""}
                  onValueChange={(value) => handleInputChange("monHoc", value)}
                >
                  <SelectTrigger className={errors.monHoc ? "border-red-500" : ""}>
                    <SelectValue placeholder="Chọn môn học" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
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
                value={formData.moTa || ""}
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
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cài đặt bài kiểm tra
            </CardTitle>
            <CardDescription>
              Thiết lập thời gian và cấu trúc bài kiểm tra
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ngayThi">Ngày thi</Label>
                <Input
                  id="ngayThi"
                  type="date"
                  value={formData.ngayThi || ""}
                  onChange={(e) => handleInputChange("ngayThi", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thoiGianLamBai">
                  <Clock className="inline mr-1 h-4 w-4" />
                  Thời gian làm bài (phút)
                </Label>
                <Input
                  id="thoiGianLamBai"
                  type="number"
                  min="1"
                  value={formData.thoiGianLamBai || ""}
                  onChange={(e) => handleInputChange("thoiGianLamBai", parseInt(e.target.value) || 0)}
                  placeholder="60"
                  className={errors.thoiGianLamBai ? "border-red-500" : ""}
                />
                {errors.thoiGianLamBai && (
                  <p className="text-sm text-red-500">{errors.thoiGianLamBai}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tongSoCau">
                  <Hash className="inline mr-1 h-4 w-4" />
                  Số câu hỏi <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tongSoCau"
                  type="number"
                  min="1"
                  value={formData.tongSoCau || ""}
                  onChange={(e) => handleInputChange("tongSoCau", parseInt(e.target.value) || 0)}
                  placeholder="30"
                  className={errors.tongSoCau ? "border-red-500" : ""}
                />
                {errors.tongSoCau && (
                  <p className="text-sm text-red-500">{errors.tongSoCau}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tongDiem">
                  <Target className="inline mr-1 h-4 w-4" />
                  Tổng điểm <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tongDiem"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.tongDiem || ""}
                  onChange={(e) => handleInputChange("tongDiem", parseFloat(e.target.value) || 0)}
                  placeholder="10"
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
                checked={formData.laDeTongHop || false}
                onCheckedChange={(checked) => handleInputChange("laDeTongHop", checked)}
              />
              <Label htmlFor="laDeTongHop">Đề tổng hợp</Label>
              <p className="text-sm text-muted-foreground">
                (Bài kiểm tra bao gồm nhiều chủ đề)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin hệ thống</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>ID bài kiểm tra:</strong> {exam.maBaiKiemTra}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Tổ chức:</strong> {user?.tenToChuc || "Đang tải..."}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Trạng thái:</strong> {exam.trangThai}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/manager/exams/${examId}`}>
            <Button variant="outline" type="button">
              Hủy
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Đang cập nhật..." : "Cập nhật bài kiểm tra"}
          </Button>
        </div>
      </form>
    </div>
  );
} 