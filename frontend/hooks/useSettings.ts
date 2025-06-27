import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, SettingCreate, SettingUpdate } from '@/lib/api/settings'
import { toast } from 'sonner'

export const settingKeys = {
  all: ['settings'] as const,
  lists: () => [...settingKeys.all, 'list'] as const,
  list: (org?: number) => [...settingKeys.lists(), org] as const,
  details: () => [...settingKeys.all, 'detail'] as const,
  detail: (id: number) => [...settingKeys.details(), id] as const,
}

export function useSettings(orgId?: number) {
  return useQuery({
    queryKey: settingKeys.list(orgId),
    queryFn: () => settingsApi.getSettings(orgId),
  })
}

export function useCreateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SettingCreate) => settingsApi.createSetting(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingKeys.all })
      toast.success('Đã tạo cài đặt')
    },
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
  })
}

export function useUpdateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SettingUpdate }) =>
      settingsApi.updateSetting(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: settingKeys.all })
      qc.invalidateQueries({ queryKey: settingKeys.detail(id) })
      toast.success('Đã cập nhật')
    },
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
  })
}

export function useDeleteSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => settingsApi.deleteSetting(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingKeys.all })
      toast.success('Đã xóa cài đặt')
    },
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
  })
}
