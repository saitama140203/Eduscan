import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teachersApi, Teacher, TeacherFilters } from '@/lib/api/teachers';
import { toast } from 'sonner';

// Get all teachers
export function useTeachers(filters?: TeacherFilters) {
  return useQuery({
    queryKey: ['teachers', filters],
    queryFn: () => teachersApi.getTeachers(filters),
  });
}

// Get teacher by ID
export function useTeacher(id: number) {
  return useQuery({
    queryKey: ['teachers', id],
    queryFn: () => teachersApi.getTeacherById(id),
    enabled: !!id,
  });
}

// Create teacher
export function useCreateTeacher() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: teachersApi.createTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Giáo viên đã được tạo thành công');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi tạo giáo viên');
    },
  });
}

// Update teacher
export function useUpdateTeacher() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Teacher> }) =>
      teachersApi.updateTeacher(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Giáo viên đã được cập nhật');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật giáo viên');
    },
  });
}

// Delete teacher
export function useDeleteTeacher() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: teachersApi.deleteTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Giáo viên đã được xóa');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi xóa giáo viên');
    },
  });
}

// Assign classes to teacher
export function useAssignClasses() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ teacherId, classIds }: { teacherId: number; classIds: number[] }) =>
      teachersApi.assignClasses(teacherId, classIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Đã phân công lớp cho giáo viên');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi phân công lớp');
    },
  });
}
