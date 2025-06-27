/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { managerClassesApi, ManagerClass, ManagerClassCreate, ManagerClassUpdate, TeacherAssignment } from '@/lib/api/manager-classes';
import { apiRequest } from '@/lib/api/base';
import { toast } from 'sonner';

// Query keys for caching
export const managerClassKeys = {
  all: ['manager-classes'] as const,
  lists: () => [...managerClassKeys.all, 'list'] as const,
  list: (params?: any) => [...managerClassKeys.lists(), params] as const,
  details: () => [...managerClassKeys.all, 'detail'] as const,
  detail: (id: number) => [...managerClassKeys.details(), id] as const,
  teachers: () => [...managerClassKeys.all, 'teachers'] as const,
  stats: () => [...managerClassKeys.all, 'stats'] as const,
};

// Hook for getting organization classes
export const useManagerClasses = (params?: {
  search?: string;
  grade?: string;
  status?: string;
  year?: string;
  teacher_assignment?: string;
  skip?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: managerClassKeys.list(params),
    queryFn: () => managerClassesApi.getOrganizationClasses(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for getting single class detail
export const useManagerClass = (classId: number) => {
  return useQuery({
    queryKey: managerClassKeys.detail(classId),
    queryFn: async () => {
      if (classId === 0) return null;
      const endpoint = `/classes/${classId}`;
      return apiRequest(endpoint);
    },
    enabled: classId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
  });
};

// Hook for creating a new class
export const useCreateClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ManagerClassCreate) => managerClassesApi.createClass(data),
    onSuccess: (newClass) => {
      queryClient.invalidateQueries({ queryKey: managerClassKeys.lists() });
      queryClient.setQueryData<ManagerClass[]>(
        managerClassKeys.list(),
        (old) => old ? [newClass, ...old] : [newClass]
      );

      toast.success('Tạo lớp học thành công', {
        description: `Lớp ${newClass.tenLop} đã được tạo`,
      });
    },
    onError: (error: any) => {
      toast.error('Lỗi tạo lớp học', {
        description: error.message || 'Không thể tạo lớp học mới',
      });
    },
  });
};

// Hook for updating a class
export const useUpdateClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classId, data }: { classId: number; data: ManagerClassUpdate }) => 
      managerClassesApi.updateClass(classId, data),
    onSuccess: (updatedClass, { classId }) => {
      queryClient.setQueryData(managerClassKeys.detail(classId), updatedClass);
      queryClient.setQueryData<ManagerClass[]>(
        managerClassKeys.list(),
        (old) => old?.map(cls => cls.maLopHoc === classId ? updatedClass : cls)
      );
      queryClient.invalidateQueries({ queryKey: managerClassKeys.lists() });

      toast.success('Cập nhật lớp học thành công', {
        description: `Lớp ${updatedClass.tenLop} đã được cập nhật`,
      });
    },
    onError: (error: any) => {
      toast.error('Lỗi cập nhật lớp học', {
        description: error.message || 'Không thể cập nhật lớp học',
      });
    },
  });
};

// Hook for deleting a class
export const useDeleteClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (classId: number) => managerClassesApi.deleteClass(classId),
    onSuccess: (_, classId) => {
      queryClient.removeQueries({ queryKey: managerClassKeys.detail(classId) });
      queryClient.setQueryData<ManagerClass[]>(
        managerClassKeys.list(),
        (old) => old?.filter(cls => cls.maLopHoc !== classId)
      );
      queryClient.invalidateQueries({ queryKey: managerClassKeys.lists() });

      toast.success('Xóa lớp học thành công', {
        description: 'Lớp học đã được xóa khỏi hệ thống',
      });
    },
    onError: (error: any) => {
      toast.error('Lỗi xóa lớp học', {
        description: error.message || 'Không thể xóa lớp học',
      });
    },
  });
};

// Hook for getting available teachers
export const useAvailableTeachers = () => {
  return useQuery({
    queryKey: managerClassKeys.teachers(),
    queryFn: () => managerClassesApi.getAvailableTeachers(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });
};

// Hook for assigning teacher to class
export const useAssignTeacher = (onSuccessCallback?: (teacherData: any, classId: number) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classId, teacherId }: { classId: number; teacherId: number }) => 
      managerClassesApi.assignTeacher(classId, teacherId),
    onSuccess: (data, { classId, teacherId }) => {
      queryClient.invalidateQueries({ queryKey: managerClassKeys.detail(classId) });
      queryClient.invalidateQueries({ queryKey: managerClassKeys.lists() });
      queryClient.invalidateQueries({ queryKey: managerClassKeys.teachers() });

      // Nếu có custom callback, gọi nó thay vì toast mặc định
      if (onSuccessCallback) {
        onSuccessCallback(data, classId);
      } else {
        // Default behavior
        toast.success('Phân công giáo viên thành công', {
          description: 'Giáo viên đã được phân công chủ nhiệm lớp',
        });
      }
    },
    onError: (error: any) => {
      toast.error('Lỗi phân công giáo viên', {
        description: error.message || 'Không thể phân công giáo viên',
      });
    },
  });
};

// Hook for toggling class status
export const useToggleClassStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (classId: number) => managerClassesApi.toggleClassStatus(classId),
    onSuccess: (updatedClass, classId) => {
      queryClient.setQueryData(managerClassKeys.detail(classId), updatedClass);
      queryClient.setQueryData<ManagerClass[]>(
        managerClassKeys.list(),
        (old) => old?.map(cls => cls.maLopHoc === classId ? updatedClass : cls)
      );

      const statusText = updatedClass.trangThai ? 'kích hoạt' : 'tạm ngưng';
      toast.success(`Đã ${statusText} lớp học`, {
        description: `Lớp ${updatedClass.tenLop} đã được ${statusText}`,
      });
    },
    onError: (error: any) => {
      toast.error('Lỗi thay đổi trạng thái', {
        description: error.message || 'Không thể thay đổi trạng thái lớp học',
      });
    },
  });
};

// Hook for exporting classes (Excel format only)
export const useExportClasses = () => {
  return useMutation({
    mutationFn: () => managerClassesApi.exportClasses('excel'),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `classes-export.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Xuất dữ liệu thành công', {
        description: `File Excel đã được tải xuống`,
      });
    },
    onError: (error: any) => {
      toast.error('Lỗi xuất dữ liệu', {
        description: error.message || 'Không thể xuất dữ liệu lớp học',
      });
    },
  });
};

export default useManagerClasses;
