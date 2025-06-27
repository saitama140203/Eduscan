import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsApi, Organization } from '@/lib/api/organizations';
import { toast } from 'sonner';

// Query keys
export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: (filters?: any) => [...organizationKeys.lists(), filters] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: number) => [...organizationKeys.details(), id] as const,
};

// Get organizations list
export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: () => organizationsApi.getAll(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Create organization
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Organization>) => organizationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      toast.success('Tạo tổ chức thành công');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi tạo tổ chức: ${error.message}`);
    },
  });
}

// Update organization
export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: number; data: Partial<Organization> }) => 
      organizationsApi.update(orgId, data),
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(orgId) });
      toast.success('Cập nhật tổ chức thành công');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi cập nhật tổ chức: ${error.message}`);
    },
  });
}

// Delete organization
export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orgId: number) => organizationsApi.delete(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      toast.success('Xóa tổ chức thành công');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi xóa tổ chức: ${error.message}`);
    },
  });
}
