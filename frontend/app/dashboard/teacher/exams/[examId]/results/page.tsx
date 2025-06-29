"use client"

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { omrApi, type ExamResultDetails } from '@/lib/api/omr';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FileText,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  AlertTriangle,
  ServerCrash
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

type ResultItem = ExamResultDetails['results'][0];

const getApiHost = (urlStr: string | undefined): string => {
    if (!urlStr) return 'http://localhost:8000';
    try {
        const url = new URL(urlStr);
        return `${url.protocol}//${url.host}`;
    } catch (e) {
        // Fallback for invalid URL format
        return 'http://localhost:8000';
    }
};

const API_HOST = getApiHost(process.env.NEXT_PUBLIC_API_URL);

const ResultsPage = () => {
  const params = useParams();
  const examId = Number(params.examId);
  const { toast } = useToast();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['examResults', examId],
    queryFn: () => omrApi.getResultsByExam(examId),
    enabled: !!examId,
  });

  const columns = useMemo<ColumnDef<ResultItem>[]>(() => [
    {
      id: 'stt',
      header: 'STT',
      cell: ({ row }) => <span>{row.index + 1}</span>,
    },
    {
      accessorKey: 'hoTen',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Học sinh
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.original.hoTen}</div>
      ),
    },
    {
      accessorKey: 'maHocSinhTruong',
      header: 'SBD/Mã HS',
    },
    {
      accessorKey: 'diem',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Điểm
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const { diem } = row.original;
        if (diem === null || diem === undefined) {
          return <span className="text-muted-foreground">N/A</span>;
        }
        return (
          <span
            className={`font-bold ${
              diem >= 8
                ? 'text-green-600'
                : diem >= 5
                ? 'text-blue-600'
                : 'text-red-600'
            }`}
          >
            {diem.toFixed(2)}
          </span>
        );
      },
    },
    {
      accessorKey: 'trangThai',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const { trangThai } = row.original;
        return (
          <Badge variant={trangThai === 'dacom' ? 'default' : 'secondary'}>
            {trangThai === 'dacom' ? 'Đã chấm' : 'Chưa chấm'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'ngayCham',
      header: 'Ngày chấm',
      cell: ({ row }) => {
        const { ngayCham } = row.original;
        return ngayCham ? new Date(ngayCham).toLocaleString('vi-VN') : 'N/A';
      },
    },
    {
      id: 'actions',
      header: 'Bài làm',
      cell: ({ row }) => {
        const { urlHinhAnhXuLy } = row.original;
        if (!urlHinhAnhXuLy) return null;

        const imageUrl = `${API_HOST}/storage/${urlHinhAnhXuLy}`;
        
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(imageUrl, '_blank')}
          >
            <Eye className="h-4 w-4" />
          </Button>
        );
      },
    },
  ], []);
  
  const table = useReactTable({
    data: data?.results || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  const handleExport = async () => {
    toast({ title: "Đang xử lý", description: "Đang chuẩn bị file Excel..." });
    try {
      const blob = await omrApi.exportExcel(examId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ket-qua-${data?.exam.tieuDe.replace(/\s+/g, '_') || examId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast({ title: "Thành công!", description: "Đã tải xuống file Excel." });
    } catch (error) {
      console.error("Export failed:", error);
      toast({ title: "Xuất file thất bại", description: error instanceof Error ? error.message : "Có lỗi xảy ra.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
       <div className="container mx-auto py-10">
        <Card className="border-destructive">
          <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                  <ServerCrash className="h-6 w-6" /> Lỗi Tải Dữ Liệu
              </CardTitle>
              <CardDescription>
                  Không thể tải được kết quả của bài thi.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <p className="mb-4">
                  Đã có lỗi xảy ra khi cố gắng kết nối đến máy chủ. Vui lòng thử lại sau.
              </p>
              <pre className="bg-muted p-4 rounded-lg text-sm">
                  <code>{error instanceof Error ? error.message : String(error)}</code>
              </pre>
               <Button onClick={() => window.location.reload()} className="mt-4">
                  Tải lại trang
              </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{data?.exam.monHoc}</p>
          <h1 className="text-3xl font-bold">{data?.exam.tieuDe}</h1>
        </div>
        <div className="flex gap-2">
            <Link href={`/dashboard/teacher/scan?examId=${examId}`} passHref>
                <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Chuyển đến trang chấm bài
                </Button>
            </Link>
            <Button onClick={handleExport} disabled={!data || !data.results || data.results.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Xuất Excel
            </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số học sinh</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.totalStudents ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã chấm</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.graded ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chưa chấm</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.notGraded ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Điểm trung bình</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.averageScore?.toFixed(2) ?? '0.00'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
            <CardTitle>Bảng điểm chi tiết</CardTitle>
            <CardDescription>
                Danh sách kết quả của tất cả học sinh trong bài thi.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center py-4">
            <Input
              placeholder="Tìm kiếm học sinh..."
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      Không tìm thấy kết quả.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} của{' '}
              {table.getFilteredRowModel().rows.length} dòng được chọn.
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Dòng mỗi trang</p>
                    <select
                        className="h-8 w-[70px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={table.getState().pagination.pageSize}
                        onChange={e => {
                            table.setPageSize(Number(e.target.value))
                        }}
                    >
                        {[10, 20, 30, 40, 50].map(pageSize => (
                            <option key={pageSize} value={pageSize}>
                                {pageSize}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Trang {table.getState().pagination.pageIndex + 1} của{' '}
                    {table.getPageCount()}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <span className="sr-only">Go to first page</span>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                    >
                        <span className="sr-only">Go to last page</span>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsPage;
