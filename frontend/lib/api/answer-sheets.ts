import { apiRequest } from './base';

export interface AnswerSheet {
  maPhieu: number;
  tenBaiThi: string;
  tenHocSinh: string;
  maSoHocSinh: string;
  lop: string;
  giaoVien: string;
  ngayNop: string;
  ngayQuet: string;
  trangThaiQuet: 'processing' | 'completed' | 'needs_review' | 'failed';
  doDinhTin: number;
  diemSo: number;
  soLuongCauDung: number;
  tongSoCau: number;
  duongDanFile: string;
  ghiChu: string;
  maToChuc?: number;
}

export interface AnswerSheetFilters {
  search?: string;
  trangThaiQuet?: string;
  lop?: string;
  giaoVien?: string;
  ngayQuetTu?: string;
  ngayQuetDen?: string;
  maToChuc?: number;
  page?: number;
  limit?: number;
}

export const answerSheetsApi = {
  // Get all answer sheets with filters
  getAnswerSheets: async (filters?: AnswerSheetFilters) => {
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
      `/answer-sheets${queryString ? `?${queryString}` : ''}`
    );
  },

  // Get answer sheet by ID
  getAnswerSheetById: async (id: number) => {
    return apiRequest(`/answer-sheets/${id}`);
  },

  // Upload and scan answer sheet
  uploadAndScan: async (file: File, examId: number, studentId?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('examId', examId.toString());
    if (studentId) {
      formData.append('studentId', studentId.toString());
    }
    
    return apiRequest('/answer-sheets/scan', {
      method: 'POST',
      body: formData,
    });
  },

  // Reprocess answer sheet
  reprocessAnswerSheet: async (id: number) => {
    return apiRequest(`/answer-sheets/${id}/reprocess`, {
      method: 'POST',
    });
  },

  // Update answer sheet (manual corrections)
  updateAnswerSheet: async (id: number, updates: Partial<AnswerSheet>) => {
    return apiRequest(`/answer-sheets/${id}`, {
      method: 'PUT',
      body: updates,
    });
  },

  // Delete answer sheet
  deleteAnswerSheet: async (id: number) => {
    return apiRequest(`/answer-sheets/${id}`, {
      method: 'DELETE',
    });
  },

  // Get scanning status
  getScanningStatus: async (id: number) => {
    return apiRequest(`/answer-sheets/${id}/status`);
  },

  // Export results
  exportResults: async (filters?: AnswerSheetFilters) => {
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
      `/answer-sheets/export${queryString ? `?${queryString}` : ''}`
    );
  },
};
