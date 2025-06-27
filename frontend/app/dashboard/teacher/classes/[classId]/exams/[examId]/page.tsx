"use client"

import React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FileText, Users, Clock, Calendar, CheckCircle, XCircle, AlertTriangle, Edit } from "lucide-react"
import { useExam, useExamStatistics, useExamResults, type ExamResult } from "@/hooks/useExams"
import type { Exam, ExamStatistics } from "@/lib/api/exams"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"

// Helper function to format date, returns placeholder if date is invalid
const formatDate = (dateString?: string | Date) => {
  if (!dateString) return "Không có"
  try {
    return format(new Date(dateString), "dd/MM/yyyy") // Định dạng ngày Việt Nam
  } catch (error) {
    return "Ngày không hợp lệ"
  }
}

export default function ExamDetailPage() {
  const params = useParams()
  const classId = Number(params.classId)
  const examId = Number(params.examId)

  const { data: exam, isLoading: isLoadingExam, error: errorExam } = useExam(examId)
  const { data: stats, isLoading: isLoadingStats, error: errorStats } = useExamStatistics(examId, classId)
  const { data: results, isLoading: isLoadingResults, error: errorResults } = useExamResults(examId, classId)

  if (isLoadingExam || isLoadingStats || isLoadingResults) {
    return <ExamDetailPageSkeleton />
  }

  if (errorExam || errorStats || errorResults) {
    const errorMessage = 
      (errorExam instanceof Error ? errorExam.message : "Lỗi bài thi không xác định") || 
      (errorStats instanceof Error ? errorStats.message : "Lỗi thống kê không xác định") || 
      (errorResults instanceof Error ? errorResults.message : "Lỗi kết quả không xác định")

    return (
      <div className="container mx-auto py-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-xl font-semibold">Lỗi Tải Dữ liệu Bài thi</h2>
        <p className="text-muted-foreground mt-2">Không thể tải chi tiết cho bài thi này. Vui lòng thử lại sau.</p>
        <p className="text-xs text-red-400 mt-4">
          {errorMessage}
        </p>
      </div>
    )
  }
  
  const submissionRate = `${stats?.totalSubmissions ?? 0}/${stats?.totalStudents ?? 0}`

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{exam?.tieuDe}</h1>
          <p className="text-muted-foreground">
            {stats?.className ?? "Đang tải..."} • {exam?.monHoc}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
           <Button variant="outline" asChild>
            <Link href={`/dashboard/teacher/exams/${examId}/edit`}>
              <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Xuất kết quả
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/teacher/scan">
              <FileText className="mr-2 h-4 w-4" /> Quét bài làm
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <SummaryCard icon={Calendar} title="Ngày thi" value={formatDate(exam?.ngayThi)} />
        <SummaryCard icon={Clock} title="Thời gian" value={`${exam?.thoiGianLamBai ?? "Không có"} phút`} />
        <SummaryCard icon={FileText} title="Số câu" value={`${exam?.tongSoCau ?? "Không có"} câu`} />
        <SummaryCard icon={Users} title="Lượt nộp bài" value={submissionRate} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatsCard 
          title="Điểm trung bình" 
          value={`${stats?.averageScore?.toFixed(1) ?? "Không có"}%`} 
          description={`Điểm qua môn: ${exam?.diemQuaMon ?? 50}%`}
        />
        <StatsCard 
          title="Điểm cao nhất" 
          value={`${stats?.highestScore?.toFixed(1) ?? "Không có"}%`} 
          valueColor="text-green-500"
        />
        <StatsCard 
          title="Điểm thấp nhất" 
          value={`${stats?.lowestScore?.toFixed(1) ?? "Không có"}%`} 
          valueColor="text-red-500"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="results">Kết quả học sinh</TabsTrigger>
          <TabsTrigger value="questions">Phân tích câu hỏi</TabsTrigger>
          <TabsTrigger value="details">Chi tiết bài thi</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
          <ResultsTable results={results} passingScore={exam?.diemQuaMon ?? 50} totalQuestions={exam?.tongSoCau ?? 0} />
        </TabsContent>

        <TabsContent value="questions">
          <ComingSoonCard featureName="Phân tích câu hỏi" />
        </TabsContent>

        <TabsContent value="details">
          <ExamDetailsTab exam={exam} stats={stats} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Sub-components for better organization
const SummaryCard = ({ icon: Icon, title, value }: { icon: React.ElementType, title: string, value: string }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-lg flex items-center">
        <Icon className="mr-2 h-5 w-5 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-xl font-medium">{value}</div>
    </CardContent>
  </Card>
)

const StatsCard = ({ title, value, description, valueColor = 'text-current' }: { title: string, value: string, description?: string, valueColor?: string }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-3xl font-bold ${valueColor}`}>{value}</div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
)

const ResultsTable = ({ results, passingScore, totalQuestions }: { results: ExamResult[] | undefined, passingScore: number, totalQuestions: number }) => (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
          <CardTitle>Kết quả học sinh</CardTitle>
          <CardDescription>Thống kê điểm của từng học sinh</CardDescription>
                </div>
                <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Xuất kết quả
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium">Học sinh</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Điểm số</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Số câu đúng</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Trạng thái</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Thời gian nộp</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
              {results?.map((result: ExamResult) => (
                <tr key={result.student.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <td className="p-4 align-middle">
                            <div>
                      <div className="font-medium">{result.student.name}</div>
                      <div className="text-xs text-muted-foreground">{result.student.code}</div>
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                    {result.status === "COMPLETED" ? (
                      <span className={`font-medium ${result.score >= passingScore ? "text-green-500" : "text-red-500"}`}>
                        {result.score.toFixed(1)}%
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-4 align-middle">
                    {result.status === "COMPLETED" ? `${result.correctAnswers}/${totalQuestions}` : "-"}
                          </td>
                          <td className="p-4 align-middle">
                    {result.status === "COMPLETED" ? (
                      <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" /> Hoàn thành</Badge>
                            ) : (
                      <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Vắng</Badge>
                            )}
                          </td>
                          <td className="p-4 align-middle">
                    {result.status === "COMPLETED" ? formatDate(result.submittedAt) : "-"}
                          </td>
                          <td className="p-4 align-middle">
                    {result.status === "COMPLETED" && (
                      <Button variant="outline" size="sm"><Download className="h-4 w-4" /></Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
)

const ComingSoonCard = ({ featureName }: { featureName: string }) => (
          <Card>
            <CardHeader>
      <CardTitle>{featureName}</CardTitle>
      <CardDescription>Phân tích hiệu suất theo câu hỏi. (Sắp có)</CardDescription>
            </CardHeader>
    <CardContent className="flex items-center justify-center h-48 bg-muted rounded-md">
      <p className="text-muted-foreground">Tính năng này đang được phát triển.</p>
            </CardContent>
          </Card>
)

const ExamDetailsTab = ({ exam, stats }: { exam: Exam | undefined, stats: ExamStatistics | undefined }) => (
          <Card>
            <CardHeader>
      <CardTitle>Chi tiết bài thi</CardTitle>
      <CardDescription>Thông tin về bài thi này</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
        <h3 className="text-lg font-medium">Mô tả</h3>
        <p className="text-muted-foreground">{exam?.moTa ?? "Không có mô tả."}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
          <h3 className="text-lg font-medium">Thông tin bài thi</h3>
                  <ul className="space-y-2 mt-2">
            <li className="flex justify-between"><span className="text-muted-foreground">Môn học:</span><span>{exam?.monHoc}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Ngày thi:</span><span>{formatDate(exam?.ngayThi)}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Thời gian:</span><span>{exam?.thoiGianLamBai} phút</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Tổng số câu:</span><span>{exam?.tongSoCau}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Điểm qua môn:</span><span>{exam?.diemQuaMon ?? 50}%</span></li>
                  </ul>
                </div>
                <div>
          <h3 className="text-lg font-medium">Tổng kết kết quả</h3>
                  <ul className="space-y-2 mt-2">
            <li className="flex justify-between"><span className="text-muted-foreground">Điểm trung bình:</span><span>{stats?.averageScore?.toFixed(1) ?? 'Không có'}%</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Điểm cao nhất:</span><span>{stats?.highestScore?.toFixed(1) ?? 'Không có'}%</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Điểm thấp nhất:</span><span>{stats?.lowestScore?.toFixed(1) ?? 'Không có'}%</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Tỉ lệ nộp bài:</span><span>{`${stats?.totalSubmissions ?? 0}/${stats?.totalStudents ?? 0}`}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Tỉ lệ qua môn:</span><span>{stats?.passRate?.toFixed(1) ?? 'Không có'}%</span></li>
                  </ul>
                </div>
              </div>
              <div className="pt-4">
        <h3 className="text-lg font-medium mb-2">Đáp án</h3>
                <div className="bg-muted p-4 rounded-md">
          <Link href={`/dashboard/teacher/exams/${exam?.maBaiKiemTra}/answers`}>
            <Button variant="outline" className="w-full">Xem/Sửa đáp án</Button>
          </Link>
                </div>
              </div>
            </CardContent>
          </Card>
)

const ExamDetailPageSkeleton = () => (
  <div className="container mx-auto py-6">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-44" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
    <Skeleton className="h-10 w-full mb-6" />
    <Skeleton className="h-96 w-full" />
    </div>
  )
