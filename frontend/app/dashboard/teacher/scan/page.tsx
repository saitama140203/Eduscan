"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { 
  Camera, Upload, Users, FileText, Scan, Play, Square, RotateCcw, Download, Eye, CheckCircle,
  AlertCircle, Clock, BarChart3, Settings, Loader2, X, ChevronRight, Target, Zap, Brain, Image as ImageIcon, Video, Plus, Filter, Grid, List, Wifi, WifiOff, ArrowLeft, Save
} from "lucide-react"
import clsx from "clsx"
import { classesApi, type Class } from "@/lib/api/classes"
import { examsApi, type Exam } from "@/lib/api/exams"
import { answerTemplatesApi } from "@/lib/api/answer-templates"
import { omrApi } from "@/lib/api/omr"
import { useOMRWebSocket } from '@/lib/hooks/useOMRWebSocket'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

// Import WebcamScanner component
const WebcamScanner = dynamic(() => import('@/components/dashboard/teacher/scan/WebcamScanner').then(mod => ({ default: mod.WebcamScanner })), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
})

// Types
interface ScanResult {
  filename: string
  sbd: string | null
  student: {
    maHocSinh: number | null
    hoTen: string | null
    maHocSinhTruong: string | null
  } | null
  score: number | null
  answers: Record<string, string>
  matched: boolean
  annotated_image?: string
}

// Components from the original file... (StatsCard, ClassSelector, etc. are assumed to be here)
// For brevity, I will omit the component definitions that are not being changed.
// ... (Paste StatsCard, ClassSelector, ExamCodeSelector, etc. here from your original file)
const StatsCard = ({ title, value, subtitle, icon: Icon, color = "blue", trend }: { title: string; value: string | number; subtitle: string; icon: React.ComponentType<{ className?: string }>; color?: string; trend?: { value: number; label: string } }) => ( <Card className="hover:shadow-lg transition-all duration-300 group cursor-pointer"> <CardContent className="p-6"> <div className="flex items-center justify-between"> <div className="space-y-2"> <p className="text-sm font-medium text-muted-foreground">{title}</p> <div className="flex items-baseline space-x-2"> <h3 className="text-2xl font-bold">{value}</h3> {trend && ( <span className={clsx( "text-xs font-medium px-2 py-1 rounded-full", trend.value >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700" )}> {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label} </span> )} </div> <p className="text-xs text-muted-foreground">{subtitle}</p> </div> <div className={clsx( "w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300", color === "blue" && "bg-blue-100 text-blue-600", color === "green" && "bg-green-100 text-green-600", color === "purple" && "bg-purple-100 text-purple-600", color === "orange" && "bg-orange-100 text-orange-600" )}> <Icon className="w-6 h-6" /> </div> </div> </CardContent> </Card> )
const ClassSelector = ({ classes, selectedClass, onSelect, isLoading }: { classes: Class[]; selectedClass: Class | null; onSelect: (classItem: Class) => void; isLoading: boolean }) => { const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); return ( <Card> <CardHeader className="pb-4"> <div className="flex items-center justify-between"> <div className="flex items-center gap-3"> <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"> <Users className="w-5 h-5 text-blue-600" /> </div> <div> <CardTitle>Chọn lớp học</CardTitle> <p className="text-sm text-muted-foreground">Lựa chọn lớp để bắt đầu chấm điểm</p> </div> </div> <div className="flex items-center gap-2"> <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}> <Grid className="w-4 h-4" /> </Button> <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}> <List className="w-4 h-4" /> </Button> </div> </div> </CardHeader> <CardContent> <div className={clsx( "gap-4", viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "space-y-3" )}> {classes.map((classItem) => ( <div key={classItem.maLopHoc} className={clsx( "p-4 rounded-lg border transition-all duration-200 cursor-pointer group", "hover:shadow-md hover:border-blue-300", selectedClass?.maLopHoc === classItem.maLopHoc ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200 hover:bg-gray-50" )} onClick={() => onSelect(classItem)}> <div className={clsx( "flex items-center", viewMode === 'grid' ? "flex-col text-center space-y-3" : "space-x-4" )}> <div className={clsx( "rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200", viewMode === 'grid' ? "w-12 h-12" : "w-10 h-10", selectedClass?.maLopHoc === classItem.maLopHoc ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600" )}> <Users className={clsx(viewMode === 'grid' ? "w-6 h-6" : "w-5 h-5")} /> </div> <div className="flex-1"> <h3 className={clsx( "font-semibold transition-colors", viewMode === 'grid' ? "text-base" : "text-sm", selectedClass?.maLopHoc === classItem.maLopHoc ? "text-blue-900" : "text-gray-900 group-hover:text-blue-700" )}> {classItem.tenLop} </h3> <p className={clsx( "text-muted-foreground", viewMode === 'grid' ? "text-sm" : "text-xs" )}> {classItem.capHoc} • {classItem.total_students} học sinh </p> {viewMode === 'grid' && ( <div className="flex justify-center mt-2"> <Badge variant="outline" className={clsx( selectedClass?.maLopHoc === classItem.maLopHoc ? "border-blue-500 text-blue-700" : "border-gray-300" )}> {classItem.total_exams} mã đề </Badge> </div> )} </div> {viewMode === 'list' && ( <div className="flex items-center space-x-2"> <Badge variant="outline" className={clsx( selectedClass?.maLopHoc === classItem.maLopHoc ? "border-blue-500 text-blue-700" : "border-gray-300" )}> {classItem.total_exams} mã đề </Badge> <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" /> </div> )} </div> </div> ))} </div> </CardContent> </Card> ) }
const ExamCodeSelector = ({ exams, selectedExam, onSelect, isLoading }: { exams: Exam[]; selectedExam: Exam | null; onSelect: (exam: Exam) => void; isLoading: boolean }) => ( <Card> <CardHeader className="pb-4"> <div className="flex items-center gap-3"> <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"> <FileText className="w-5 h-5 text-green-600" /> </div> <div> <CardTitle>Chọn mã đề</CardTitle> <p className="text-sm text-muted-foreground">Lựa chọn đề thi cần chấm điểm</p> </div> </div> </CardHeader> <CardContent> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {exams.map((exam) => ( <div key={exam.maBaiKiemTra} className={clsx( "p-4 rounded-lg border transition-all duration-200 cursor-pointer group", "hover:shadow-md hover:border-green-300", selectedExam?.maBaiKiemTra === exam.maBaiKiemTra ? "border-green-500 bg-green-50 shadow-md" : "border-gray-200 hover:bg-gray-50" )} onClick={() => onSelect(exam)}> <div className="flex items-start justify-between"> <div className="flex-1"> <div className="flex items-center gap-2 mb-2"> <h3 className={clsx( "font-semibold transition-colors", selectedExam?.maBaiKiemTra === exam.maBaiKiemTra ? "text-green-900" : "text-gray-900" )}> {exam.tieuDe} </h3> <Badge className={clsx( selectedExam?.maBaiKiemTra === exam.maBaiKiemTra ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700" )}> {exam.tongSoCau} câu </Badge> </div> <p className="text-sm text-muted-foreground mb-3">{exam.moTa || 'Không có mô tả'}</p> <div className="flex items-center gap-4 text-xs text-muted-foreground"> <span className="flex items-center gap-1"> <Clock className="w-3 h-3" /> {new Date(exam.thoiGianTao).toLocaleDateString('vi-VN')} </span> <span className={clsx( "flex items-center gap-1", exam.trangThai === 'xuatBan' ? "text-green-600" : "text-red-600" )}> {exam.trangThai === 'xuatBan' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} {exam.trangThai === 'xuatBan' ? "Sẵn sàng" : "Nháp"} </span> </div> </div> <div className={clsx( "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200", selectedExam?.maBaiKiemTra === exam.maBaiKiemTra ? "bg-green-600 text-white scale-110" : "bg-gray-100 text-gray-400 group-hover:bg-green-100 group-hover:text-green-600" )}> <Target className="w-4 h-4" /> </div> </div> </div> ))} </div> </CardContent> </Card> )
const ScanModeSelector = ({ onModeSelect, selectedMode }: { onModeSelect: (mode: 'upload' | 'webcam') => void; selectedMode: 'upload' | 'webcam' | null }) => ( <Card> <CardHeader className="pb-4"> <div className="flex items-center gap-3"> <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"> <Scan className="w-5 h-5 text-purple-600" /> </div> <div> <CardTitle>Chọn phương thức chấm</CardTitle> <p className="text-sm text-muted-foreground">Lựa chọn cách thức quét phiếu trả lời</p> </div> </div> </CardHeader> <CardContent> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className={clsx( "p-6 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group", "hover:border-blue-400 hover:bg-blue-50/50", selectedMode === 'upload' ? "border-blue-500 bg-blue-50 shadow-lg" : "border-gray-300 hover:shadow-md" )} onClick={() => onModeSelect('upload')}> <div className="text-center space-y-4"> <div className={clsx( "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all duration-300", "group-hover:scale-110", selectedMode === 'upload' ? "bg-blue-600 text-white shadow-lg" : "bg-blue-100 text-blue-600 group-hover:bg-blue-200" )}> <Upload className="w-8 h-8" /> </div> <div> <h3 className={clsx( "text-lg font-semibold mb-2 transition-colors", selectedMode === 'upload' ? "text-blue-900" : "text-gray-900 group-hover:text-blue-700" )}> Tải lên ảnh </h3> <p className="text-sm text-muted-foreground leading-relaxed"> Chọn và tải lên ảnh phiếu trả lời từ thiết bị của bạn </p> </div> <div className="space-y-2 text-xs text-muted-foreground"> <div className="flex items-center justify-center gap-2"> <ImageIcon className="w-3 h-3" /> <span>Hỗ trợ JPG, PNG, PDF</span> </div> <div className="flex items-center justify-center gap-2"> <Zap className="w-3 h-3" /> <span>Xử lý hàng loạt</span> </div> </div> </div> </div> <div className={clsx( "p-6 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group", "hover:border-green-400 hover:bg-green-50/50", selectedMode === 'webcam' ? "border-green-500 bg-green-50 shadow-lg" : "border-gray-300 hover:shadow-md" )} onClick={() => onModeSelect('webcam')}> <div className="text-center space-y-4"> <div className={clsx( "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all duration-300", "group-hover:scale-110", selectedMode === 'webcam' ? "bg-green-600 text-white shadow-lg" : "bg-green-100 text-green-600 group-hover:bg-green-200" )}> <Camera className="w-8 h-8" /> </div> <div> <h3 className={clsx( "text-lg font-semibold mb-2 transition-colors", selectedMode === 'webcam' ? "text-green-900" : "text-gray-900 group-hover:text-green-700" )}> Quét trực tiếp </h3> <p className="text-sm text-muted-foreground leading-relaxed"> Sử dụng camera để quét phiếu trả lời theo thời gian thực </p> </div> <div className="space-y-2 text-xs text-muted-foreground"> <div className="flex items-center justify-center gap-2"> <Video className="w-3 h-3" /> <span>Realtime scanning</span> </div> <div className="flex items-center justify-center gap-2"> <Brain className="w-3 h-3" /> <span>AI detection</span> </div> </div> </div> </div> </div> </CardContent> </Card> )
const ImageUploader = ({ onFilesSelected, isProcessing, files, onFileRemove }: { onFilesSelected: (files: FileList) => void; isProcessing: boolean; files: File[]; onFileRemove: (file: File) => void }) => { const [dragOver, setDragOver] = useState(false); const fileInputRef = useRef<HTMLInputElement>(null); const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const files = e.dataTransfer.files; if (files.length > 0) { onFilesSelected(files); } }, [onFilesSelected]); const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const files = e.target.files; if (files && files.length > 0) { onFilesSelected(files); } }, [onFilesSelected]); return ( <Card> <CardHeader> <CardTitle className="flex items-center gap-2"> <Upload className="w-5 h-5" /> Tải lên phiếu trả lời </CardTitle> </CardHeader> <CardContent> <div className={clsx( "relative border-2 border-dashed rounded-xl p-8 transition-all duration-300", "hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer", dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300", isProcessing && "pointer-events-none opacity-60" )} onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onClick={() => fileInputRef.current?.click()}> <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple onChange={handleFileInput} className="hidden" disabled={isProcessing} /> <div className="text-center space-y-4"> {isProcessing ? ( <> <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin" /> <div> <p className="text-lg font-medium text-blue-600">Đang xử lý...</p> <p className="text-sm text-muted-foreground">AI đang phân tích phiếu trả lời</p> </div> </> ) : ( <> <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto"> <Upload className="w-8 h-8 text-blue-600" /> </div> <div> <p className="text-lg font-semibold text-gray-900 mb-2"> {dragOver ? "Thả file vào đây" : "Kéo thả hoặc click để chọn file"} </p> <p className="text-sm text-muted-foreground"> Hỗ trợ JPG, PNG, PDF • Tối đa 10MB mỗi file </p> </div> <Button variant="outline" size="lg" className="mt-4"> <Plus className="w-4 h-4 mr-2" /> Chọn file </Button> </> )} </div> </div> <div className="mt-4 grid grid-cols-4 gap-4"> {files.map((file, i) => ( <div key={i} className="relative"> <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-auto rounded-md" /> <button onClick={() => onFileRemove(file)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X size={12} /></button> </div> ))} </div> </CardContent> </Card> ) }
const ResultsDisplay = ({ results, examCode, classId, onSaveAll }: { results: ScanResult[], examCode: Exam | null, classId?: number | null, onSaveAll: () => Promise<void> }) => {
  const { toast } = useToast();
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isSaving, setIsSaving] = useState(false);

  const handleExport = async () => {
    if (!examCode || !examCode.maBaiKiemTra) {
      toast({ title: "Lỗi", description: "Vui lòng chọn mã đề thi trước khi xuất file.", variant: "destructive" });
      return;
    }
    toast({ title: "Đang xử lý", description: "Đang chuẩn bị file Excel, vui lòng chờ..." });
    try {
      const blob = await omrApi.exportExcel(examCode.maBaiKiemTra, classId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ket-qua-${examCode.tieuDe.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast({ title: "Thành công", description: "Đã tải xuống file Excel kết quả." });
    } catch (error) {
      console.error("Export failed:", error);
      toast({ title: "Xuất file thất bại", description: error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại.", variant: "destructive" });
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    toast({ title: "Đang lưu...", description: `Đang lưu ${results.length} kết quả.`});
    try {
      await onSaveAll();
      toast({ title: "Thành công", description: "Tất cả kết quả đã được lưu."});
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể lưu kết quả.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">Chưa có kết quả</p>
              <p className="text-sm text-muted-foreground">Kết quả quét sẽ hiển thị ở đây</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{results.length}</p>
            <p className="text-sm text-blue-600/80">Tổng số bài</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{results.filter(r => r.matched).length}</p>
            <p className="text-sm text-green-600/80">Đã khớp HS</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{results.filter(r => r.score !== null).length > 0 ? (results.filter(r => r.score !== null).reduce((sum, r) => sum + (r.score || 0), 0) / results.filter(r => r.score !== null).length).toFixed(2) : 'N/A'}</p>
            <p className="text-sm text-purple-600/80">Điểm TB</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{results.filter(r => r.score !== null).length > 0 ? Math.max(...results.filter(r => r.score !== null).map(r => r.score || 0)) : 'N/A'}</p>
            <p className="text-sm text-orange-600/80">Điểm cao nhất</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{results.filter(r => r.score !== null).length > 0 ? Math.min(...results.filter(r => r.score !== null).map(r => r.score || 0)) : 'N/A'}</p>
            <p className="text-sm text-red-600/80">Điểm thấp nhất</p>
          </div>
        </div>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Kết quả chấm điểm</CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleSaveAll} disabled={isSaving || results.length === 0}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Lưu tất cả ({results.length})
              </Button>
              <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}><List className="w-4 h-4 mr-2" /> Bảng</Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}><Grid className="w-4 h-4 mr-2" /> Lưới</Button>
              <Button variant="outline" size="sm" onClick={handleExport}> <Download className="w-4 h-4 mr-2" /> Xuất Excel </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3 px-4">Học sinh</th>
                    <th scope="col" className="py-3 px-2">Điểm</th>
                    <th scope="col" className="py-3 px-2">Trạng thái</th>
                    <th scope="col" className="py-3 px-2">Mã HS</th>
                    <th scope="col" className="py-3 px-2">File</th>
                    <th scope="col" className="py-3 px-2">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={`result-${index}-${result.filename}`} className="bg-white border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                        {result.student?.hoTen || result.sbd || 'Chưa khớp'}
                      </td>
                      <td className="py-3 px-2">
                        <span className={clsx("font-semibold", result.score === null ? "text-gray-400" : result.score >= 8 ? "text-green-600" : result.score >= 6.5 ? "text-orange-600" : "text-red-600")}>
                          {result.score !== null ? result.score.toFixed(2) : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {result.matched ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"> <CheckCircle className="w-3 h-3 mr-1" /> Đã khớp </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"> <X className="w-3 h-3 mr-1" /> Chưa khớp </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-gray-900">
                        {result.student?.maHocSinhTruong || result.sbd || 'N/A'}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-500">
                        {result.filename}
                      </td>
                      <td className="py-3 px-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          if (result.annotated_image) {
                            const newWindow = window.open();
                            if (newWindow) {
                              newWindow.document.write(`
                                <html>
                                  <head><title>Kết quả chấm - ${result.filename}</title></head>
                                  <body style="margin: 0; padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                                    <h2>${result.filename}</h2>
                                    ${result.student ? `
                                      <div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background: #f9f9f9;">
                                        <strong>Học sinh:</strong> ${result.student.hoTen} (${result.student.maHocSinhTruong})<br/>
                                        <strong>Số báo danh:</strong> ${result.sbd}<br/>
                                        <strong>Điểm:</strong> ${result.score}/10
                                      </div>
                                    ` : `
                                      <div style="margin: 10px 0; padding: 10px; border: 1px solid #ff9999; border-radius: 5px; background: #ffe6e6;">
                                        <strong>Không tìm thấy học sinh</strong><br/>
                                        <strong>Số báo danh phát hiện:</strong> ${result.sbd || 'Không xác định'}
                                      </div>
                                    `}
                                    <img src="data:image/jpeg;base64,${result.annotated_image}" style="max-width: 100%; height: auto; border: 1px solid #ddd;" />
                                  </body>
                                </html>
                              `);
                            }
                          } else {
                            setSelectedResult(result);
                          }
                        }}>
                          <Eye className="w-3 h-3 mr-1" /> Xem
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map((result, index) => (
                <Card key={`result-img-${index}`} className="overflow-hidden group transition-all hover:shadow-lg">
                  <CardContent className="p-0">
                    {result.annotated_image ? (
                      <img
                        src={`data:image/jpeg;base64,${result.annotated_image}`}
                        alt={`Kết quả của ${result.filename}`}
                        className="w-full h-auto object-cover aspect-[3/4] group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </CardContent>
                  <div className="p-4 border-t bg-white">
                    <h3 className="font-semibold text-sm truncate" title={result.student?.hoTen || result.sbd || result.filename}>
                      {result.student?.hoTen || result.sbd || result.filename}
                    </h3>
                    <div className="flex justify-between items-center mt-2">
                       <p className="text-sm text-muted-foreground">
                        Điểm: <span className="font-bold text-lg text-blue-600">{result.score !== null ? result.score.toFixed(2) : 'N/A'}</span>
                      </p>
                      {result.matched ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">Đã khớp</Badge>
                      ) : (
                          <Badge variant="destructive">Chưa khớp</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const OMRScanPage = () => {
  const searchParams = useSearchParams()
  const initialClassId = searchParams.get('classId')
  const initialExamId = searchParams.get('examId')
  
  const [selectedClassId, setSelectedClassId] = useState<number | null>(initialClassId ? Number(initialClassId) : null)
  const [selectedExamId, setSelectedExamId] = useState<number | null>(initialExamId ? Number(initialExamId) : null)

  const [scanMode, setScanMode] = useState<'upload' | 'webcam' | null>('webcam')
  const [files, setFiles] = useState<File[]>([])
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [isUploadProcessing, setIsUploadProcessing] = useState(false)
  const { toast } = useToast()
  
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['teacherClasses'],
    queryFn: () => classesApi.getClasses()
  })

  const { data: exams = [], isLoading: isLoadingExams } = useQuery({
    queryKey: ['exams', selectedClassId],
    queryFn: () => {
      if (!selectedClassId) return Promise.resolve([])
      return examsApi.getExams({ class_id: selectedClassId, trangThai: 'xuatBan' })
    },
    enabled: !!selectedClassId,
  })

  const selectedExam = useMemo(() => exams.find(e => e.maBaiKiemTra === selectedExamId), [exams, selectedExamId]);

  const { data: templateDetails, error: templateError, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['answerTemplateDetails', selectedExamId],
    queryFn: async () => {
      if (!selectedExamId || !selectedExam?.maMauPhieu) return null;
      
      try {
        return await answerTemplatesApi.getTemplate(selectedExam.maMauPhieu);
      } catch (error) {
        console.error('Failed to fetch template details:', error);
        // Return null instead of throwing to prevent breaking the UI
        return null;
      }
    },
    enabled: !!selectedExamId && !!selectedExam?.maMauPhieu,
    retry: 2,
    retryDelay: 1000,
  });

  const { 
    isConnected, 
    isScanning, 
    isProcessing,
    lastResult,
    startScanning, 
    captureFrame,
    saveResult,
    endSession,
  } = useOMRWebSocket({
    examId: selectedExamId ?? undefined,
    templateId: selectedExam?.maMauPhieu ?? undefined,
    onResult: (result) => {
      // Results are now handled in real-time, not automatically added to list
      console.log('Received OMR result:', result);
    },
    onResultSaved: (result) => {
      if (result.success && result.data) {
        const newScanResult: ScanResult = {
            filename: `webcam_${Date.now()}.jpg`,
            sbd: result.data.sbd || null,
            student: result.data.student || null,
            score: result.data.score || null,
            answers: result.data.answers || {},
            matched: !!result.data.student,
            annotated_image: result.data.aligned_image
        };
        setScanResults(prev => [newScanResult, ...prev]);
        toast({ 
          title: "Lưu thành công", 
          description: `Đã lưu kết quả cho SBD ${result.data.sbd || 'N/A'}` 
        });
      }
    },
  })

  const handleStartProcessing = async () => {
    if (!selectedExamId) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn mã đề thi.",
        variant: "destructive",
      });
      return;
    }

    // Removed template validation since OMR API handles it internally
    
    if (files.length === 0) {
      toast({
        title: "Chưa có ảnh",
        description: "Vui lòng tải lên ảnh phiếu trả lời cần chấm.",
        variant: "destructive",
      });
      return;
    }

    const selectedExam = exams.find(e => e.maBaiKiemTra === selectedExamId);
    if (!selectedExam?.maMauPhieu) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy thông tin mẫu phiếu của đề thi.",
          variant: "destructive",
        });
        return;
      }

    try {
      setIsUploadProcessing(true);
      
      console.log('Starting OMR batch processing with params:', {
        examId: selectedExamId,
        templateId: selectedExam.maMauPhieu,
        filesCount: files.length,
        classId: selectedClassId
      });
      
        toast({
        title: "Đang xử lý",
        description: `Đang chấm ${files.length} phiếu trả lời với AI OMR...`,
      });

      const result = await omrApi.processBatch({
        examId: selectedExamId,
        templateId: selectedExam.maMauPhieu,
        files: files,
        classId: selectedClassId || undefined
      });
      
      console.log('OMR batch processing result:', result);

      if (result && result.success && result.scoring_result && Array.isArray(result.scoring_result.results)) {
        const scoringData = result.scoring_result.results;
        const annotatedImages = result.annotated_images || {};
        
        const newResults: ScanResult[] = scoringData.map((scoringItem: any) => {
          const filename = scoringItem.filename || '';
          return {
            filename: filename,
            sbd: scoringItem.sbd || null,
            student: {
              maHocSinh: scoringItem.student_id || null,
              hoTen: scoringItem.student_name || null,
              maHocSinhTruong: scoringItem.student_code || null,
            },
            score: scoringItem.total_score !== undefined ? scoringItem.total_score : null,
            answers: scoringItem.details || {},
            matched: !!scoringItem.student_id,
            annotated_image: annotatedImages[filename] || null
          };
        });

        if (newResults.length === 0) {
          toast({
            title: "Xử lý hoàn tất",
            description: result.summary?.message || "Không có phiếu nào được chấm điểm thành công.",
          });
        } else {
          setScanResults(prev => [...newResults, ...prev]);
          setFiles([]); // Clear uploaded files
          
          toast({
            title: "Chấm bài thành công",
            description: `Đã xử lý và chấm điểm ${newResults.length} phiếu trả lời.`,
          });
        }
      } else {
        throw new Error(result?.message || result?.error || "Lỗi không xác định hoặc response không hợp lệ");
      }
    } catch (error) {
      console.error('OMR batch processing failed:', error);
      toast({
        title: "Lỗi chấm bài OMR",
        description: error instanceof Error 
          ? `Chi tiết lỗi: ${error.message}` 
          : "Có lỗi xảy ra trong hệ thống OMR. Vui lòng thử lại hoặc liên hệ hỗ trợ.",
        variant: "destructive",
      });
    } finally {
      setIsUploadProcessing(false);
    }
  };

  const resetAll = () => {
    setSelectedClassId(null);
    setSelectedExamId(null);
    setScanMode(null);
    setFiles([]);
    setScanResults([]);
  }

  const selectedClass = useMemo(() => classes.find((c: Class) => c.maLopHoc === selectedClassId), [classes, selectedClassId]);

  const { data: stats } = useQuery({
    queryKey: ['omrStats', selectedExamId, selectedClassId],
    queryFn: () => {
      if (!selectedExamId) return Promise.resolve(null);
      return omrApi.getStats(selectedExamId, selectedClassId ?? undefined);
    },
    enabled: !!selectedExamId,
  });

  const summaryStats = useMemo(() => [
    { title: "Tổng số bài chấm", value: stats?.total_scanned ?? 0, subtitle: "Số phiếu đã quét", icon: Scan, color: "blue" },
    { title: "Khớp định danh", value: `${stats?.total_matched ?? 0} / ${stats?.total_scanned ?? 0}`, subtitle: "Khớp SBD/Mã HS", icon: CheckCircle, color: "green" },
    { title: "Điểm trung bình", value: stats?.average_score?.toFixed(2) ?? 'N/A', subtitle: "Toàn bộ bài chấm", icon: BarChart3, color: "purple" },
    { title: "Tỉ lệ lỗi", value: `${stats?.error_rate?.toFixed(1) ?? 0}%`, subtitle: "Phiếu không hợp lệ", icon: AlertCircle, color: "orange" },
  ], [stats]);

  const handleSaveAllResults = async () => {
    if (!selectedExamId || scanResults.length === 0) return;
    try {
      await omrApi.saveResults(selectedExamId, scanResults);
      // Có thể xóa kết quả đã lưu khỏi UI
      setScanResults([]);
    } catch (error) {
      console.error("Failed to save results:", error);
      throw error;
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Scan className="w-6 h-6 text-white" />
            </div>
            Hệ thống OMR
          </h1>
          <p className="text-muted-foreground mt-1">
            Chấm điểm tự động phiếu trả lời trắc nghiệm
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={resetAll}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Cài đặt
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryStats.map((stat, index) => (
        <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            subtitle={stat.subtitle}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <ClassSelector
          classes={classes}
          selectedClass={selectedClass || null}
          onSelect={(cls) => {
            setSelectedClassId(cls.maLopHoc)
            setSelectedExamId(null)
            setScanMode(null)
            setScanResults([])
          }}
          isLoading={isLoadingClasses}
        />

        {selectedClass && (
          <ExamCodeSelector
            exams={exams}
            selectedExam={selectedExam || null}
            onSelect={(exam) => {
              setSelectedExamId(exam.maBaiKiemTra)
              setScanMode(null)
              setScanResults([])
            }}
            isLoading={isLoadingExams}
          />
        )}

        {selectedClass && selectedExam && (
          <ScanModeSelector
            onModeSelect={(mode) => setScanMode(mode)}
            selectedMode={scanMode}
          />
        )}

        {selectedClass && selectedExam && scanMode && (
          <div className="space-y-6">
            {scanMode === 'webcam' ? (
                <WebcamScanner
                    isConnected={isConnected}
                    isScanning={isScanning}
                    isProcessing={isProcessing}
                    onStartScan={startScanning}
                    onCaptureFrame={captureFrame}
                    onSaveResult={saveResult}
                    onEndSession={endSession}
                    lastResult={lastResult}
                />
            ) : (
                <div className="space-y-6">
              <ImageUploader
                onFilesSelected={(files) => setFiles(Array.from(files))}
                        isProcessing={isUploadProcessing}
                files={files}
                onFileRemove={(file) => setFiles(files.filter(f => f !== file))}
              />
                    
                {files.length > 0 && (
                        <Card>
                            <CardContent className="py-6">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                            <Brain className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Sẵn sàng chấm bài</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {files.length} phiếu trả lời đã được tải lên
                                            </p>
                                        </div>
                      </div>
                      <Button
                        onClick={handleStartProcessing}
                                        size="lg"
                                        className="bg-green-600 hover:bg-green-700 text-white px-8"
                                        disabled={isUploadProcessing}
                      >
                                        {isUploadProcessing ? (
                          <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                                                <Zap className="w-4 h-4 mr-2" />
                                                Bắt đầu chấm bài
                          </>
                        )}
                      </Button>
                                </div>
                    </CardContent>
                  </Card>
                )}
                </div>
            )}
            
            {!isScanning && (
            <ResultsDisplay
              results={scanResults}
                examCode={selectedExam || null}
                classId={selectedClassId ?? undefined}
                onSaveAll={handleSaveAllResults}
            />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default OMRScanPage