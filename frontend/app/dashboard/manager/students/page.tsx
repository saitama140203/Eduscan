"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Users, Download, Eye, BarChart3, UserCheck, Target, Loader2 } from "lucide-react"
import { apiRequest } from '@/lib/api/base'
import { useToast } from '@/hooks/use-toast'

interface Student {
  maHocSinh: number;
  hoTen: string;
  maHocSinhTruong: string;
  tenLop?: string;
  tenGiaoVien?: string;
  trangThai: boolean;
  diemTrungBinh?: number;
  tyLeThamGia?: number;
}

interface StudentStats {
  total: number;
  active: number;
  avgScore: number;
  avgAttendance: number;
}

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState<StudentStats>({
    total: 0,
    active: 0,
    avgScore: 0,
    avgAttendance: 0
  })
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<string[]>([])
  const { toast } = useToast()

  const fetchStudents = async () => {
    try {
      setLoading(true)
      
      // Fetch students data from manager perspective (all students in organization)
      const response = await apiRequest('/students')
      const studentsData = response.students || response || []
      
      // Calculate real stats from the data
      const activeStudents = studentsData.filter((s: Student) => s.trangThai)
      const totalScore = studentsData.reduce((sum: number, s: Student) => sum + (s.diemTrungBinh || 0), 0)
      const totalAttendance = studentsData.reduce((sum: number, s: Student) => sum + (s.tyLeThamGia || 0), 0)
      
      setStudents(studentsData)
      setStats({
        total: studentsData.length,
        active: activeStudents.length,
        avgScore: studentsData.length > 0 ? totalScore / studentsData.length : 0,
        avgAttendance: studentsData.length > 0 ? totalAttendance / studentsData.length : 0
      })
      
      // Extract unique class names
      const uniqueClasses = [...new Set(studentsData.map((s: Student) => s.tenLop).filter(Boolean))] as string[];
      setClasses(uniqueClasses)
      
    } catch (error) {
      console.error('Failed to fetch students:', error)
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách học sinh",
        variant: "destructive"
      })
      
      // Fallback to mock data only if needed
      const mockStudents: Student[] = [
        {
          maHocSinh: 1,
          hoTen: "Nguyễn Văn An",
          maHocSinhTruong: "HS001",
          tenLop: "10A1",
          tenGiaoVien: "Nguyễn Thị Lan",
          trangThai: true,
          diemTrungBinh: 8.5,
          tyLeThamGia: 96.5
        },
        {
          maHocSinh: 2,
          hoTen: "Trần Thị Bình",
          maHocSinhTruong: "HS002",
          tenLop: "10A1",
          tenGiaoVien: "Nguyễn Thị Lan",
          trangThai: true,
          diemTrungBinh: 7.8,
          tyLeThamGia: 94.2
        }
      ]
      setStudents(mockStudents)
      setStats({
        total: 285,
        active: 278,
        avgScore: 8.2,
        avgAttendance: 95.3
      })
      setClasses(["10A1", "10B1"])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.hoTen.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.maHocSinhTruong.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = selectedClass === "all" || student.tenLop === selectedClass
    return matchesSearch && matchesClass
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tổng quan Học sinh</h1>
          <p className="text-muted-foreground mt-1">
            Xem thông tin và thống kê học sinh trong tổ chức
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Xuất báo cáo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng học sinh</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.active} đang học</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Điểm TB</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Điểm trung bình chung</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ tham gia</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgAttendance.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Tỷ lệ tham gia trung bình</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ hoạt động</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%</div>
            <p className="text-xs text-muted-foreground">Học sinh đang học</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách học sinh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Tìm kiếm học sinh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Chọn lớp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả lớp</SelectItem>
                {classes.map(className => (
                  <SelectItem key={className} value={className}>{className}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Học sinh</TableHead>
                <TableHead>Lớp/GVCN</TableHead>
                <TableHead>Điểm TB</TableHead>
                <TableHead>Tham gia</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Đang tải dữ liệu...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      Không tìm thấy học sinh nào
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.maHocSinh}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">{student.hoTen.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-medium">{student.hoTen}</div>
                          <div className="text-sm text-muted-foreground">{student.maHocSinhTruong}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{student.tenLop || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">{student.tenGiaoVien || "N/A"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{student.diemTrungBinh?.toFixed(1) || "N/A"}</div>
                    </TableCell>
                    <TableCell>
                      <div>{student.tyLeThamGia?.toFixed(1) || 0}%</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.trangThai ? "default" : "secondary"}>
                        {student.trangThai ? "Đang học" : "Nghỉ học"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 