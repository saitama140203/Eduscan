import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  answerTemplateApi, 
  AnswerSheetTemplate, 
  AnswerSheetTemplateCreate, 
  AnswerSheetTemplateUpdate,
  FileUploadResponse,
  TemplateFileInfo
} from '@/lib/api/answer-templates'

// Query Keys
export const answerTemplateKeys = {
  all: ['answer-templates'] as const,
  lists: () => [...answerTemplateKeys.all, 'list'] as const,
  list: (orgId?: number) => [...answerTemplateKeys.lists(), { orgId }] as const,
  public: () => [...answerTemplateKeys.all, 'public'] as const,
  default: () => [...answerTemplateKeys.all, 'default'] as const,
  details: () => [...answerTemplateKeys.all, 'detail'] as const,
  detail: (id: number) => [...answerTemplateKeys.details(), id] as const,
  fileInfo: (id: number) => [...answerTemplateKeys.all, 'file-info', id] as const,
}

// Queries
export const useAnswerTemplates = (orgId?: number) => {
  return useQuery({
    queryKey: answerTemplateKeys.list(orgId),
    queryFn: () => answerTemplateApi.getTemplates(),
  })
}

export const usePublicAnswerTemplates = () => {
  return useQuery({
    queryKey: answerTemplateKeys.public(),
    queryFn: () => answerTemplateApi.getPublicTemplates(),
  })
}

export const useDefaultAnswerTemplates = () => {
  return useQuery({
    queryKey: answerTemplateKeys.default(),
    queryFn: () => answerTemplateApi.getDefaultTemplates(),
  })
}

export const useAnswerTemplate = (id: number) => {
  return useQuery({
    queryKey: answerTemplateKeys.detail(id),
    queryFn: () => answerTemplateApi.getTemplate(id),
    enabled: !!id,
  })
}

export const useTemplateFileInfo = (id: number) => {
  return useQuery({
    queryKey: answerTemplateKeys.fileInfo(id),
    queryFn: () => answerTemplateApi.getFileInfo(id),
    enabled: !!id,
  })
}

// Mutations
export const useCreateAnswerTemplate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AnswerSheetTemplateCreate) => answerTemplateApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: answerTemplateKeys.lists() })
      toast.success('Tạo mẫu phiếu thành công!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi tạo mẫu phiếu')
    },
  })
}

export const useUpdateAnswerTemplate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AnswerSheetTemplateUpdate }) =>
      answerTemplateApi.updateTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: answerTemplateKeys.lists() })
      queryClient.invalidateQueries({ queryKey: answerTemplateKeys.detail(id) })
      toast.success('Cập nhật mẫu phiếu thành công!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật mẫu phiếu')
    },
  })
}

export const useDeleteAnswerTemplate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => answerTemplateApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: answerTemplateKeys.lists() })
      toast.success('Xóa mẫu phiếu thành công!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi xóa mẫu phiếu')
    },
  })
}

// File Upload Mutations
export const useUploadTemplateFile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      templateId, 
      file, 
      provider = 'local' 
    }: { 
      templateId: number
      file: File
      provider?: string 
    }) => answerTemplateApi.uploadFile(templateId, file),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: answerTemplateKeys.detail(templateId) })
      queryClient.invalidateQueries({ queryKey: answerTemplateKeys.fileInfo(templateId) })
      queryClient.invalidateQueries({ queryKey: answerTemplateKeys.lists() })
      toast.success('Tải file mẫu phiếu thành công!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi tải file')
    },
  })
}

// Download Template
export const useDownloadTemplate = () => {
  return {
    downloadTemplate: (templateId: number) => {
      try {
        answerTemplateApi.downloadFile(templateId)
        toast.success('Đang tải xuống mẫu phiếu...')
      } catch (error: any) {
        toast.error('Có lỗi xảy ra khi tải xuống')
      }
    }
  }
}
