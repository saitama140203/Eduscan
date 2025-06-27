import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  classesApi, 
  classAnalyticsApi, 
  classSettingsApi, 
  Class, 
  ClassCreate, 
  ClassUpdate,
  ClassAnalytics,
  ClassSettings,
  ClassSettingsUpdate
} from '@/lib/api/classes';
import { toast } from 'sonner';

// Query keys
export const classKeys = {
  all: ['classes'] as const,
  lists: () => [...classKeys.all, 'list'] as const,
  list: (params?: any) => [...classKeys.lists(), params] as const,
  details: () => [...classKeys.all, 'detail'] as const,
  detail: (id: number) => [...classKeys.details(), id] as const,
};

// Hooks
export function useClasses(params?: {
  org_id?: number;
  teacher_id?: number;
  search?: string;
  skip?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: classKeys.list(params),
    queryFn: () => classesApi.getClasses(params),
  });
}

export function useClass(classId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: classKeys.detail(classId),
    queryFn: () => classesApi.getClass(classId),
    enabled: options?.enabled !== false && !!classId,
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClassCreate) => classesApi.createClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      toast.success('Tạo lớp học thành công');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Có lỗi xảy ra khi tạo lớp học');
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classId, data }: { classId: number; data: ClassUpdate }) =>
      classesApi.updateClass(classId, data),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      queryClient.invalidateQueries({ queryKey: classKeys.detail(classId) });
      toast.success('Cập nhật lớp học thành công');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Có lỗi xảy ra khi cập nhật lớp học');
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (classId: number) => classesApi.deleteClass(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      toast.success('Xóa lớp học thành công');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Có lỗi xảy ra khi xóa lớp học');
    },
  });
}

// Class Analytics Hooks
export function useClassAnalytics(
  classId: number,
  period: string = "all",
  metric: string = "average"
) {
  return useQuery({
    queryKey: ['class-analytics', classId, period, metric],
    queryFn: () => classAnalyticsApi.getAnalytics(classId, period, metric),
    enabled: !!classId,
  });
}

// Class Settings Hooks
export function useClassSettings(classId: number) {
  return useQuery({
    queryKey: ['class-settings', classId],
    queryFn: () => classSettingsApi.getSettings(classId),
    enabled: !!classId,
  });
}

export function useUpdateClassSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classId, settings }: { classId: number; settings: ClassSettingsUpdate }) =>
      classSettingsApi.updateSettings(classId, settings),
    onSuccess: (_, { classId }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['class-settings', classId] });
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      toast.success('Cập nhật cài đặt lớp học thành công');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Có lỗi xảy ra khi cập nhật cài đặt');
    },
  });
}
