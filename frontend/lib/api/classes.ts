import { apiRequest } from './base';
import type { Student } from './students';

export interface Class {
  maLopHoc: number;
  tenLop: string;
  capHoc?: string;
  nienKhoa?: string;
  giaoVienChuNhiemId?: number;
  maToChuc: number;
  trangThai?: boolean;
  thoiGianTao?: string;
  thoiGianCapNhat?: string;
  total_students?: number;
  total_exams?: number;
}

export interface ClassCreate {
  tenLop: string;
  maToChuc: number;
  capHoc?: string;
  namHoc?: string;
  maGiaoVienChuNhiem?: number;
  moTa?: string;
}

export interface ClassUpdate {
  tenLop?: string;
  capHoc?: string;
  namHoc?: string;
  maGiaoVienChuNhiem?: number;
  moTa?: string;
  trangThai?: boolean;
}

export const classesApi = {
  // Lấy danh sách lớp học
  async getClasses(params: { org_id?: number; teacher_id?: number; search?: string; skip?: number; limit?: number } = {}) {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.org_id) searchParams.append('ma_to_chuc', String(params.org_id));
      if (params.teacher_id) searchParams.append('ma_giao_vien', String(params.teacher_id));
      if (params.search !== undefined) searchParams.append('search', params.search);
      if (params.skip !== undefined) searchParams.append('skip', params.skip.toString());
      if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
    }
    const queryString = searchParams.toString();
    return apiRequest(`/classes/${queryString ? `?${queryString}` : ''}`);
  },

  // Lấy chi tiết lớp học
  async getClass(classId: number) {
    return apiRequest(`/classes/${classId}`);
  },

  // Tạo lớp học mới
  async createClass(data: ClassCreate) {
    return apiRequest("/classes/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  // Cập nhật lớp học
  async updateClass(classId: number, data: ClassUpdate) {
    return apiRequest(`/classes/${classId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  // Xóa lớp học
  async deleteClass(classId: number) {
    return apiRequest(`/classes/${classId}`, {
      method: "DELETE",
    });
  },

  async assignToClasses(examId: number, classIds: number[]): Promise<any> {
    return apiRequest(`/exams/${examId}/assign-classes`, {
      method: 'POST',
      body: JSON.stringify({ class_ids: classIds }),
    });
  },

  async getStudentsInClass(classId: number): Promise<Student[]> {
    return apiRequest(`/classes/${classId}/students`);
  },

  async getAssignedClasses(examId: number): Promise<Class[]> {
    return apiRequest(`/exams/${examId}/classes`);
  }
};

// Class Analytics Types
export interface ExamStatistic {
  maKyThi: number;
  tenKyThi: string;
  ngayThi: string;
  soLuongHocSinh: number;
  diemTrungBinh: number;
  diemCao: number;
  diemThap: number;
  tyLeDau: number;
  phanPhoi: {
    gioi: number;
    kha: number;
    trungBinh: number;
    yeu: number;
  };
  trend?: string;
}

export interface ClassAnalytics {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  examTrend: ExamStatistic[];
  overallAverage: string;
  bestExam: ExamStatistic;
  worstExam: ExamStatistic;
  totalExams: number;
}

// Class Settings Types
export interface ClassSettings {
  maLopHoc: number;
  maxStudents: number;
  allowSelfEnroll: boolean;
  requireApproval: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  parentNotifications: boolean;
  autoGrading: boolean;
  passingScore: number;
  retakeAllowed: boolean;
  maxRetakeAttempts: number;
  showStudentList: boolean;
  showScores: boolean;
  allowStudentComments: boolean;
  dataRetentionDays: number;
  backupFrequency: string;
  auditLogging: boolean;
}

export interface ClassSettingsUpdate {
  maxStudents?: number;
  allowSelfEnroll?: boolean;
  requireApproval?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  parentNotifications?: boolean;
  autoGrading?: boolean;
  passingScore?: number;
  retakeAllowed?: boolean;
  maxRetakeAttempts?: number;
  showStudentList?: boolean;
  showScores?: boolean;
  allowStudentComments?: boolean;
  dataRetentionDays?: number;
  backupFrequency?: string;
  auditLogging?: boolean;
}

// Class Analytics API
export const classAnalyticsApi = {
  getAnalytics: async (classId: number, period: string = "all", metric: string = "average") => {
    const params = new URLSearchParams({ period, metric });
    return apiRequest(`/classes/${classId}/analytics?${params}`);
  }
};

// Class Settings API
export const classSettingsApi = {
  getSettings: async (classId: number) => {
    return apiRequest(`/classes/${classId}/settings`);
  },

  updateSettings: async (classId: number, settings: ClassSettingsUpdate) => {
    return apiRequest(`/classes/${classId}/settings`, {
      method: 'PUT',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  }
};

export default classesApi;
