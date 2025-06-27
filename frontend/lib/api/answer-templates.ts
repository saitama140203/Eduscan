export interface FileInfo {
  urlFileMau?: string
  urlFilePreview?: string
  tenFileGoc?: string
  kichThuocFile?: number
  loaiFile?: string
  cloudProvider?: string
  cloudFileId?: string
}

export interface AIConfig {
  aiTemplateId?: string
  recognitionAreas?: any[]
  processingRules?: any
}

export interface OMRConfig {
  pageDimensions: [number, number]
  bubbleDimensions: [number, number]
  fieldBlocks: Record<string, any>
  customLabels?: Record<string, string>
  preProcessors?: Array<{
    name: string
    options: Record<string, any>
  }>
}

export interface TemplateStructure {
  fileInfo?: FileInfo
  aiConfig?: AIConfig
  omrConfig?: OMRConfig
  omrTemplatePath?: string
  layout?: any
}

export interface AnswerSheetTemplate {
  maMauPhieu: number
  maToChuc: number
  maNguoiTao: number
  tenMauPhieu: string
  soCauHoi: number
  soLuaChonMoiCau: number
  khoGiay: string
  coTuLuan: boolean
  coThongTinHocSinh: boolean
  coLogo: boolean
  cauTrucJson?: TemplateStructure
  cssFormat?: string
  laMacDinh: boolean
  laCongKhai: boolean
  thoiGianTao: string
  thoiGianCapNhat: string
  urlFileMau?: string
  urlFilePreview?: string
  tenFileGoc?: string
}

export interface AnswerSheetTemplateCreate {
  maToChuc: number
  maNguoiTao: number
  tenMauPhieu: string
  soCauHoi: number
  soLuaChonMoiCau?: number
  khoGiay?: string
  coTuLuan?: boolean
  coThongTinHocSinh?: boolean
  coLogo?: boolean
  cauTrucJson?: TemplateStructure
  cssFormat?: string
  laMacDinh?: boolean
  laCongKhai?: boolean
}

export interface AnswerSheetTemplateUpdate {
  tenMauPhieu?: string
  soCauHoi?: number
  soLuaChonMoiCau?: number
  khoGiay?: string
  coTuLuan?: boolean
  coThongTinHocSinh?: boolean
  coLogo?: boolean
  cauTrucJson?: TemplateStructure
  cssFormat?: string
  laMacDinh?: boolean
  laCongKhai?: boolean
}

// File Upload Response
export interface FileUploadResponse {
  success: boolean
  message: string
  fileUrl?: string
  previewUrl?: string
  cloudFileId?: string
  fileName: string
  fileSize: number
  fileType: string
}

// Template File Info
export interface TemplateFileInfo {
  maMauPhieu: number
  tenMauPhieu: string
  urlFileMau?: string
  urlFilePreview?: string
  tenFileGoc?: string
  downloadUrl?: string
}

// API configuration for Answer Templates
const API_BASE_URL = 'http://103.67.199.62:8000/api/v1';

// Types
export interface CreateTemplateRequest {
  tenMauPhieu: string;
  soCauHoi: number;
  soLuaChonMoiCau: number;
  khoGiay: string;
  coTuLuan: boolean;
  coThongTinHocSinh: boolean;
  coLogo: boolean;
  laCongKhai: boolean;
  laMacDinh: boolean;
}

export interface SearchFilters {
  search?: string;
  public?: boolean;
  default?: boolean;
  skip?: number;
  limit?: number;
}

export interface TemplateStatistics {
  totalTemplates: number;
  publicTemplates: number;
  privateTemplates: number;
  templatesWithFiles: number;
  usageStats: {
    [templateId: number]: {
      usageCount: number;
      lastUsed: string;
    };
  };
}

// API utility function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `HTTP error! status: ${response.status}` 
      }));
      throw new Error(errorData.message || errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// Answer Templates API
export const answerTemplatesApi = {
  // Get all templates
  async getTemplates(): Promise<AnswerSheetTemplate[]> {
    try {
      const response = await apiCall('/answer-templates/');
      return response || [];
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      throw error;
    }
  },

  // Search templates with filters
  async searchTemplates(filters: SearchFilters = {}): Promise<AnswerSheetTemplate[]> {
    try {
      const searchRequest = {
        keyword: filters.search?.trim() || undefined,
        la_cong_khai: filters.public,
        la_mac_dinh: filters.default,
        page: Math.floor((filters.skip || 0) / (filters.limit || 20)) + 1,
        limit: filters.limit || 20
      };

      const cleanRequest = Object.fromEntries(
        Object.entries(searchRequest).filter(([_, value]) => value !== undefined)
      );

      const response = await apiCall('/answer-templates/search', {
        method: 'POST',
        body: JSON.stringify(cleanRequest),
      });
      
      return response?.templates || response || [];
    } catch (error) {
      console.error('Failed to search templates:', error);
      throw error;
    }
  },

  async getPublicTemplates(): Promise<AnswerSheetTemplate[]> {
    try {
      const response = await apiCall('/answer-templates/public');
      return response || [];
    } catch (error) {
      console.error('Failed to fetch public templates:', error);
      throw error;
    }
  },

  async getDefaultTemplates(): Promise<AnswerSheetTemplate[]> {
    try {
      const response = await apiCall('/answer-templates/default');
      return response || [];
    } catch (error) {
      console.error('Failed to fetch default templates:', error);
      throw error;
    }
  },

  async getTemplate(id: number): Promise<AnswerSheetTemplate> {
    const response = await apiCall(`/answer-templates/${id}`);
    return response;
  },

  async createTemplate(templateData: CreateTemplateRequest): Promise<AnswerSheetTemplate> {
    const response = await apiCall('/answer-templates/', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
    return response;
  },

  async updateTemplate(id: number, templateData: Partial<CreateTemplateRequest>): Promise<AnswerSheetTemplate> {
    const response = await apiCall(`/answer-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    });
    return response;
  },

  async deleteTemplate(id: number): Promise<void> {
    await apiCall(`/answer-templates/${id}`, {
      method: 'DELETE',
    });
  },

  async duplicateTemplate(id: number, newName: string): Promise<AnswerSheetTemplate> {
    const response = await apiCall(`/answer-templates/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ tenMauPhieu: newName }),
    });
    return response;
  },

  // Toggle template visibility
  async toggleVisibility(id: number, newVisibility: boolean): Promise<AnswerSheetTemplate> {
    const response = await apiCall(`/answer-templates/${id}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ la_cong_khai: newVisibility }),
    });
    return response;
  },

  // Set template as default
  async setDefault(id: number, isDefault: boolean): Promise<AnswerSheetTemplate> {
    const response = await apiCall(`/answer-templates/${id}/default`, {
      method: 'PATCH',
      body: JSON.stringify({ la_mac_dinh: isDefault }),
    });
    return response;
  },

  async uploadFile(id: number, file: File, onProgress?: (progress: number) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded * 100) / e.total);
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${API_BASE_URL}/answer-templates/${id}/upload`);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  },

  async getFileInfo(id: number): Promise<any> {
    try {
      const response = await apiCall(`/answer-templates/${id}/file-info`);
      return response;
    } catch (error) {
      console.error('Failed to get file info:', error);
      throw error;
    }
  },

  async downloadFile(id: number): Promise<void> {
    try {
      const url = `${API_BASE_URL}/answer-templates/${id}/download`;
      const response = await fetch(url, { credentials: 'include' });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `template-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  },

  async getStatistics(id?: number): Promise<TemplateStatistics> {
    const endpoint = id ? `/answer-templates/${id}/statistics` : '/answer-templates/statistics';
    const response = await apiCall(endpoint);
    return response;
  },

  async bulkDelete(ids: number[]): Promise<void> {
    await apiCall('/answer-templates/bulk-delete', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  },

  async bulkToggleVisibility(ids: number[], isPublic: boolean): Promise<void> {
    await apiCall('/answer-templates/bulk-visibility', {
      method: 'PATCH',
      body: JSON.stringify({ ids, isPublic }),
    });
  },

  async validateTemplate(id: number): Promise<any> {
    try {
      const response = await apiCall(`/answer-templates/${id}/validate`, {
        method: 'POST',
      });
      return response;
    } catch (error) {
      console.error('Failed to validate template:', error);
      throw error;
    }
  },

  async healthCheck(): Promise<boolean> {
    try {
      await apiCall('/answer-templates/health');
      return true;
    } catch {
      return false;
    }
  },

  processOmrImages: async (examId: number, templateId: number, files: File[], options?: any): Promise<any> => {
    const formData = new FormData();
    formData.append('exam_id', examId.toString());

    files.forEach(file => {
      formData.append('images', file, file.name);
    });

    if (options) {
      if (options.yolo_model) formData.append('yolo_model', options.yolo_model);
      if (options.confidence) formData.append('confidence', options.confidence.toString());
      if (options.auto_align !== undefined) formData.append('auto_align', String(options.auto_align));
    }
    
    // Use test endpoint first for development
    let endpoint = `http://103.67.199.62:8000/api/v1/answer-templates/${templateId}/process-omr-test`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Network error' }));
        throw new Error(errorData.detail || 'Lỗi xử lý OMR');
      }
      
      return response.json();
    } catch (error) {
      // Fallback to real endpoint if test fails
      console.warn('Test endpoint failed, trying real endpoint:', error);
      endpoint = `http://103.67.199.62:8000/api/v1/answer-templates/${templateId}/process-omr`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Network error' }));
        throw new Error(errorData.detail || 'Lỗi xử lý OMR');
      }
      
      return response.json();
    }
  }
};

export const answerTemplateApi = answerTemplatesApi;

export default answerTemplatesApi;
