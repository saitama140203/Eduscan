"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClasses, useDeleteClass } from "@/hooks/useClasses";
import { apiRequest } from "@/lib/api/base";
import { Class } from "@/lib/api/classes";
import {
  Plus, Search, Filter, Eye, BookOpen, Users, ShieldCheck, XCircle,
  BarChart3, Settings, Trash, Download, Upload, FileSpreadsheet,
  Calendar, Building, GraduationCap, CheckSquare, Square,
  MoreHorizontal, RefreshCw, SortAsc, SortDesc, TrendingUp,
  AlertCircle, CheckCircle, Clock, Target
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";

interface AdvancedFilters {
  capHoc?: string;
  namHoc?: string;
  trangThai?: boolean;
  dateFrom?: string;
  dateTo?: string;
  minStudents?: number;
  maxStudents?: number;
}

interface BulkOperation {
  type: 'delete' | 'update_teacher' | 'update_status' | 'move_organization';
  data?: any;
}

export default function AdminClassesPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Basic filters
  const [search, setSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedOrg, setSelectedOrg] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  
  // Sorting
  const [sortBy, setSortBy] = useState("tenLop");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Bulk operations
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation | null>(null);
  
  // Import/Export
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // Real-time stats
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  
  const debouncedSearch = useDebounce(search, 150); // Giảm từ 500ms xuống 150ms
  const deleteClassMutation = useDeleteClass();

  // Build query parameters for API
  const queryParams = {
    search: debouncedSearch || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    cap_hoc: selectedGrade !== "all" ? selectedGrade : undefined,
    nam_hoc: selectedYear !== "all" ? selectedYear : undefined,
    trang_thai: selectedStatus !== "all" ? selectedStatus === "active" : undefined,
    org_id: selectedOrg !== "all" ? parseInt(selectedOrg) : undefined,
    ...advancedFilters
  };

  // Sử dụng hook đã tối ưu
  const { data: classes = [], isLoading, refetch } = useClasses(queryParams);

  // Load dashboard stats
  const loadDashboardStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const data = await apiRequest('/classes/analytics/dashboard');
      setDashboardStats(data);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  // Lấy danh sách tổ chức từ dữ liệu
  const orgOptions = Array.from(new Set(classes.map((cls: Class) => cls.maToChuc)))
    .map((maToChuc) => {
      const classWithOrg = classes.find((c: Class) => c.maToChuc === maToChuc);
      return {
        value: maToChuc,
        label: classWithOrg?.tenToChuc || `Tổ chức #${maToChuc}`
      };
    });

  // Lấy danh sách năm học
  const yearOptions = Array.from(new Set(classes.map((cls: Class) => cls.namHoc).filter(Boolean))) as string[];

  // Lọc dữ liệu
  const filteredClasses = classes.filter((classItem: Class) => {
    const matchesSearch = classItem.tenLop.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesGrade = selectedGrade === "all" || (classItem.capHoc || "") === selectedGrade;
    const matchesOrg = selectedOrg === "all" || String(classItem.maToChuc) === String(selectedOrg);
    const matchesStatus = selectedStatus === "all"
      || (selectedStatus === "active" && classItem.trangThai)
      || (selectedStatus === "inactive" && !classItem.trangThai);
    const matchesYear = selectedYear === "all" || (classItem.namHoc === selectedYear);
    return matchesSearch && matchesGrade && matchesOrg && matchesStatus && matchesYear;
  });

  // Tổng hợp stats
  const totalStudents = filteredClasses.reduce((sum: number, cls: Class) => sum + (cls.total_students || 0), 0);
  const activeClasses = filteredClasses.filter((cls: Class) => cls.trangThai).length;
  const totalExams = filteredClasses.reduce((sum: number, cls: Class) => sum + (cls.total_exams || 0), 0);

  // Handlers
  const handleViewClass = (classId: number) => router.push(`/dashboard/admin/classes/${classId}`);
  const handleViewStudents = (classId: number) => router.push(`/dashboard/admin/classes/${classId}/students`);
  const handleEditClass = (classId: number) => router.push(`/dashboard/admin/classes/${classId}/edit`);
  const handleViewAnalytics = (classId: number) => router.push(`/dashboard/admin/classes/${classId}/analytics`);
  const handleViewSettings = (classId: number) => router.push(`/dashboard/admin/classes/${classId}/settings`);
  const handleCreateClass = () => router.push("/dashboard/admin/classes/create");
  
  const handleDeleteClass = (classId: number, className: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa lớp "${className}" không?\nThao tác này không thể hoàn tác.`)) {
      deleteClassMutation.mutate(classId);
    }
  };

  // Sorting handlers
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Bulk operations handlers
  const handleSelectClass = (classId: number, checked: boolean) => {
    if (checked) {
      setSelectedClasses([...selectedClasses, classId]);
    } else {
      setSelectedClasses(selectedClasses.filter(id => id !== classId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClasses(filteredClasses.map((cls: Class) => cls.maLopHoc));
    } else {
      setSelectedClasses([]);
    }
  };

  const handleBulkOperation = async (operation: BulkOperation) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://eduscan.local/api/v1"}/classes/bulk-operations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: operation.type,
          class_ids: selectedClasses,
          data: operation.data
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Thành công",
          description: result.message,
        });
        setSelectedClasses([]);
        refetch();
      } else {
        throw new Error('Bulk operation failed');
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể thực hiện thao tác hàng loạt",
        variant: "destructive",
      });
    }
    setShowBulkDialog(false);
  };

  // Import/Export handlers
  const handleExport = async () => {
    try {
      const queryString = new URLSearchParams(queryParams as any).toString();
      const response = await fetch(`/classes/export/excel?${queryString}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'danh_sach_lop_hoc.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Thành công",
          description: "Đã xuất file Excel thành công",
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xuất file Excel",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      const response = await fetch('/classes/import/excel', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Thành công",
          description: `Đã import ${result.created_count} lớp học`,
        });
        setShowImportDialog(false);
        setImportFile(null);
        refetch();
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể import file Excel",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/classes/template/excel');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_import_lop_hoc.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải template",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Đang tải dữ liệu lớp học...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý lớp học</h1>
          <p className="text-muted-foreground">
            Danh sách tất cả lớp học thuộc hệ thống ({filteredClasses.length} lớp)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Template
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={handleCreateClass} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Tạo lớp học
          </Button>
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng lớp</p>
                <p className="text-2xl font-bold">{filteredClasses.length}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{dashboardStats?.dashboard?.monthly_classes || 0} tháng này
                </p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-md flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lớp hoạt động</p>
                <p className="text-2xl font-bold text-green-600">{activeClasses}</p>
                <Progress 
                  value={filteredClasses.length > 0 ? (activeClasses / filteredClasses.length) * 100 : 0} 
                  className="h-1 mt-2"
                />
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-md flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng học sinh</p>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  TB: {filteredClasses.length > 0 ? Math.round(totalStudents / filteredClasses.length) : 0} HS/lớp
                </p>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-md flex items-center justify-center">
                <Users className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bài kiểm tra</p>
                <p className="text-2xl font-bold text-purple-600">{totalExams}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  TB: {filteredClasses.length > 0 ? Math.round(totalExams / filteredClasses.length) : 0} BKT/lớp
                </p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-md flex items-center justify-center">
                <Target className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hiệu suất</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {filteredClasses.length > 0 ? Math.round((activeClasses / filteredClasses.length) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tỉ lệ hoạt động
                </p>
              </div>
              <div className="h-8 w-8 bg-indigo-100 rounded-md flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ lọc tìm kiếm
          </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? "Ẩn bộ lọc nâng cao" : "Bộ lọc nâng cao"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm tên lớp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger>
                <SelectValue placeholder="Tổ chức" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tổ chức</SelectItem>
                {orgOptions.map(opt =>
                  <SelectItem key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger>
                <SelectValue placeholder="Cấp học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả cấp</SelectItem>
                <SelectItem value="THPT">THPT</SelectItem>
                <SelectItem value="THCS">THCS</SelectItem>
                <SelectItem value="TIEU_HOC">Tiểu học</SelectItem>
                <SelectItem value="TRUONG_DAI_HOC">Đại học</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Năm học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả năm</SelectItem>
                {yearOptions.map((year: string) =>
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                )}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Đang hoạt động</SelectItem>
                <SelectItem value="inactive">Đã đóng</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [column, order] = value.split('-');
              setSortBy(column);
              setSortOrder(order as "asc" | "desc");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenLop-asc">Tên A-Z</SelectItem>
                <SelectItem value="tenLop-desc">Tên Z-A</SelectItem>
                <SelectItem value="ngayTao-desc">Mới nhất</SelectItem>
                <SelectItem value="ngayTao-asc">Cũ nhất</SelectItem>
                <SelectItem value="total_students-desc">Nhiều HS nhất</SelectItem>
                <SelectItem value="total_students-asc">Ít HS nhất</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="dateFrom">Từ ngày</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={advancedFilters.dateFrom || ''}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, dateFrom: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo">Đến ngày</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={advancedFilters.dateTo || ''}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, dateTo: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="minStudents">Số HS tối thiểu</Label>
                  <Input
                    id="minStudents"
                    type="number"
                    placeholder="0"
                    value={advancedFilters.minStudents || ''}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, minStudents: parseInt(e.target.value) || undefined})}
                  />
                </div>
                <div>
                  <Label htmlFor="maxStudents">Số HS tối đa</Label>
                  <Input
                    id="maxStudents"
                    type="number"
                    placeholder="100"
                    value={advancedFilters.maxStudents || ''}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, maxStudents: parseInt(e.target.value) || undefined})}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Operations Bar */}
      {selectedClasses.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  Đã chọn {selectedClasses.length} lớp học
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedClasses([])}
                >
                  Bỏ chọn tất cả
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkOperation({ type: 'delete' });
                    setShowBulkDialog(true);
                  }}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Xóa
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkOperation({ type: 'update_status', data: { status: false } });
                    setShowBulkDialog(true);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Đóng lớp
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => {
                      setBulkOperation({ type: 'update_status', data: { status: true } });
                      setShowBulkDialog(true);
                    }}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Kích hoạt lớp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setBulkOperation({ type: 'update_teacher' });
                      setShowBulkDialog(true);
                    }}>
                      <Users className="h-4 w-4 mr-2" />
                      Gán giáo viên
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classes Grid with Selection */}
      <div className="space-y-4">
        {/* Select All Header */}
        <div className="flex items-center gap-2 px-4">
          <Checkbox
            checked={selectedClasses.length === filteredClasses.length && filteredClasses.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <Label className="text-sm text-muted-foreground">
            Chọn tất cả ({filteredClasses.length} lớp)
          </Label>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map((classItem: Class) => (
            <Card 
              key={classItem.maLopHoc} 
              className={`hover:shadow-lg transition-all duration-200 ${
                selectedClasses.includes(classItem.maLopHoc) 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : ''
              }`}
            >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={selectedClasses.includes(classItem.maLopHoc)}
                      onCheckedChange={(checked) => 
                        handleSelectClass(classItem.maLopHoc, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                <CardTitle className="text-xl">{classItem.tenLop}</CardTitle>
                      <CardDescription className="mt-1">
                        Năm học {classItem.namHoc || "N/A"} • 
                        Cấp: <span className="font-medium">{classItem.capHoc || "N/A"}</span>
                        {classItem.tenToChuc && (
                          <> • Tổ chức: <span className="font-medium">{classItem.tenToChuc}</span></>
                        )}
                      </CardDescription>
                      <p className="text-sm mt-1 text-muted-foreground">
                        <span className="font-semibold">GVCN:</span> {classItem.tenGiaoVienChuNhiem || "Chưa phân công"}
                      </p>
                    </div>
                  </div>
                <Badge
                  variant={classItem.trangThai ? "default" : "destructive"}
                  className={classItem.trangThai ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                >
                  {classItem.trangThai ? (
                      <ShieldCheck className="inline mr-1 h-3 w-3" />
                  ) : (
                      <XCircle className="inline mr-1 h-3 w-3" />
                  )}
                  {classItem.trangThai ? "Hoạt động" : "Đã đóng"}
                </Badge>
              </div>
            </CardHeader>
              
            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">
                    {classItem.total_students ?? 0}
                    </div>
                    <div className="text-xs text-blue-600">Học sinh</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-600">
                      {classItem.total_exams ?? 0}
                    </div>
                    <div className="text-xs text-purple-600">Bài kiểm tra</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">
                    {classItem.trangThai ? "ON" : "OFF"}
                    </div>
                    <div className="text-xs text-green-600">Trạng thái</div>
                  </div>
                </div>
                
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewClass(classItem.maLopHoc)}
                >
                  <Eye className="mr-2 h-3 w-3" />
                  Chi tiết
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewAnalytics(classItem.maLopHoc)}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Phân tích
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewSettings(classItem.maLopHoc)}>
                      <Settings className="mr-2 h-4 w-4" />
                      Cài đặt
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewStudents(classItem.maLopHoc)}>
                      <Users className="mr-2 h-4 w-4" />
                      Học sinh
                    </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleEditClass(classItem.maLopHoc)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClass(classItem.maLopHoc, classItem.tenLop)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredClasses.length === 0 && (
        <Card>
          <CardContent className="text-center py-10">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Không tìm thấy lớp học phù hợp
            </h3>
            <p className="text-muted-foreground mb-4">
              Kiểm tra lại bộ lọc hoặc thêm mới lớp học.
            </p>
            <Button onClick={handleCreateClass} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Tạo lớp học đầu tiên
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import lớp học từ Excel</DialogTitle>
            <DialogDescription>
              Chọn file Excel chứa danh sách lớp học để import vào hệ thống.
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
            {importFile && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm">
                  <strong>File đã chọn:</strong> {importFile.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kích thước: {(importFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!importFile || isImporting}
            >
              {isImporting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
              Bạn có chắc chắn muốn thực hiện thao tác này trên {selectedClasses.length} lớp học đã chọn?
              {bulkOperation?.type === 'delete' && (
                <span className="text-red-600 font-medium block mt-2">
                  ⚠️ Thao tác xóa không thể hoàn tác!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkOperation && handleBulkOperation(bulkOperation)}
              className={bulkOperation?.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}