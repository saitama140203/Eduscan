"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import { 
  Users, 
  UserPlus, 
  Search, 
  Settings,
  UserCheck,
  UserX,
  Loader2,
  ArrowLeft,
  Download,
  MoreHorizontal,
  Crown,
  ShieldCheck,
  GraduationCap
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
import { Checkbox } from "@/components/ui/checkbox";

// Import custom hook
import { useUsers, User } from "@/hooks/use-users";

// Import existing dialogs
import { CreateUserDialog } from "./CreateUserDialog";
import { EditUserDialog } from "./EditUserDialog";
import { DeactivateUserDialog } from "./DeactivateUserDialog";
import { ActivateUserDialog } from "./ActivateUserDialog";

export default function UsersPage() {
  const router = useRouter();
  
  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [operationLoading, setOperationLoading] = useState(false);

  // Custom hook
  const {
    users,
    loading,
    error,
    deleteUser,
    activateUser,
    getStats,
    filterUsers,
  } = useUsers();

  // Computed values
  const stats = useMemo(() => getStats(), [getStats]);
  const filteredUsersList = useMemo(() => 
    filterUsers(searchTerm, roleFilter, statusFilter), 
    [filterUsers, searchTerm, roleFilter, statusFilter]
  );

  // Handlers
  const handleCreateUser = () => {
    setShowCreateDialog(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  };

  const handleDeactivateUser = (user: User) => {
    setSelectedUser(user);
    setShowDeactivateDialog(true);
  };

  const handleActivateUser = (user: User) => {
    setSelectedUser(user);
    setShowActivateDialog(true);
  };

  // Dialog action handlers
  const handleConfirmDeactivate = async () => {
    if (!selectedUser) return;
    
    setOperationLoading(true);
    try {
      await deleteUser(selectedUser.maNguoiDung);
      setShowDeactivateDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.log("Deactivate operation completed");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleConfirmActivate = async () => {
    if (!selectedUser) return;
    
    setOperationLoading(true);
    try {
      await activateUser(selectedUser.maNguoiDung);
      setShowActivateDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.log("Activate operation completed");
    } finally {
      setOperationLoading(false);
    }
  };

  const onActionSuccess = () => {
    // Refresh page after successful operations
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      ADMIN: { color: "bg-red-100 text-red-800", icon: Crown, label: "Admin" },
      MANAGER: { color: "bg-blue-100 text-blue-800", icon: ShieldCheck, label: "Manager" },
      TEACHER: { color: "bg-green-100 text-green-800", icon: GraduationCap, label: "Giáo viên" },
      admin: { color: "bg-red-100 text-red-800", icon: Crown, label: "Admin" },
      manager: { color: "bg-blue-100 text-blue-800", icon: ShieldCheck, label: "Manager" },
      teacher: { color: "bg-green-100 text-green-800", icon: GraduationCap, label: "Giáo viên" },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.teacher;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} border-0`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <UserCheck className="w-3 h-3 mr-1" />
        Hoạt động
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        <UserX className="w-3 h-3 mr-1" />
        Vô hiệu
      </Badge>
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
            <h1 className="text-3xl font-bold">Quản lý người dùng</h1>
            <p className="text-gray-600">Quản lý thông tin người dùng trong hệ thống</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
          <Button onClick={handleCreateUser}>
            <UserPlus className="h-4 w-4 mr-2" />
            Thêm người dùng
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoạt động</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin</CardTitle>
            <Crown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.admin}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manager</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.manager}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giáo viên</CardTitle>
            <GraduationCap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.teacher}</div>
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
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Lọc theo vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả vai trò</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="teacher">Giáo viên</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Lọc theo trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Vô hiệu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                Đã chọn {selectedUsers.length} người dùng
              </span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  Vô hiệu hóa hàng loạt
                </Button>
                <Button variant="outline" size="sm">
                  Kích hoạt hàng loạt
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsersList.map((user) => (
          <Card key={user.maNguoiDung} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedUsers.includes(user.maNguoiDung)}
                    onCheckedChange={(checked) => 
                      handleSelectUser(user.maNguoiDung, checked as boolean)
                    }
                  />
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                    {user.hoTen?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{user.hoTen}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditUser(user)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Chỉnh sửa
                    </DropdownMenuItem>
                    {user.trangThai ? (
                      <DropdownMenuItem 
                        onClick={() => handleDeactivateUser(user)}
                        className="text-red-600"
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Vô hiệu hóa
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        onClick={() => handleActivateUser(user)}
                        className="text-green-600"
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Kích hoạt
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Vai trò:</span>
                  {getRoleBadge(user.vaiTro)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Trạng thái:</span>
                  {getStatusBadge(user.trangThai)}
                </div>
                {user.soDienThoai && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Điện thoại:</span>
                    <span className="text-sm font-medium">{user.soDienThoai}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredUsersList.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Không có người dùng nào
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                  ? "Không tìm thấy người dùng phù hợp với bộ lọc"
                  : "Chưa có người dùng nào trong hệ thống"
                }
              </p>
              {!(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
                <Button onClick={handleCreateUser}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Thêm người dùng đầu tiên
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CreateUserDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        onSuccess={onActionSuccess}
      />
      
      <EditUserDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog}
        user={selectedUser}
        onSuccess={onActionSuccess}
      />
      
      <DeactivateUserDialog 
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
        user={selectedUser}
        onDeactivate={handleConfirmDeactivate}
        loading={operationLoading}
      />
      
      <ActivateUserDialog 
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
        user={selectedUser}
        onActivate={handleConfirmActivate}
        loading={operationLoading}
      />
    </div>
  );
} 