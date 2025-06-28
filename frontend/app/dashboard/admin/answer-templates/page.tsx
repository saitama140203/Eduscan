/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Input 
} from '@/components/ui/input';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Upload, 
  Download, 
  Copy, 
  Eye, 
  EyeOff, 
  Star, 
  Trash2, 
  BarChart3,
  FileText,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import CreateTemplateDialog from './components/CreateTemplateDialog';
import UploadFileDialog from './components/UploadFileDialog';
import { answerTemplatesApi, type AnswerSheetTemplate, type SearchFilters } from '@/lib/api/answer-templates';

const AdminTemplatesPage: React.FC = () => {
  const router = useRouter();
  
  // State management
  const [templates, setTemplates] = useState<AnswerSheetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterPublic, setFilterPublic] = useState<string>('all');
  const [filterDefault, setFilterDefault] = useState<string>('all');
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AnswerSheetTemplate | null>(null);

  // Load templates function
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      let data: AnswerSheetTemplate[] = [];
      
      if (searchKeyword.trim() || filterPublic !== 'all' || filterDefault !== 'all') {
        const filters: SearchFilters = {
          search: searchKeyword.trim() || undefined,
          public: filterPublic === 'all' ? undefined : filterPublic === 'true',
          default: filterDefault === 'all' ? undefined : filterDefault === 'true',
        };
        data = await answerTemplatesApi.searchTemplates(filters);
      } else {
        data = await answerTemplatesApi.getTemplates();
      }
      
      setTemplates(data);
      setIsOnline(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể tải danh sách templates';
      console.error('Load templates error:', error);
      setError(errorMessage);
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, filterPublic, filterDefault]);

  // Initial load - chỉ chạy 1 lần khi component mount
  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when filters change - tách riêng để tránh dependency loop
  useEffect(() => {
    // Skip initial render để tránh double loading
    const timer = setTimeout(() => {
      loadTemplates();
    }, 300);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword, filterPublic, filterDefault]);

  // Template actions
  const handleCreateTemplate = () => {
    setCreateDialogOpen(true);
  };

  const handleEditTemplate = (template: AnswerSheetTemplate) => {
    router.push(`/dashboard/admin/answer-templates/${template.maMauPhieu}/edit`);
  };

  const handleUploadFile = (template: AnswerSheetTemplate) => {
    // Check permission before opening dialog
    if (!canEditTemplate()) {
      toast.error('Bạn không có quyền upload file cho template này. Chỉ người tạo hoặc Admin mới có thể upload file.');
      return;
    }
    
    setSelectedTemplate(template);
    setUploadDialogOpen(true);
  };

  const handleDownloadTemplate = async (template: AnswerSheetTemplate) => {
    try {
      if (!hasFile(template)) {
        toast.warning('Template này chưa có file đính kèm');
        return;
      }
      
      await answerTemplatesApi.downloadFile(template.maMauPhieu);
      toast.success('Đang tải file...');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Lỗi khi tải file template');
    }
  };

  const handleDuplicateTemplate = async (template: AnswerSheetTemplate) => {
    try {
      const newName = `Bản sao - ${template.tenMauPhieu}`;
      await answerTemplatesApi.duplicateTemplate(template.maMauPhieu, newName);
      toast.success('Nhân bản template thành công');
      await loadTemplates();
    } catch (error) {
      console.error('Duplicate error:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi khi nhân bản template');
    }
  };

  const handleToggleVisibility = async (template: AnswerSheetTemplate) => {
    try {
      const newVisibility = !template.laCongKhai;
      await answerTemplatesApi.toggleVisibility(template.maMauPhieu, newVisibility);
      const action = newVisibility ? 'công khai' : 'ẩn';
      toast.success(`Đã ${action} template thành công`);
      await loadTemplates();
    } catch (error) {
      console.error('Toggle visibility error:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi khi thay đổi trạng thái template');
    }
  };

  const handleToggleDefault = async (template: AnswerSheetTemplate) => {
    try {
      const newDefault = !template.laMacDinh;
      await answerTemplatesApi.setDefault(template.maMauPhieu, newDefault);
      const action = newDefault ? 'đặt làm' : 'bỏ';
      toast.success(`Đã ${action} template mặc định thành công`);
      await loadTemplates();
    } catch (error) {
      console.error('Toggle default error:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi khi thay đổi template mặc định');
    }
  };

  const handleDeleteTemplate = (template: AnswerSheetTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleViewStatistics = (template: AnswerSheetTemplate) => {
    router.push(`/dashboard/admin/answer-templates/${template.maMauPhieu}/statistics`);
  };

  const confirmDelete = async () => {
    if (!selectedTemplate) return;
    
    try {
      await answerTemplatesApi.deleteTemplate(selectedTemplate.maMauPhieu);
      toast.success('Xóa template thành công');
      await loadTemplates();
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi khi xóa template');
    }
  };

  // Check if template has file
  const hasFile = (template: AnswerSheetTemplate) => {
    return template.cauTrucJson?.fileInfo && 'maTapTin' in template.cauTrucJson.fileInfo;
  };

  // Check if current user can edit/upload to template
  const canEditTemplate = () => {
    // Since user already passed admin check to access this page,
    // they should have permission for all templates
    return true; // Admin can edit all templates
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-bold">Quản lý Mẫu Phiếu Trả Lời</h1>
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <div className="flex items-center text-green-600" title="API kết nối thành công">
                  <Wifi className="w-4 h-4 mr-1" />
                  <span className="text-xs">Online</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600" title="Không thể kết nối API">
                  <WifiOff className="w-4 h-4 mr-1" />
                  <span className="text-xs">Offline</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-muted-foreground mt-1">
            Tạo và quản lý các mẫu phiếu trả lời cho hệ thống
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTemplates}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button onClick={handleCreateTemplate}>
          <Plus className="w-4 h-4 mr-2" />
          Tạo Template Mới
        </Button>
      </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tìm kiếm & Lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Từ khóa</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Tìm kiếm theo tên template..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái công khai</label>
              <Select value={filterPublic} onValueChange={setFilterPublic}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="true">Công khai</SelectItem>
                  <SelectItem value="false">Riêng tư</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Template mặc định</label>
              <Select value={filterDefault} onValueChange={setFilterDefault}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="true">Mặc định</SelectItem>
                  <SelectItem value="false">Không mặc định</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Đang tải templates...</p>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Chưa có template nào
            </h3>
            <p className="text-gray-500 text-center mb-6">
              Tạo template đầu tiên để bắt đầu quản lý mẫu phiếu trả lời
            </p>
            <Button onClick={handleCreateTemplate}>
              <Plus className="w-4 h-4 mr-2" />
              Tạo Template Đầu Tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.maMauPhieu} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">
                    {template.tenMauPhieu}
                  </CardTitle>
                    <CardDescription className="mt-1">
                      {template.soCauHoi} câu hỏi • {template.soLuaChonMoiCau} lựa chọn/câu
                    </CardDescription>
                  </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleUploadFile(template)}
                        disabled={!canEditTemplate()}
                      >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload File
                        {!canEditTemplate() && (
                          <span className="text-xs text-muted-foreground ml-1">(Không có quyền)</span>
                        )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDownloadTemplate(template)}
                          disabled={!hasFile(template)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Tải xuống
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Nhân bản
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleVisibility(template)}>
                          {template.laCongKhai ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Ẩn
                          </>
                          ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Công khai
                          </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleDefault(template)}>
                          <Star className="w-4 h-4 mr-2" />
                          {template.laMacDinh ? 'Bỏ mặc định' : 'Đặt mặc định'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewStatistics(template)}>
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Thống kê
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteTemplate(template)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      Khổ {template.khoGiay}
                    </Badge>
                  {template.laCongKhai && (
                    <Badge variant="default">
                      Công khai
                    </Badge>
                  )}
                  {template.laMacDinh && (
                      <Badge variant="destructive">
                      Mặc định
                    </Badge>
                  )}
                    {hasFile(template) && (
                      <Badge variant="outline">
                        <FileText className="w-3 h-3 mr-1" />
                        Có file
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                  {template.coTuLuan && (
                      <div>✓ Có phần tự luận</div>
                    )}
                    {template.coThongTinHocSinh && (
                      <div>✓ Có thông tin học sinh</div>
                    )}
                    {template.coLogo && (
                      <div>✓ Có logo</div>
                  )}
                </div>

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                  Tạo: {new Date(template.thoiGianTao).toLocaleDateString('vi-VN')}
                    {template.thoiGianCapNhat !== template.thoiGianTao && (
                      <> • Cập nhật: {new Date(template.thoiGianCapNhat).toLocaleDateString('vi-VN')}</>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateTemplateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={() => {
          loadTemplates();
          setCreateDialogOpen(false);
        }}
      />

      <UploadFileDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        template={selectedTemplate}
        onSuccess={() => {
          loadTemplates();
          setUploadDialogOpen(false);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa template</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa template "{selectedTemplate?.tenMauPhieu}"?
                Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTemplatesPage; 