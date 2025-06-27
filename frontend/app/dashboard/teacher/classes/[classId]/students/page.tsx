"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { classesApi } from "@/lib/api/classes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, UserPlus, FileDown, Upload, Download, FileSpreadsheet, Users, AlertCircle } from "lucide-react"
import { GenericUserTable } from '@/components/users/GenericUserTable'
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx'

interface StudentImportData {
  maHocSinhTruong?: string
  hoTen: string
  ngaySinh?: string
  gioiTinh?: string
  diaChi?: string
  soDienThoai?: string
  email?: string
  tenPhuHuynh?: string
  sdtPhuHuynh?: string
}

export default function TeacherClassStudentsPage() {
  const router = useRouter()
  const params = useParams()
  const classId = Number(params.classId)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Import states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [uploadedSheets, setUploadedSheets] = useState<{ sheetName: string; data: any[][] }[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [importPreview, setImportPreview] = useState<StudentImportData[]>([])
  const [isImporting, setIsImporting] = useState(false)

  const { data: classDetails, isLoading: isLoadingClass } = useQuery({
    queryKey: ['classDetails', classId],
    queryFn: () => classesApi.getClass(classId),
    enabled: !!classId,
  })

  const { 
    data: students, 
    isLoading: isLoadingStudents, 
    isError,
    error,
    refetch: refetchStudents
  } = useQuery({
    queryKey: ['classStudents', classId],
    queryFn: () => classesApi.getStudentsInClass(classId),
    enabled: !!classId,
  })

  // Import mutation
  const importStudentsMutation = useMutation({
    mutationFn: async (studentsData: StudentImportData[]) => {
      // Call API to import students
      const response = await fetch(`/api/v1/classes/${classId}/students/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ students: studentsData }),
      })
      
      if (!response.ok) {
        throw new Error('Không thể import học sinh')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      toast({
        title: "Import thành công",
        description: `Đã import ${data.imported || importPreview.length} học sinh vào lớp ${classDetails?.tenLop}.`,
      })
      refetchStudents()
      setIsImportDialogOpen(false)
      resetImportState()
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi import",
        description: error.message || "Không thể import học sinh. Vui lòng kiểm tra lại dữ liệu.",
        variant: "destructive",
      })
    }
  })

  const isLoading = isLoadingClass || isLoadingStudents

  const handleViewStudentDetails = (student: any) => {
    router.push(`/dashboard/teacher/students/${student.maHocSinh}`)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Lỗi Định Dạng File",
        description: "Vui lòng chỉ upload file có định dạng .xlsx hoặc .xls",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        const sheets = workbook.SheetNames.map(sheetName => {
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          return { sheetName, data: jsonData as any[][] }
        })

        if (sheets.length === 0) {
          toast({
            title: "File Rỗng",
            description: "File Excel không có sheet nào để đọc.",
            variant: "destructive",
          })
          return
        }

        setUploadedSheets(sheets)
        setSelectedSheet(sheets[0].sheetName)

        toast({
          title: "Đọc File Thành Công",
          description: `Đã tìm thấy ${sheets.length} sheet. Vui lòng chọn sheet chứa dữ liệu học sinh.`,
        })

      } catch (error) {
        console.error("Error parsing Excel file:", error)
        toast({
          title: "Lỗi Xử Lý File",
          description: "Không thể đọc hoặc xử lý file Excel. Vui lòng kiểm tra lại định dạng.",
          variant: "destructive",
        })
      }
    }
    reader.readAsBinaryString(file)
  }

  const processSheetData = (sheetData: any[][]) => {
    if (!sheetData || sheetData.length < 2) return []

    // Skip header row
    const dataRows = sheetData.slice(1)
    const studentsData: StudentImportData[] = []

    dataRows.forEach((row, index) => {
      if (!row || row.length === 0) return

      // Map columns based on template structure
      const student: StudentImportData = {
        maHocSinhTruong: row[0]?.toString().trim() || `HS${Date.now()}_${index}`,
        hoTen: row[1]?.toString().trim() || '',
        ngaySinh: row[2] ? formatExcelDate(row[2]) : '',
        gioiTinh: row[3]?.toString().trim() || 'Nam',
        diaChi: row[4]?.toString().trim() || '',
        soDienThoai: row[5]?.toString().trim() || '',
        email: row[6]?.toString().trim() || '',
        tenPhuHuynh: row[7]?.toString().trim() || '',
        sdtPhuHuynh: row[8]?.toString().trim() || '',
      }

      // Only add if has required fields
      if (student.hoTen) {
        studentsData.push(student)
      }
    })

    return studentsData
  }

  const formatExcelDate = (excelDate: any) => {
    try {
      if (typeof excelDate === 'number') {
        // Excel date serial number
        const date = new Date((excelDate - 25569) * 86400 * 1000)
        return date.toISOString().split('T')[0]
      } else if (typeof excelDate === 'string') {
        // Try to parse as date string
        const date = new Date(excelDate)
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0]
        }
      }
      return excelDate?.toString() || ''
    } catch {
      return excelDate?.toString() || ''
    }
  }

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName)
    const sheetData = uploadedSheets.find(s => s.sheetName === sheetName)?.data
    if (sheetData) {
      const processedData = processSheetData(sheetData)
      setImportPreview(processedData)
    }
  }

  const handleImport = async () => {
    if (importPreview.length === 0) {
      toast({
        title: "Không có dữ liệu",
        description: "Vui lòng chọn file và sheet chứa dữ liệu học sinh.",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    try {
      await importStudentsMutation.mutateAsync(importPreview)
    } finally {
      setIsImporting(false)
    }
  }

  const resetImportState = () => {
    setUploadedSheets([])
    setSelectedSheet('')
    setImportPreview([])
  }

  const downloadTemplate = () => {
    // Create sample data
    const templateData = [
      ['Mã học sinh', 'Họ tên', 'Ngày sinh', 'Giới tính', 'Địa chỉ', 'Số điện thoại', 'Email', 'Tên phụ huynh', 'SĐT phụ huynh'],
      ['HS001', 'Nguyễn Văn A', '2005-01-15', 'Nam', '123 Đường ABC, Q1, TP.HCM', '0901234567', 'nva@email.com', 'Nguyễn Văn B', '0987654321'],
      ['HS002', 'Trần Thị B', '2005-02-20', 'Nữ', '456 Đường DEF, Q2, TP.HCM', '0902345678', 'ttb@email.com', 'Trần Văn C', '0987654322'],
    ]

    const ws = XLSX.utils.aoa_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách học sinh')
    XLSX.writeFile(wb, `template_hoc_sinh_lop_${classDetails?.tenLop || classId}.xlsx`)

    toast({
      title: "Tải template thành công",
      description: "File mẫu đã được tải về. Vui lòng điền thông tin học sinh theo mẫu.",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Danh sách học sinh
          </h1>
          <p className="text-muted-foreground">
            Lớp: {isLoadingClass ? "Đang tải..." : classDetails?.tenLop || "Không rõ"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tổng số: {students?.length || 0} học sinh</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Tải file mẫu
            </Button>
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export danh sách
            </Button>
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import Excel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import học sinh từ file Excel</DialogTitle>
                  <DialogDescription>
                    Upload file Excel chứa danh sách học sinh để import vào lớp {classDetails?.tenLop}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="excel-file">Chọn file Excel (.xlsx, .xls)</Label>
                    <Input
                      id="excel-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground">
                      File phải có cột: Mã học sinh, Họ tên, Ngày sinh, Giới tính, Địa chỉ, SĐT, Email, Tên PH, SĐT PH
                    </p>
                  </div>

                  {/* Sheet Selection */}
                  {uploadedSheets.length > 0 && (
                    <div className="space-y-2">
                      <Label>Chọn sheet dữ liệu</Label>
                      <Select value={selectedSheet} onValueChange={handleSheetChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn sheet chứa dữ liệu học sinh" />
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

                  {/* Preview Data */}
                  {importPreview.length > 0 && (
                    <div className="space-y-2">
                      <Label>Xem trước dữ liệu ({importPreview.length} học sinh)</Label>
                      <div className="border rounded-lg max-h-60 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-2 text-left">Mã HS</th>
                              <th className="p-2 text-left">Họ tên</th>
                              <th className="p-2 text-left">Ngày sinh</th>
                              <th className="p-2 text-left">Giới tính</th>
                              <th className="p-2 text-left">Địa chỉ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.slice(0, 5).map((student, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">{student.maHocSinhTruong}</td>
                                <td className="p-2 font-medium">{student.hoTen}</td>
                                <td className="p-2">{student.ngaySinh}</td>
                                <td className="p-2">{student.gioiTinh}</td>
                                <td className="p-2">{student.diaChi}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {importPreview.length > 5 && (
                          <p className="p-2 text-center text-muted-foreground">
                            ... và {importPreview.length - 5} học sinh khác
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsImportDialogOpen(false)}
                    >
                      Hủy
                    </Button>
                    <Button 
                      onClick={handleImport} 
                      disabled={importPreview.length === 0 || isImporting}
                    >
                      {isImporting ? "Đang import..." : `Import ${importPreview.length} học sinh`}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Thêm học sinh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <TableSkeleton />}
          {isError && (
             <Alert variant="destructive">
               <AlertTitle>Lỗi</AlertTitle>
               <AlertDescription>
                 Không thể tải danh sách học sinh. Lỗi: {error?.message || "Unknown error"}
               </AlertDescription>
             </Alert>
          )}
          {!isLoading && !isError && students && (
            <GenericUserTable 
              users={students}
              onViewDetails={handleViewStudentDetails}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}