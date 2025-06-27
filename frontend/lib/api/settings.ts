import { apiRequest } from './base'

export interface Setting {
  maCaiDat: number
  maToChuc?: number
  tuKhoa: string
  giaTri?: string
  thoiGianTao: string
  thoiGianCapNhat: string
}

export interface SettingCreate {
  maToChuc?: number
  tuKhoa: string
  giaTri?: string
}

export interface SettingUpdate {
  maToChuc?: number
  tuKhoa?: string
  giaTri?: string
}

export const settingsApi = {
  getSettings: async (orgId?: number) => {
    const qs = orgId ? `?ma_to_chuc=${orgId}` : ''
    return apiRequest(`/settings${qs}`)
  },
  getSetting: async (id: number) => apiRequest(`/settings/${id}`),
  createSetting: async (data: SettingCreate) =>
    apiRequest('/settings', { method: 'POST', body: data }),
  updateSetting: async (id: number, data: SettingUpdate) =>
    apiRequest(`/settings/${id}`, { method: 'PUT', body: data }),
  deleteSetting: async (id: number) =>
    apiRequest(`/settings/${id}`, { method: 'DELETE' }),
}
