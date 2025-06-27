"use client";

import { useState } from "react";
import { useExams } from "@/hooks/useExams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Plus, Search, Filter, BookOpen, Calendar, Clock, Users } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Exam } from "@/lib/api/exams";
import { toast } from "sonner";

const SUBJECTS = [
  "Toán", "Ngữ văn", "Tiếng Anh", "Vật lý", "Hóa học", "Sinh học", 
  "Lịch sử", "Địa lý", "GDCD", "Tin học", "Thể dục", "Âm nhạc", "Mỹ thuật"
];

const STATUS_OPTIONS = [
  { value: "nhap", label: "Nháp", color: "bg-gray-100 text-gray-800" },
  { value: "xuat_ban", label: "Xuất bản", color: "bg-blue-100 text-blue-800" },
  { value: "hoan_thanh", label: "Hoàn thành", color: "bg-green-100 text-green-800" },
];

export default function ManagerExamsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [subjectFilter, setSubjectFilter] = useState<string>("");

  const { data: exams = [], isLoading, error } = useExams();
  const { deleteExam, updateExamStatus } = useExams();

  // Filter exams based on search and filters
  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.tieuDe.toLowerCase().includes(search.toLowerCase()) ||
                         exam.monHoc.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || exam.trangThai === statusFilter;
    const matchesSubject = !subjectFilter || exam.monHoc === subjectFilter;
    
    return matchesSearch && matchesStatus && matchesSubject;
  });

  // Calculate statistics
  const stats = {
    total: exams.length,
    draft: exams.filter(e => e.trangThai === "nhap").length,
    published: exams.filter(e => e.trangThai === "xuat_ban").length,
    completed: exams.filter(e => e.trangThai === "hoan_thanh").length,
  };

  const handleStatusChange = async (examId: number, newStatus: string) => {
    try {
      await updateExamStatus.mutateAsync({ examId, status: newStatus });
      toast.success("Cập nhật trạng thái thành công");
    } catch (error) {
      toast.error("Lỗi khi cập nhật trạng thái");
    }
  };

  const handleDelete = async (examId: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa bài kiểm tra này?")) {
      try {
        await deleteExam.mutateAsync(examId);
        toast.success("Xóa bài kiểm tra thành công");
      } catch (error) {
        toast.error("Lỗi khi xóa bài kiểm tra");
      }
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSubjectFilter("");
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center text-red-600">
          Lỗi khi tải dữ liệu: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Bài kiểm tra</h1>
          <p className="text-muted-foreground">
            Quản lý bài kiểm tra của tổ chức bạn
          </p>
        </div>
        <Link href="/dashboard/manager/exams/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tạo bài kiểm tra
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              bài kiểm tra
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nháp</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">
              chưa xuất bản
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Xuất bản</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published}</div>
            <p className="text-xs text-muted-foreground">
              đang diễn ra
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoàn thành</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              đã kết thúc
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tiêu đề hoặc môn học..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Môn học" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || statusFilter || subjectFilter) && (
              <Button variant="outline" onClick={clearFilters}>
                <Filter className="mr-2 h-4 w-4" />
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exams List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Không có bài kiểm tra</h3>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter || subjectFilter 
                ? "Không tìm thấy bài kiểm tra phù hợp với bộ lọc."
                : "Chưa có bài kiểm tra nào. Tạo bài kiểm tra đầu tiên của bạn."
              }
            </p>
            {!search && !statusFilter && !subjectFilter && (
              <Link href="/dashboard/manager/exams/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo bài kiểm tra
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam) => {
            const statusOption = STATUS_OPTIONS.find(s => s.value === exam.trangThai);
            
            return (
              <Card key={exam.maBaiKiemTra} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">
                        {exam.tieuDe}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span className="font-medium">{exam.monHoc}</span>
                        {exam.ngayThi && (
                          <>
                            <span>•</span>
                            <span>{format(new Date(exam.ngayThi), "dd/MM/yyyy", { locale: vi })}</span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/manager/exams/${exam.maBaiKiemTra}`}>
                            Xem chi tiết
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/manager/exams/${exam.maBaiKiemTra}/edit`}>
                            Chỉnh sửa
                          </Link>
                        </DropdownMenuItem>
                        {exam.trangThai === "nhap" && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(exam.maBaiKiemTra, "xuat_ban")}
                          >
                            Xuất bản
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/manager/exams/${exam.maBaiKiemTra}/statistics`}>
                            Thống kê
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDelete(exam.maBaiKiemTra)}
                        >
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={statusOption?.color}>
                        {statusOption?.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {exam.tongSoCau} câu • {exam.tongDiem} điểm
                      </span>
                    </div>
                    
                    {exam.thoiGianLamBai && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        {exam.thoiGianLamBai} phút
                      </div>
                    )}
                    
                    {exam.moTa && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {exam.moTa}
                      </p>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      Tạo: {format(new Date(exam.thoiGianTao), "dd/MM/yyyy HH:mm", { locale: vi })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
} 