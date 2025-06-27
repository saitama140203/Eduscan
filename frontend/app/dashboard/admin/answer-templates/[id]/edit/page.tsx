'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Eye, 
  Settings, 
  Brain,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';

import OMRTemplateBuilder from '@/components/omr/OMRTemplateBuilder';
import OMRProcessor from '@/components/omr/OMRProcessor';
import UploadInterface from '@/components/templates/UploadInterface';
import { answerTemplatesApi, type AnswerSheetTemplate, type OMRConfig } from '@/lib/api/answer-templates';

interface FileStatus {
  uploaded: boolean;
  name: string;
  purpose: string;
}

interface FileStatusResponse {
  files: Record<string, FileStatus>;
  completeness: {
    is_complete: boolean;
    uploaded_count: number;
    required_count: number;
    percentage: number;
  };
  next_steps: {
    message: string;
    missing_files: string[];
    suggestion: string;
  };
}

export default function TemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = parseInt(params?.id as string);

  console.log('🎬 TemplateEditPage rendered:', { templateId, params });

  // Tất cả state variables được định nghĩa rõ ràng
  const [template, setTemplate] = useState<AnswerSheetTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [omrConfig, setOmrConfig] = useState<OMRConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<Array<{
    name: string;
    path: string;
    size: number;
  }>>([]);
  const [fileStatus, setFileStatus] = useState<FileStatusResponse | null>(null);

  // Load template data function
  const loadTemplate = async () => {
    try {
      setLoading(true);
      const data = await answerTemplatesApi.getTemplate(templateId);
      setTemplate(data);

      // Extract OMR config if exists
      if (data.cauTrucJson?.omrConfig) {
        setOmrConfig(data.cauTrucJson.omrConfig);
      }

      // Load available models
      try {
        const modelsResponse = await fetch('/api/v1/answer-templates/omr/models', {
          credentials: 'include'
        });
        if (modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          setAvailableModels(modelsData);
        }
      } catch (modelError) {
        console.warn('Could not load models:', modelError);
      }

    } catch (error: unknown) {
      console.error('Failed to load template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể tải template';
      toast.error(errorMessage);
      router.push('/dashboard/admin/answer-templates');
    } finally {
      setLoading(false);
    }
  };

  // Load file status function
  const loadFileStatus = async () => {
    try {
      const response = await fetch(`/api/v1/answer-templates/${templateId}/file-status`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const status = await response.json();
        setFileStatus(status);
        console.log('📊 File Status:', status);
      }
    } catch (error) {
      console.error('Error loading file status:', error);
    }
  };

  // Load template data on mount
  useEffect(() => {
    if (templateId && !isNaN(templateId)) {
      loadTemplate();
      loadFileStatus();
    }
  }, [templateId]);

  // Debug tab changes
  useEffect(() => {
    console.log('📱 Current active tab:', activeTab);
    if (activeTab === 'omr-config') {
      console.log('📱 OMR Config Tab is active - UploadInterface should render');
    }
  }, [activeTab]);

  // Debug isUploading changes
  useEffect(() => {
    console.log('🚀 isUploading state changed:', isUploading);
  }, [isUploading]);

  const handleSaveOMRConfig = async (config: OMRConfig) => {
    try {
      setIsSaving(true);

      const response = await fetch(`/api/v1/answer-templates/${templateId}/omr-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save OMR config');
      }

      await response.json();
      setOmrConfig(config);
      toast.success('OMR configuration đã được lưu thành công');

      // Reload template to get updated data
      const updatedTemplate = await answerTemplatesApi.getTemplate(templateId);
      setTemplate(updatedTemplate);

    } catch (error: unknown) {
      console.error('Save OMR config error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể lưu OMR configuration';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Debug function để test API connection
  const testAPIConnection = async () => {
    try {
      console.log('🧪 Testing API connection...');
      
      const response = await fetch(`/api/v1/answer-templates/${templateId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      console.log('📊 Test response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API connection working, got template data:', data);
        toast.success('API connection OK!');
      } else {
        const errorData = await response.json();
        console.error('❌ API connection failed:', errorData);
        toast.error(`API Error: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ API test failed:', error);
      toast.error('Network error during API test');
    }
  };

  const handlePreviewOMR = async (config: OMRConfig, sampleImage?: File) => {
    try {
      let response;
      
      console.log('🔍 Starting OMR preview...');
      console.log('Template ID:', templateId);
      console.log('Has sample image:', !!sampleImage);
      
      if (sampleImage) {
        const formData = new FormData();
        formData.append('sample_image', sampleImage);

        console.log('📤 Sending POST request...');
        response = await fetch(`/api/v1/answer-templates/${templateId}/omr-preview`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
      } else {
        console.log('📤 Sending GET request...');
        response = await fetch(`/api/v1/answer-templates/${templateId}/omr-preview`, {
          method: 'GET',
          credentials: 'include'
        });
      }

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.detail || 'Preview failed');
      }

      const result = await response.json();
      console.log('✅ API Success:', result);
      
      if (result.template_id) {
        console.log('📊 Template Debug Info:');
        console.log('- Template ID:', result.template_id);
        console.log('- Template Name:', result.template_name);
        console.log('- Has cauTrucJson:', result.has_cau_truc_json);
        console.log('- Has OMR Config:', result.has_omr_config);
        console.log('- Message:', result.message);
        
        toast.info(`Debug: ${result.message}`, { duration: 5000 });
      }
      
      if (result.preview_image) {
        console.log('🖼️ Opening preview window...');
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>OMR Template Preview</title></head>
              <body style="margin: 0; padding: 20px; text-align: center;">
                <h2>Template Preview - ${template?.tenMauPhieu}</h2>
                <img src="data:image/jpeg;base64,${result.preview_image}" style="max-width: 100%; height: auto;" />
                <div style="margin-top: 20px;">
                  <p><strong>Page Dimensions:</strong> ${result.template_info?.page_dimensions?.join(' x ') || 'N/A'}</p>
                  <p><strong>Bubble Dimensions:</strong> ${result.template_info?.bubble_dimensions?.join(' x ') || 'N/A'}</p>
                  <p><strong>Field Blocks:</strong> ${result.template_info?.field_blocks || 'N/A'}</p>
                  <p><strong>Total Bubbles:</strong> ${result.template_info?.total_bubbles || 'N/A'}</p>
                </div>
              </body>
            </html>
          `);
        }
      } else {
        console.log('ℹ️ No preview image in response');
        toast.info('Template info loaded but no preview image available');
      }

      toast.success('Preview generated successfully');

    } catch (error: unknown) {
      console.error('❌ Preview error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể tạo preview';
      toast.error(errorMessage);
    }
  };

  const handleProcessComplete = (results: unknown[]) => {
    console.log('OMR processing complete:', results);
    toast.success(`${results.length} sheets processed successfully!`);
  };

  const handleFinalizeTemplate = async (imageFile: File, configFile: File) => {
    console.log('🎯 handleFinalizeTemplate called');
    console.log('🔄 Setting isUploading = true');
    try {
      setIsUploading(true);
      toast.info('Đang hoàn tất template...');
      
      console.log('🔄 Starting upload process...');
      console.log('📁 Image file:', imageFile.name, imageFile.size, 'bytes');
      console.log('📄 Config file:', configFile.name, configFile.size, 'bytes');
      
      // Check cookies before making request
      if (typeof window !== 'undefined') {
        console.log('🍪 [UPLOAD] Document cookies before upload:', document.cookie);
      }
      
      const formData = new FormData();
      formData.append('template_image', imageFile);
      formData.append('template_config', configFile);

      const url = `/api/v1/answer-templates/${templateId}/upload-complete`;
      console.log('🚀 Making request to:', url);

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const result = await response.json();
      console.log('📦 Response data:', result);

      if (!response.ok) {
        console.error('❌ Request failed:', result);
        throw new Error(result.detail || 'Hoàn tất template thất bại');
      }
      
      toast.success(result.message || 'Template đã được cập nhật thành công!');
      
      // Reload all data to reflect changes
      console.log('🔄 Reloading template and file status...');
      await loadTemplate();
      await loadFileStatus();
      console.log('✅ Upload completed successfully');

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể hoàn tất template.';
      toast.error(errorMessage);
      console.error('❌ Finalize template error:', error);
    } finally {
      console.log('🔄 Setting isUploading = false');
      setIsUploading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải template...</p>
        </div>
      </div>
    );
  }

  // No template found
  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Template không tồn tại</p>
          <Button 
            className="mt-4" 
            onClick={() => router.push('/dashboard/admin/answer-templates')}
          >
            Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  const hasOMRConfig = template.cauTrucJson?.omrConfig;
  const referenceImageUrl = template.cauTrucJson?.fileInfo?.urlFileMau;

  // File Status Card Component
  const FileStatusCard = () => {
    if (!fileStatus) return null;

    const { files, completeness, next_steps } = fileStatus;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Trạng thái File Template
            </span>
            <Badge 
              variant={completeness.is_complete ? "default" : "secondary"}
              className={completeness.is_complete ? "bg-green-500" : "bg-amber-500"}
            >
              {completeness.uploaded_count}/{completeness.required_count} files ({completeness.percentage}%)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  completeness.is_complete ? 'bg-green-500' : 'bg-amber-500'
                }`}
                style={{ width: `${completeness.percentage}%` }}
              ></div>
            </div>

            {/* File List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(files).map(([key, file]) => (
                <div 
                  key={key}
                  className={`p-4 border rounded-lg ${
                    file.uploaded ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{file.name}</h4>
                    {file.uploaded ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{file.purpose}</p>
                  <div className="text-xs">
                    {file.uploaded ? (
                      <span className="text-green-600 font-medium">✓ Đã upload</span>
                    ) : (
                      <span className="text-amber-600 font-medium">⚠ Chưa upload</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Next Steps */}
            <Alert className={completeness.is_complete ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
              <AlertCircle className={`h-4 w-4 ${completeness.is_complete ? 'text-green-600' : 'text-amber-600'}`} />
              <AlertDescription className={completeness.is_complete ? 'text-green-800' : 'text-amber-800'}>
                <strong>{completeness.is_complete ? '🎉' : '📋'} {next_steps.message}</strong>
                {next_steps.missing_files.length > 0 && (
                  <ul className="mt-2 ml-4 list-disc">
                    {next_steps.missing_files.map((file: string, index: number) => (
                      <li key={index}>{file}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-sm font-medium">{next_steps.suggestion}</p>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/admin/answer-templates')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{template.tenMauPhieu}</h1>
            <p className="text-gray-600">
              {template.soCauHoi} câu hỏi • {template.soLuaChonMoiCau} lựa chọn/câu
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {hasOMRConfig && (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <Brain className="w-3 h-3 mr-1" />
              OMR Enabled
            </Badge>
          )}
          <Badge variant="secondary">
            {template.laCongKhai ? 'Công khai' : 'Riêng tư'}
          </Badge>
          
          {/* Debug button */}
          <Button
            variant="outline"
            size="sm"
            onClick={testAPIConnection}
            className="text-xs"
          >
            🧪 Test API
          </Button>
        </div>
      </div>

      <Separator />

      {/* File Status Card */}
      <FileStatusCard />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(tab) => {
        console.log('🏷️ Tab changed to:', tab);
        setActiveTab(tab);
      }} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Thông tin cơ bản
          </TabsTrigger>
          <TabsTrigger value="omr-config" className="flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            OMR Config
          </TabsTrigger>
          <TabsTrigger value="omr-builder" className="flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            Template Builder
          </TabsTrigger>
          <TabsTrigger value="omr-processor" className="flex items-center">
            <Upload className="w-4 h-4 mr-2" />
            Xử lý ảnh
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tên template</label>
                  <p className="text-lg">{template.tenMauPhieu}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Số câu hỏi</label>
                  <p className="text-lg">{template.soCauHoi}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Số lựa chọn/câu</label>
                  <p className="text-lg">{template.soLuaChonMoiCau}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Khổ giấy</label>
                  <p className="text-lg">{template.khoGiay}</p>
                </div>
              </div>

              {template.cauTrucJson?.fileInfo && (
                <div>
                  <label className="text-sm font-medium">File đính kèm</label>
                  <div className="mt-2 p-3 border rounded">
                    <p className="font-medium">{template.cauTrucJson.fileInfo.tenFileGoc}</p>
                    <p className="text-sm text-gray-500">
                      {((template.cauTrucJson.fileInfo.kichThuocFile || 0) / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {template.cauTrucJson?.fileInfo?.urlFileMau && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => window.open(template.cauTrucJson?.fileInfo?.urlFileMau)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Xem file
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OMR Config Tab */}
        <TabsContent value="omr-config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tải lên & Hoàn tất</CardTitle>
            </CardHeader>
            <CardContent>
              <UploadInterface
                templateId={templateId}
                onUploadComplete={handleFinalizeTemplate}
                isUploading={isUploading}
              />
            </CardContent>
          </Card>

          {/* Existing OMR Status */}
          {hasOMRConfig && (
            <Card>
              <CardHeader>
                <CardTitle>OMR Configuration Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Đã cấu hình OMR
                    </Badge>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">
                      Template này đã được cấu hình OMR. Bạn có thể chỉnh sửa cấu hình bằng Template Builder 
                      hoặc upload file mới để thay thế.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* OMR Builder Tab */}
        <TabsContent value="omr-builder" className="space-y-6">
          <OMRTemplateBuilder
            templateId={templateId}
            initialConfig={omrConfig || undefined}
            referenceImage={referenceImageUrl}
            onSave={handleSaveOMRConfig}
            onPreview={handlePreviewOMR}
          />
        </TabsContent>

        {/* OMR Processor Tab */}
        <TabsContent value="omr-processor" className="space-y-6">
          {hasOMRConfig ? (
            <OMRProcessor
              templateId={templateId}
              availableModels={availableModels}
              onProcessComplete={handleProcessComplete}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Cần cấu hình OMR trước</h3>
                <p className="text-gray-600 mb-4">
                  Vui lòng cấu hình OMR template trước khi xử lý ảnh.
                </p>
                <Button
                  onClick={() => setActiveTab('omr-builder')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Cấu hình OMR
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}