import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  examsApi, 
  type Exam, 
  type ExamCreate, 
  type ExamUpdate, 
  type ExamFilters,
  type ExamResult
} from '@/lib/api/exams';
import { useToast } from '@/hooks/use-toast';

// Re-export type for component usage
export type { Exam, ExamCreate, ExamUpdate, ExamFilters, ExamResult };

// Query keys
export const examKeys = {
  all: ['exams'] as const,
  lists: () => [...examKeys.all, 'list'] as const,
  list: (filters: ExamFilters) => [...examKeys.lists(), filters] as const,
  details: () => [...examKeys.all, 'detail'] as const,
  detail: (id: number) => [...examKeys.details(), id] as const,
  answers: (id: number) => [...examKeys.all, 'answers', id] as const,
  statistics: (id: number, classId?: number) => [...examKeys.all, 'statistics', id, classId] as const,
  results: (id: number, classId?: number) => [...examKeys.all, 'results', id, classId] as const,
  assignedClasses: (id: number) => [...examKeys.all, 'assigned-classes', id] as const,
};

// Get exams list
export function useExams(filters?: ExamFilters) {
  return useQuery({
    queryKey: examKeys.list(filters || {}),
    queryFn: () => examsApi.getExams(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get exam detail
export function useExam(id: number) {
  return useQuery({
    queryKey: examKeys.detail(id),
    queryFn: () => examsApi.getExamById(id),
    enabled: !!id,
  });
}

// Get exam answers
export function useExamAnswers(id: number) {
  return useQuery({
    queryKey: examKeys.answers(id),
    queryFn: () => examsApi.getExamAnswers(id),
    enabled: !!id,
  });
}

// Get exam statistics
export function useExamStatistics(id: number, classId?: number) {
  return useQuery({
    queryKey: examKeys.statistics(id, classId),
    queryFn: () => examsApi.getExamStatistics(id, classId),
    enabled: !!id,
  });
}

// Get exam results
export function useExamResults(id: number, classId?: number) {
  return useQuery({
    queryKey: examKeys.results(id, classId),
    queryFn: () => examsApi.getExamResults(id, classId),
    enabled: !!id,
  });
}

// Get assigned classes
export function useExamAssignedClasses(id: number) {
  return useQuery({
    queryKey: examKeys.assignedClasses(id),
    queryFn: () => examsApi.getAssignedClasses(id),
    enabled: !!id,
  });
}

// Create exam
export function useCreateExam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: ExamCreate) => examsApi.createExam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
      toast({
        title: "Thành công",
        description: "Tạo bài kiểm tra thành công!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra khi tạo bài kiểm tra",
        variant: "destructive",
      });
    },
  });
}

// Update exam
export function useUpdateExam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ examId, data }: { examId: number; data: ExamUpdate }) => 
      examsApi.updateExam(examId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
      queryClient.invalidateQueries({ queryKey: examKeys.detail(variables.examId) });
      toast({
        title: "Thành công",
        description: "Cập nhật bài kiểm tra thành công!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra khi cập nhật bài kiểm tra",
        variant: "destructive",
      });
    },
  });
}

// Delete exam
export function useDeleteExam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => examsApi.deleteExam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
      toast({
        title: "Thành công",
        description: "Xóa bài kiểm tra thành công!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra khi xóa bài kiểm tra",
        variant: "destructive",
      });
    },
  });
}

// Assign exam to classes
export function useAssignExamToClasses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ examId, classIds }: { examId: number; classIds: number[] }) => 
      examsApi.assignToClasses(examId, classIds),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: examKeys.assignedClasses(variables.examId) });
      toast({
        title: "Thành công",
        description: "Gán bài kiểm tra cho lớp học thành công!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra khi gán bài kiểm tra",
        variant: "destructive",
      });
    },
  });
}

// Create or update exam answers
export function useCreateOrUpdateExamAnswers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ examId, answersData }: { examId: number; answersData: Record<string, any> }) => 
      examsApi.createOrUpdateAnswers(examId, answersData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: examKeys.answers(variables.examId) });
      toast({
        title: "Thành công",
        description: "Lưu đáp án thành công!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra khi lưu đáp án",
        variant: "destructive",
      });
    },
  });
}

// Export object để dễ sử dụng
export const useExamsHooks = {
  useGetExams: useExams,
  useGetExam: useExam,
  useGetExamAnswers: useExamAnswers,
  useGetExamStatistics: useExamStatistics,
  useGetExamResults: useExamResults,
  useGetAssignedClasses: useExamAssignedClasses,
  useCreateExam,
  useUpdateExam,
  useDeleteExam,
  useAssignExamToClasses,
  useCreateOrUpdateExamAnswers,
};
