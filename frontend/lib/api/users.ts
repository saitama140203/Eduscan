// lib/api/users.ts
import { apiRequest } from './base';

// Types
export interface User {
  maNguoiDung: number;
  maToChuc: number;
  email: string;
  hoTen: string;
  vaiTro: string;
  trangThai: boolean;
  thoiGianTao: string;
  thoiGianCapNhat: string;
}

export interface UserCreate {
  maToChuc: number;
  email: string;
  hoTen: string;
  vaiTro: string;
  password: string;
  trangThai?: boolean;
}

export interface UserUpdate {
  email?: string;
  hoTen?: string;
  vaiTro?: string;
  trangThai?: boolean;
  maToChuc?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API functions
// Individual API functions for easier typing
export const getUsers = async (skip = 0, limit = 100) => {
  return apiRequest(`/users/?skip=${skip}&limit=${limit}`)
}

export const getUsersByOrganization = async (orgId: number, skip = 0, limit = 100) => {
  return apiRequest(`/users/organization/${orgId}?skip=${skip}&limit=${limit}`)
}

export const getTeachers = async (orgId?: number, skip = 0, limit = 100) => {
  if (orgId) {
    const users = await getUsersByOrganization(orgId, skip, limit)
    return users.filter((user: User) => user.vaiTro.toLowerCase() === 'teacher')
  } else {
    const users = await getUsers(skip, limit)
    return users.filter((user: User) => user.vaiTro.toLowerCase() === 'teacher')
  }
}

export const getUser = async (userId: string) => {
  return apiRequest(`/users/${userId}`)
}

export const createUser = async (data: UserCreate) => {
  return apiRequest('/users/', {
    method: 'POST',
    body: data,
  })
}

export const updateUser = async (userId: string, data: UserUpdate) => {
  return apiRequest(`/users/${userId}`, {
    method: 'PUT',
    body: data,
  })
}

export const deleteUser = async (userId: string) => {
  return apiRequest(`/users/${userId}`, {
    method: 'DELETE',
  })
}

export const userApi = {
  // Get paginated users
  async getUsers(skip: number = 0, limit: number = 20): Promise<PaginatedResponse<User>> {
    return apiRequest(`/users/?skip=${skip}&limit=${limit}`)
  },

  async getUsersByOrganization(orgId: number, skip: number = 0, limit: number = 20): Promise<PaginatedResponse<User>> {
    return apiRequest(`/users/organization/${orgId}?skip=${skip}&limit=${limit}`)
  },

  // Search users
  async searchUsers(
    query: string,
    role?: string,
    orgId?: number,
    skip: number = 0,
    limit: number = 20
  ): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() })
    if (query) params.append('search', query)
    if (role) params.append('role', role)
    if (orgId) params.append('organization_id', orgId.toString())
    
    return apiRequest(`/users/search?${params}`)
  },

  // Get user by ID
  async getUser(userId: number): Promise<User> {
    return apiRequest(`/users/${userId}`)
  },

  async createUser(userData: UserCreate): Promise<User> {
    return apiRequest('/users/', {
      method: 'POST',
      body: userData,
    })
  },

  async updateUser(userId: number, userData: UserUpdate): Promise<User> {
    return apiRequest(`/users/${userId}`, {
      method: 'PUT', 
      body: userData,
    })
  },

  async deleteUser(userId: number): Promise<void> {
    return apiRequest(`/users/${userId}`, {
      method: 'DELETE',
    })
  },
}

