// lib/api/users.ts
import { apiRequest } from './base';
import type { PaginatedResponse } from '@/types/api';

// Types
export interface UserProfile {
  maNguoiDung: number;
  email: string;
  hoTen: string;
  vaiTro: 'ADMIN' | 'MANAGER' | 'TEACHER';
  trangThai: boolean;
  soDienThoai?: string;
  urlAnhDaiDien?: string;
  thoiGianTao: string;
  soLopDay?: number; // Giả sử API trả về
  tenToChuc?: string;
  maToChuc?: number;
}

export interface UserCreate {
  maToChuc: number;
  email: string;
  hoTen: string;
  vaiTro: string;
  password?: string;
  trangThai?: boolean;
  urlAnhDaiDien?: string;
}

export interface UserUpdate {
  email?: string;
  hoTen?: string;
  vaiTro?: 'ADMIN' | 'MANAGER' | 'TEACHER';
  trangThai?: boolean;
  maToChuc?: number;
  soDienThoai?: string;
  urlAnhDaiDien?: string;
}

export const usersApi = {
  getMe: async (): Promise<UserProfile | null> => {
    return await apiRequest<UserProfile>('/users/me');
  },

  getUsers: async (params?: any): Promise<PaginatedResponse<UserProfile> | null> => {
    const queryParams = new URLSearchParams(params).toString();
    const users = await apiRequest<UserProfile[]>(`/users?${queryParams}`);
    
    // Transform array response to paginated format expected by frontend
    if (users && Array.isArray(users)) {
      return {
        data: users,
        meta: {
          totalItems: users.length,
          itemCount: users.length,
          itemsPerPage: params?.limit || 100,
          totalPages: 1,
          currentPage: params?.page || 1
        }
      };
    }
    return null;
  },

  getUserById: async (id: number): Promise<UserProfile | null> => {
    return await apiRequest<UserProfile>(`/users/${id}`);
  },

  createUser: async (userData: Partial<UserProfile> & { password?: string }): Promise<UserProfile | null> => {
    return await apiRequest<UserProfile>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  updateUser: async (id: number, userData: Partial<UserProfile>): Promise<UserProfile | null> => {
    return await apiRequest<UserProfile>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  deleteUser: async (id: number): Promise<void | null> => {
    await apiRequest(`/users/${id}`, { method: 'DELETE' });
  },

  changePassword: async (userId: number, data: any): Promise<void | null> => {
    await apiRequest(`/users/${userId}/change-password`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  resetPassword: async (userId: number): Promise<{ newPassword?: string } | null> => {
    return await apiRequest<{ newPassword?: string }>(`/users/${userId}/reset-password`, {
      method: 'POST',
    });
  },

  getTeachers: async (params: { 
    page?: number, 
    limit?: number, 
    search?: string, 
    sortBy?: string, 
    sortOrder?: string 
  }): Promise<PaginatedResponse<UserProfile> | null> => {
    const queryParams = new URLSearchParams();
    if (params.page) {
      const skip = (params.page - 1) * (params.limit || 10);
      queryParams.append('skip', skip.toString());
    }
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sort_by', params.sortBy);
    if (params.sortOrder) queryParams.append('sort_order', params.sortOrder);
    
    return await apiRequest<PaginatedResponse<UserProfile>>(`/manager/teachers?${queryParams.toString()}`);
  }
};

