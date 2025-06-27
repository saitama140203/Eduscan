'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Download, Upload, Filter, Eye, Settings, Users, RefreshCw, Trash2, Edit, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useDebounce } from '@/hooks/useDebounce';
import { useManagerClasses, useDeleteClass, useExportClasses } from '@/hooks/useManagerClasses';
import { ManagerClass } from '@/lib/api/manager-classes';

export default function ManagerClassesPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Search and filters
  const [search, setSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const debouncedSearch = useDebounce(search, 500);

  // API Query params
  const queryParams = {
    search: debouncedSearch || undefined,
    limit: 50,
    skip: 0
  };

  // React Query for classes data
  const { 
    data: classesData, 
    isLoading, 
    error, 
    refetch,
    isRefetching 
  } = useManagerClasses(queryParams);
  
  // Mutations
  const deleteClassMutation = useDeleteClass();
  const exportClassesMutation = useExportClasses();

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Làm mới thành công",
        description: "Dữ liệu lớp học đã được cập nhật",
      });
    } catch (error) {
      toast({
        title: "Lỗi làm mới",
        description: "Không thể tải dữ liệu mới",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Handle delete class
  const handleDeleteClass = async (classId: number, className: string) => {
    deleteClassMutation.mutate(classId);
  };

  // Navigation handlers
  const handleViewClass = (classId: number) => {
    router.push(`/dashboard/manager/classes/${classId}`);
  };

  const handleViewStudents = (classId: number) => {
    router.push(`/dashboard/manager/classes/${classId}/students`);
  };

  const handleViewExams = (classId: number) => {
    router.push(`/dashboard/manager/classes/${classId}/exams`);
  };

  const handleAssignTeacher = (classId: number) => {
    router.push(`/dashboard/manager/classes/${classId}/assign-teacher`);
  };

  const handleViewAnalytics = (classId: number) => {
    router.push(`/dashboard/manager/classes/${classId}/analytics`);
  };

  const handleEditClass = (classId: number) => {
    router.push(`/dashboard/manager/classes/${classId}/edit`);
  };

  const handleCreateClass = () => {
    router.push('/dashboard/manager/classes/create');
  };

  // Export classes data
  const handleExportClasses = async () => {
    exportClassesMutation.mutate();
  };



  // Process classes data with filters
  const classes = classesData || [];
  
  const filteredClasses = classes.filter((classItem: ManagerClass) => {
    const matchesGrade = selectedGrade === 'all' || classItem.capHoc === selectedGrade;
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' && classItem.trangThai) ||
                         (selectedStatus === 'inactive' && !classItem.trangThai);
    const matchesYear = selectedYear === 'all' || classItem.namHoc === selectedYear;
    const matchesTeacher = selectedTeacher === 'all' || 
                          (selectedTeacher === 'assigned' && classItem.tenGiaoVienChuNhiem) ||
                          (selectedTeacher === 'unassigned' && !classItem.tenGiaoVienChuNhiem);
    
    return matchesGrade && matchesStatus && matchesYear && matchesTeacher;
  });

  // Calculate summary stats
  const totalStudents = filteredClasses.reduce((sum: number, cls: ManagerClass) => sum + (cls.total_students || 0), 0);
  const totalExams = filteredClasses.reduce((sum: number, cls: ManagerClass) => sum + (cls.total_exams || 0), 0);
  const unassignedClasses = filteredClasses.filter((cls: ManagerClass) => !cls.tenGiaoVienChuNhiem).length;
  const activeClasses = filteredClasses.filter((cls: ManagerClass) => cls.trangThai).length;

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý lớp học</h1>
            <p className="text-muted-foreground">Quản lý lớp học trong tổ chức của bạn</p>
          </div>
          <Button onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">❌ Không thể tải dữ liệu lớp học</p>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải dữ liệu'}
              </p>
              <Button onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Thử lại
              </Button>
            </div>
          </CardContent>
        </Card>
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
            Quản lý lớp học trong tổ chức của bạn ({filteredClasses.length} lớp)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing || isRefetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${(refreshing || isRefetching) ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button variant="outline" onClick={handleExportClasses}>
            <Download className="mr-2 h-4 w-4" />
            Xuất báo cáo
          </Button>
          <Button onClick={handleCreateClass}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo lớp học
          </Button>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng lớp học</p>
                <p className="text-2xl font-bold text-blue-600">{filteredClasses.length}</p>
                <p className="text-xs text-muted-foreground">{activeClasses} hoạt động</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-md flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng học sinh</p>
                <p className="text-2xl font-bold text-green-600">{totalStudents}</p>
                <p className="text-xs text-muted-foreground">Trung bình {Math.round(totalStudents / Math.max(filteredClasses.length, 1))} HS/lớp</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-md flex items-center justify-center">
                <Users className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng bài thi</p>
                <p className="text-2xl font-bold text-purple-600">{totalExams}</p>
                <p className="text-xs text-muted-foreground">Trung bình {Math.round(totalExams / Math.max(filteredClasses.length, 1))} bài/lớp</p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-md flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chưa phân GVCN</p>
                <p className="text-2xl font-bold text-red-600">{unassignedClasses}</p>
                <p className="text-xs text-muted-foreground">Cần phân công</p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-md flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ lọc và tìm kiếm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm lớp, GVCN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Grade Filter */}


            {/* Teacher Assignment Filter */}
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="GVCN" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="assigned">Đã phân công</SelectItem>
                <SelectItem value="unassigned">Chưa phân công</SelectItem>
              </SelectContent>
            </Select>

            {/* Year Filter */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Năm học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả năm</SelectItem>
                <SelectItem value="2024-2025">2024-2025</SelectItem>
                <SelectItem value="2023-2024">2023-2024</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Tạm ngưng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách lớp học</CardTitle>
          <CardDescription>
            Hiển thị {filteredClasses.length} / {classes.length} lớp học
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên lớp</TableHead>
                <TableHead>GVCN</TableHead>
                <TableHead>Học sinh</TableHead>
                <TableHead>Bài thi</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.map((classItem: ManagerClass) => (
                <TableRow key={classItem.maLopHoc}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{classItem.tenLop}</div>
                      <div className="text-sm text-muted-foreground">
                        {classItem.namHoc || 'Chưa set năm học'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {classItem.tenGiaoVienChuNhiem ? (
                      <div className="text-sm">
                        <div className="font-medium">{classItem.tenGiaoVienChuNhiem}</div>

                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="text-red-600 w-fit">
                          Chưa phân công
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleAssignTeacher(classItem.maLopHoc)}
                          className="text-xs h-6"
                        >
                          Phân công
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="font-semibold">{classItem.total_students || 0}</div>
                    <div className="text-xs text-muted-foreground">học sinh</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="font-semibold">{classItem.total_exams || 0}</div>
                    <div className="text-xs text-muted-foreground">bài thi</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={classItem.trangThai ? "default" : "secondary"}>
                      {classItem.trangThai ? "Hoạt động" : "Tạm ngưng"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-1" />
                          Quản lý
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Quản lý lớp học</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewClass(classItem.maLopHoc)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Xem tổng quan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewAnalytics(classItem.maLopHoc)}>
                          📊 Phân tích thành tích
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewStudents(classItem.maLopHoc)}>
                          👥 Quản lý học sinh ({classItem.total_students || 0})
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewExams(classItem.maLopHoc)}>
                          📝 Quản lý bài thi ({classItem.total_exams || 0})
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditClass(classItem.maLopHoc)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Chỉnh sửa lớp
                        </DropdownMenuItem>
                        {!classItem.tenGiaoVienChuNhiem && (
                          <DropdownMenuItem onClick={() => handleAssignTeacher(classItem.maLopHoc)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Phân công GVCN
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                              <span className="text-red-600">Xóa lớp</span>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xác nhận xóa lớp</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc chắn muốn xóa lớp <strong>{classItem.tenLop}</strong>? 
                                Hành động này không thể hoàn tác và sẽ xóa tất cả dữ liệu liên quan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteClass(classItem.maLopHoc, classItem.tenLop)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Xóa lớp
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredClasses.length === 0 && (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">
                {classes.length === 0 ? 'Chưa có lớp học nào' : 'Không tìm thấy lớp học phù hợp với bộ lọc'}
              </p>
              {classes.length === 0 && (
                <Button onClick={handleCreateClass}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo lớp học đầu tiên
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
