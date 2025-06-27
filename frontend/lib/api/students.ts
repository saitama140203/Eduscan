import { apiRequest } from './base';

export interface Student {
  maHocSinh: number;
  maHocSinhTruong: string;
  hoTen: string;
  ngaySinh?: string;
  gioiTinh?: string;
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  hoTenPhuHuynh?: string;
  soDienThoaiPhuHuynh?: string;
  maLopHoc: number;
  trangThai: boolean;
  thoiGianTao: string;
  thoiGianCapNhat: string;
}

export interface StudentCreate {
  maHocSinhTruong: string;
  hoTen: string;
  ngaySinh?: string;
  gioiTinh?: string;
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  hoTenPhuHuynh?: string;
  soDienThoaiPhuHuynh?: string;
  maLopHoc: number;
}

export interface StudentUpdate {
  hoTen?: string;
  ngaySinh?: string;
  gioiTinh?: string;
  diaChi?: string;
  soDienThoai?: string;
  email?: string;
  hoTenPhuHuynh?: string;
  soDienThoaiPhuHuynh?: string;
  trangThai?: boolean;
}

export interface ImportResult {
  total_processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

export interface StudentFilters {
  search?: string;
  lop?: string;
  khoi?: string;
  trangThai?: string;
  xepLoai?: string;
  maToChuc?: number;
  page?: number;
  limit?: number;
}

export const studentsApi = {
  // Get all students with filters
  getStudents: async (filters?: StudentFilters) => {
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
      `/students${queryString ? `?${queryString}` : ''}`
    );
  },

  // Get student by ID
  getStudentById: async (id: number) => {
    return apiRequest(`/students/${id}`);
  },

  // Get students by class
  async getStudentsByClass(classId: number, skip: number = 0, limit: number = 100): Promise<Student[]> {
    return apiRequest(`/students/class/${classId}?skip=${skip}&limit=${limit}`);
  },

  // Create student
  async createStudent(studentData: StudentCreate): Promise<Student> {
    return apiRequest('/students/', {
      method: 'POST',
      body: studentData,
    });
  },

  // Update student
  async updateStudent(studentId: number, studentData: StudentUpdate): Promise<Student> {
    return apiRequest(`/students/${studentId}`, {
      method: 'PUT',
      body: studentData,
    });
  },

  // Delete student
  async deleteStudent(studentId: number): Promise<void> {
    return apiRequest(`/students/${studentId}`, {
      method: 'DELETE',
    });
  },

  // Get student grades
  getStudentGrades: async (studentId: number) => {
    return apiRequest(`/students/${studentId}/grades`);
  },

  // Transfer student to another class
  transferStudent: async (studentId: number, newClassId: number) => {
    return apiRequest(`/students/${studentId}/transfer`, {
      method: 'POST',
      body: { newClassId },
    });
  },

  // Get student attendance
  getStudentAttendance: async (studentId: number) => {
    return apiRequest(`/students/${studentId}/attendance`);
  },

  // Download import template
  async downloadTemplate(): Promise<Blob> {
    const response = await fetch('/api/v1/public/student-template', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Không thể tải template');
    }
    
    return response.blob();
  },

  // Import from Excel
  async importFromExcel(file: File, classId: number): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('class_id', classId.toString());
    
    const response = await fetch('/api/v1/students/import-excel', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Import failed');
    }
    
    return response.json();
  },

  // Export to Excel
  async exportToExcel(classId?: number): Promise<Blob> {
    const url = classId 
      ? `/api/v1/students/export-excel?class_id=${classId}`
      : '/api/v1/students/export-excel';
      
    const response = await fetch(url, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    return response.blob();
  },

  // Helper method to download file from blob
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};
