import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { usersApi, type UserProfile } from '@/lib/api/users';
import type { PaginatedResponse } from '@/types/api';

// Re-export UserProfile type for convenience
export type User = UserProfile;

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

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<PaginatedResponse<User>['meta'] | null>(null);
  const { toast } = useToast();

  const fetchUsers = useCallback(async (params: any = { page: 1, limit: 100 }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.getUsers(params);
      if (response) {
        setUsers(response.data);
        setMeta(response.meta);
      }
      return response;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Lỗi",
        description: err.message || "Không thể tải danh sách người dùng",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createUser = useCallback(async (userData: Partial<User>): Promise<User | null> => {
    try {
      const newUser = await usersApi.createUser(userData);
      if (newUser) {
        toast({
          title: "Thành công",
          description: "Tạo người dùng mới thành công",
        });
        // Refetch or add to state locally
        fetchUsers(); 
        return newUser;
      }
      return null;
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Không thể tạo người dùng mới",
        variant: "destructive",
      });
      return null;
    }
  }, [toast, fetchUsers]);

  const updateUser = useCallback(async (userId: number, updateData: Partial<User>): Promise<User | null> => {
    try {
      const updatedUser = await usersApi.updateUser(userId, updateData);
      if (updatedUser) {
        setUsers(prev => prev.map(u => u.maNguoiDung === userId ? updatedUser : u));
        toast({
          title: "Thành công",
          description: "Cập nhật người dùng thành công",
        });
        return updatedUser;
      }
      return null;
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Không thể cập nhật người dùng",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Deactivate user by setting trangThai to false
  const deleteUser = useCallback(async (userId: number): Promise<boolean> => {
    try {
      await usersApi.updateUser(userId, { trangThai: false });
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
        description: err.message || "Không thể vô hiệu hóa người dùng",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Activate user by setting trangThai to true
  const activateUser = useCallback(async (userId: number): Promise<boolean> => {
    try {
      const updatedUser = await usersApi.updateUser(userId, { trangThai: true });
       if (updatedUser) {
        setUsers(prev => prev.map(u => u.maNguoiDung === userId ? updatedUser : u));
        toast({
          title: "Thành công",
          description: "Kích hoạt người dùng thành công",
        });
        return true;
      }
      return false;
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Không thể kích hoạt người dùng",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Change user password
  const changePassword = useCallback(async (userId: number, currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      await usersApi.changePassword(userId, {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: newPassword,
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
  }, [toast]);

  // Reset user password (admin only)
  const resetPassword = useCallback(async (userId: number): Promise<string | null> => {
    try {
      const result = await usersApi.resetPassword(userId);
      toast({
        title: "Thành công",
        description: "Reset mật khẩu thành công",
      });
      return result?.newPassword || "123456"; // Default password
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Không thể reset mật khẩu",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

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
    if (!users || !Array.isArray(users)) {
      return { total: 0, active: 0, admins: 0, managers: 0, teachers: 0 };
    }

    const total = users.length;
    const active = users.filter(u => u.trangThai).length;
    const admins = users.filter(u => u.vaiTro?.toUpperCase() === "ADMIN").length;
    const managers = users.filter(u => u.vaiTro?.toUpperCase() === "MANAGER").length;
    const teachers = users.filter(u => u.vaiTro?.toUpperCase() === "TEACHER").length;
    
    return { total, active, admins, managers, teachers };
  };

  // Filter users
  const filterUsers = (search: string, role: string, status: string, organization: string): User[] => {
    if (!users || !Array.isArray(users)) {
      return [];
    }
    return users.filter(user => {
      const matchesSearch = !search || 
        user.hoTen?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase());
      
      const matchesRole = !role || role === "all" || user.vaiTro?.toLowerCase() === role.toLowerCase();
      
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
  }, [fetchUsers]);

  return {
    users,
    meta,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    activateUser,
    changePassword,
    resetPassword,
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
      const data = await usersApi.getUserById(userId);
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
  }, [userId, fetchUser]);

  return {
    user,
    loading,
    error,
    fetchUser,
  };
}

export function useTeachersByOrg(organizationId: number | null | undefined) {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTeachers = useCallback(async (orgId: number) => {
    setLoading(true);
    setError(null);
    try {
      // API endpoint này cần trả về danh sách giáo viên của một tổ chức
      const response = await usersApi.getUsers({
        maToChuc: orgId,
        vaiTro: 'TEACHER',
        limit: 500 // Lấy nhiều để tránh phân trang
      });

      if (response && response.data) {
        setTeachers(response.data);
      } else {
        setTeachers([]);
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách giáo viên.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (organizationId && organizationId > 0) {
      fetchTeachers(organizationId);
    } else {
      setTeachers([]); // Xóa danh sách giáo viên nếu không có tổ chức nào được chọn
    }
  }, [organizationId, fetchTeachers]);

  return { teachers, loading, error, refetch: () => organizationId && fetchTeachers(organizationId) };
} 