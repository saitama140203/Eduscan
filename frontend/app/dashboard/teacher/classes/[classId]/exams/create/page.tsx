"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { classesApi } from "@/lib/api/classes"
import { examsApi } from "@/lib/api/exams"
import { answerTemplateApi } from "@/lib/api/answer-templates"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, ArrowLeft, Calendar, Clock, Download, Eye, FileText, Save, Upload } from "lucide-react"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import * as XLSX from 'xlsx';

// Create a CustomDatePicker component if it doesn't exist
function CustomDatePicker({ value, onChange }: { value: Date | undefined; onChange: (date: Date | undefined) => void }) {
  return (
    <Input
      type="date"
      value={value ? value.toISOString().split("T")[0] : ""}
      onChange={(e) => {
        const date = e.target.value ? new Date(e.target.value) : undefined
        onChange(date)
      }}
    />
  )
}

export default function CreateExamPage({ params }: { params: Promise<{ classId: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [classId, setClassId] = useState<string>('')
  const [classData, setClassData] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [uploadedSheets, setUploadedSheets] = useState<{ sheetName: string; data: any[][] }[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Extract classId from params
  useEffect(() => {
    params.then(({ classId }) => {
      setClassId(classId)
    })
  }, [params])

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    description: "",
    date: undefined as Date | undefined,
    duration: 60,
    totalQuestions: 50,
    passingScore: 60,
    templateId: "",
    answerKey: [] as string[],
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!classId) return // Wait for classId to be available
      
      try {
        setIsLoading(true)

        // Fetch class details
        const classDetails = await classesApi.getClass(Number.parseInt(classId))
        setClassData(classDetails)

        // Fetch templates
        const templatesData = await answerTemplateApi.getTemplates()
        setTemplates(templatesData)

        setError(null)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Không thể tải dữ liệu. Vui lòng thử lại sau.")
        toast({
          title: "Lỗi",
          description: "Không thể tải dữ liệu. Vui lòng thử lại sau.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [classId, toast])

  // Fetch template details when template is selected
  useEffect(() => {
    const fetchTemplateDetails = async () => {
      if (!formData.templateId || formData.templateId === "none") {
        setSelectedTemplate(null)
        return
      }

      try {
        const template = await answerTemplateApi.getTemplate(Number.parseInt(formData.templateId))
        setSelectedTemplate(template)
        
        // Update total questions based on template
        if (template.soCauHoi) {
          setFormData(prev => ({
            ...prev,
            totalQuestions: template.soCauHoi
          }))
        }
      } catch (err) {
        console.error("Error fetching template details:", err)
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin mẫu đề thi.",
          variant: "destructive",
        })
      }
    }

    fetchTemplateDetails()
  }, [formData.templateId, toast])

  // Lấy URL xem trước (chỉ PDF) từ template
  const getPreviewUrl = (template: any): string | null => {
    if (!template) return null
    
    if (template.cauTrucJson) {
      const pdfInfo = template.cauTrucJson.fileTypes?.templatePdf;
      if (pdfInfo) {
        // Lấy mã tệp tin từ fileInfo bên trong pdfInfo
        const maTapTin = pdfInfo.fileInfo?.maTapTin;
        if (maTapTin) {
          return `/api/v1/files/${maTapTin}/preview`;
        }
      }

      // Fallback cho cấu trúc cũ hơn
      const fileInfo = template.cauTrucJson.fileInfo;
      if (fileInfo?.loaiFile === 'application/pdf' && fileInfo?.maTapTin) {
        return `/api/v1/files/${fileInfo.maTapTin}/preview`;
      }
    }
    
    // Fallback về URL cũ nếu có
    if (template.urlFilePreview) {
      return template.urlFilePreview;
    }
    
    return null;
  }

  // Kiểm tra xem template có URL xem trước (PDF) không
  const hasPreviewUrl = (template: any): boolean => {
    return getPreviewUrl(template) !== null;
  }

  // Kiểm tra xem template có file để tải xuống không
  const hasDownloadUrl = (template: any) => {
    if (!template) return false;
    
    // Kiểm tra trong cấu trúc JSON
    if (template.cauTrucJson) {
      if (template.cauTrucJson.fileTypes && template.cauTrucJson.fileTypes.templatePdf) {
        return true;
      }
      if (template.cauTrucJson.fileInfo && template.cauTrucJson.fileInfo.status === "uploaded") {
        return true;
      }
    }
    
    // Kiểm tra trường cũ
    return !!template.urlFileMau;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: Number.parseInt(value) || 0 }))
  }

  const handleDateChange = (date: Date | undefined) => {
    setFormData((prev) => ({ ...prev, date }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAnswerKeyChange = (questionIndex: number, answer: string) => {
    const newAnswerKey = [...formData.answerKey]
    newAnswerKey[questionIndex] = answer
    setFormData((prev) => ({ ...prev, answerKey: newAnswerKey }))
  }

  useEffect(() => {
    if (!selectedSheet || uploadedSheets.length === 0) return;

    const sheetData = uploadedSheets.find(s => s.sheetName === selectedSheet)?.data;
    if (!sheetData) return;

    try {
      // Bỏ qua hàng tiêu đề nếu có (kiểm tra nếu ô đầu tiên là string)
      const answersData = (typeof sheetData[0]?.[0] === 'string' ? sheetData.slice(1) : sheetData) as [number, string][];

      const newAnswerKey = Array(formData.totalQuestions).fill("");
      let answersFound = 0;

      answersData.forEach(row => {
        if (!row) return; // Bỏ qua các hàng trống
        const questionNumber = row[0];
        const answer = row[1];
        
        if (typeof questionNumber === 'number' && questionNumber > 0 && questionNumber <= formData.totalQuestions) {
          newAnswerKey[questionNumber - 1] = String(answer || '').trim().toUpperCase();
          answersFound++;
        }
      });
      
      setFormData(prev => ({ ...prev, answerKey: newAnswerKey }));

      toast({
        title: "Import thành công",
        description: `Đã import ${answersFound} đáp án từ mã đề "${selectedSheet}".`,
      });

    } catch (error) {
      console.error("Error parsing sheet data:", error);
      toast({
        title: "Lỗi Xử Lý Dữ Liệu",
        description: "Không thể xử lý dữ liệu từ sheet đã chọn.",
        variant: "destructive",
      });
    }

  }, [selectedSheet, uploadedSheets, formData.totalQuestions]);

  const handleAnswerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      toast({
        title: "Lỗi Định Dạng File",
        description: "Vui lòng chỉ upload file có định dạng .xlsx",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const sheets = workbook.SheetNames.map(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          return { sheetName, data: jsonData as any[][] };
        });

        if (sheets.length === 0) {
          toast({
            title: "File Rỗng",
            description: "File Excel không có sheet nào để đọc.",
            variant: "destructive",
          });
          return;
        }

        setUploadedSheets(sheets);
        setSelectedSheet(sheets[0].sheetName); // Tự động chọn sheet đầu tiên

        toast({
          title: "Đọc File Thành Công",
          description: `Đã tìm thấy ${sheets.length} mã đề (sheet). Vui lòng chọn mã đề bạn muốn import.`,
        });

      } catch (error) {
        console.error("Error parsing XLSX file:", error);
        toast({
          title: "Lỗi Xử Lý File",
          description: "Không thể đọc hoặc xử lý file Excel. Vui lòng kiểm tra lại định dạng.",
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
  }

  const handleDownloadTemplate = async () => {
    if (!formData.templateId || formData.templateId === "none") {
      toast({
        title: "Thông báo",
        description: "Vui lòng chọn một mẫu đề thi trước.",
      })
      return
    }

    try {
      if (!hasDownloadUrl(selectedTemplate)) {
        toast({
          title: "Thông báo",
          description: "Mẫu đề thi này không có tệp để tải xuống.",
          variant: "destructive",
        })
        return
      }
      
      await answerTemplateApi.downloadFile(Number.parseInt(formData.templateId))
      toast({
        title: "Thành công",
        description: "Đang tải xuống mẫu đề thi.",
      })
    } catch (err) {
      console.error("Error downloading template:", err)
      toast({
        title: "Lỗi",
        description: "Không thể tải xuống mẫu đề thi.",
        variant: "destructive",
      })
    }
  }

  const handlePreviewTemplate = () => {
    if (!hasPreviewUrl(selectedTemplate)) {
      toast({
        title: "Thông báo",
        description: "Mẫu đề thi này không có bản xem trước.",
        variant: "destructive",
      })
      return
    }
    
    setPreviewOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title) {
      toast({
        title: "Lỗi xác thực",
        description: "Vui lòng nhập tiêu đề bài thi.",
        variant: "destructive",
      })
      return
    }

    if (!formData.totalQuestions || formData.totalQuestions <= 0) {
      toast({
        title: "Lỗi xác thực",
        description: "Vui lòng nhập số lượng câu hỏi hợp lệ.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare data for API
      const examData = {
        tieuDe: formData.title,
        monHoc: formData.subject,
        moTa: formData.description,
        ngayThi: formData.date ? formData.date.toISOString() : undefined,
        thoiGianLamBai: formData.duration,
        tongSoCau: formData.totalQuestions,
        maToChuc: classData?.maToChuc,
        maMauPhieu: formData.templateId !== "none" && formData.templateId ? Number.parseInt(formData.templateId) : undefined,
        tongDiem: 10, // Điểm mặc định
        trangThai: 'nhap' as const,
      }

      // Create exam
      const result = await examsApi.createExam(examData)

      // Save answers if any
      const hasAnswers = formData.answerKey.some(answer => answer && answer.trim())
      if (hasAnswers) {
        try {
          // Prepare answers data
          const answersData = {
            answers: formData.answerKey.reduce((acc, answer, index) => {
              if (answer && answer.trim()) {
                acc[(index + 1).toString()] = answer.trim().toUpperCase()
              }
              return acc
            }, {} as Record<string, string>),
            scores: formData.answerKey.reduce((acc, answer, index) => {
              if (answer && answer.trim()) {
                acc[(index + 1).toString()] = 10 / formData.totalQuestions // Điểm đều cho mỗi câu
              }
              return acc
            }, {} as Record<string, number>)
          }

          await examsApi.createOrUpdateAnswers(result.maBaiKiemTra, answersData)
          
          toast({
            title: "Thành công",
            description: "Bài thi và đáp án đã được tạo thành công!",
          })
        } catch (answerError) {
          console.error("Error saving answers:", answerError)
          toast({
            title: "Cảnh báo",
            description: "Bài thi đã được tạo nhưng không thể lưu đáp án. Bạn có thể thêm đáp án sau.",
            variant: "destructive",
          })
        }
      } else {
      toast({
        title: "Thành công",
        description: "Bài thi đã được tạo thành công!",
      })
      }

      // Redirect to exam page
      router.push(`/dashboard/teacher/classes/${classId}/exams/${result.maBaiKiemTra}`)
    } catch (err) {
      console.error("Error creating exam:", err)
      toast({
        title: "Lỗi",
        description: err instanceof Error ? err.message : "Không thể tạo bài thi. Vui lòng thử lại.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <div className="h-10 bg-gray-200 rounded animate-pulse w-64"></div>
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded animate-pulse w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-64"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  <div className="h-10 bg-gray-200 rounded animate-pulse w-full"></div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <div className="h-10 bg-gray-200 rounded animate-pulse w-32"></div>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (error || !classData) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="sm" className="mr-4" asChild>
            <Link href={`/dashboard/teacher/classes/${classId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại lớp học
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Tạo bài thi</h1>
        </div>

        <Card className="p-8 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="rounded-full bg-red-100 p-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium">Lỗi tải dữ liệu</h3>
            <p className="text-muted-foreground mt-1 mb-4">{error || "Không tìm thấy lớp học"}</p>
            <Button asChild>
              <Link href={`/dashboard/teacher/classes/${classId}`}>Quay lại lớp học</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" className="mr-4" asChild>
          <Link href={`/dashboard/teacher/classes/${classId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại lớp học
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Tạo bài thi</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="details">Thông tin bài thi</TabsTrigger>
            <TabsTrigger value="settings">Cài đặt bài thi</TabsTrigger>
            <TabsTrigger value="answers">Đáp án</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin bài thi</CardTitle>
                <CardDescription>Thông tin cơ bản về bài thi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Tiêu đề bài thi <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="VD: Kiểm tra giữa kỳ"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Môn học</Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="VD: Toán học"
                    value={formData.subject}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Mô tả ngắn gọn về bài thi"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" /> Ngày thi
                    </Label>
                    <CustomDatePicker value={formData.date} onChange={handleDateChange} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration" className="flex items-center">
                      <Clock className="mr-2 h-4 w-4" /> Thời gian làm bài (phút)
                    </Label>
                    <Input
                      id="duration"
                      name="duration"
                      type="number"
                      min="1"
                      value={formData.duration}
                      onChange={handleNumberChange}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/teacher/classes/${classId}`}>Hủy bỏ</Link>
                </Button>
                <Button type="button" onClick={() => (document.querySelector('[data-value="settings"]') as HTMLElement)?.click()}>
                  Tiếp theo: Cài đặt bài thi
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Cài đặt bài thi</CardTitle>
                <CardDescription>Cấu hình thông số và mẫu đề thi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalQuestions" className="flex items-center">
                      <FileText className="mr-2 h-4 w-4" /> Tổng số câu hỏi <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="totalQuestions"
                      name="totalQuestions"
                      type="number"
                      min="1"
                      value={formData.totalQuestions}
                      onChange={handleNumberChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passingScore">Điểm đạt (%)</Label>
                    <Input
                      id="passingScore"
                      name="passingScore"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.passingScore}
                      onChange={handleNumberChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="templateId">Mẫu phiếu trả lời</Label>
                  <div className="flex flex-col space-y-2">
                  <Select
                    value={formData.templateId}
                    onValueChange={(value) => handleSelectChange("templateId", value)}
                  >
                    <SelectTrigger id="templateId">
                        <SelectValue placeholder="Chọn mẫu đề thi" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Không có mẫu (mặc định)</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.maMauPhieu} value={template.maMauPhieu.toString()}>
                            {template.tenMauPhieu} ({template.soCauHoi} câu hỏi)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                    
                    {formData.templateId && formData.templateId !== "none" && (
                      <div className="flex items-center justify-between mt-2 p-3 border rounded-md bg-gray-50">
                        <div>
                          <p className="font-medium">Mẫu đã chọn: {selectedTemplate?.tenMauPhieu}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedTemplate?.soCauHoi} câu hỏi, {selectedTemplate?.soLuaChonMoiCau || 4} lựa chọn/câu
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={handlePreviewTemplate}>
                                <Eye className="mr-2 h-4 w-4" /> Xem trước
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Xem trước mẫu đề thi</DialogTitle>
                                <DialogDescription>
                                  {selectedTemplate?.tenMauPhieu} - {selectedTemplate?.soCauHoi} câu hỏi
                                </DialogDescription>
                              </DialogHeader>
                              <div className="relative w-full h-[70vh] border rounded-md overflow-hidden">
                                {hasPreviewUrl(selectedTemplate) ? (
                                  <iframe 
                                    src={getPreviewUrl(selectedTemplate) || ""} 
                                    className="w-full h-full"
                                    title="Template Preview"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <p>Không có bản xem trước</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                            <Download className="mr-2 h-4 w-4" /> Tải xuống
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mẫu đề thi xác định bố cục của phiếu trả lời. Nếu không chọn, mẫu mặc định sẽ được sử dụng.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => (document.querySelector('[data-value="details"]') as HTMLElement)?.click()}
                >
                  Quay lại: Thông tin bài thi
                </Button>
                <Button type="button" onClick={() => (document.querySelector('[data-value="answers"]') as HTMLElement)?.click()}>
                  Tiếp theo: Đáp án
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="answers">
            <Card>
              <CardHeader>
                <CardTitle>Đáp án</CardTitle>
                <CardDescription>Xác định đáp án đúng cho từng câu hỏi bằng cách nhập tay hoặc upload file Excel.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  
                  <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                    <div className="space-y-1">
                      <h4 className="font-medium">Upload File Đáp Án</h4>
                      <p className="text-sm text-muted-foreground">
                        Hỗ trợ file .xlsx. File cần có 2 cột: Cột A là số thứ tự câu, Cột B là đáp án.
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <Label htmlFor="answer-file-upload">
                        <Upload className="mr-2 h-4 w-4" /> Upload File
                        <Input 
                          id="answer-file-upload" 
                          type="file" 
                          className="hidden"
                          accept=".xlsx"
                          onChange={handleAnswerFileUpload}
                        />
                      </Label>
                    </Button>
                  </div>

                  {uploadedSheets.length > 0 && (
                    <div className="space-y-2 p-3 border rounded-md">
                      <Label htmlFor="sheet-select">Chọn Mã Đề (Sheet) để Import Đáp Án</Label>
                      <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                        <SelectTrigger id="sheet-select">
                          <SelectValue placeholder="Chọn một mã đề..." />
                        </SelectTrigger>
                        <SelectContent>
                          {uploadedSheets.map(sheet => (
                            <SelectItem key={sheet.sheetName} value={sheet.sheetName}>
                              {sheet.sheetName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    Nhập đáp án đúng cho từng câu hỏi. Đối với câu hỏi trắc nghiệm, sử dụng A, B, C, D, v.v.
                    Để trống nếu bạn muốn nhập đáp án sau.
                  </p>

                  <div className="border rounded-md p-4">
                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({ length: Math.min(formData.totalQuestions, 50) }).map((_, index) => (
                        <div key={index} className="space-y-1">
                          <Label htmlFor={`answer-${index + 1}`} className="text-xs">
                            Câu {index + 1}
                          </Label>
                          <Input
                            id={`answer-${index + 1}`}
                            value={formData.answerKey[index] || ""}
                            onChange={(e) => handleAnswerKeyChange(index, e.target.value)}
                            className="h-8 text-center"
                            maxLength={1}
                          />
                        </div>
                      ))}
                    </div>

                    {formData.totalQuestions > 50 && (
                      <div className="mt-4 text-center text-sm text-muted-foreground">
                        Hiển thị 50 câu hỏi đầu tiên. Bạn có thể chỉnh sửa toàn bộ đáp án sau khi tạo bài thi.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => (document.querySelector('[data-value="settings"]') as HTMLElement)?.click()}
                >
                  Quay lại: Cài đặt bài thi
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>Đang tạo bài thi...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Tạo bài thi
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}
