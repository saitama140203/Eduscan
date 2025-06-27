'use client';

import { useState } from 'react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash, Users } from 'lucide-react';
import { Class } from '@/lib/api/classes';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ClassesTableProps {
  classes: Class[];
  onEdit: (classItem: Class) => void;
  onDelete: (classItem: Class) => void;
  onViewStudents: (classItem: Class) => void;
}

export function ClassesTable({
  classes,
  onEdit,
  onDelete,
  onViewStudents,
}: ClassesTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên lớp</TableHead>
            <TableHead>Cấp học</TableHead>
            <TableHead>Năm học</TableHead>
            <TableHead>GVCN</TableHead>
            <TableHead className="text-center">Sĩ số</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Ngày tạo</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                Không có dữ liệu
              </TableCell>
            </TableRow>
          ) : (
            classes.map((classItem) => (
              <TableRow key={classItem.maLopHoc}>
                <TableCell className="font-medium">{classItem.tenLop}</TableCell>
                <TableCell>{classItem.capHoc || '-'}</TableCell>
                <TableCell>{classItem.namHoc || '-'}</TableCell>
                <TableCell>{classItem.tenGiaoVienChuNhiem || '-'}</TableCell>
                <TableCell className="text-center">
                  {classItem.total_students || 0}
                </TableCell>
                <TableCell>
                  <Badge variant={classItem.trangThai ? 'default' : 'secondary'}>
                    {classItem.trangThai ? 'Hoạt động' : 'Ngừng hoạt động'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(classItem.thoiGianTao), 'dd/MM/yyyy', {
                    locale: vi,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewStudents(classItem)}>
                        <Users className="mr-2 h-4 w-4" />
                        Danh sách học sinh
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(classItem)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(classItem)}
                        className="text-destructive"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
