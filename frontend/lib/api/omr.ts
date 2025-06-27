import { apiRequest } from './base'

const OMR_BASE_URL = process.env.NEXT_PUBLIC_OMR_API_URL || 'http://localhost:8001'

export const omrApi = {
  /**
   * Gửi batch ảnh để chấm OMR
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

    return fetch(`${OMR_BASE_URL}/api/omr/batch`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
      },
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).detail || 'OMR processing failed')
      return r.json()
    })
  },

  /**
   * Xuất kết quả Excel
   */
  exportExcel: async (examId: number, classId?: number) => {
    const url = `${OMR_BASE_URL}/api/omr/export-excel/${examId}${classId ? `?class_id=${classId}` : ''}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
      },
    })
    if (!res.ok) throw new Error('Export failed')
    return res.blob()
  },

  /**
   * Lấy thống kê OMR
   */
  getStats: async (examId: number, classId?: number) => {
    const url = `${OMR_BASE_URL}/api/omr/stats/${examId}${classId ? `?class_id=${classId}` : ''}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
      },
    })
    if (!res.ok) throw new Error('Failed to get stats')
    return res.json()
  },
}

export default omrApi 