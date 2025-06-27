import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi, Student, StudentFilters } from '@/lib/api/students';
import { toast } from 'sonner';

// Get all students
export function useStudents(filters?: StudentFilters) {
  return useQuery({
    queryKey: ['students', filters],
    queryFn: () => studentsApi.getStudents(filters),
  });
}

// Get student by ID
export function useStudent(id: number) {
  return useQuery({
    queryKey: ['students', id],
    queryFn: () => studentsApi.getStudentById(id),
    enabled: !!id,
  });
}

// Create student
export function useCreateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: studentsApi.createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Học sinh đã được tạo thành công');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi tạo học sinh');
    },
  });
}

// Update student
export function useUpdateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Student> }) =>
      studentsApi.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Học sinh đã được cập nhật');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật học sinh');
    },
  });
}

// Delete student
export function useDeleteStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: studentsApi.deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Học sinh đã được xóa');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi xóa học sinh');
    },
  });
}

// Transfer student
export function useTransferStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ studentId, newClassId }: { studentId: number; newClassId: number }) =>
      studentsApi.transferStudent(studentId, newClassId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Đã chuyển lớp cho học sinh');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi chuyển lớp');
    },
  });
}
