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

import { apiRequest } from './base'

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

// Answer Templates API
export const answerTemplatesApi = {
  // Get all templates
  async getTemplates(): Promise<AnswerSheetTemplate[]> {
    try {
      const response = await apiRequest('/answer-templates/');
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

      const response = await apiRequest('/answer-templates/search', {
        method: 'POST',
        body: cleanRequest,
      });
      
      return response?.templates || response || [];
    } catch (error) {
      console.error('Failed to search templates:', error);
      throw error;
    }
  },

  async getPublicTemplates(): Promise<AnswerSheetTemplate[]> {
    try {
      const response = await apiRequest('/answer-templates/public');
      return response || [];
    } catch (error) {
      console.error('Failed to fetch public templates:', error);
      throw error;
    }
  },

  async getDefaultTemplates(): Promise<AnswerSheetTemplate[]> {
    try {
      const response = await apiRequest('/answer-templates/default');
      return response || [];
    } catch (error) {
      console.error('Failed to fetch default templates:', error);
      throw error;
    }
  },

  async getTemplate(id: number): Promise<AnswerSheetTemplate> {
    const response = await apiRequest(`/answer-templates/${id}`);
    return response;
  },

  async createTemplate(templateData: CreateTemplateRequest): Promise<AnswerSheetTemplate> {
    const response = await apiRequest('/answer-templates/', {
      method: 'POST',
      body: templateData,
    });
    return response;
  },

  async updateTemplate(id: number, templateData: Partial<CreateTemplateRequest>): Promise<AnswerSheetTemplate> {
    const response = await apiRequest(`/answer-templates/${id}`, {
      method: 'PUT',
      body: templateData,
    });
    return response;
  },

  async deleteTemplate(id: number): Promise<void> {
    await apiRequest(`/answer-templates/${id}`, {
      method: 'DELETE',
    });
  },

  async duplicateTemplate(id: number, newName: string): Promise<AnswerSheetTemplate> {
    const response = await apiRequest(`/answer-templates/${id}/duplicate`, {
      method: 'POST',
      body: { tenMauPhieu: newName },
    });
    return response;
  },

  // Toggle template visibility
  async toggleVisibility(id: number, newVisibility: boolean): Promise<AnswerSheetTemplate> {
    const response = await apiRequest(`/answer-templates/${id}/visibility`, {
      method: 'PATCH',
      body: { la_cong_khai: newVisibility },
    });
    return response;
  },

  // Set template as default
  async setDefault(id: number, isDefault: boolean): Promise<AnswerSheetTemplate> {
    const response = await apiRequest(`/answer-templates/${id}/default`, {
      method: 'PATCH',
      body: { la_mac_dinh: isDefault },
    });
    return response;
  },

  async uploadFile(id: number, file: File, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    // Use apiRequest for upload, but without progress callback support for now
    const response = await apiRequest(`/answer-templates/${id}/upload`, {
      method: 'POST',
      body: formData,
    });
    return response;
  },

  async getFileInfo(id: number): Promise<any> {
    try {
      const response = await apiRequest(`/answer-templates/${id}/file-info`);
      return response;
    } catch (error) {
      console.error('Failed to get file info:', error);
      throw error;
    }
  },

  async downloadFile(id: number): Promise<void> {
    try {
      // For file downloads, we might need to handle differently
      const response = await apiRequest(`/answer-templates/${id}/download`, {
        method: 'GET',
      });
      
      // Handle blob response if needed
      if (response instanceof Blob) {
        const downloadUrl = window.URL.createObjectURL(response);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `template-${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  },

  async getStatistics(id?: number): Promise<TemplateStatistics> {
    const endpoint = id ? `/answer-templates/${id}/statistics` : '/answer-templates/statistics';
    const response = await apiRequest(endpoint);
    return response;
  },

  async bulkDelete(ids: number[]): Promise<void> {
    await apiRequest('/answer-templates/bulk-delete', {
      method: 'DELETE',
      body: { ids },
    });
  },

  async bulkToggleVisibility(ids: number[], isPublic: boolean): Promise<void> {
    await apiRequest('/answer-templates/bulk-visibility', {
      method: 'PATCH',
      body: { ids, isPublic },
    });
  },

  async validateTemplate(id: number): Promise<any> {
    try {
      const response = await apiRequest(`/answer-templates/${id}/validate`, {
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
      await apiRequest('/answer-templates/health');
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
    
    // Try test endpoint first for development
    try {
      const response = await apiRequest(`/answer-templates/${templateId}/process-omr-test`, {
        method: 'POST',
        body: formData,
      });
      return response;
    } catch (error) {
      // Fallback to real endpoint if test fails
      console.warn('Test endpoint failed, trying real endpoint:', error);
      
      const response = await apiRequest(`/answer-templates/${templateId}/process-omr`, {
        method: 'POST',
        body: formData,
      });
      return response;
    }
  }
};

export const answerTemplateApi = answerTemplatesApi;

export default answerTemplatesApi;
