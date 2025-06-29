"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import { toast } from "sonner"

import { usersApi, type UserProfile } from "@/lib/api/users"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Plus,
  MoreHorizontal,
  Download, 
  Search, 
  Users, 
  UserCheck, 
  UserX,
  BookOpen,
  ArrowUpDown
} from "lucide-react"

// Component mới cho các thẻ thống kê
const StatCard = ({ title, value, icon: Icon, description }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
)

export default function ManagerTeachersPage() {
  // State quản lý bảng
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [debouncedGlobalFilter] = useDebounce(globalFilter, 500)
  
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // Query để lấy dữ liệu giáo viên
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['managerTeachers', pagination, debouncedGlobalFilter, sorting],
    queryFn: async () => {
      // Logic sắp xếp
      const sortParams = sorting.length > 0 ? { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' } : {}
      
      // API call
      // Giả sử usersApi.getTeachers được tạo ra để gọi API mới
      const response = await usersApi.getTeachers({
          page: pagination.pageIndex + 1,
          limit: pagination.pageSize,
          search: debouncedGlobalFilter,
          ...sortParams
      });
      return response;
    },
    keepPreviousData: true,
  })

  const teachers = useMemo(() => data?.data || [], [data])
  const pageCount = useMemo(() => data?.meta?.totalPages || 0, [data])

  // Định nghĩa các cột cho bảng
  const columns: ColumnDef<UserProfile>[] = useMemo(() => [
    {
      accessorKey: 'hoTen',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Tên giáo viên <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('hoTen')}</div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'soDienThoai',
      header: 'Số điện thoại',
    },
    {
      accessorKey: 'trangThai',
      header: 'Trạng thái',
      cell: ({ row }) => (
        <Badge variant={row.getValue('trangThai') ? 'default' : 'secondary'}>
          {row.getValue('trangThai') ? 'Hoạt động' : 'Vô hiệu hóa'}
        </Badge>
      ),
    },
    {
      accessorKey: 'soLopDay', // Giả sử API trả về trường này
      header: 'Số lớp',
      cell: ({ row }) => (
        <div className="text-center">{row.original.soLopDay || 0}</div>
      )
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const teacher = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Mở menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Hành động</DropdownMenuLabel>
              <DropdownMenuItem>Sửa thông tin</DropdownMenuItem>
              <DropdownMenuItem>Phân công lớp</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Xóa giáo viên
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [])

  const table = useReactTable({
    data: teachers,
    columns,
    pageCount,
    state: {
      pagination,
      sorting,
      globalFilter,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  })

  // Dữ liệu thống kê (lấy từ meta của API)
  const statsData = {
      total: data?.meta?.totalItems || 0,
      active: data?.meta?.totalItems || 0, // Cần API trả về số liệu này
      avgClasses: 3, // Cần API trả về số liệu này
  }

  if (isError) {
      return <div>Có lỗi xảy ra: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <header>
          <h1 className="text-3xl font-bold">Quản lý Giáo viên</h1>
          <p className="text-muted-foreground mt-1">
          Thêm mới, tìm kiếm và quản lý thông tin giáo viên trong hệ thống.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tổng số giáo viên" value={statsData.total} icon={Users} description="Tổng số giáo viên trong tổ chức" />
        <StatCard title="Đang hoạt động" value={statsData.active} icon={UserCheck} description="Số lượng giáo viên sẵn sàng giảng dạy" />
        <StatCard title="Không hoạt động" value={statsData.total - statsData.active} icon={UserX} description="Tài khoản bị vô hiệu hóa" />
        <StatCard title="Số lớp trung bình" value={statsData.avgClasses} icon={BookOpen} description="Số lớp trung bình mỗi giáo viên" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
          <CardTitle>Danh sách giáo viên</CardTitle>
                <CardDescription>
                    Tổng cộng {data?.meta?.totalItems || 0} giáo viên
                </CardDescription>
            </div>
            <div className="flex gap-2">
                 <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Xuất file</Button>
                 <Button><Plus className="mr-2 h-4 w-4" /> Thêm giáo viên</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="mb-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                        placeholder="Tìm kiếm theo tên, email..."
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="pl-10 max-w-sm"
              />
            </div>
          </div>

            <div className="rounded-md border">
          <Table>
            <TableHeader>
                  {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <TableHead key={header.id}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
              </TableRow>
                  ))}
            </TableHeader>
            <TableBody>
                  {isLoading ? (
                <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        <p>Đang tải dữ liệu...</p>
                  </TableCell>
                </TableRow>
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map(row => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        Không tìm thấy giáo viên nào.
                    </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
            </div>
            
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Trang trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Trang sau
              </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}