"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { 
  Camera, Upload, Users, FileText, Scan, Play, Pause, Square, RotateCcw, Download, Eye, CheckCircle,
  AlertCircle, Clock, BarChart3, Settings, Loader2, X, ChevronRight, Target, Zap, Brain, Image as ImageIcon, Video, Plus, Filter, Grid, List
} from "lucide-react"
import clsx from "clsx"
import { apiRequest } from '@/lib/api/base'
import { classesApi, type Class } from "@/lib/api/classes"
import { examsApi, type Exam } from "@/lib/api/exams"
import { answerTemplatesApi } from "@/lib/api/answer-templates"
import { omrApi } from "@/lib/api/omr"
import { ApiError } from "@/lib/api/base"

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

interface ScanningState {
  mode: 'upload' | 'webcam' | null
  isScanning: boolean
  isProcessing: boolean
  results: ScanResult[]
  currentScan?: ScanResult
}

// API Functions
const fetchClasses = () => classesApi.getClasses();
const fetchExamsForClass = (classId: number) => examsApi.getExams({ class_id: classId, trangThai: 'xuat_ban' });

// OMR API Functions
const processOMRImages = omrApi.processBatch
const exportOMRResults = omrApi.exportExcel
const getOMRStats = omrApi.getStats

// Components
const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = "blue",
  trend 
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  color?: string
  trend?: { value: number; label: string }
}) => (
  <Card className="hover:shadow-lg transition-all duration-300 group cursor-pointer">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-2xl font-bold">{value}</h3>
            {trend && (
              <span className={clsx(
                "text-xs font-medium px-2 py-1 rounded-full",
                trend.value >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className={clsx(
          "w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300",
          color === "blue" && "bg-blue-100 text-blue-600",
          color === "green" && "bg-green-100 text-green-600",
          color === "purple" && "bg-purple-100 text-purple-600",
          color === "orange" && "bg-orange-100 text-orange-600"
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
  </Card>
)

const ClassSelector = ({ 
  classes, 
  selectedClass, 
  onSelect,
  isLoading
}: {
  classes: Class[]
  selectedClass: Class | null
  onSelect: (classItem: Class) => void
  isLoading: boolean
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Chọn lớp học</CardTitle>
              <p className="text-sm text-muted-foreground">Lựa chọn lớp để bắt đầu chấm điểm</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={clsx(
          "gap-4",
          viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"
        )}>
          {classes.map((classItem) => (
            <div
              key={classItem.maLopHoc}
              className={clsx(
                "p-4 rounded-lg border transition-all duration-200 cursor-pointer group",
                "hover:shadow-md hover:border-blue-300",
                selectedClass?.maLopHoc === classItem.maLopHoc 
                  ? "border-blue-500 bg-blue-50 shadow-md" 
                  : "border-gray-200 hover:bg-gray-50"
              )}
              onClick={() => onSelect(classItem)}
            >
              <div className={clsx(
                "flex items-center",
                viewMode === 'grid' ? "flex-col text-center space-y-3" : "space-x-4"
              )}>
                <div className={clsx(
                  "rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200",
                  viewMode === 'grid' ? "w-12 h-12" : "w-10 h-10",
                  selectedClass?.maLopHoc === classItem.maLopHoc 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600"
                )}>
                  <Users className={clsx(viewMode === 'grid' ? "w-6 h-6" : "w-5 h-5")} />
                </div>
                <div className="flex-1">
                  <h3 className={clsx(
                    "font-semibold transition-colors",
                    viewMode === 'grid' ? "text-base" : "text-sm",
                    selectedClass?.maLopHoc === classItem.maLopHoc ? "text-blue-900" : "text-gray-900 group-hover:text-blue-700"
                  )}>
                    {classItem.tenLop}
                  </h3>
                  <p className={clsx(
                    "text-muted-foreground",
                    viewMode === 'grid' ? "text-sm" : "text-xs"
                  )}>
                    {classItem.capHoc} • {classItem.total_students} học sinh
                  </p>
                  {viewMode === 'grid' && (
                    <div className="flex justify-center mt-2">
                      <Badge variant="outline" className={clsx(
                        selectedClass?.maLopHoc === classItem.maLopHoc 
                          ? "border-blue-500 text-blue-700" 
                          : "border-gray-300"
                      )}>
                        {classItem.total_exams} mã đề
                      </Badge>
                    </div>
                  )}
                </div>
                {viewMode === 'list' && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={clsx(
                      selectedClass?.maLopHoc === classItem.maLopHoc 
                        ? "border-blue-500 text-blue-700" 
                        : "border-gray-300"
                    )}>
                      {classItem.total_exams} mã đề
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const ExamCodeSelector = ({
  exams,
  selectedExam,
  onSelect,
  isLoading
}: {
  exams: Exam[]
  selectedExam: Exam | null
  onSelect: (exam: Exam) => void
  isLoading: boolean
}) => (
  <Card>
    <CardHeader className="pb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <CardTitle>Chọn mã đề</CardTitle>
          <p className="text-sm text-muted-foreground">Lựa chọn đề thi cần chấm điểm</p>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exams.map((exam) => (
          <div
            key={exam.maBaiKiemTra}
            className={clsx(
              "p-4 rounded-lg border transition-all duration-200 cursor-pointer group",
              "hover:shadow-md hover:border-green-300",
              selectedExam?.maBaiKiemTra === exam.maBaiKiemTra 
                ? "border-green-500 bg-green-50 shadow-md" 
                : "border-gray-200 hover:bg-gray-50"
            )}
            onClick={() => onSelect(exam)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={clsx(
                    "font-semibold transition-colors",
                    selectedExam?.maBaiKiemTra === exam.maBaiKiemTra ? "text-green-900" : "text-gray-900"
                  )}>
                    {exam.tieuDe}
                  </h3>
                  <Badge className={clsx(
                    selectedExam?.maBaiKiemTra === exam.maBaiKiemTra 
                      ? "bg-green-600 text-white" 
                      : "bg-gray-100 text-gray-700"
                  )}>
                    {exam.tongSoCau} câu
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{exam.moTa || 'Không có mô tả'}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(exam.thoiGianTao).toLocaleDateString('vi-VN')}
                  </span>
                  <span className={clsx(
                    "flex items-center gap-1",
                    exam.trangThai === 'xuatBan' ? "text-green-600" : "text-red-600"
                  )}>
                    {exam.trangThai === 'xuatBan' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {exam.trangThai === 'xuatBan' ? "Sẵn sàng" : "Nháp"}
                  </span>
                </div>
              </div>
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                selectedExam?.maBaiKiemTra === exam.maBaiKiemTra 
                  ? "bg-green-600 text-white scale-110" 
                  : "bg-gray-100 text-gray-400 group-hover:bg-green-100 group-hover:text-green-600"
              )}>
                <Target className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const ScanModeSelector = ({
  onModeSelect,
  selectedMode
}: {
  onModeSelect: (mode: 'upload' | 'webcam') => void
  selectedMode: 'upload' | 'webcam' | null
}) => (
  <Card>
    <CardHeader className="pb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Scan className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <CardTitle>Chọn phương thức chấm</CardTitle>
          <p className="text-sm text-muted-foreground">Lựa chọn cách thức quét phiếu trả lời</p>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Mode */}
        <div
          className={clsx(
            "p-6 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group",
            "hover:border-blue-400 hover:bg-blue-50/50",
            selectedMode === 'upload' 
              ? "border-blue-500 bg-blue-50 shadow-lg" 
              : "border-gray-300 hover:shadow-md"
          )}
          onClick={() => onModeSelect('upload')}
        >
          <div className="text-center space-y-4">
            <div className={clsx(
              "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all duration-300",
              "group-hover:scale-110",
              selectedMode === 'upload' 
                ? "bg-blue-600 text-white shadow-lg" 
                : "bg-blue-100 text-blue-600 group-hover:bg-blue-200"
            )}>
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h3 className={clsx(
                "text-lg font-semibold mb-2 transition-colors",
                selectedMode === 'upload' ? "text-blue-900" : "text-gray-900 group-hover:text-blue-700"
              )}>
                Tải lên ảnh
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chọn và tải lên ảnh phiếu trả lời từ thiết bị của bạn
              </p>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <ImageIcon className="w-3 h-3" />
                <span>Hỗ trợ JPG, PNG, PDF</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-3 h-3" />
                <span>Xử lý hàng loạt</span>
              </div>
            </div>
          </div>
        </div>

        {/* Webcam Mode */}
        <div
          className={clsx(
            "p-6 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group",
            "hover:border-green-400 hover:bg-green-50/50",
            selectedMode === 'webcam' 
              ? "border-green-500 bg-green-50 shadow-lg" 
              : "border-gray-300 hover:shadow-md"
          )}
          onClick={() => onModeSelect('webcam')}
        >
          <div className="text-center space-y-4">
            <div className={clsx(
              "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all duration-300",
              "group-hover:scale-110",
              selectedMode === 'webcam' 
                ? "bg-green-600 text-white shadow-lg" 
                : "bg-green-100 text-green-600 group-hover:bg-green-200"
            )}>
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h3 className={clsx(
                "text-lg font-semibold mb-2 transition-colors",
                selectedMode === 'webcam' ? "text-green-900" : "text-gray-900 group-hover:text-green-700"
              )}>
                Quét trực tiếp
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sử dụng camera để quét phiếu trả lời theo thời gian thực
              </p>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <Video className="w-3 h-3" />
                <span>Realtime scanning</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Brain className="w-3 h-3" />
                <span>AI detection</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

const ImageUploader = ({
  onFilesSelected,
  isProcessing,
  files,
  onFileRemove
}: {
  onFilesSelected: (files: FileList) => void
  isProcessing: boolean
  files: File[]
  onFileRemove: (file: File) => void
}) => {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      onFilesSelected(files)
    }
  }, [onFilesSelected])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFilesSelected(files)
    }
  }, [onFilesSelected])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Tải lên phiếu trả lời
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={clsx(
            "relative border-2 border-dashed rounded-xl p-8 transition-all duration-300",
            "hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer",
            dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300",
            isProcessing && "pointer-events-none opacity-60"
          )}
          onDrop={handleDrop}
          onDragOver={e => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileInput}
            className="hidden"
            disabled={isProcessing}
          />
          
          <div className="text-center space-y-4">
            {isProcessing ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
                <div>
                  <p className="text-lg font-medium text-blue-600">Đang xử lý...</p>
                  <p className="text-sm text-muted-foreground">AI đang phân tích phiếu trả lời</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    {dragOver ? "Thả file vào đây" : "Kéo thả hoặc click để chọn file"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Hỗ trợ JPG, PNG, PDF • Tối đa 10MB mỗi file
                  </p>
                </div>
                <Button variant="outline" size="lg" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Chọn file
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-4">
          {files.map((file, i) => (
            <div key={i} className="relative">
              <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-auto rounded-md" />
              <button onClick={() => onFileRemove(file)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X size={12} /></button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const WebcamScanner = ({
  isScanning,
  onStartScan,
  onStopScan,
  onCapture
}: {
  isScanning: boolean
  onStartScan: () => void
  onStopScan: () => void
  onCapture: () => void
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use rear camera on mobile
        }
      })
      
      setStream(mediaStream)
      setHasPermission(true)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Camera access denied:', error)
      setHasPermission(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  useEffect(() => {
    if (isScanning) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => stopCamera()
  }, [isScanning, startCamera, stopCamera])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Quét trực tiếp bằng camera
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Camera Preview */}
          <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {hasPermission === false ? (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center space-y-3">
                  <AlertCircle className="w-12 h-12 mx-auto text-red-400" />
                  <p className="text-lg font-medium">Không thể truy cập camera</p>
                  <p className="text-sm text-gray-300">Vui lòng cấp quyền sử dụng camera</p>
                  <Button variant="outline" onClick={startCamera}>
                    Thử lại
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay guides */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center">
                    <div className="text-white text-center">
                      <Scan className="w-8 h-8 mx-auto mb-2 opacity-75" />
                      <p className="text-sm font-medium">Đặt phiếu trả lời vào khung này</p>
                    </div>
                  </div>
                </div>
                
                {/* Scanning indicator */}
                {isScanning && (
                  <div className="absolute top-4 left-4">
                    <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-sm font-medium">ĐANG QUÉT</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {!isScanning ? (
              <Button 
                size="lg" 
                onClick={onStartScan}
                disabled={hasPermission === false}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-5 h-5 mr-2" />
                Bắt đầu quét
              </Button>
            ) : (
              <>
                <Button 
                  size="lg" 
                  variant="destructive"
                  onClick={onStopScan}
                >
                  <Square className="w-5 h-5 mr-2" />
                  Dừng quét
                </Button>
                <Button 
                  size="lg"
                  onClick={onCapture}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Chụp ảnh
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const ResultsDisplay = ({ results, examCode, classId }: { results: ScanResult[], examCode: Exam | null, classId?: number | null }) => {
  const { toast } = useToast()
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null)

  const handleExport = async () => {
    if (!examCode || !examCode.maBaiKiemTra) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn mã đề thi trước khi xuất file.",
        variant: "destructive"
      })
      return;
    }

    toast({ title: "Đang xử lý", description: "Đang chuẩn bị file Excel, vui lòng chờ..." })
    try {
      const blob = await exportOMRResults(examCode.maBaiKiemTra, classId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ket-qua-${examCode.tieuDe.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast({ title: "Thành công", description: "Đã tải xuống file Excel kết quả." })
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Xuất file thất bại",
        description: error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại.",
        variant: "destructive"
      })
    }
  };

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
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
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
            <p className="text-2xl font-bold text-purple-600">{results.filter(r => r.score !== null && typeof r.score === 'number' && isFinite(r.score)).length > 0 ? (results.filter(r => r.score !== null && typeof r.score === 'number' && isFinite(r.score)).reduce((sum, r) => sum + (r.score || 0), 0) / results.filter(r => r.score !== null && typeof r.score === 'number' && isFinite(r.score)).length).toFixed(2) : 'N/A'}</p>
            <p className="text-sm text-purple-600/80">Điểm TB</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{results.filter(r => r.score !== null && typeof r.score === 'number' && isFinite(r.score)).length > 0 ? Math.max(...results.filter(r => r.score !== null && typeof r.score === 'number' && isFinite(r.score)).map(r => r.score || 0)) : 'N/A'}</p>
            <p className="text-sm text-orange-600/80">Điểm cao nhất</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{results.filter(r => r.score !== null && typeof r.score === 'number' && isFinite(r.score)).length > 0 ? Math.min(...results.filter(r => r.score !== null && typeof r.score === 'number' && isFinite(r.score)).map(r => r.score || 0)) : 'N/A'}</p>
            <p className="text-sm text-red-600/80">Điểm thấp nhất</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Kết quả chấm điểm</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Xuất Excel
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Xem chi tiết
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                      <span className={clsx(
                        "font-semibold",
                        result.score === null ? "text-gray-400" :
                        result.score >= 8 ? "text-green-600" :
                        result.score >= 6.5 ? "text-orange-600" : "text-red-600"
                      )}>
                        {result.score !== null ? result.score : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {result.matched ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Đã khớp
                      </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <X className="w-3 h-3 mr-1" />
                          Chưa khớp
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-gray-900">
                      {result.student?.maHocSinhTruong || result.sbd || 'N/A'}
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-500">
                      {result.filename}
                    </td>
                    <td className="py-3 px-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
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
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Xem
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main Component
export default function TeacherOMRPage() {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [scanMode, setScanMode] = useState<'upload' | 'webcam' | null>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['teacherClasses'],
    queryFn: () => classesApi.getClasses()
  })

  const { data: exams = [], isLoading: isLoadingExams } = useQuery({
    queryKey: ['exams', selectedClass?.maLopHoc],
    queryFn: () => {
      if (!selectedClass?.maLopHoc) return Promise.resolve([])
      return examsApi.getExams({ class_id: selectedClass.maLopHoc, trangThai: 'xuatBan' })
    },
    enabled: !!selectedClass,
  })

  const processMutation = useMutation({
    mutationFn: omrApi.processBatch,
    onMutate: () => {
      toast({
        title: "Bắt đầu chấm bài...",
        description: "Hệ thống đang xử lý các phiếu trả lời. Vui lòng chờ trong giây lát.",
      });
    },
    onSuccess: (data: any) => {
      const newResults = data?.results || []
      setScanResults(prev => [...prev, ...newResults]);
      toast({
        title: "Hoàn tất!",
        description: `Đã xử lý xong ${newResults.length} bài thi.`,
      });
      if (selectedExam) {
        queryClient.invalidateQueries({ queryKey: ['omrStats', selectedExam.maBaiKiemTra, selectedClass?.maLopHoc] });
      }
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : "Chấm bài thất bại. Vui lòng thử lại.";
      toast({
        title: "Đã xảy ra lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setFiles([]); // Clear files after processing
    }
  })

  const handleStartProcessing = () => {
    if (!selectedExam || !selectedExam.maBaiKiemTra || !selectedExam.maMauPhieu) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn lớp, mã đề và đảm bảo mã đề đã được gán mẫu phiếu.",
        variant: "destructive",
      });
      return;
    }
    if (files.length === 0) {
      toast({
        title: "Chưa có ảnh",
        description: "Vui lòng tải lên ảnh phiếu trả lời cần chấm.",
        variant: "destructive",
      });
      return;
    }
    processMutation.mutate({
      examId: selectedExam.maBaiKiemTra,
      templateId: selectedExam.maMauPhieu,
      files,
      classId: selectedClass?.maLopHoc,
    });
  };

  const resetAll = () => {
    setSelectedClass(null);
    setSelectedExam(null);
    setScanMode(null);
    setFiles([]);
    setScanResults([]);
  }

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['omrStats', selectedExam?.maBaiKiemTra, selectedClass?.maLopHoc],
    queryFn: () => {
      if (!selectedExam || !selectedExam.maBaiKiemTra) return Promise.resolve(null);
      return getOMRStats(selectedExam.maBaiKiemTra, selectedClass?.maLopHoc);
    },
    enabled: !!selectedExam,
    refetchInterval: 5000, // Refetch stats every 5 seconds
  });

  const summaryStats = useMemo(() => [
    { title: "Tổng số bài chấm", value: stats?.total_scanned ?? 0, subtitle: "Số phiếu đã quét", icon: Scan, color: "blue" },
    { title: "Khớp định danh", value: `${stats?.total_matched ?? 0} / ${stats?.total_scanned ?? 0}`, subtitle: "Khớp SBD/Mã HS", icon: CheckCircle, color: "green" },
    { title: "Điểm trung bình", value: stats?.average_score?.toFixed(2) ?? 'N/A', subtitle: "Toàn bộ bài chấm", icon: BarChart3, color: "purple" },
    { title: "Tỉ lệ lỗi", value: `${stats?.error_rate?.toFixed(1) ?? 0}%`, subtitle: "Phiếu không hợp lệ", icon: AlertCircle, color: "orange" },
  ], [stats]);

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

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Tiến độ thiết lập</span>
              <span className="text-muted-foreground">{selectedExam ? "Đang chấm bài" : "Chọn lớp và mã đề"}
              </span>
            </div>
            <Progress value={selectedExam ? 50 : 0} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Chọn lớp</span>
              <span>Chọn mã đề</span>
              <span>Chọn phương thức</span>
              <span>Bắt đầu chấm</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Lớp học đã chọn"
          value={selectedClass?.tenLop || "Chưa chọn"}
          subtitle={selectedClass ? `${selectedClass.capHoc} • ${selectedClass.total_students} HS` : "Vui lòng chọn lớp"}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Mã đề đang dùng"
          value={selectedExam?.tieuDe || "Chưa chọn"}
          subtitle={selectedExam ? `${selectedExam.tongSoCau} câu hỏi` : "Vui lòng chọn mã đề"}
          icon={FileText}
          color="green"
        />
        <StatsCard
          title="Phương thức"
          value={
            scanMode === 'upload' ? "Tải ảnh" :
            scanMode === 'webcam' ? "Camera" : "Chưa chọn"
          }
          subtitle={
            scanMode === 'upload' ? "Xử lý hàng loạt" :
            scanMode === 'webcam' ? "Realtime scanning" : "Vui lòng chọn phương thức"
          }
          icon={scanMode === 'upload' ? Upload : Camera}
          color="purple"
        />
        <StatsCard
          title="Đã chấm"
          value={scanResults.length}
          subtitle={`${scanResults.length} phiếu trả lời`}
          icon={CheckCircle}
          color="orange"
          trend={scanResults.length > 0 ? { value: 100, label: "hoàn thành" } : undefined}
        />
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Step 1: Class Selection */}
        <ClassSelector
          classes={classes}
          selectedClass={selectedClass}
          onSelect={cls => {
            setSelectedClass(cls)
            setSelectedExam(null)
            setScanMode(null)
            setScanResults([])
          }}
          isLoading={isLoadingClasses}
        />

        {/* Step 2: Exam Code Selection */}
        {selectedClass && (
          <ExamCodeSelector
            exams={exams}
            selectedExam={selectedExam}
            onSelect={exam => {
              setSelectedExam(exam)
              setScanMode(null)
              setScanResults([])
            }}
            isLoading={isLoadingExams}
          />
        )}

        {/* Step 3: Scan Mode Selection */}
        {selectedClass && selectedExam && (
          <ScanModeSelector
            onModeSelect={(mode) => setScanMode(mode)}
            selectedMode={scanMode}
          />
        )}

        {/* Step 4: Scanning Interface */}
        {selectedClass && selectedExam && scanMode && (
          <div className="space-y-6">
            {scanMode === 'upload' ? (
              <ImageUploader
                onFilesSelected={(files) => setFiles(Array.from(files))}
                isProcessing={processMutation.isPending}
                files={files}
                onFileRemove={(file) => setFiles(files.filter(f => f !== file))}
              />
            ) : (
              <WebcamScanner
                isScanning={scanMode === 'webcam'}
                onStartScan={handleStartProcessing}
                onStopScan={() => setScanMode(null)}
                onCapture={handleStartProcessing}
              />
            )}

            {/* Results Display */}
            <ResultsDisplay
              results={scanResults}
              examCode={selectedExam}
              classId={selectedClass?.maLopHoc}
            />
          </div>
        )}
      </div>
    </div>
  )
}