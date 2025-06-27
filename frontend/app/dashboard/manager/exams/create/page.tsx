"use client";

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  ArrowLeft,
  FileText,
  Users,
  Eye,
  Plus,
  AlertCircle,
  CheckCircle2,
  Download,
} from 'lucide-react'
import { toast } from "sonner"
import { apiRequest } from '@/lib/api/base'

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://103.67.199.62:8000"

// Interfaces
interface Template {
  maMauPhieu: number
  tenMauPhieu: string
  soCauHoi?: number
  khoGiay?: string
  moTa?: string
  laMacDinh?: boolean
  laCongKhai?: boolean
  trangThai?: boolean
}

interface ClassRoom {
  maLopHoc: number
  tenLop: string
  tenGiaoVienChuNhiem?: string
  capHoc?: string
  total_students?: number
}

interface ExamFormData {
  tieuDe: string
  monHoc: string
  ngayThi: string
  thoiGianLamBai: string
  tongSoCau: string
  tongDiem: string
  moTa: string
  maMauPhieu?: number
  selectedClasses: number[]
}

const SUBJECTS = [
  'Toán học', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học',
  'Lịch sử', 'Địa lý', 'GDCD', 'Tin học', 'Thể dục', 'Âm nhạc', 'Mỹ thuật'
]

export default function CreateExamPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [classesLoading, setClassesLoading] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  
  const [formData, setFormData] = useState<ExamFormData>({
    tieuDe: '',
    monHoc: '',
    ngayThi: '',
    thoiGianLamBai: '90',
    tongSoCau: '',
    tongDiem: '10',
    moTa: '',
    maMauPhieu: undefined,
    selectedClasses: []
  })

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setTemplatesLoading(true)
        setClassesLoading(true)
        const [templatesRes, classesRes] = await Promise.all([
          apiRequest('/answer-templates/'),
          apiRequest('/classes/')
        ]);
        const templatesData = templatesRes.templates || templatesRes || []
        setTemplates(templatesData.filter((t: Template) => t.trangThai !== false))
        
        const classesData = classesRes.classes || classesRes || []
        setClasses(classesData)
      } catch (error) {
        console.error('Failed to fetch initial data:', error)
        toast.error("Không thể tải dữ liệu cần thiết (templates, lớp học).")
      } finally {
        setTemplatesLoading(false)
        setClassesLoading(false)
      }
    }
    fetchInitialData()
  }, [])

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
    setFormData(prev => ({
      ...prev,
      maMauPhieu: template.maMauPhieu,
      tongSoCau: template.soCauHoi ? template.soCauHoi.toString() : prev.tongSoCau
    }))
    setShowTemplateDialog(false)
    toast.success(`Đã chọn template: ${template.tenMauPhieu}`)
  }

  const handleClassToggle = (classId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter(id => id !== classId)
        : [...prev.selectedClasses, classId]
    }))
  }

  const handleTemplatePreview = (templateId: number) => {
    if (!templateId) return;
    const previewUrl = `${API_BASE_URL}/api/v1/answer-templates/public/${templateId}/preview-pdf`;
    window.open(previewUrl, '_blank');
  };

  const handleTemplateDownload = (templateId: number, templateName: string) => {
    if (!templateId) return;
    const downloadUrl = `${API_BASE_URL}/api/v1/answer-templates/public/${templateId}/download-pdf`;
    
    fetch(downloadUrl)
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok.');
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${templateName || 'template'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Download failed:', error);
        toast.error('Không thể tải file. Template có thể không có file PDF hoặc không công khai.');
      });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (!formData.tieuDe || !formData.monHoc || !formData.tongSoCau || !selectedTemplate || formData.selectedClasses.length === 0) {
      toast.error("Vui lòng điền đầy đủ thông tin, chọn template và lớp học.")
      return
    }

    try {
      setLoading(true)
      const examData = {
        tieuDe: formData.tieuDe,
        monHoc: formData.monHoc,
        ngayThi: formData.ngayThi || null,
        thoiGianLamBai: formData.thoiGianLamBai ? parseInt(formData.thoiGianLamBai) : null,
        tongSoCau: parseInt(formData.tongSoCau),
        tongDiem: parseFloat(formData.tongDiem),
        moTa: formData.moTa || null,
        maMauPhieu: formData.maMauPhieu,
      }

      const newExam = await apiRequest('/exams', { method: 'POST', body: examData })

      await apiRequest(`/exams/${newExam.maBaiKiemTra}/assign-classes`, {
        method: 'POST',
        body: { class_ids: formData.selectedClasses }
      })

      toast.success("Tạo bài kiểm tra thành công!")
      router.push(`/dashboard/manager/exams/${newExam.maBaiKiemTra}`)
      
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra khi tạo bài kiểm tra")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Tạo bài kiểm tra mới</h1>
          <p className="text-muted-foreground mt-1">Tạo bài kiểm tra với template và gán cho các lớp học.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Thông tin cơ bản</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tieuDe">Tiêu đề bài kiểm tra *</Label>
                  <Input id="tieuDe" value={formData.tieuDe} onChange={e => setFormData(p => ({ ...p, tieuDe: e.target.value }))} placeholder="VD: Kiểm tra cuối kỳ I" required />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="monHoc">Môn học *</Label>
                    <Select value={formData.monHoc} onValueChange={(v: string) => setFormData(p => ({ ...p, monHoc: v }))}>
                      <SelectTrigger><SelectValue placeholder="Chọn môn học" /></SelectTrigger>
                      <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ngayThi">Ngày thi</Label>
                    <Input id="ngayThi" type="date" value={formData.ngayThi} onChange={e => setFormData(p => ({ ...p, ngayThi: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="thoiGianLamBai">Thời gian (phút)</Label>
                    <Input id="thoiGianLamBai" type="number" value={formData.thoiGianLamBai} onChange={e => setFormData(p => ({ ...p, thoiGianLamBai: e.target.value }))} placeholder="90" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tongSoCau">Số câu hỏi *</Label>
                    <Input id="tongSoCau" type="number" value={formData.tongSoCau} onChange={e => setFormData(p => ({ ...p, tongSoCau: e.target.value }))} placeholder="50" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tongDiem">Tổng điểm</Label>
                    <Input id="tongDiem" type="number" step="0.1" value={formData.tongDiem} onChange={e => setFormData(p => ({ ...p, tongDiem: e.target.value }))} placeholder="10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moTa">Mô tả</Label>
                  <Textarea id="moTa" value={formData.moTa} onChange={e => setFormData(p => ({ ...p, moTa: e.target.value }))} placeholder="Mô tả chi tiết về bài kiểm tra..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Template {selectedTemplate && <CheckCircle2 className="h-4 w-4 text-green-600" />}</CardTitle></CardHeader>
              <CardContent>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{selectedTemplate.tenMauPhieu}</div>
                        <div className="text-sm text-muted-foreground">{selectedTemplate.soCauHoi} câu • {selectedTemplate.khoGiay}</div>
                      </div>
                      <Button type="button" variant="outline" onClick={() => setShowTemplateDialog(true)}>Đổi</Button>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => handleTemplatePreview(selectedTemplate.maMauPhieu)} disabled={previewLoading} className="flex-1"><Eye className="h-4 w-4 mr-2" />Xem trước</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleTemplateDownload(selectedTemplate.maMauPhieu, selectedTemplate.tenMauPhieu)} className="flex-1"><Download className="h-4 w-4 mr-2" />Tải về</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8"><AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground mb-4">Chưa chọn template</p><Button type="button" onClick={() => setShowTemplateDialog(true)}><Plus className="h-4 w-4 mr-2" />Chọn template</Button></div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Lớp học tham gia ({formData.selectedClasses.length})</CardTitle></CardHeader>
              <CardContent>
                {classesLoading ? <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  : classes.length === 0 ? <div className="text-center py-8 text-muted-foreground">Không có lớp học nào.</div>
                  : <div className="space-y-2 max-h-60 overflow-y-auto pr-2">{classes.map(cls => (
                      <div key={cls.maLopHoc} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                        <Checkbox id={`class-${cls.maLopHoc}`} checked={formData.selectedClasses.includes(cls.maLopHoc)} onCheckedChange={() => handleClassToggle(cls.maLopHoc)} />
                        <div className="flex-1">
                          <div className="font-medium">{cls.tenLop}</div>
                          <div className="text-sm text-muted-foreground">{cls.tenGiaoVienChuNhiem ? `GVCN: ${cls.tenGiaoVienChuNhiem}` : 'Chưa có GVCN'} {cls.total_students !== undefined && `• ${cls.total_students} HS`}</div>
                        </div>
                        {cls.capHoc && <Badge variant="outline">{cls.capHoc}</Badge>}
                      </div>))}
                  </div>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Tóm tắt</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Môn học:</span><span>{formData.monHoc || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Số câu:</span><span>{formData.tongSoCau || '0'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Thời gian:</span><span>{formData.thoiGianLamBai || '0'} phút</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Template:</span><span>{selectedTemplate ? 'Đã chọn' : 'Chưa'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Lớp học:</span><span>{formData.selectedClasses.length} lớp</span></div>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-3">
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Đang tạo..." : "Tạo bài kiểm tra"}</Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => router.back()}>Hủy</Button>
            </div>
          </div>
        </div>
      </form>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Chọn template phiếu trả lời</DialogTitle>
            <DialogDescription>Chọn template phù hợp. Bạn có thể xem trước hoặc tải về để kiểm tra.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto p-1 -m-1">
            {templatesLoading ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <Card key={i}><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>)}</div>
            : templates.length === 0 ? <div className="text-center py-8 text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Không có template nào.</p></div>
            : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{templates.map(template => (
                <Card key={template.maMauPhieu} className={`cursor-pointer transition-all hover:shadow-md ${selectedTemplate?.maMauPhieu === template.maMauPhieu && 'ring-2 ring-primary'}`} onClick={() => handleTemplateSelect(template)}>
                  <CardHeader>
                    <CardTitle className="text-base flex justify-between items-start">{template.tenMauPhieu}{selectedTemplate?.maMauPhieu === template.maMauPhieu && <CheckCircle2 className="h-5 w-5 text-primary" />}</CardTitle>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="outline" className="text-xs">{template.khoGiay}</Badge>
                      <Badge variant="secondary" className="text-xs">{template.soCauHoi} câu</Badge>
                      {template.laMacDinh && <Badge variant="default" className="text-xs">Mặc định</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3 h-10">{template.moTa || "Không có mô tả."}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={e => { e.stopPropagation(); handleTemplatePreview(template.maMauPhieu); }}><Eye className="h-3 w-3 mr-1" />Xem</Button>
                      <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={e => { e.stopPropagation(); handleTemplateDownload(template.maMauPhieu, template.tenMauPhieu); }}><Download className="h-3 w-3 mr-1" />Tải</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}