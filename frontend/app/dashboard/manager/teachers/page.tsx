"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Download, 
  Search, 
  Users, 
  UserCheck, 
  GraduationCap, 
  TrendingUp,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  UserX,
  Clock,
  Eye
} from 'lucide-react'
import { toast } from "sonner"
import { apiRequest } from '@/lib/api/base'

interface Teacher {
  id: number
  name: string
  email: string
  phone: string
  subject: string
  employeeCode: string
  hireDate: string
  status: 'active' | 'inactive' | 'on_leave'
  totalClasses: number
  totalStudents: number
  averageScore: number
  experience: number
  education: string
  address: string
  avatar?: string
  vaiTro?: string
  currentClasses?: number
  maxClasses?: number
  available?: boolean
  organization?: string
}

interface TeacherFormData {
  name: string
  email: string
  phone: string
  subject: string
  employeeCode: string
  education: string
  address: string
  hireDate: string
}

const STATUS_CONFIG = {
  active: { label: 'Hoạt động', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Không hoạt động', color: 'bg-gray-100 text-gray-800' },
  on_leave: { label: 'Nghỉ phép', color: 'bg-yellow-100 text-yellow-800' }
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [formData, setFormData] = useState<TeacherFormData>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    employeeCode: "",
    education: "",
    address: "",
    hireDate: ""
  })

  const fetchTeachers = async () => {
    try {
      setLoading(true)
      
      // Try to get available teachers endpoint first
      let teachersData = []
      try {
        const response = await apiRequest('/users/teachers/available')
        teachersData = response.teachers || response || []
      } catch (error) {
        // Fallback to general users API for teachers
        const response = await apiRequest('/users?role=teacher')
        teachersData = response.users || response || []
      }
      
      // Transform backend data to frontend format
      const transformedTeachers = teachersData.map((teacher: any) => ({
        id: teacher.maGiaoVien || teacher.maNguoiDung || teacher.id,
        name: teacher.hoTen || teacher.name || '',
        email: teacher.email || '',
        phone: teacher.soDienThoai || teacher.phone || '',
        subject: teacher.monHocChinh || teacher.subject || 'N/A',
        employeeCode: teacher.maNguoiDung?.toString() || teacher.employeeCode || `GV${teacher.id || Math.random()}`,
        hireDate: teacher.thoiGianTao || teacher.ngayVaoLam || teacher.hireDate || new Date().toISOString().split('T')[0],
        status: teacher.trangThai === false ? 'inactive' : 'active',
        totalClasses: teacher.currentClasses || teacher.soLuongLopDay || teacher.totalClasses || 0,
        totalStudents: teacher.totalStudents || 0,
        averageScore: teacher.averageScore || 0,
        experience: teacher.experience || teacher.kinh_nghiem || 0,
        education: teacher.education || teacher.bangCap || '',
        address: teacher.address || teacher.diaChi || '',
        avatar: teacher.avatar,
        vaiTro: teacher.vaiTro,
        currentClasses: teacher.currentClasses,
        maxClasses: teacher.maxClasses,
        available: teacher.available,
        organization: teacher.organization
      }))

      setTeachers(transformedTeachers)
      setFilteredTeachers(transformedTeachers)
    } catch (error) {
      console.error('Failed to fetch teachers:', error)
      toast.error("Không thể tải danh sách giáo viên")
      
      // Fallback to mock data only if API completely fails
      const mockTeachers: Teacher[] = [
        {
          id: 1,
          name: "Nguyễn Thị Lan",
          email: "nguyenthilan@school.edu.vn",
          phone: "0987654321",
          subject: "Toán học",
          employeeCode: "GV001",
          hireDate: "2020-09-01",
          status: "active",
          totalClasses: 3,
          totalStudents: 95,
          averageScore: 8.5,
          experience: 8,
          education: "Thạc sĩ Toán học - Đại học Sư phạm Hà Nội",
          address: "123 Đường ABC, Quận 1, TP.HCM"
        },
        {
          id: 2,
          name: "Trần Văn Minh",
          email: "tranvanminh@school.edu.vn",
          phone: "0976543210",
          subject: "Vật lý",
          employeeCode: "GV002",
          hireDate: "2019-08-15",
          status: "active",
          totalClasses: 2,
          totalStudents: 68,
          averageScore: 7.9,
          experience: 10,
          education: "Tiến sĩ Vật lý - Đại học Khoa học Tự nhiên",
          address: "456 Đường DEF, Quận 2, TP.HCM"
        }
      ]
      setTeachers(mockTeachers)
      setFilteredTeachers(mockTeachers)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeachers()
  }, [])

  useEffect(() => {
    // Filter teachers based on search and filters
    const filtered = teachers.filter(teacher => {
      const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           teacher.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSubject = selectedSubject === "all" || teacher.subject === selectedSubject
      const matchesStatus = selectedStatus === "all" || teacher.status === selectedStatus
      
      return matchesSearch && matchesSubject && matchesStatus
    })
    
    setFilteredTeachers(filtered)
  }, [teachers, searchTerm, selectedSubject, selectedStatus])

  // Calculate statistics
  const stats = {
    total: teachers.length,
    active: teachers.filter(t => t.status === 'active').length,
    totalStudents: teachers.reduce((sum, t) => sum + t.totalStudents, 0),
    avgScore: teachers.length > 0 ? (teachers.reduce((sum, t) => sum + t.averageScore, 0) / teachers.filter(t => t.averageScore > 0).length).toFixed(1) : "0"
  }

  const handleCreateTeacher = async () => {
    try {
      // Validate form
      if (!formData.name || !formData.email || !formData.subject) {
        toast.error("Vui lòng điền đầy đủ thông tin bắt buộc")
        return
      }

      // API call to create teacher
      const newTeacher = await apiRequest('/users', {
        method: 'POST',
        body: {
          hoTen: formData.name,
          email: formData.email,
          soDienThoai: formData.phone,
          vaiTro: 'teacher',
          monHocChinh: formData.subject,
          bangCap: formData.education,
          diaChi: formData.address
        }
      })

      // Add to local state
      const transformedTeacher: Teacher = {
        id: newTeacher.maNguoiDung || newTeacher.id,
        name: newTeacher.hoTen,
        email: newTeacher.email,
        phone: newTeacher.soDienThoai || '',
        subject: newTeacher.monHocChinh || formData.subject,
        employeeCode: `GV${newTeacher.maNguoiDung || newTeacher.id}`,
        hireDate: new Date().toISOString().split('T')[0],
        status: 'active',
        totalClasses: 0,
        totalStudents: 0,
        averageScore: 0,
        experience: 0,
        education: formData.education,
        address: formData.address
      }

      setTeachers([...teachers, transformedTeacher])
      setIsCreateDialogOpen(false)
      resetForm()
      toast.success("Tạo giáo viên thành công!")
    } catch (error) {
      console.error('Create teacher error:', error)
      toast.error("Có lỗi xảy ra khi tạo giáo viên")
    }
  }

  const handleEditTeacher = async () => {
    try {
      if (!selectedTeacher) return

      // API call to update teacher
      const updatedTeacher = await apiRequest(`/users/${selectedTeacher.id}`, {
        method: 'PUT',
        body: {
          hoTen: formData.name,
          email: formData.email,
          soDienThoai: formData.phone,
          monHocChinh: formData.subject,
          bangCap: formData.education,
          diaChi: formData.address
        }
      })

      // Update local state
      const transformedTeacher = { 
        ...selectedTeacher, 
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        education: formData.education,
        address: formData.address
      }

      const updatedTeachers = teachers.map(t => 
        t.id === selectedTeacher.id ? transformedTeacher : t
      )

      setTeachers(updatedTeachers)
      setIsEditDialogOpen(false)
      setSelectedTeacher(null)
      resetForm()
      toast.success("Cập nhật giáo viên thành công!")
    } catch (error) {
      console.error('Update teacher error:', error)
      toast.error("Có lỗi xảy ra khi cập nhật giáo viên")
    }
  }

  const handleDeleteTeacher = async (teacherId: number) => {
    try {
      if (confirm("Bạn có chắc chắn muốn xóa giáo viên này?")) {
        await apiRequest(`/users/${teacherId}`, {
          method: 'DELETE'
        })

        const updatedTeachers = teachers.filter(t => t.id !== teacherId)
        setTeachers(updatedTeachers)
        toast.success("Xóa giáo viên thành công!")
      }
    } catch (error) {
      console.error('Delete teacher error:', error)
      toast.error("Có lỗi xảy ra khi xóa giáo viên")
    }
  }

  const handleStatusChange = async (teacherId: number, newStatus: Teacher['status']) => {
    try {
      await apiRequest(`/users/${teacherId}`, {
        method: 'PUT',
        body: { 
          trangThai: newStatus === 'active' 
        }
      })

      const updatedTeachers = teachers.map(t => 
        t.id === teacherId ? { ...t, status: newStatus } : t
      )
      setTeachers(updatedTeachers)
      toast.success("Cập nhật trạng thái thành công!")
    } catch (error) {
      console.error('Status change error:', error)
      toast.error("Có lỗi xảy ra khi cập nhật trạng thái")
    }
  }

  const openEditDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setFormData({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      subject: teacher.subject,
      employeeCode: teacher.employeeCode,
      education: teacher.education,
      address: teacher.address,
      hireDate: teacher.hireDate
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      employeeCode: "",
      education: "",
      address: "",
      hireDate: ""
    })
  }

  const handleExport = () => {
    toast.success("Đang xuất báo cáo giáo viên...")
  }

  const getStatusBadge = (status: Teacher['status']) => {
    const config = STATUS_CONFIG[status]
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const getStatusIcon = (status: Teacher['status']) => {
    switch (status) {
      case 'active':
        return <UserCheck className="h-4 w-4 text-green-600" />
      case 'inactive':
        return <UserX className="h-4 w-4 text-gray-600" />
      case 'on_leave':
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const subjects = [...new Set(teachers.map(t => t.subject).filter(Boolean))]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Giáo viên</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý thông tin và hoạt động của giáo viên
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Xuất báo cáo
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Thêm giáo viên
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Thêm giáo viên mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin để tạo tài khoản giáo viên mới
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Họ và tên *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Nhập họ và tên"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="Nhập email"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Môn học chính *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      placeholder="Nhập môn học"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="education">Bằng cấp</Label>
                  <Input
                    id="education"
                    value={formData.education}
                    onChange={(e) => setFormData({...formData, education: e.target.value})}
                    placeholder="Nhập thông tin bằng cấp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Nhập địa chỉ"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreateTeacher}>
                  Tạo giáo viên
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng giáo viên</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.active} đang hoạt động</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giáo viên hoạt động</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% tổng số
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng học sinh</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Được quản lý</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Điểm TB</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore}</div>
            <p className="text-xs text-muted-foreground">Điểm trung bình chung</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách giáo viên</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Tìm kiếm giáo viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Chọn môn học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả môn học</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Không hoạt động</SelectItem>
                <SelectItem value="on_leave">Nghỉ phép</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Giáo viên</TableHead>
                <TableHead>Môn học</TableHead>
                <TableHead>Lớp/Học sinh</TableHead>
                <TableHead>Kinh nghiệm</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      Không tìm thấy giáo viên nào
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">{teacher.name.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-medium">{teacher.name}</div>
                          <div className="text-sm text-muted-foreground">{teacher.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{teacher.subject}</div>
                      <div className="text-sm text-muted-foreground">{teacher.employeeCode}</div>
                    </TableCell>
                    <TableCell>
                      <div>{teacher.totalClasses} lớp</div>
                      <div className="text-sm text-muted-foreground">{teacher.totalStudents} học sinh</div>
                    </TableCell>
                    <TableCell>
                      <div>{teacher.experience} năm</div>
                      <div className="text-sm text-muted-foreground">
                        TB: {teacher.averageScore > 0 ? teacher.averageScore.toFixed(1) : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(teacher.status)}
                        {getStatusBadge(teacher.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {}}>
                            <Eye className="mr-2 h-4 w-4" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(teacher)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(teacher.id, teacher.status === 'active' ? 'inactive' : 'active')}
                          >
                            {teacher.status === 'active' ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Vô hiệu hóa
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Kích hoạt
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTeacher(teacher.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa giáo viên</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin giáo viên
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Họ và tên *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nhập họ và tên"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Nhập email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Số điện thoại</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Nhập số điện thoại"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-subject">Môn học chính *</Label>
                <Input
                  id="edit-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  placeholder="Nhập môn học"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-education">Bằng cấp</Label>
              <Input
                id="edit-education"
                value={formData.education}
                onChange={(e) => setFormData({...formData, education: e.target.value})}
                placeholder="Nhập thông tin bằng cấp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Địa chỉ</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Nhập địa chỉ"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditTeacher}>
              Cập nhật
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
