import { apiRequest } from './base';

// Interface khớp với backend model
export interface Exam {
  maBaiKiemTra: number;
  maToChuc: number;
  maNguoiTao: number;
  maMauPhieu?: number;
  tieuDe: string;
  monHoc: string;
  ngayThi?: string;
  thoiGianLamBai?: number;
  tongSoCau: number;
  tongDiem: number;
  diemQuaMon?: number;
  moTa?: string;
  laDeTongHop: boolean;
  trangThai: 'nhap' | 'xuatBan' | 'dongDaChAm';
  thoiGianTao: string;
  thoiGianCapNhat: string;
  
  // Relationships
  toChuc?: {
    maToChuc: number;
    tenToChuc: string;
  };
  nguoiTao?: {
    maNguoiDung: number;
    hoTen: string;
  };
  mauPhieu?: {
    maMauPhieu: number;
    tenMauPhieu: string;
  };
}

export interface ExamCreate {
  maToChuc?: number;
  maMauPhieu?: number;
  tieuDe: string;
  monHoc: string;
  ngayThi?: string;
  thoiGianLamBai?: number;
  tongSoCau: number;
  tongDiem?: number;
  moTa?: string;
  laDeTongHop?: boolean;
  trangThai?: 'nhap' | 'xuatBan' | 'dongDaChAm';
}

export interface ExamUpdate {
  tieuDe?: string;
  monHoc?: string;
  ngayThi?: string;
  thoiGianLamBai?: number;
  tongSoCau?: number;
  tongDiem?: number;
  moTa?: string;
  laDeTongHop?: boolean;
  trangThai?: 'nhap' | 'xuatBan' | 'dongDaChAm';
  maMauPhieu?: number;
}

export interface ExamFilters {
  org_id?: number;
  class_id?: number;
  creator_id?: number;
  search?: string;
  monHoc?: string;
  trangThai?: string;
  page?: number;
  limit?: number;
}

export interface ExamAnswer {
  maDapAn: number;
  maBaiKiemTra: number;
  dapAnJson: Record<string, any>;
  diemMoiCauJson?: Record<string, any>;
  thoiGianTao: string;
  thoiGianCapNhat: string;
}

export interface ExamStatistics {
  totalSubmissions: number;
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  className?: string;
  questionAnalysis?: {
    questionNumber: number;
    correctRate: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
}

export interface ExamResult {
  student: {
    id: number;
    name: string;
    code?: string;
  };
  score: number;
  correctAnswers: number;
  status: 'COMPLETED' | 'ABSENT';
  submittedAt?: string;
}

export const examsApi = {
  // Get all exams with filters
  getExams: async (filters?: ExamFilters): Promise<Exam[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== 'all') {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();
    return apiRequest(`/exams${queryString ? `?${queryString}` : ''}`);
  },

  // Get exam by ID
  getExamById: async (id: number): Promise<Exam> => {
    return apiRequest(`/exams/${id}`);
  },

  // Create new exam
  createExam: async (exam: ExamCreate): Promise<Exam> => {
    return apiRequest('/exams', {
      method: 'POST',
      body: exam,
    });
  },

  // Update exam
  updateExam: async (id: number, exam: ExamUpdate): Promise<Exam> => {
    return apiRequest(`/exams/${id}`, {
      method: 'PUT',
      body: exam,
    });
  },

  // Delete exam
  deleteExam: async (id: number): Promise<void> => {
    return apiRequest(`/exams/${id}`, {
      method: 'DELETE',
    });
  },

  // Assign exam to classes
  assignToClasses: async (examId: number, classIds: number[]): Promise<any> => {
    return apiRequest(`/exams/${examId}/assign-classes`, {
      method: 'POST',
      body: { class_ids: classIds },
    });
  },

  // Get assigned classes
  getAssignedClasses: async (examId: number): Promise<any[]> => {
    return apiRequest(`/exams/${examId}/classes`);
  },

  // Create/Update exam answers
  createOrUpdateAnswers: async (examId: number, answersData: Record<string, any>): Promise<ExamAnswer> => {
    return apiRequest(`/exams/${examId}/answers`, {
      method: 'POST',
      body: answersData,
    });
  },

  // Get exam answers
  getExamAnswers: async (examId: number): Promise<ExamAnswer> => {
    return apiRequest(`/exams/${examId}/answers`);
  },

  // Get exam statistics
  getExamStatistics: async (examId: number, classId?: number): Promise<ExamStatistics> => {
    const params = classId ? `?class_id=${classId}` : '';
    return apiRequest(`/exams/${examId}/statistics${params}`);
  },

  // Get exam results
  getExamResults: async (examId: number, classId?: number): Promise<ExamResult[]> => {
    const params = classId ? `?class_id=${classId}` : '';
    return apiRequest(`/exams/${examId}/results${params}`);
  },
};