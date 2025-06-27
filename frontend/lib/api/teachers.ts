import { apiRequest } from './base';

export interface Teacher {
  maGiaoVien: number;
  hoTen: string;
  email: string;
  soDienThoai: string;
  monHocChinh: string;
  kinh_nghiem: number;
  capBac: string;
  lopChuNhiem: string[];
  soLuongLopDay: number;
  trangThai: 'active' | 'busy' | 'leave';
  ngayVaoLam: string;
  lanCapNhatCuoi: string;
  maToChuc?: number;
}

export interface TeacherFilters {
  search?: string;
  monHoc?: string;
  capBac?: string;
  trangThai?: string;
  maToChuc?: number;
  page?: number;
  limit?: number;
}

export const teachersApi = {
  // Get all teachers with filters
  getTeachers: async (filters?: TeacherFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== 'all') {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();
    return apiRequest(
      `/teachers${queryString ? `?${queryString}` : ''}`
    );
  },

  // Get teacher by ID
  getTeacherById: async (id: number) => {
    return apiRequest(`/teachers/${id}`);
  },

  // Create new teacher
  createTeacher: async (teacher: Omit<Teacher, 'maGiaoVien' | 'lanCapNhatCuoi'>) => {
    return apiRequest('/teachers', {
      method: 'POST',
      body: teacher,
    });
  },

  // Update teacher
  updateTeacher: async (id: number, teacher: Partial<Teacher>) => {
    return apiRequest(`/teachers/${id}`, {
      method: 'PUT', 
      body: teacher,
    });
  },

  // Delete teacher
  deleteTeacher: async (id: number) => {
    return apiRequest(`/teachers/${id}`, {
      method: 'DELETE',
    });
  },

  // Assign classes to teacher
  assignClasses: async (teacherId: number, classIds: number[]) => {
    return apiRequest(`/teachers/${teacherId}/assign-classes`, {
      method: 'POST',
      body: { classIds },
    });
  },

  // Get teacher schedule
  getTeacherSchedule: async (teacherId: number) => {
    return apiRequest(`/teachers/${teacherId}/schedule`);
  },
};
