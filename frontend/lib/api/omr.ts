import { apiRequest } from './base'

export const omrApi = {
  /**
   * Gửi batch ảnh để chấm OMR với backend tích hợp
   */
  processBatch: async (params: {
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
  },

  /**
   * Xử lý ảnh OMR đơn lẻ
   */
  processSingle: async (params: {
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
  },

  /**
   * Lưu một batch kết quả đã chấm vào database
   */
  saveResults: async (examId: number, results: any[]) => {
    const payload = {
      exam_id: examId,
      results: results.map(r => ({
        student_answers: r.answers,
        sbd: r.sbd,
        filename: r.filename,
        annotated_image_path: r.annotated_image_path // Cần đảm bảo trường này tồn tại
      }))
    };
    return apiRequest(`/omr/save-results`, {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Xuất kết quả Excel
   */
  exportExcel: async (examId: number, classId?: number): Promise<Blob> => {
    const params = new URLSearchParams()
    if (classId) params.append('class_id', classId.toString())
    
    const url = `/omr/export-excel/${examId}${params.toString() ? `?${params.toString()}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
      },
    })
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`)
    }
    
    return response.blob()
  },

  /**
   * Lấy thống kê OMR
   */
  getStats: async (examId: number, classId?: number) => {
    const params = new URLSearchParams()
    if (classId) params.append('class_id', classId.toString())
    
    const url = `/omr/exam-stats/${examId}${params.toString() ? `?${params.toString()}` : ''}`
    
    return apiRequest(url, {
      method: 'GET',
    })
  },

  /**
   * Lấy danh sách templates OMR
   */
  getTemplates: async () => {
    return apiRequest('/omr/templates', {
      method: 'GET',
    })
  },

  /**
   * Lấy danh sách YOLO models
   */
  getModels: async () => {
    return apiRequest('/omr/models', {
      method: 'GET',
    })
  },

  /**
   * Preview template OMR
   */
  previewTemplate: async (templateId: number) => {
    return apiRequest(`/omr/preview`, {
      method: 'POST',
      body: JSON.stringify({ template_id: templateId }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  },

  /**
   * Health check OMR service
   */
  healthCheck: async () => {
    return apiRequest('/omr/health', {
      method: 'GET',
    })
  },

  /**
   * Tạo mapping SBD cho học sinh
   */
  generateSBD: async (params: {
    examId: number
    classId?: number
  }) => {
    return apiRequest('/omr/generate-sbd', {
      method: 'POST',
      body: JSON.stringify(params),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  },
}

export default omrApi 