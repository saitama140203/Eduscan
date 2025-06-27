'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Upload, 
  Play, 
  Download, 
  Eye, 
  FileText,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Users,
  FileSpreadsheet,
  Target
} from 'lucide-react';

interface OMRResult {
  filename: string;
  sbd: string | null;
  student: {
    maHocSinh: number | null;
    hoTen: string | null;
    maHocSinhTruong: string | null;
  } | null;
  score: number | null;
  answers: Record<string, string>;
  matched: boolean;
  annotated_image?: string;
}

interface ProcessingStats {
  total_processed: number;
  matched_count: number;
  average_score: number;
  max_score: number;
  min_score: number;
  score_distribution: Array<{
    grade: string;
    count: number;
  }>;
}

interface ExamOMRProcessorProps {
  examId: number;
  templateId: number;
  classId?: number;
  examName: string;
  className?: string;
}

export default function ExamOMRProcessor({
  examId,
  templateId,
  classId,
  examName,
  className
}: ExamOMRProcessorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [autoAlign, setAutoAlign] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState<OMRResult[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateId);

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  // Load stats if there are existing results
  useEffect(() => {
    if (examId) {
      loadExamStats();
    }
  }, [examId, classId]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/v1/omr/templates', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadExamStats = async () => {
    try {
      const url = `/api/v1/omr/stats/${examId}${classId ? `?class_id=${classId}` : ''}`;
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const startProcessing = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Vui lòng chọn ít nhất một ảnh để xử lý');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      const formData = new FormData();
      
      // Add images
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });
      
      // Add configuration
      formData.append('exam_id', examId.toString());
      formData.append('template_id', selectedTemplateId.toString());
      if (classId) {
        formData.append('class_id', classId.toString());
      }
      formData.append('auto_align', autoAlign.toString());

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/v1/omr/process-batch', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Processing failed');
      }

      const result = await response.json();
      
      // Update results
      setProcessingResults(result.data.results || []);
      setProcessingProgress(100);
      
      // Reload stats
      await loadExamStats();

      toast.success(`Đã xử lý thành công ${result.data.total_processed} ảnh, khớp được ${result.data.matched_count} học sinh`);

    } catch (error: any) {
      console.error('Processing error:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xử lý OMR');
      
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const url = `/api/v1/omr/export-excel/${examId}${classId ? `?class_id=${classId}` : ''}`;
      const response = await fetch(url, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const filename = `ket_qua_thi_${examName}_${examId}${classId ? `_lop_${classId}` : ''}.xlsx`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Đã xuất file Excel thành công');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Có lỗi xảy ra khi xuất file Excel');
    }
  };

  const viewAnnotatedImage = (result: OMRResult) => {
    if (!result.annotated_image) return;
    
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>Kết quả chấm - ${result.filename}</title></head>
          <body style="margin: 0; padding: 20px; text-align: center; font-family: Arial, sans-serif;">
            <h2>${result.filename}</h2>
            ${result.student ? `
              <div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background: #f9f9f9;">
                <strong>Học sinh:</strong> ${result.student.hoTen} (${result.student.maHocSinhTruong})<br/>
                <strong>Số báo danh:</strong> ${result.sbd}<br/>
                <strong>Điểm:</strong> ${result.score}/10
              </div>
            ` : `
              <div style="margin: 10px 0; padding: 10px; border: 1px solid #ff9999; border-radius: 5px; background: #ffe6e6;">
                <strong>Không tìm thấy học sinh</strong><br/>
                <strong>Số báo danh phát hiện:</strong> ${result.sbd || 'Không xác định'}
              </div>
            `}
            <img src="data:image/jpeg;base64,${result.annotated_image}" style="max-width: 100%; height: auto; border: 1px solid #ddd;" />
          </body>
        </html>
      `);
    }
  };

  const getMatchStatusBadge = (matched: boolean) => {
    return matched ? (
      <Badge variant="default" className="bg-green-600">
        <CheckCircle className="w-3 h-3 mr-1" />
        Đã khớp
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Chưa khớp
      </Badge>
    );
  };

  const matchedCount = processingResults.filter(r => r.matched).length;
  const avgScore = processingResults.filter(r => r.matched && r.score !== null)
    .reduce((sum, r, _, arr) => sum + (r.score || 0) / arr.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Xử lý OMR và Chấm điểm tự động
          </CardTitle>
          <div className="text-sm text-gray-600">
            <strong>Kỳ thi:</strong> {examName}
            {className && <><br/><strong>Lớp:</strong> {className}</>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="template">Template</Label>
              <Select value={selectedTemplateId.toString()} onValueChange={(value) => setSelectedTemplateId(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="images">Chọn ảnh bài thi</Label>
              <Input
                id="images"
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Chọn nhiều ảnh để xử lý hàng loạt
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-align"
                checked={autoAlign}
                onCheckedChange={(checked) => setAutoAlign(checked as boolean)}
              />
              <Label htmlFor="auto-align">Tự động căn chỉnh ảnh</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={startProcessing} 
              disabled={isProcessing || selectedFiles.length === 0}
            >
              <Play className="w-4 h-4 mr-2" />
              {isProcessing ? 'Đang xử lý...' : 'Bắt đầu xử lý'}
            </Button>
            
            <Button variant="outline" onClick={exportToExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Xuất file Excel
            </Button>
          </div>

          {isProcessing && (
            <div>
              <Label>Tiến trình xử lý</Label>
              <Progress value={processingProgress} className="mt-2" />
              <p className="text-sm text-gray-500 mt-1">
                Đang xử lý ảnh và khớp số báo danh...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File List */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Danh sách ảnh đã chọn ({selectedFiles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isProcessing}
                  >
                    Xóa
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Session Results */}
      {processingResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Kết quả xử lý phiên này
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{processingResults.length}</div>
                <div className="text-sm text-gray-500">Tổng ảnh</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{matchedCount}</div>
                <div className="text-sm text-gray-500">Đã khớp HS</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{processingResults.length - matchedCount}</div>
                <div className="text-sm text-gray-500">Chưa khớp</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{avgScore.toFixed(1)}</div>
                <div className="text-sm text-gray-500">Điểm TB</div>
              </div>
            </div>

            <div className="space-y-2">
              {processingResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex-1">
                      <div className="font-medium">{result.filename}</div>
                      <div className="text-sm text-gray-500">
                        SBD: {result.sbd || 'Không xác định'}
                        {result.student && (
                          <span className="ml-2">
                            | HS: {result.student.hoTen} ({result.student.maHocSinhTruong})
                          </span>
                        )}
                        {result.score !== null && (
                          <span className="ml-2">| Điểm: {result.score}/10</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getMatchStatusBadge(result.matched)}
                    
                    {result.annotated_image && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewAnnotatedImage(result)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Thống kê tổng kết kỳ thi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total_processed}</div>
                <div className="text-sm text-gray-500">Tổng bài đã chấm</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.average_score.toFixed(1)}</div>
                <div className="text-sm text-gray-500">Điểm trung bình</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.max_score}</div>
                <div className="text-sm text-gray-500">Điểm cao nhất</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.min_score}</div>
                <div className="text-sm text-gray-500">Điểm thấp nhất</div>
              </div>
            </div>

            {stats.score_distribution.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Phân phối điểm:</h4>
                <div className="space-y-2">
                  {stats.score_distribution.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">{item.grade}</span>
                      <span className="text-sm text-gray-600">{item.count} học sinh</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 