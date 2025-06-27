"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useExamsHooks } from "@/hooks/useExams"
import * as XLSX from 'xlsx'

interface AnswerData {
  [key: string]: string
}

interface ScoreData {
  [key: string]: number
}

export default function AdminExamAnswersPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const examId = parseInt(params.examId as string)

  const { data: exam, isLoading: examLoading } = useExamsHooks.useGetExam(examId)
  const { data: existingAnswers, isLoading: answersLoading } = useExamsHooks.useGetExamAnswers(examId)
  const createOrUpdateAnswersMutation = useExamsHooks.useCreateOrUpdateExamAnswers()

  const [answers, setAnswers] = useState<AnswerData>({})
  const [scores, setScores] = useState<ScoreData>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Load existing answers when available
  useEffect(() => {
    if (existingAnswers) {
      setAnswers(existingAnswers.dapAnJson || {})
      setScores(existingAnswers.diemMoiCauJson || {})
    } else if (exam) {
      // Initialize default scores if no existing answers
      const defaultScores: ScoreData = {}
      for (let i = 1; i <= exam.tongSoCau; i++) {
        defaultScores[i.toString()] = exam.tongDiem / exam.tongSoCau
      }
      setScores(defaultScores)
    }
  }, [existingAnswers, exam])

  const handleAnswerChange = (questionNumber: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionNumber]: answer.toUpperCase() }))
    setHasChanges(true)
  }

  const handleScoreChange = (questionNumber: string, score: number) => {
    setScores(prev => ({ ...prev, [questionNumber]: score }))
    setHasChanges(true)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      const newAnswers: AnswerData = {}
      let answersFound = 0

      // Skip header row if exists
      const dataRows = typeof jsonData[0]?.[0] === 'string' ? jsonData.slice(1) : jsonData

      dataRows.forEach(row => {
        if (!row || row.length < 2) return
        
        const questionNumber = row[0]
        const answer = row[1]
        
        if (typeof questionNumber === 'number' && questionNumber > 0 && questionNumber <= (exam?.tongSoCau || 0)) {
          newAnswers[questionNumber.toString()] = String(answer || '').trim().toUpperCase()
          answersFound++
        }
      })

      setAnswers(prev => ({ ...prev, ...newAnswers }))
      setHasChanges(true)

      toast({
        title: "Import thành công",
        description: `Đã import ${answersFound} đáp án từ file Excel.`,
      })

    } catch (error) {
      console.error("Error parsing Excel file:", error)
      toast({
        title: "Lỗi",
        description: "Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.",
        variant: "destructive",
      })
    }

    // Reset input
    event.target.value = ""
  }

  const handleSave = async () => {
    if (!exam) return

    try {
      await createOrUpdateAnswersMutation.mutateAsync({
        examId,
        answersData: {
          answers,
          scores
        }
      })
      setHasChanges(false)
    } catch (error) {
      console.error("Error saving answers:", error)
    }
  }

  const generateDefaultAnswers = () => {
    const defaultAnswers: AnswerData = {}
    for (let i = 1; i <= (exam?.tongSoCau || 0); i++) {
      defaultAnswers[i.toString()] = "A"
    }
    setAnswers(defaultAnswers)
    setHasChanges(true)
    
    toast({
      title: "Tạo đáp án mặc định",
      description: "Đã tạo đáp án mặc định (tất cả câu là A). Vui lòng chỉnh sửa theo đáp án thực tế.",
    })
  }

  const exportAnswers = () => {
    if (!exam) return

    const exportData = []
    exportData.push(['Câu hỏi', 'Đáp án', 'Điểm số']) // Header

    for (let i = 1; i <= exam.tongSoCau; i++) {
      const questionNumber = i.toString()
      exportData.push([
        i,
        answers[questionNumber] || '',
        scores[questionNumber] || 0
      ])
    }

    const ws = XLSX.utils.aoa_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Đáp án")
    XLSX.writeFile(wb, `dap_an_${exam.tieuDe.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`)

    toast({
      title: "Export thành công",
      description: "Đã xuất file Excel đáp án.",
    })
  }

  if (examLoading || answersLoading) {
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
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
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
              <Link href="/dashboard/admin/exams">
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/admin/exams/${examId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Quản lý đáp án</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">{exam.tieuDe} - {exam.monHoc}</p>
              <Badge variant="outline">{exam.trangThai}</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <div className="flex items-center text-sm text-amber-600">
              <AlertCircle className="w-4 h-4 mr-2" />
              Có thay đổi chưa lưu
            </div>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || createOrUpdateAnswersMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {createOrUpdateAnswersMutation.isPending ? "Đang lưu..." : "Lưu đáp án"}
          </Button>
        </div>
      </div>

      {/* Management Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Công cụ quản lý đáp án</CardTitle>
          <CardDescription>
            Quản lý đáp án cho {exam.tongSoCau} câu hỏi. Có thể nhập tay, upload file hoặc export.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button asChild variant="outline">
              <Label htmlFor="answer-file-upload" className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Import Excel
                <Input 
                  id="answer-file-upload" 
                  type="file" 
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                />
              </Label>
            </Button>

            <Button 
              variant="outline" 
              onClick={exportAnswers}
              disabled={Object.keys(answers).length === 0}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>

            <Button 
              variant="outline" 
              onClick={generateDefaultAnswers}
              type="button"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Tạo đáp án mặc định
            </Button>

            {Object.keys(answers).length > 0 && (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="mr-2 h-4 w-4" />
                Đã có {Object.keys(answers).length}/{exam.tongSoCau} đáp án
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Answer Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Chỉnh sửa đáp án</CardTitle>
          <CardDescription>
            Nhập đáp án và điểm số cho từng câu hỏi (A, B, C, D, ...)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: exam.tongSoCau }).map((_, index) => {
              const questionNumber = (index + 1).toString()
              return (
                <div key={questionNumber} className="space-y-2 p-3 border rounded-lg">
                  <Label className="text-sm font-medium">Câu {questionNumber}</Label>
                  
                  <div className="space-y-2">
                    <Input
                      value={answers[questionNumber] || ""}
                      onChange={(e) => handleAnswerChange(questionNumber, e.target.value)}
                      placeholder="A, B, C, D..."
                      className="text-center font-mono text-lg"
                      maxLength={3}
                    />
                    
                    <div className="flex items-center space-x-2">
                      <Label className="text-xs text-muted-foreground">Điểm:</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={scores[questionNumber] || ""}
                        onChange={(e) => handleScoreChange(questionNumber, parseFloat(e.target.value) || 0)}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 