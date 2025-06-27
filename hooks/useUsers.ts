import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, type User } from '@/lib/api/users';
import { toast } from 'sonner';

// Định nghĩa các query keys để quản lý cache
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
};


/**
 * Hook để lấy danh sách người dùng, có thể lọc theo organization ID.
 */
export const useUsers = (orgId?: number) => {
  return useQuery({
    queryKey: userKeys.list(orgId ? `org-${orgId}` : 'all'),
    queryFn: () => orgId ? userApi.getUsersByOrganization(orgId) : userApi.getUsers(),
    staleTime: 1000 * 60 * 5, // 5 phút
  });
};

/**
 * Hook để lấy chi tiết một người dùng theo ID.
 */
export const useUser = (userId: number) => {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userApi.getUser(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 phút
  });
};

/**
 * Hook để tạo người dùng mới.
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      // Vô hiệu hóa toàn bộ cache của users để fetch lại
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('Tạo người dùng mới thành công!');
    },
    onError: (error: any) => {
      toast.error(`Tạo người dùng thất bại: ${error.message}`);
    }
  });
};

/**
 * Hook để cập nhật thông tin người dùng.
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: Partial<User> }) =>
      userApi.updateUser(userId, data),
    onSuccess: (updatedUser: User) => {
      // Vô hiệu hóa toàn bộ cache users
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      
      // Cập nhật cache cho user cụ thể này
      if(updatedUser) {
        queryClient.setQueryData(userKeys.detail(updatedUser.maNguoiDung), updatedUser);
      }
      
      toast.success('Cập nhật người dùng thành công!');
    },
    onError: (error: any) => {
      toast.error(`Cập nhật thất bại: ${error.message}`);
    }
  });
};

/**
 * Hook để xóa người dùng.
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => userApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('Đã xóa người dùng thành công!');
    },
    onError: (error: any) => {
      toast.error(`Xóa thất bại: ${error.message}`);
    }
  });
}; 