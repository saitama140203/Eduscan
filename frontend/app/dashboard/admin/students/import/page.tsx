"use client"

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { studentsApi } from "@/lib/api/students"
import { 
  Upload, Download, FileSpreadsheet, Users, 
  CheckCircle, AlertCircle, Loader2, ArrowLeft 
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export default function StudentImportPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  // Mock classes data - trong thực tế sẽ fetch từ API
  const mockClasses = [
    { id: 1, name: "10A1", organization: "THPT ABC" },
    { id: 2, name: "10A2", organization: "THPT ABC" },
    { id: 3, name: "11B1", organization: "THPT ABC" },
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      const blob = await studentsApi.downloadTemplate()
      studentsApi.downloadFile(blob, 'template_import_hoc_sinh.xlsx')
      toast({
        title: "Thành công",
        description: "Đã tải template thành công",
      })
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tải template",
        variant: "destructive",
      })
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile || !selectedClassId) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn file và lớp học",
        variant: "destructive",
      })
      return
    }

    setImporting(true)
    try {
      const result = await studentsApi.importFromExcel(selectedFile, parseInt(selectedClassId))
      setImportResult(result)
      
      toast({
        title: "Import thành công",
        description: `Đã import ${result.successful}/${result.total_processed} học sinh`,
      })
    } catch (error: any) {
      toast({
        title: "Lỗi import",
        description: error.message || "Không thể import file",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const classId = selectedClassId ? parseInt(selectedClassId) : undefined
      const blob = await studentsApi.exportToExcel(classId)
      const filename = classId 
        ? `danh_sach_hoc_sinh_lop_${classId}.xlsx`
        : 'danh_sach_tat_ca_hoc_sinh.xlsx'
      studentsApi.downloadFile(blob, filename)
      
      toast({
        title: "Export thành công",
        description: "Đã xuất danh sách học sinh",
      })
    } catch (error: any) {
      toast({
        title: "Lỗi export",
        description: error.message || "Không thể xuất file",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Import/Export Học Sinh</h1>
          <p className="text-muted-foreground">
            Quản lý danh sách học sinh bằng file Excel
          </p>
        </div>
      </div>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Tải Template Mẫu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tải file Excel mẫu với 5 học sinh để tham khảo định dạng và cách điền thông tin.
          </p>
          <Button 
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="bg-green-600 hover:bg-green-700"
          >
            {downloadingTemplate ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Tải Template Excel
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Học Sinh
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="class-select">Chọn lớp học</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn lớp học..." />
                </SelectTrigger>
                <SelectContent>
                  {mockClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name} - {cls.organization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="file-input">Chọn file Excel</Label>
              <Input
                id="file-input"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {selectedFile && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm">
                <strong>File đã chọn:</strong> {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Kích thước: {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}

          <Button 
            onClick={handleImport}
            disabled={!selectedFile || !selectedClassId || importing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang import...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Học Sinh
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Result */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Kết Quả Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{importResult.total_processed}</div>
                <div className="text-sm text-muted-foreground">Tổng xử lý</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.successful}</div>
                <div className="text-sm text-muted-foreground">Thành công</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                <div className="text-sm text-muted-foreground">Lỗi</div>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">Danh sách lỗi:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importResult.errors.map((error: string, index: number) => (
                    <Badge key={index} variant="destructive" className="block w-fit">
                      {error}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Học Sinh
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Xuất danh sách học sinh ra file Excel. Có thể xuất theo lớp cụ thể hoặc tất cả học sinh.
          </p>
          
          <div>
            <Label>Lớp học (để trống để xuất tất cả)</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn lớp học hoặc để trống..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tất cả học sinh</SelectItem>
                {mockClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name} - {cls.organization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleExport}
            disabled={exporting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xuất...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 