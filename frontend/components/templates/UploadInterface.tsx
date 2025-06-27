'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  X,
  Eye,
  FileImage,
  FileCode
} from 'lucide-react';
import { toast } from 'sonner';

interface UploadInterfaceProps {
  templateId: number;
  onUploadComplete: (imageFile: File, configFile: File) => Promise<any>; // Can return data
  isUploading: boolean;
}

interface FilePreview {
  file: File;
  preview?: string;
  isValid: boolean;
  errors: string[];
}

export default function UploadInterface({ 
  templateId, 
  onUploadComplete, 
  isUploading 
}: UploadInterfaceProps) {
  const [imageFile, setImageFile] = useState<FilePreview | null>(null);
  const [configFile, setConfigFile] = useState<FilePreview | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState<string | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const configInputRef = useRef<HTMLInputElement>(null);

  // Debug component render
  useEffect(() => {
    console.log('🎬 UploadInterface rendered/updated:', { 
      templateId, 
      isUploading, 
      onUploadComplete: !!onUploadComplete,
      hasImageFile: !!imageFile,
      hasConfigFile: !!configFile
    });
  }, [templateId, isUploading, onUploadComplete, imageFile, configFile]);

  // Validation functions
  const validateImageFile = (file: File): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      errors.push('Chỉ chấp nhận file PNG, JPG hoặc JPEG');
    }
    
    if (file.size > 20 * 1024 * 1024) {
      errors.push('File không được vượt quá 20MB');
    }

    if (file.size < 1024) {
      errors.push('File quá nhỏ, có thể bị lỗi');
    }
    
    return { isValid: errors.length === 0, errors };
  };

  const validateConfigFile = async (file: File): Promise<{ isValid: boolean; errors: string[] }> => {
    const errors: string[] = [];
    
    if (!file.name.endsWith('.json')) {
      errors.push('File phải có định dạng .json');
    }
    
    if (file.size > 2 * 1024 * 1024) {
      errors.push('File JSON không được vượt quá 2MB');
    }

    // Validate JSON content
    try {
      const content = await file.text();
      const json = JSON.parse(content);
      
      // Check required fields
      const requiredFields = ['pageDimensions', 'bubbleDimensions', 'fieldBlocks'];
      const missingFields = requiredFields.filter(field => !(field in json));
      
      if (missingFields.length > 0) {
        errors.push(`Thiếu các trường bắt buộc: ${missingFields.join(', ')}`);
      }

      if (!json.fieldBlocks || typeof json.fieldBlocks !== 'object') {
        errors.push('fieldBlocks phải là object');
      }

    } catch (e) {
      errors.push('File JSON không hợp lệ hoặc có lỗi cú pháp');
    }
    
    return { isValid: errors.length === 0, errors };
  };

  // Create preview for image files
  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  // Handle file selection
  const handleImageSelect = async (file: File) => {
    console.log('🖼️ Image file selected:', { name: file.name, size: file.size, type: file.type });
    
    const validation = validateImageFile(file);
    const preview = await createImagePreview(file);
    
    console.log('🔍 Image validation result:', validation);
    
    setImageFile({
      file,
      preview,
      isValid: validation.isValid,
      errors: validation.errors
    });

    if (!validation.isValid) {
      console.log('❌ Image validation failed:', validation.errors);
      toast.error(`Lỗi file ảnh: ${validation.errors.join(', ')}`);
    } else {
      console.log('✅ Image validation passed');
      toast.success(`Đã chọn ảnh template: ${file.name}`);
    }
  };

  const handleConfigSelect = async (file: File) => {
    console.log('📄 Config file selected:', { name: file.name, size: file.size, type: file.type });
    
    const validation = await validateConfigFile(file);
    
    console.log('🔍 Config validation result:', validation);
    
    setConfigFile({
      file,
      isValid: validation.isValid,
      errors: validation.errors
    });

    if (!validation.isValid) {
      console.log('❌ Config validation failed:', validation.errors);
      toast.error(`Lỗi file JSON: ${validation.errors.join(', ')}`);
    } else {
      console.log('✅ Config validation passed');
      toast.success(`Đã chọn file config: ${file.name}`);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent, type: string) => {
    e.preventDefault();
    setIsDragOver(type);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, type: 'image' | 'config') => {
    e.preventDefault();
    setIsDragOver(null);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    
    if (type === 'image') {
      await handleImageSelect(file);
    } else {
      await handleConfigSelect(file);
    }
  }, []);

  // Handle upload
  const handleUpload = async () => {
    console.log('🎯 Upload button clicked!');
    console.log('📋 Upload conditions check:');
    console.log('   - imageFile?.isValid:', imageFile?.isValid);
    console.log('   - configFile?.isValid:', configFile?.isValid);
    console.log('   - canUpload:', canUpload);
    
    if (!imageFile?.isValid || !configFile?.isValid) {
      console.log('❌ Upload validation failed');
      toast.error('Vui lòng chọn file hợp lệ cho cả ảnh template và JSON config');
      return;
    }

    console.log('✅ Starting upload process...');
    try {
      setUploadProgress(0);
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      console.log('🚀 Calling onUploadComplete...');
      await onUploadComplete(imageFile.file, configFile.file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Do not reset here, parent component will trigger a reload.
      // setTimeout(() => {
      //   setUploadProgress(0);
      //   setImageFile(null);
      //   setConfigFile(null);
      // }, 2000);
      
    } catch (error) {
      setUploadProgress(0);
      console.error('Upload failed:', error);
      // Error toast is likely handled in parent component
    }
  };

  // Remove file
  const removeFile = (type: 'image' | 'config') => {
    if (type === 'image') {
      setImageFile(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
    } else {
      setConfigFile(null);
      if (configInputRef.current) configInputRef.current.value = '';
    }
  };

  const canUpload = imageFile?.isValid && configFile?.isValid && !isUploading;
  
  // Debug canUpload - log mỗi khi có thay đổi
  useEffect(() => {
    console.log('🔍 Upload status check:', {
      imageFile: imageFile ? {
        name: imageFile.file.name,
        isValid: imageFile.isValid,
        errors: imageFile.errors
      } : null,
      configFile: configFile ? {
        name: configFile.file.name,
        isValid: configFile.isValid,
        errors: configFile.errors
      } : null,
      isUploading,
      canUpload,
      buttonShouldBeEnabled: canUpload
    });
    
    // Log button state specifically
    if (imageFile && configFile) {
      console.log('📝 Upload button state analysis:');
      console.log('  ✅ Both files selected');
      console.log('  🖼️ Image valid:', imageFile.isValid);
      console.log('  📄 Config valid:', configFile.isValid);
      console.log('  🚫 Not uploading:', !isUploading);
      console.log('  🎯 Can upload:', canUpload);
      
      if (!canUpload) {
        console.log('❌ Upload disabled reasons:');
        if (!imageFile.isValid) console.log('  - Image invalid:', imageFile.errors);
        if (!configFile.isValid) console.log('  - Config invalid:', configFile.errors);
        if (isUploading) console.log('  - Already uploading');
      }
    } else {
      console.log('📝 Files missing:');
      console.log('  🖼️ Image file:', !!imageFile);
      console.log('  📄 Config file:', !!configFile);
    }
  }, [imageFile, configFile, isUploading, canUpload]);

  return (
    <div className="space-y-6">
      {/* Upload Progress */}
      {uploadProgress > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Upload className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">
                Đang upload... {uploadProgress}%
              </span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* File Upload Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Image Upload */}
        <Card 
          className={`border-2 border-dashed transition-all duration-200 ${
            isDragOver === 'image' 
              ? 'border-green-400 bg-green-50' 
              : imageFile?.isValid 
                ? 'border-green-300 bg-green-50' 
                : imageFile && !imageFile.isValid 
                  ? 'border-red-300 bg-red-50'
                  : 'border-green-300 hover:border-green-400'
          }`}
          onDragOver={(e) => handleDragOver(e, 'image')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'image')}
        >
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-green-700 flex items-center justify-center gap-2">
              <FileImage className="w-5 h-5" />
              Ảnh Template Chuẩn
              {imageFile?.isValid && <CheckCircle className="w-4 h-4 text-green-600" />}
              {imageFile && !imageFile.isValid && <AlertCircle className="w-4 h-4 text-red-600" />}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            {imageFile ? (
              <div className="space-y-3">
                {/* Preview */}
                {imageFile.preview && (
                  <div className="relative mx-auto w-32 h-32 border rounded-lg overflow-hidden">
                    <img 
                      src={imageFile.preview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* File Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant={imageFile.isValid ? "default" : "destructive"}>
                      {imageFile.file.name}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile('image')}
                      className="h-6 w-6 p-0 text-gray-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-600">
                    {(imageFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  
                  {/* Errors */}
                  {imageFile.errors.length > 0 && (
                    <Alert variant="destructive" className="text-left">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {imageFile.errors.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <FileImage className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-sm text-green-600 mb-2">
                  <strong>PNG/JPG, max 20MB</strong>
                </p>
                <p className="text-xs text-gray-600 mb-4">
                  Kéo thả file hoặc click để chọn<br/>
                  Ảnh chuẩn để hệ thống căn chỉnh và nhận dạng bubble
                </p>
              </div>
            )}
            
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) => {
                console.log('📁 Image input onChange triggered:', e.target.files?.length);
                const file = e.target.files?.[0];
                if (file) {
                  console.log('📁 Image file found, calling handleImageSelect...');
                  handleImageSelect(file);
                } else {
                  console.log('❌ No image file found in input');
                }
              }}
            />
            
            <Button
              variant="outline"
              className="w-full border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => {
                console.log('🖱️ Image select button clicked');
                imageInputRef.current?.click();
              }}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {imageFile ? 'Chọn Ảnh Khác' : 'Chọn Ảnh Template'}
            </Button>
          </CardContent>
        </Card>

        {/* JSON Config Upload */}
        <Card 
          className={`border-2 border-dashed transition-all duration-200 ${
            isDragOver === 'config' 
              ? 'border-purple-400 bg-purple-50' 
              : configFile?.isValid 
                ? 'border-purple-300 bg-purple-50' 
                : configFile && !configFile.isValid 
                  ? 'border-red-300 bg-red-50'
                  : 'border-purple-300 hover:border-purple-400'
          }`}
          onDragOver={(e) => handleDragOver(e, 'config')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'config')}
        >
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-purple-700 flex items-center justify-center gap-2">
              <FileCode className="w-5 h-5" />
              File JSON Config
              {configFile?.isValid && <CheckCircle className="w-4 h-4 text-green-600" />}
              {configFile && !configFile.isValid && <AlertCircle className="w-4 h-4 text-red-600" />}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            {configFile ? (
              <div className="space-y-3">
                {/* File Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant={configFile.isValid ? "default" : "destructive"}>
                      {configFile.file.name}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile('config')}
                      className="h-6 w-6 p-0 text-gray-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-600">
                    {(configFile.file.size / 1024).toFixed(2)} KB
                  </p>
                  
                  {/* Errors */}
                  {configFile.errors.length > 0 && (
                    <Alert variant="destructive" className="text-left">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {configFile.errors.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                  <FileCode className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-sm text-purple-600 mb-2">
                  <strong>.json, max 2MB</strong>
                </p>
                <p className="text-xs text-gray-600 mb-4">
                  Kéo thả file hoặc click để chọn<br/>
                  Cấu hình vùng nhận dạng: SBD, mã đề, câu hỏi
                </p>
              </div>
            )}
            
            <input
              ref={configInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                console.log('📁 Config input onChange triggered:', e.target.files?.length);
                const file = e.target.files?.[0];
                if (file) {
                  console.log('📁 Config file found, calling handleConfigSelect...');
                  handleConfigSelect(file);
                } else {
                  console.log('❌ No config file found in input');
                }
              }}
            />
            
            <Button
              variant="outline"
              className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={() => {
                console.log('🖱️ Config select button clicked');
                configInputRef.current?.click();
              }}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {configFile ? 'Chọn File Khác' : 'Chọn File JSON'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upload Action */}
      <div className="flex flex-col items-center pt-4">
        {/* Debug info */}
        <div className="text-center mb-4">
          <p className="text-xs text-gray-500 mb-2">
            Debug: isUploading = {isUploading.toString()}
          </p>
          {isUploading && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                console.log('🔄 Force reset isUploading state');
                console.log('⚠️ isUploading comes from parent component - need to refresh page');
              }}
              className="mb-2"
            >
              🔄 Debug: Reset Upload State (Refresh Page)
            </Button>
          )}
        </div>
        
        <Button
          size="lg"
          className={`px-8 py-3 transition-all duration-200 ${
            canUpload 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          onClick={(e) => {
            console.log('🖱️ Upload button clicked event:', {
              canUpload,
              disabled: !canUpload,
              isUploading,
              imageFileValid: imageFile?.isValid,
              configFileValid: configFile?.isValid,
              eventType: e.type
            });
            handleUpload();
          }}
          disabled={!canUpload}
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Đang Upload...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Upload Files để Hoàn Thiện Template
            </>
          )}
        </Button>
      </div>

      {/* Upload Status Summary */}
      {(imageFile || configFile) && (
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Ảnh Template:</span>
                {imageFile?.isValid ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Sẵn sàng
                  </Badge>
                ) : imageFile ? (
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Có lỗi
                  </Badge>
                ) : (
                  <Badge variant="outline">Chưa chọn</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium">JSON Config:</span>
                {configFile?.isValid ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Sẵn sàng
                  </Badge>
                ) : configFile ? (
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Có lỗi
                  </Badge>
                ) : (
                  <Badge variant="outline">Chưa chọn</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}