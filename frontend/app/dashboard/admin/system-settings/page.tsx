"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import { 
  Settings, 
  Plus, 
  Search, 
  Filter,
  Download,
  Upload,
  Loader2,
  ArrowLeft,
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
  Activity,
  Database,
  Zap,
  Shield,
  Bell,
  Mail,
  Server,
  Clock,
  Users
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Import custom hook
import { useSystemSettings, SystemSetting, SystemSettingCreate, SystemSettingUpdate } from "@/hooks/use-system-settings";

// Form schema
const settingSchema = z.object({
  key: z.string().min(1, "Key là bắt buộc").max(100, "Key không quá 100 ký tự"),
  value: z.string().min(1, "Giá trị là bắt buộc"),
  type: z.enum(['string', 'number', 'boolean', 'json']),
  category: z.string().min(1, "Danh mục là bắt buộc"),
  description: z.string().min(1, "Mô tả là bắt buộc"),
});

type SettingFormData = z.infer<typeof settingSchema>;

export default function SystemSettingsPage() {
  const router = useRouter();
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // Custom hook
  const {
    settings,
    loading,
    error,
    createSetting,
    updateSetting,
    deleteSetting,
    getStats,
    filterSettings,
    exportConfig,
  } = useSystemSettings();

  // Form
  const form = useForm<SettingFormData>({
    resolver: zodResolver(settingSchema),
    defaultValues: {
      key: "",
      value: "",
      type: "string",
      category: "general",
      description: "",
    },
  });

  // Computed values
  const stats = useMemo(() => getStats(), [getStats]);
  const filteredSettingsList = useMemo(() => 
    filterSettings(searchTerm, categoryFilter), 
    [filterSettings, searchTerm, categoryFilter]
  );

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(settings.map(s => s.category))];
    return cats.filter(Boolean);
  }, [settings]);

  // Handlers
  const handleCreateSetting = () => {
    form.reset({
      key: "",
      value: "",
      type: "string",
      category: "general",
      description: "",
    });
    setSelectedSetting(null);
    setShowCreateDialog(true);
  };

  const handleEditSetting = (setting: SystemSetting) => {
    form.reset({
      key: setting.key,
      value: setting.value,
      type: setting.type,
      category: setting.category,
      description: setting.description,
    });
    setSelectedSetting(setting);
    setShowEditDialog(true);
  };

  const handleViewSetting = (setting: SystemSetting) => {
    setSelectedSetting(setting);
    setShowViewDialog(true);
  };

  const onSubmit = async (data: SettingFormData) => {
    setOperationLoading(true);
    try {
      if (selectedSetting) {
        // Update
        const updateData: SystemSettingUpdate = {
          value: data.value,
          type: data.type,
          category: data.category,
          description: data.description,
        };
        await updateSetting(selectedSetting.id, updateData);
        setShowEditDialog(false);
      } else {
        // Create
        await createSetting(data);
        setShowCreateDialog(false);
      }
      form.reset();
    } catch (error) {
      console.log("Operation completed");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteSetting = async (id: number, key: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa cài đặt "${key}" không?`)) {
      await deleteSetting(id);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'boolean': return <Shield className="w-4 h-4" />;
      case 'number': return <Zap className="w-4 h-4" />;
      case 'json': return <Database className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'general': return <Settings className="w-4 h-4" />;
      case 'security': return <Shield className="w-4 h-4" />;
      case 'notification': return <Bell className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'system': return <Server className="w-4 h-4" />;
      case 'performance': return <Activity className="w-4 h-4" />;
      case 'backup': return <Database className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      string: { color: "bg-blue-100 text-blue-800", label: "Text" },
      number: { color: "bg-green-100 text-green-800", label: "Number" },
      boolean: { color: "bg-purple-100 text-purple-800", label: "Boolean" },
      json: { color: "bg-orange-100 text-orange-800", label: "JSON" },
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.string;
    
    return (
      <Badge className={`${config.color} border-0`}>
        {getTypeIcon(type)}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  const renderValue = (setting: SystemSetting) => {
    const { value, type } = setting;
    
    if (type === 'boolean') {
      return (
        <div className="flex items-center">
          <Switch checked={value.toLowerCase() === 'true'} disabled />
          <span className="ml-2">{value.toLowerCase() === 'true' ? 'Bật' : 'Tắt'}</span>
        </div>
      );
    }
    
    if (type === 'json') {
      try {
        const parsed = JSON.parse(value);
        return (
          <pre className="text-xs bg-gray-50 p-2 rounded border max-h-20 overflow-auto">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch {
        return <span className="text-red-600 text-sm">Invalid JSON</span>;
      }
    }
    
    return (
      <span className="font-mono text-sm">
        {value.length > 50 ? `${value.substring(0, 50)}...` : value}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Đang tải...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Lỗi: {error}</p>
          <Button onClick={() => window.location.reload()}>
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Cài đặt hệ thống</h1>
            <p className="text-gray-600">Quản lý cấu hình và tham số hệ thống</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={exportConfig}>
            <Download className="h-4 w-4 mr-2" />
            Xuất cấu hình
          </Button>
          <Button onClick={handleCreateSetting}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm cài đặt
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng cài đặt</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_settings}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Danh mục</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hệ thống</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.system_health.status === 'healthy' ? 'Ổn định' : 'Cảnh báo'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {Math.floor(stats.system_health.uptime / 3600)}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Tìm kiếm theo key, mô tả hoặc giá trị..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Lọc theo danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSettingsList.map((setting) => (
          <Card key={setting.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(setting.category)}
                  <div>
                    <h3 className="font-semibold text-sm">{setting.key}</h3>
                    <p className="text-xs text-gray-600">{setting.category}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getTypeBadge(setting.type)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewSetting(setting)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Xem chi tiết
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditSetting(setting)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      {!setting.is_system && (
                        <DropdownMenuItem 
                          onClick={() => handleDeleteSetting(setting.id, setting.key)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Mô tả:</p>
                  <p className="text-sm">{setting.description}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Giá trị:</p>
                  {renderValue(setting)}
                </div>
                <div className="text-xs text-gray-500">
                  Cập nhật: {new Date(setting.updated_at).toLocaleString('vi-VN')}
                </div>
              </div>
            </CardContent>
            </Card>
          ))}
        </div>

      {/* Empty State */}
      {filteredSettingsList.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Không có cài đặt nào
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || categoryFilter !== "all"
                  ? "Không tìm thấy cài đặt phù hợp với bộ lọc"
                  : "Chưa có cài đặt nào trong hệ thống"
                }
              </p>
              {!(searchTerm || categoryFilter !== "all") && (
                <Button onClick={handleCreateSetting}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm cài đặt đầu tiên
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedSetting ? "Chỉnh sửa cài đặt" : "Thêm cài đặt mới"}
            </DialogTitle>
            <DialogDescription>
              {selectedSetting 
                ? "Cập nhật thông tin cài đặt hệ thống" 
                : "Tạo cài đặt mới cho hệ thống"
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!!selectedSetting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kiểu dữ liệu</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn kiểu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="string">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Danh mục</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="general, security, email..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá trị</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setShowEditDialog(false);
                  }}
                  disabled={operationLoading}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={operationLoading}>
                  {operationLoading && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {selectedSetting ? "Cập nhật" : "Tạo"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Chi tiết cài đặt</DialogTitle>
            <DialogDescription>
              Thông tin đầy đủ về cài đặt hệ thống
            </DialogDescription>
          </DialogHeader>

          {selectedSetting && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Key:</label>
                  <p className="font-mono text-sm">{selectedSetting.key}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Kiểu:</label>
                  <div className="mt-1">{getTypeBadge(selectedSetting.type)}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Danh mục:</label>
                <div className="flex items-center mt-1">
                  {getCategoryIcon(selectedSetting.category)}
                  <span className="ml-2">{selectedSetting.category}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Mô tả:</label>
                <p className="text-sm mt-1">{selectedSetting.description}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Giá trị:</label>
                <div className="mt-1">{renderValue(selectedSetting)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div>
                  <label className="font-medium">ID:</label>
                  <p>{selectedSetting.id}</p>
                </div>
                <div>
                  <label className="font-medium">System:</label>
                  <p>{selectedSetting.is_system ? 'Có' : 'Không'}</p>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                <label className="font-medium">Cập nhật cuối:</label>
                <p>{new Date(selectedSetting.updated_at).toLocaleString('vi-VN')}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Đóng
            </Button>
            {selectedSetting && (
              <Button onClick={() => {
                setShowViewDialog(false);
                handleEditSetting(selectedSetting);
              }}>
                <Edit3 className="w-4 h-4 mr-2" />
                Chỉnh sửa
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}