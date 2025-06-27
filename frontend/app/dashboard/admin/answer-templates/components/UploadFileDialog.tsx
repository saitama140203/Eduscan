'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  CloudUpload, 
  FileText, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Info,
  X,
  Loader2
} from 'lucide-react';
import { AnswerSheetTemplate } from '@/lib/api/answer-templates';

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  template: AnswerSheetTemplate | null;
}

interface UploadedFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  id: string;
}

const UploadFileDialog: React.FC<UploadFileDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  template
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supported file types
  const supportedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type label
  const getFileTypeLabel = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'application/pdf': 'PDF',
      'image/jpeg': 'JPEG',
      'image/png': 'PNG',
      'image/tiff': 'TIFF',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/msword': 'DOC'
    };
    return typeMap[type] || 'Unknown';
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    if (!supportedTypes.includes(file.type)) {
      return `Loại file không được hỗ trợ. Chỉ chấp nhận: ${supportedTypes.map(t => getFileTypeLabel(t)).join(', ')}`;
    }
    
    if (file.size > maxFileSize) {
      return `File quá lớn. Kích thước tối đa: ${formatFileSize(maxFileSize)}`;
    }
    
    return null;
  };

  // Get template info
  const templateId = template?.maMauPhieu;
  const templateName = template?.tenMauPhieu || '';
  const currentFile = template?.cauTrucJson?.fileInfo;

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file);
      
      newFiles.push({
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error ? error : undefined,
        id: `${file.name}-${Date.now()}-${i}`
      });
    }

    // Only allow one file for template
    setUploadedFiles([newFiles[0]]);
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Handle file input click
  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  // Remove file
  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Upload file with credentials
  const uploadFile = async (uploadedFile: UploadedFile): Promise<void> => {
    console.log('🔍 Upload debug info:', { 
      template, 
      templateId, 
      templateName 
    });
    
    if (!templateId) {
      console.error('❌ Template ID is missing!', { template });
      throw new Error('Template ID is required');
    }

    const formData = new FormData();
    formData.append('file', uploadedFile.file);

    try {
      // Update status to uploading
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === uploadedFile.id 
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        )
      );

      // API configuration
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://eduscan.local/api/v1';

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Gửi credentials (cookies)
      xhr.withCredentials = true;

      // Progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === uploadedFile.id 
                ? { ...f, progress }
                : f
            )
          );
        }
      });

      // Promise wrapper for XMLHttpRequest
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.onreadystatechange = () => {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText);
                reject(new Error(errorData.message || errorData.detail || 'Upload failed'));
              } catch {
                reject(new Error(`Upload failed with status: ${xhr.status}`));
              }
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        
        xhr.open('POST', `${API_BASE_URL}/answer-templates/${templateId}/upload`);
        xhr.send(formData);
      });

      await uploadPromise;

      // Mark as success
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === uploadedFile.id 
            ? { ...f, status: 'success', progress: 100 }
            : f
        )
      );

      toast.success('Upload file thành công!');

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === uploadedFile.id 
            ? { 
                ...f, 
                status: 'error', 
                error: errorMessage,
                progress: 0
              }
            : f
        )
      );

      toast.error(`Lỗi upload: ${errorMessage}`);
    }
  };

  // Handle upload all
  const handleUpload = async () => {
    const filesToUpload = uploadedFiles.filter(f => f.status === 'pending');
    if (filesToUpload.length === 0) return;

    setUploading(true);

    try {
      // Upload files sequentially
      for (const file of filesToUpload) {
        await uploadFile(file);
      }

      // Check if all uploads were successful
      const allSuccess = uploadedFiles.every(f => f.status === 'success');
      if (allSuccess) {
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1000);
      }
    } finally {
      setUploading(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!uploading) {
      setUploadedFiles([]);
      setIsDragOver(false);
      onOpenChange(false);
    }
  };

  // Check if can upload
  const canUpload = uploadedFiles.length > 0 && 
                   uploadedFiles.some(f => f.status === 'pending') && 
                   !uploading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upload File Template</DialogTitle>
          <DialogDescription>
            Template: <strong>{templateName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current File Info */}
          {currentFile && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">File hiện tại:</p>
                  <p>{currentFile.tenFileGoc} ({formatFileSize(currentFile.kichThuocFile)})</p>
                  <p className="text-xs text-muted-foreground">
                    Upload file mới sẽ thay thế file hiện tại
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Area */}
          <Card 
            className={`border-2 border-dashed cursor-pointer transition-colors ${
              isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary hover:bg-muted/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileInputClick}
          >
            <CardContent className="p-8 text-center">
              <CloudUpload className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Kéo thả file vào đây hoặc click để chọn
              </h3>
              <p className="text-muted-foreground mb-2">
                Hỗ trợ: PDF, DOCX, DOC, JPEG, PNG, TIFF
              </p>
              <p className="text-sm text-muted-foreground">
                Kích thước tối đa: {formatFileSize(maxFileSize)}
              </p>
            </CardContent>
          </Card>

          <input
            ref={fileInputRef}
            type="file"
            accept={supportedTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">File đã chọn</h3>
              <div className="space-y-3">
                {uploadedFiles.map((uploadedFile) => (
                  <Card key={uploadedFile.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="mt-1">
                            {uploadedFile.status === 'success' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : uploadedFile.status === 'error' ? (
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            ) : (
                              <FileText className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="font-medium truncate">{uploadedFile.file.name}</p>
                              <Badge variant="outline">
                                {getFileTypeLabel(uploadedFile.file.type)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {formatFileSize(uploadedFile.file.size)}
                            </p>
                            
                            {uploadedFile.status === 'uploading' && (
                              <div className="space-y-1">
                                <Progress value={uploadedFile.progress} className="h-2" />
                                <p className="text-xs text-muted-foreground">
                                  {uploadedFile.progress}%
                                </p>
                              </div>
                            )}
                            
                            {uploadedFile.error && (
                              <p className="text-sm text-red-600">{uploadedFile.error}</p>
                            )}
                          </div>
                        </div>
                        
                        {uploadedFile.status !== 'uploading' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(uploadedFile.id)}
                            disabled={uploading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upload Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Lưu ý khi upload file template:</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>File PDF được khuyến nghị cho chất lượng tốt nhất</li>
                  <li>Đảm bảo template có layout rõ ràng, dễ nhận dạng</li>
                  <li>Tránh sử dụng font chữ quá nhỏ hoặc màu sắc mờ nhạt</li>
                  <li>File sẽ được sử dụng để AI nhận dạng cấu trúc phiếu</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            <X className="w-4 h-4 mr-2" />
            Hủy
          </Button>
          <Button onClick={handleUpload} disabled={!canUpload}>
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CloudUpload className="w-4 h-4 mr-2" />
            )}
            {uploading ? 'Đang upload...' : 'Upload File'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadFileDialog; 