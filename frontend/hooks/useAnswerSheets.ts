import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { answerSheetsApi, AnswerSheet, AnswerSheetFilters } from '@/lib/api/answer-sheets';
import { toast } from 'sonner';

// Get all answer sheets
export function useAnswerSheets(filters?: AnswerSheetFilters) {
  return useQuery({
    queryKey: ['answer-sheets', filters],
    queryFn: () => answerSheetsApi.getAnswerSheets(filters),
  });
}

// Get answer sheet by ID
export function useAnswerSheet(id: number) {
  return useQuery({
    queryKey: ['answer-sheets', id],
    queryFn: () => answerSheetsApi.getAnswerSheetById(id),
    enabled: !!id,
  });
}

// Upload and scan answer sheet
export function useUploadAndScan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ file, examId, studentId }: { file: File; examId: number; studentId?: number }) =>
      answerSheetsApi.uploadAndScan(file, examId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answer-sheets'] });
      toast.success('Phiếu trả lời đang được xử lý');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi tải lên phiếu trả lời');
    },
  });
}

// Reprocess answer sheet
export function useReprocessAnswerSheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: answerSheetsApi.reprocessAnswerSheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answer-sheets'] });
      toast.success('Đang xử lý lại phiếu trả lời');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi xử lý lại phiếu');
    },
  });
}

// Update answer sheet
export function useUpdateAnswerSheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<AnswerSheet> }) =>
      answerSheetsApi.updateAnswerSheet(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answer-sheets'] });
      toast.success('Phiếu trả lời đã được cập nhật');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật phiếu');
    },
  });
}

// Delete answer sheet
export function useDeleteAnswerSheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: answerSheetsApi.deleteAnswerSheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answer-sheets'] });
      toast.success('Phiếu trả lời đã được xóa');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi xóa phiếu');
    },
  });
}

// Get scanning status
export function useScanningStatus(id: number) {
  return useQuery({
    queryKey: ['answer-sheets', id, 'status'],
    queryFn: () => answerSheetsApi.getScanningStatus(id),
    enabled: !!id,
    refetchInterval: 2000, // Refresh every 2 seconds for processing sheets
  });
}

// Export results
export function useExportAnswerSheets() {
  return useMutation({
    mutationFn: answerSheetsApi.exportResults,
    onSuccess: () => {
      toast.success('Đang xuất dữ liệu...');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi xuất dữ liệu');
    },
  });
}
