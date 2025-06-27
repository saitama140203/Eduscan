import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

// Types
export interface User {
  maNguoiDung: number;
  email: string;
  hoTen: string;
  vaiTro: "ADMIN" | "MANAGER" | "TEACHER";
  soDienThoai?: string;
  urlAnhDaiDien?: string;
  maToChuc?: number;
  tenToChuc?: string;
  trangThai: boolean;
  thoiGianTao: string;
  thoiGianCapNhat: string;
}

export interface UserCreate {
  email: string;
  password: string;
  hoTen: string;
  vaiTro: "ADMIN" | "MANAGER" | "TEACHER";
  soDienThoai?: string;
  urlAnhDaiDien?: string;
  maToChuc?: number;
}

export interface UserUpdate {
  hoTen?: string;
  soDienThoai?: string;
  urlAnhDaiDien?: string;
  trangThai?: boolean;
  vaiTro?: "ADMIN" | "MANAGER" | "TEACHER";
  maToChuc?: number;
}

export interface UserStats {
  total: number;
  active: number;
  admins: number;
  managers: number;
  teachers: number;
}

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const baseURL = "/api/v1";
  
  const response = await fetch(`${baseURL}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.detail || errorData.message || 'Something went wrong';
    } catch {
      errorMessage = errorText || 'Network error';
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch users
  const fetchUsers = async (skip = 0, limit = 100) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest(`/users?skip=${skip}&limit=${limit}`);
      setUsers(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Lỗi",
        description: err.message || "Không thể tải danh sách người dùng",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch users by organization
  const fetchUsersByOrganization = async (orgId: number, skip = 0, limit = 100) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest(`/users/organization/${orgId}?skip=${skip}&limit=${limit}`);
      setUsers(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Lỗi",
        description: err.message || "Không thể tải danh sách người dùng theo tổ chức",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Create user
  const createUser = async (userData: UserCreate): Promise<User | null> => {
    try {
      const newUser = await apiRequest('/users/', {
        method: 'POST',
        body: userData,
      });
      
      setUsers(prev => [newUser, ...prev]);
      
      toast({
        title: "Thành công",
        description: "Tạo người dùng mới thành công",
      });
      
      return newUser;
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Không thể tạo người dùng mới",
        variant: "destructive",
      });
      return null;
    }
  };

  // Update user
  const updateUser = async (userId: number, updateData: UserUpdate): Promise<User | null> => {
    try {
      const updatedUser = await apiRequest(`/users/${userId}`, {
        method: 'PUT',
        body: updateData,
      });
      
      setUsers(prev => prev.map(u => u.maNguoiDung === userId ? updatedUser : u));
      
      toast({
        title: "Thành công",
        description: "Cập nhật người dùng thành công",
      });
      
      return updatedUser;
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Không thể cập nhật người dùng",
        variant: "destructive",
      });
      return null;
    }
  };

  // Delete user (deactivate)
  const deleteUser = async (userId: number): Promise<boolean> => {
    try {
      await apiRequest(`/users/${userId}`, {
        method: 'DELETE',
      });
      
      // Update local state to show user as deactivated
      setUsers(prev => prev.map(u => 
        u.maNguoiDung === userId ? { ...u, trangThai: false } : u
      ));
      
      toast({
        title: "Thành công",
        description: "Vô hiệu hóa người dùng thành công",
      });
      
      return true;
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Không thể xóa người dùng",
        variant: "destructive",
      });
      return false;
    }
  };

  // Change user password
  const changePassword = async (userId: number, currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      await apiRequest(`/users/${userId}/change-password`, {
        method: 'POST',
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: newPassword,
        },
      });
      
      toast({
        title: "Thành công",
        description: "Đổi mật khẩu thành công",
      });
      
      return true;
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Không thể đổi mật khẩu",
        variant: "destructive",
      });
      return false;
    }
  };

  // Reset user password (admin only)
  const resetPassword = async (userId: number): Promise<string | null> => {
    try {
      const result = await apiRequest(`/users/${userId}/reset-password`, {
        method: 'POST',
      });
      
      toast({
        title: "Thành công",
        description: "Reset mật khẩu thành công",
      });
      
      return result.newPassword || "123456"; // Default password
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Không thể reset mật khẩu",
        variant: "destructive",
      });
      return null;
    }
  };

  // Activate user
  const activateUser = async (userId: number): Promise<boolean> => {
    try {
      const updatedUser = await apiRequest(`/users/${userId}`, {
        method: 'PUT',
        body: { trangThai: true },
      });
      
      setUsers(prev => prev.map(u => u.maNguoiDung === userId ? updatedUser : u));
      
      toast({
        title: "Thành công",
        description: "Kích hoạt người dùng thành công",
      });
      
      return true;
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Không thể kích hoạt người dùng",
        variant: "destructive",
      });
      return false;
    }
  };

  // Upload avatar
  const uploadAvatar = async (userId: number, file: File): Promise<boolean> => {
    try {
      // Upload to Cloudinary first
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'eduscan');

      const uploadResponse = await fetch('https://api.cloudinary.com/v1_1/eduscan/image/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      if (!uploadData.secure_url) {
        throw new Error('Upload ảnh thất bại');
      }

      // Update user with new avatar URL
      await updateUser(userId, { urlAnhDaiDien: uploadData.secure_url });
      
      return true;
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Không thể tải ảnh đại diện",
        variant: "destructive",
      });
      return false;
    }
  };

  // Bulk operations
  const bulkOperation = async (operation: string, userIds: number[], extraData?: any): Promise<boolean> => {
    try {
      if (operation === "activate") {
        const promises = userIds.map(id => activateUser(id));
        await Promise.all(promises);
      } else if (operation === "deactivate") {
        const promises = userIds.map(id => deleteUser(id));
        await Promise.all(promises);
      }
      
      toast({
        title: "Thành công",
        description: `Đã thực hiện thao tác trên ${userIds.length} người dùng`,
      });
      
      return true;
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Không thể thực hiện thao tác hàng loạt",
        variant: "destructive",
      });
      return false;
    }
  };

  // Calculate stats
  const getStats = (): UserStats => {
    const total = users.length;
    const active = users.filter(u => u.trangThai).length;
    const admins = users.filter(u => u.vaiTro === "ADMIN").length;
    const managers = users.filter(u => u.vaiTro === "MANAGER").length;
    const teachers = users.filter(u => u.vaiTro === "TEACHER").length;
    
    return { total, active, admins, managers, teachers };
  };

  // Filter users
  const filterUsers = (search: string, role: string, status: string, organization: string): User[] => {
    return users.filter(user => {
      const matchesSearch = !search || 
        user.hoTen.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      
      const matchesRole = !role || role === "all" || user.vaiTro === role;
      
      const matchesStatus = !status || status === "all" || 
        (status === "active" && user.trangThai) ||
        (status === "inactive" && !user.trangThai);
      
      const matchesOrg = !organization || organization === "all" || 
        user.tenToChuc?.toLowerCase().includes(organization.toLowerCase());
      
      return matchesSearch && matchesRole && matchesStatus && matchesOrg;
    });
  };

  // Load data on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    fetchUsers,
    fetchUsersByOrganization,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
    resetPassword,
    activateUser,
    uploadAvatar,
    bulkOperation,
    getStats,
    filterUsers,
  };
}

export function useUser(userId: number) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest(`/users/${userId}`);
      setUser(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  return {
    user,
    loading,
    error,
    fetchUser,
  };
} 