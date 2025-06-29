import { apiRequest } from './base'

const processBatch = async (params: {
    examId: number
    templateId: number
    files: File[]
    classId?: number
  }) => {
    const formData = new FormData()
    params.files.forEach((f) => formData.append('images', f))
    formData.append('exam_id', params.examId.toString())
    formData.append('template_id', params.templateId.toString())
    if (params.classId) formData.append('class_id', params.classId.toString())

    return apiRequest(`/omr/batch-process-with-exam`, {
      method: 'POST',
      body: formData,
    })
}

const processSingle = async (params: {
    examId: number
    templateId: number
    file: File
    classId?: number
  }) => {
    const formData = new FormData()
    formData.append('image', params.file)
    formData.append('exam_id', params.examId.toString())
    formData.append('template_id', params.templateId.toString())
    if (params.classId) formData.append('class_id', params.classId.toString())

    return apiRequest(`/omr/process-with-exam`, {
      method: 'POST',
      body: formData,
    })
}

const saveResults = async (payload: { exam_id: number; results: any[] }) => {
    return apiRequest(`/omr/save-results`, {
      method: 'POST',
      body: payload,
    });
}

const exportExcel = async (examId: number, classId?: number): Promise<Blob> => {
    const params = new URLSearchParams()
    if (classId) params.append('class_id', classId.toString())
    
    const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const url = `${baseURL}/api/v1/omr/export-excel/${examId}${params.toString() ? `?${params.toString()}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
      },
    })
    
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Export failed: ${errorBody.detail || response.statusText}`)
    }
    
    return response.blob()
}

const getStats = async (examId: number, classId?: number) => {
    const params = new URLSearchParams()
    if (classId) params.append('class_id', classId.toString())
    
    const url = `/omr/exam-stats/${examId}${params.toString() ? `?${params.toString()}` : ''}`
    
    return apiRequest(url, {
      method: 'GET',
    })
}

export interface ExamResultDetails {
  exam: {
    id: number;
    tieuDe: string;
    monHoc: string;
    tongSoCau: number;
  };
  stats: {
    totalStudents: number;
    graded: number;
    notGraded: number;
    averageScore: number;
  };
  results: {
    maHocSinh: number;
    hoTen: string;
    maHocSinhTruong: string;
    diem: number | null;
    soCauDung: number | null;
    soCauSai: number | null;
    ngayCham: string | null;
    urlHinhAnhXuLy: string | null;
    trangThai: 'dacom' | 'chuacham';
  }[];
}

async function getResultsByExam(examId: number): Promise<ExamResultDetails> {
  const response = await apiRequest<{ success: boolean, data: ExamResultDetails }>(`/omr/exams/${examId}/results`, {
      method: 'GET',
  });
  if (response && response.success) {
    return response.data;
  }
  throw new Error("Failed to fetch exam results from API");
}


export const omrApi = {
    processBatch,
    processSingle,
    saveResults,
    exportExcel,
    getStats,
    getResultsByExam,
};

export default omrApi 