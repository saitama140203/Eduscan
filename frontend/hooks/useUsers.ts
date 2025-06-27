// hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  userApi,
  getTeachers,
  createUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
  User,
} from '@/lib/api/users';
import { toast } from 'sonner';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: any) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  teachers: () => [...userKeys.all, 'teachers'] as const,
  teachersByOrg: (orgId: number) => [...userKeys.teachers(), orgId] as const,
};

// Get all users
export function useUsers(skip = 0, limit = 100) {
  return useQuery({
    queryKey: userKeys.list({ skip, limit }),
    queryFn: () => userApi.getUsers(skip, limit),
  });
}

// Get users by organization
export function useUsersByOrganization(orgId: number, skip = 0, limit = 100) {
  return useQuery({
    queryKey: userKeys.list({ orgId, skip, limit }),
    queryFn: () => userApi.getUsersByOrganization(orgId, skip, limit),
    enabled: !!orgId,
  });
}

// Get teachers (users with role Teacher)
export function useTeachers(orgId?: number, skip = 0, limit = 100) {
  return useQuery({
    queryKey: orgId ? userKeys.teachersByOrg(orgId) : userKeys.teachers(),
    queryFn: () => getTeachers(orgId, skip, limit),
  });
}

// Get single user
export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userApi.getUser(parseInt(userId)),
    enabled: !!userId,
  });
}

// Create user
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('Tạo người dùng thành công');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi tạo người dùng: ${error.message}`);
    },
  });
}

// Update user
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      apiUpdateUser(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      toast.success('Cập nhật người dùng thành công');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi cập nhật người dùng: ${error.message}`);
    },
  });
}

// Delete user
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiDeleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('Xóa người dùng thành công');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi xóa người dùng: ${error.message}`);
    },
  });
}
