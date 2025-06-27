"use client"
import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Định nghĩa một kiểu dữ liệu chung cho người dùng, bao gồm cả học sinh
export interface DisplayUser {
  maHocSinh?: number;
  maHocSinhTruong?: string;
  hoTen: string;
  email?: string;
  ngaySinh?: string;
  gioiTinh?: string;
  vaiTro?: string; // 'HOCSINH', 'TEACHER', 'ADMIN'
  trangThai?: boolean;
}

interface GenericUserTableProps {
  users: DisplayUser[];
  onEdit?: (user: DisplayUser) => void;
  onDelete?: (user: DisplayUser) => void;
  onViewDetails?: (user: DisplayUser) => void;
}

export function GenericUserTable({ users, onEdit, onDelete, onViewDetails }: GenericUserTableProps) {
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof DisplayUser, direction: 'ascending' | 'descending' } | null>(null);

  const filteredUsers = useMemo(() => {
    const sortableUsers = [...users];
    if (sortConfig !== null) {
      sortableUsers.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    if (!filter) {
      return sortableUsers;
    }

    return sortableUsers.filter(user =>
      user.hoTen.toLowerCase().includes(filter.toLowerCase()) ||
      user.maHocSinhTruong?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [users, filter, sortConfig]);
  
  const requestSort = (key: keyof DisplayUser) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };


  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Tìm kiếm theo tên hoặc mã học sinh..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('maHocSinhTruong')}>
                  Mã HS <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('hoTen')}>
                  Họ và Tên <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell">Ngày sinh</TableHead>
              <TableHead className="hidden md:table-cell">Giới tính</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.maHocSinh}>
                <TableCell>{user.maHocSinhTruong}</TableCell>
                <TableCell className="font-medium">{user.hoTen}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {user.ngaySinh ? new Date(user.ngaySinh).toLocaleDateString('vi-VN') : 'N/A'}
                </TableCell>
                <TableCell className="hidden md:table-cell">{user.gioiTinh || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={user.trangThai ? 'default' : 'destructive'}>
                    {user.trangThai ? 'Hoạt động' : 'Đã khóa'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {onViewDetails && <DropdownMenuItem onSelect={() => onViewDetails(user)}>Xem chi tiết</DropdownMenuItem>}
                      {onEdit && <DropdownMenuItem onSelect={() => onEdit(user)}>Sửa</DropdownMenuItem>}
                      {onDelete && <DropdownMenuItem onSelect={() => onDelete(user)} className="text-red-500">Xóa</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 