// lib/api/organizations.ts
import { apiRequest } from "./base"
import { debugLog } from "../utils/debug"

export interface Organization {
  id: number
  name: string
  address: string
  type?: string // Loại tổ chức
  logo_url?: string | null
  created_at?: string
  updated_at?: string
  [key: string]: any // mở rộng nếu BE bổ sung field mới
}

// Map dữ liệu trả về từ BE sang FE
function mapOrgFromApi(org: any): Organization {
  return {
    id: org.maToChuc,
    name: org.tenToChuc,
    address: org.diaChi,
    type: org.loaiToChuc,
    logo_url: org.urlLogo,
    created_at: org.thoiGianTao,
    updated_at: org.thoiGianCapNhat,
  }
}

export const organizationsApi = {
  getAll: async (skip = 0, limit = 100) => {
    const data = await apiRequest(`/organizations/?skip=${skip}&limit=${limit}`)
    return Array.isArray(data) ? data.map(mapOrgFromApi) : []
  },
  create: async (data: Partial<Organization>) => {
    // Map FE → BE
    const payload = {
      tenToChuc: data.name,
      loaiToChuc: data.type,
      diaChi: data.address,
      urlLogo: data.logo_url,
    }
    return mapOrgFromApi(await apiRequest("/organizations/", { method: "POST", body: payload }))
  },
  update: async (id: number, data: Partial<Organization>) => {
    const payload = {
      tenToChuc: data.name,
      loaiToChuc: data.type,
      diaChi: data.address,
      urlLogo: data.logo_url,
    }
    debugLog(payload)
    return mapOrgFromApi(await apiRequest(`/organizations/${id}`, { method: "PUT", body: payload }))
  },
  delete: async (id: number) => {
    return apiRequest(`/organizations/${id}`, { method: "DELETE" })
  },
}
