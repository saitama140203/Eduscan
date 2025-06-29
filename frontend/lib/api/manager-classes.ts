import { apiRequest } from "./base";

// Manager-specific class interfaces extending base Class
export interface ManagerClass {
  maLopHoc: number;
  tenLop: string;
  maToChuc: number;
  capHoc?: string;
  namHoc?: string;
  maGiaoVienChuNhiem?: number;
  tenGiaoVienChuNhiem?: string;
  moTa?: string;
  trangThai: boolean;
  thoiGianTao: string;
  thoiGianCapNhat: string;
  tenToChuc?: string;
  total_students?: number;
  total_exams?: number;
  total_completed_exams?: number;
  average_score?: number;
  last_activity?: string;
}

export interface ManagerClassCreate {
  tenLop: string;
  capHoc?: string;
  namHoc?: string;
  maGiaoVienChuNhiem?: number;
  moTa?: string;
}

export interface ManagerClassUpdate {
  tenLop?: string;
  capHoc?: string;
  namHoc?: string;
  maGiaoVienChuNhiem?: number;
  moTa?: string;
  trangThai?: boolean;
}

export interface TeacherAssignment {
  maGiaoVien: number;
  tenGiaoVien: string;
  email: string;
  soDienThoai?: string;
  vaiTro: string;
  currentClasses: number;
  maxClasses?: number;
  available: boolean;
  experience: number;
  organization: string;
  subject: string;
}

// Manager Classes API
export const managerClassesApi = {
  // Get classes for current organization only
  getOrganizationClasses: async (params?: {
    search?: string;
    grade?: string;
    status?: string;
    year?: string;
    teacher_assignment?: string;
    skip?: number;
    limit?: number;
  }): Promise<ManagerClass[]> => {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.search) searchParams.append('search', params.search);
      if (params.grade && params.grade !== 'all') searchParams.append('cap_hoc', params.grade);
      if (params.status && params.status !== 'all') {
        searchParams.append('trang_thai', params.status === 'active' ? 'true' : 'false');
      }
      if (params.year && params.year !== 'all') searchParams.append('nam_hoc', params.year);
      if (params.skip !== undefined) searchParams.append('skip', params.skip.toString());
      if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
          }
      
      const endpoint = `/classes${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      return apiRequest(endpoint);
    },

    // Create new class in organization
    createClass: async (data: ManagerClassCreate): Promise<ManagerClass> => {
      return apiRequest('/classes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

      // Update class (manager permissions only)
    updateClass: async (classId: number, data: ManagerClassUpdate): Promise<ManagerClass> => {
      return apiRequest(`/classes/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

      // Delete class (with organization check)
    deleteClass: async (classId: number): Promise<{ success: boolean; message: string }> => {
      return apiRequest(`/classes/${classId}`, {
        method: 'DELETE',
      });
    },

    // Get available teachers for assignment
    getAvailableTeachers: async (): Promise<TeacherAssignment[]> => {
      return apiRequest('/users/teachers/available');
    },

    // Assign teacher to class
    assignTeacher: async (classId: number, teacherId: number): Promise<{ success: boolean; message: string }> => {
      return apiRequest(`/classes/${classId}/assign-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId }),
    });
  },

  // Export classes data
  exportClasses: async (format: 'csv' | 'excel' | 'json' = 'csv'): Promise<Blob> => {
    const endpoint = format === 'excel' ? '/classes/export/excel' : '/classes/export/csv';
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://eduscan.id.vn/api'}${endpoint}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    return response.blob();
  },

  // Toggle class status (use update endpoint since backend doesn't have toggle)
  toggleClassStatus: async (classId: number): Promise<ManagerClass> => {
    // First get current class to know current status
    const currentClass = await apiRequest(`/classes/${classId}`);
    const newStatus = !currentClass.trangThai;
    
    return apiRequest(`/classes/${classId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trangThai: newStatus }),
    });
  }
};

export default managerClassesApi;
