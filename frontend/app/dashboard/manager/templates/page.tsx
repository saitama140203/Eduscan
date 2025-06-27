"use client"

import React, { useState, useEffect } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  FileSpreadsheet, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Eye,
  Search,
  MoreHorizontal,
  FileText,
  PlayCircle,
  PauseCircle,
  Users,
  Settings,
  Calendar
} from "lucide-react"
import { toast } from "sonner"
import { apiRequest } from '@/lib/api/base'

interface Template {
  id: number
  name: string
  description: string
  category: string
  createdAt: string
  updatedAt: string
  createdBy: string
  isActive: boolean
  usageCount: number
  questionCount?: number
  fileSize?: string
}

export default function ManagerTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    content: ""
  })

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      
      // Fetch templates from answer-templates API
      const response = await apiRequest('/answer-templates')
      const templatesData = response.templates || response || []
      
      // Transform backend data to frontend format
      const transformedTemplates = templatesData.map((template: any) => ({
        id: template.maMauPhieu || template.id,
        name: template.tenMauPhieu || template.name || 'Template không tên',
        description: template.moTa || template.description || '',
        category: template.loaiPhieu || template.category || 'Phiếu trả lời',
        createdAt: template.thoiGianTao ? new Date(template.thoiGianTao).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        updatedAt: template.thoiGianCapNhat ? new Date(template.thoiGianCapNhat).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        createdBy: template.createdBy || 'Admin',
        isActive: template.trangThai !== false,
        usageCount: template.usageCount || 0,
        questionCount: template.soCauHoi || template.questionCount,
        fileSize: template.fileSize || 'N/A'
      }))

      setTemplates(transformedTemplates)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      toast.error("Không thể tải danh sách template")
      
      // Fallback to mock data only if API fails
      const mockTemplates: Template[] = [
        {
          id: 1,
          name: "Mẫu đề thi Toán học",
          description: "Template cho đề thi môn Toán học lớp 10",
          category: "Toán học",
          createdAt: "2024-01-15",
          updatedAt: "2024-01-20",
          createdBy: "Nguyễn Thị Lan",
          isActive: true,
          usageCount: 15
        },
        {
          id: 2,
          name: "Mẫu phiếu trả lời 50 câu",
          description: "Phiếu trả lời chuẩn cho 50 câu hỏi trắc nghiệm",
          category: "Phiếu trả lời",
          createdAt: "2024-01-08",
          updatedAt: "2024-01-25",
          createdBy: "Nguyễn Thị Lan",
          isActive: true,
          usageCount: 28
        }
      ]
      setTemplates(mockTemplates)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(templates.map(t => t.category)))

  const handleCreateTemplate = async () => {
    try {
      if (!formData.name || !formData.category) {
        toast.error("Vui lòng điền đầy đủ thông tin bắt buộc")
        return
      }

      // API call to create template
      const newTemplate = await apiRequest('/answer-templates', {
        method: 'POST',
        body: {
          tenMauPhieu: formData.name,
          moTa: formData.description,
          loaiPhieu: formData.category,
          noiDung: formData.content
        }
      })

      // Transform and add to local state
      const transformedTemplate: Template = {
        id: newTemplate.maMauPhieu || newTemplate.id,
        name: newTemplate.tenMauPhieu,
        description: newTemplate.moTa || '',
        category: newTemplate.loaiPhieu,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        createdBy: "Current User",
        isActive: true,
        usageCount: 0
      }

      setTemplates([...templates, transformedTemplate])
      setIsCreateDialogOpen(false)
      setFormData({ name: "", description: "", category: "", content: "" })
      toast.success("Tạo template thành công!")
    } catch (error) {
      console.error('Create template error:', error)
      toast.error("Có lỗi xảy ra khi tạo template")
    }
  }

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      if (confirm("Bạn có chắc chắn muốn xóa template này?")) {
        await apiRequest(`/answer-templates/${templateId}`, {
          method: 'DELETE'
        })

        setTemplates(templates.filter(t => t.id !== templateId))
        toast.success("Xóa template thành công!")
      }
    } catch (error) {
      console.error('Delete template error:', error)
      toast.error("Có lỗi xảy ra khi xóa template")
    }
  }

  const handleToggleActive = async (templateId: number) => {
    try {
      const template = templates.find(t => t.id === templateId)
      if (!template) return

      await apiRequest(`/answer-templates/${templateId}`, {
        method: 'PUT',
        body: {
          trangThai: !template.isActive
        }
      })

      setTemplates(templates.map(t => 
        t.id === templateId ? { ...t, isActive: !t.isActive } : t
      ))
      toast.success("Cập nhật trạng thái thành công!")
    } catch (error) {
      console.error('Toggle status error:', error)
      toast.error("Có lỗi xảy ra khi cập nhật trạng thái")
    }
  }

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      // API call to duplicate template
      const duplicatedTemplate = await apiRequest(`/answer-templates/${template.id}/duplicate`, {
        method: 'POST'
      })

      const transformedTemplate: Template = {
        id: duplicatedTemplate.maMauPhieu || duplicatedTemplate.id,
        name: `${template.name} (Copy)`,
        description: template.description,
        category: template.category,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        createdBy: "Current User",
        isActive: true,
        usageCount: 0
      }

      setTemplates([...templates, transformedTemplate])
      toast.success("Sao chép template thành công!")
    } catch (error) {
      console.error('Duplicate template error:', error)
      toast.error("Có lỗi xảy ra khi sao chép template")
    }
  }

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Template</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý các mẫu đề thi và template hệ thống
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tạo template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tạo template mới</DialogTitle>
              <DialogDescription>
                Tạo template mới cho hệ thống
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên template *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nhập tên template"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Danh mục *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Phiếu trả lời">Phiếu trả lời</SelectItem>
                    <SelectItem value="Đề thi">Đề thi</SelectItem>
                    <SelectItem value="Báo cáo">Báo cáo</SelectItem>
                    <SelectItem value="Khác">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Nhập mô tả template"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Nội dung template</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Nội dung template (JSON hoặc HTML)"
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreateTemplate}>
                Tạo template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng template</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">
              {templates.filter(t => t.isActive).length} đang hoạt động
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lượt sử dụng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.reduce((sum, t) => sum + t.usageCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Tổng lượt sử dụng</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Danh mục</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">Số danh mục</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cập nhật gần đây</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.filter(t => {
                const daysDiff = Math.floor((Date.now() - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
                return daysDiff <= 7
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Trong 7 ngày qua</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Tìm kiếm template..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <div className="text-muted-foreground">
                  Không tìm thấy template nào
                </div>
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <Card key={template.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-1">
                          {template.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{template.category}</Badge>
                          <Badge variant={template.isActive ? "default" : "secondary"}>
                            {template.isActive ? "Hoạt động" : "Tạm dừng"}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Sao chép
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleActive(template.id)}>
                            <Settings className="mr-2 h-4 w-4" />
                            {template.isActive ? "Tạm dừng" : "Kích hoạt"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {template.description || "Không có mô tả"}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lượt sử dụng:</span>
                        <span className="font-medium">{template.usageCount}</span>
                      </div>
                      {template.questionCount && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Số câu hỏi:</span>
                          <span className="font-medium">{template.questionCount}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tạo bởi:</span>
                        <span className="font-medium">{template.createdBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cập nhật:</span>
                        <span className="font-medium">
                          {new Date(template.updatedAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
