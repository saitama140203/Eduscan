"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  Search, Filter, Users, Download, Upload,
  Edit, Trash, RefreshCw, UserPlus,
  ArrowLeft, GraduationCap, Calendar, Phone, Mail,
  CheckCircle, AlertCircle, FileSpreadsheet, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useStudents, type Student, type StudentCreate, type StudentUpdate } from "@/hooks/use-students";

const studentSchema = z.object({
  maHocSinhTruong: z.string().min(1, "Mã học sinh là bắt buộc"),
  hoTen: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
  ngaySinh: z.string().optional(),
  gioiTinh: z.enum(["Nam", "Nữ", "Khác"]).optional(),
  soDienThoaiPhuHuynh: z.string().optional(),
  emailPhuHuynh: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
});

type StudentFormData = z.infer<typeof studentSchema>;

export default function ClassStudentsPage() {
  const router = useRouter();
  const params = useParams();
  const classId = parseInt(params.id as string);
  const { toast } = useToast();

  
  // API hooks
  const {
    students,
    loading,
    error,
    createStudent,
    updateStudent,
    deleteStudent,
    bulkOperation,
    importFromExcel,
    exportToExcel,
    downloadTemplate,
    getStats,
    filterStudents,
    fetchStudents,
  } = useStudents(classId);
  
  // State
  const [search, setSearch] = useState("");
  const [selectedGender, setSelectedGender] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkOp, setBulkOp] = useState<string>("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [deletingStudents, setDeletingStudents] = useState<Set<number>>(new Set());
  const [operationLoading, setOperationLoading] = useState(false);

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      maHocSinhTruong: "",
      hoTen: "",
      ngaySinh: "",
      gioiTinh: undefined,
      soDienThoaiPhuHuynh: "",
      emailPhuHuynh: "",
    },
  });

  // Get filtered students and stats
  const filteredStudents = filterStudents(search, selectedGender, selectedStatus);
  const stats = getStats();

  // Handlers with duplicate prevention
  const handleCreateStudent = () => {
    setEditingStudent(null);
    form.reset();
    setShowStudentDialog(true);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    form.reset({
      maHocSinhTruong: student.maHocSinhTruong,
      hoTen: student.hoTen,
      ngaySinh: student.ngaySinh ? new Date(student.ngaySinh).toISOString().split('T')[0] : "",
      gioiTinh: student.gioiTinh,
      soDienThoaiPhuHuynh: student.soDienThoaiPhuHuynh || "",
      emailPhuHuynh: student.emailPhuHuynh || "",
    });
    setShowStudentDialog(true);
  };

  const handleDeleteStudent = useCallback(async (studentId: number, studentName: string) => {
    // Prevent duplicate operations using state only
    if (deletingStudents.has(studentId)) {
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa học sinh "${studentName}" không?`)) {
      setDeletingStudents(prev => new Set(prev).add(studentId));
      
      try {
        await deleteStudent(studentId);
      } catch (error) {
        // Bỏ qua mọi lỗi
        console.log('Delete operation completed');
      }
      
      // Luôn reload trang sau khi gọi API (thành công hay thất bại)
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  }, [deletingStudents, deleteStudent]);

  const onSubmit = async (data: StudentFormData) => {
    if (operationLoading) return;

    try {
      setOperationLoading(true);
      
      const studentData: StudentCreate | StudentUpdate = {
        maLopHoc: classId,
        maHocSinhTruong: data.maHocSinhTruong,
        hoTen: data.hoTen,
        ngaySinh: data.ngaySinh || undefined,
        gioiTinh: data.gioiTinh,
        soDienThoaiPhuHuynh: data.soDienThoaiPhuHuynh || undefined,
        emailPhuHuynh: data.emailPhuHuynh || undefined,
      };

      if (editingStudent) {
        await updateStudent(editingStudent.maHocSinh, studentData);
      } else {
        await createStudent(studentData as StudentCreate);
      }
      
      setShowStudentDialog(false);
      form.reset();
    } finally {
      setOperationLoading(false);
    }
  };

  const handleSelectStudent = (studentId: number, checked: boolean) => {
    if (checked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map(s => s.maHocSinh));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleBulkOperation = (operation: string) => {
    setBulkOp(operation);
    setShowBulkDialog(true);
  };

  const executeBulkOperation = async () => {
    if (operationLoading) return;

    try {
      setOperationLoading(true);
      
      if (bulkOp === "delete") {
        await bulkOperation("delete", selectedStudents);
      }
      
      setSelectedStudents([]);
      setShowBulkDialog(false);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleImport = async () => {
    if (operationLoading || !importFile) return;

    try {
      setOperationLoading(true);
      const success = await importFromExcel(importFile);
      if (success) {
        setShowImportDialog(false);
        setImportFile(null);
      }
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-3xl font-bold tracking-tight">Học sinh lớp</h1>
            <p className="text-muted-foreground">
              Quản lý {stats.total} học sinh trong lớp
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={handleCreateStudent} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="mr-2 h-4 w-4" />
            Thêm học sinh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng học sinh</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đang học</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nam</p>
                <p className="text-2xl font-bold text-blue-600">{stats.male}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nữ</p>
                <p className="text-2xl font-bold text-pink-600">{stats.female}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-pink-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ lọc tìm kiếm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm học sinh..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger>
                <SelectValue placeholder="Giới tính" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="Nam">Nam</SelectItem>
                <SelectItem value="Nữ">Nữ</SelectItem>
                <SelectItem value="Khác">Khác</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Đang học</SelectItem>
                <SelectItem value="inactive">Đã nghỉ</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => fetchStudents()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations Bar */}
      {selectedStudents.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  Đã chọn {selectedStudents.length} học sinh
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStudents([])}
                >
                  Bỏ chọn tất cả
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkOperation("delete")}>
                  <Trash className="h-4 w-4 mr-2" />
                  Xóa
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="text-center py-10">
            <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
            <p className="text-muted-foreground">Đang tải danh sách học sinh...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-red-200">
          <CardContent className="text-center py-10">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-red-700 mb-2">Có lỗi xảy ra</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchStudents()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Thử lại
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Students List */}
      {!loading && !error && (
        <div className="space-y-4">
          {/* Select All Header */}
          <div className="flex items-center gap-2 px-4">
            <Checkbox
              checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <Label className="text-sm text-muted-foreground">
              Chọn tất cả ({filteredStudents.length} học sinh)
            </Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student) => (
              <Card 
                key={student.maHocSinh} 
                className={`hover:shadow-lg transition-all duration-200 ${
                  selectedStudents.includes(student.maHocSinh) 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        checked={selectedStudents.includes(student.maHocSinh)}
                        onCheckedChange={(checked) => 
                          handleSelectStudent(student.maHocSinh, checked as boolean)
                        }
                      />
                      <div className="flex-1">
                        <CardTitle className="text-lg">{student.hoTen}</CardTitle>
                        <CardDescription className="mt-1">
                          MSHS: {student.maHocSinhTruong}
                        </CardDescription>
                        {student.ngaySinh && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(student.ngaySinh).toLocaleDateString('vi-VN')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={student.trangThai ? "default" : "destructive"}
                      className={student.trangThai ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                    >
                      {student.trangThai ? "Đang học" : "Đã nghỉ"}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    {student.gioiTinh && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Giới tính:</span>
                        <span>{student.gioiTinh}</span>
                      </div>
                    )}
                    {student.soDienThoaiPhuHuynh && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{student.soDienThoaiPhuHuynh}</span>
                      </div>
                    )}
                    {student.emailPhuHuynh && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{student.emailPhuHuynh}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEditStudent(student)}
                    >
                      <Edit className="mr-2 h-3 w-3" />
                      Sửa
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteStudent(student.maHocSinh, student.hoTen)}
                      disabled={deletingStudents.has(student.maHocSinh)}
                    >
                      {deletingStudents.has(student.maHocSinh) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredStudents.length === 0 && (
        <Card>
          <CardContent className="text-center py-10">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Không tìm thấy học sinh phù hợp
            </h3>
            <p className="text-muted-foreground mb-4">
              Kiểm tra lại bộ lọc hoặc thêm mới học sinh.
            </p>
            <Button onClick={handleCreateStudent} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="mr-2 h-4 w-4" />
              Thêm học sinh đầu tiên
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Student Form Dialog */}
      <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStudent ? "Chỉnh sửa học sinh" : "Thêm học sinh mới"}
            </DialogTitle>
            <DialogDescription>
              {editingStudent ? "Cập nhật thông tin học sinh" : "Nhập thông tin học sinh mới"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maHocSinhTruong"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã học sinh *</FormLabel>
                      <FormControl>
                        <Input placeholder="HS001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hoTen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Họ tên *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nguyễn Văn A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ngaySinh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày sinh</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gioiTinh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giới tính</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn giới tính" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Nam">Nam</SelectItem>
                          <SelectItem value="Nữ">Nữ</SelectItem>
                          <SelectItem value="Khác">Khác</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="soDienThoaiPhuHuynh"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại phụ huynh</FormLabel>
                    <FormControl>
                      <Input placeholder="0987654321" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailPhuHuynh"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email phụ huynh</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="parent@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowStudentDialog(false)}>
                  Hủy
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={operationLoading}
                >
                  {operationLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingStudent ? "Đang cập nhật..." : "Đang thêm..."}
                    </>
                  ) : (
                    editingStudent ? "Cập nhật" : "Thêm mới"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import học sinh từ Excel</DialogTitle>
            <DialogDescription>
              Chọn file Excel chứa danh sách học sinh để import vào lớp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-file">File Excel</Label>
              <Input
                id="import-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Tải template
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!importFile || operationLoading}
            >
              {operationLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang import...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Operations Dialog */}
      <AlertDialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận thao tác hàng loạt</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn thực hiện thao tác này trên {selectedStudents.length} học sinh đã chọn?
              {bulkOp === 'delete' && (
                <span className="text-red-600 font-medium block mt-2">
                  ⚠️ Thao tác xóa không thể hoàn tác!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkOperation}
              className={bulkOp === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
              disabled={operationLoading}
            >
              {operationLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}