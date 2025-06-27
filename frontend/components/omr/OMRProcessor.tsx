'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  BarChart3
} from 'lucide-react';

interface ProcessingResult {
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  results?: Record<string, string>;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  annotatedImage?: string;
  error?: string;
}

interface OMRProcessorProps {
  templateId: number;
  availableModels?: Array<{
    name: string;
    path: string;
    size: number;
  }>;
  onProcessComplete?: (results: ProcessingResult[]) => void;
}

export default function OMRProcessor({
  templateId,
  availableModels = [],
  onProcessComplete
}: OMRProcessorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const answerKeyInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState('models/best.pt');
  const [confidence, setConfidence] = useState(0.25);
  const [autoAlign, setAutoAlign] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    
    // Initialize processing results
    const initialResults: ProcessingResult[] = files.map(file => ({
      fileName: file.name,
      status: 'pending'
    }));
    setProcessingResults(initialResults);
  };

  const handleAnswerKeySelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setAnswerKeyFile(file || null);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    
    const newResults = processingResults.filter((_, i) => i !== index);
    setProcessingResults(newResults);
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
      formData.append('yolo_model', selectedModel);
      formData.append('confidence', confidence.toString());
      formData.append('auto_align', autoAlign.toString());
      
      // Add answer key if provided
      if (answerKeyFile) {
        formData.append('answer_key_excel', answerKeyFile);
      }

      const response = await fetch(`/api/v1/answer-templates/${templateId}/process-omr`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Processing failed');
      }

      const result = await response.json();
      
      // Update results
      const updatedResults: ProcessingResult[] = selectedFiles.map((file, index) => {
        const fileName = file.name;
        const fileResult = result.results?.[fileName] || {};
        
        return {
          fileName,
          status: 'completed',
          results: fileResult,
          score: fileResult.totalScore || 0,
          totalQuestions: fileResult.totalQuestions || 0,
          correctAnswers: fileResult.correctAnswers || 0,
          annotatedImage: result.annotated_images?.[fileName]
        };
      });

      setProcessingResults(updatedResults);
      setProcessingProgress(100);
      
      if (onProcessComplete) {
        onProcessComplete(updatedResults);
      }

      toast.success(`Đã xử lý thành công ${selectedFiles.length} ảnh`);

    } catch (error: any) {
      console.error('Processing error:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xử lý');
      
      // Mark all as error
      const errorResults = processingResults.map(result => ({
        ...result,
        status: 'error' as const,
        error: error.message
      }));
      setProcessingResults(errorResults);
      
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResults = () => {
    const csvContent = generateCSV(processingResults);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `omr_results_${templateId}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSV = (results: ProcessingResult[]) => {
    const headers = ['File Name', 'Status', 'Score', 'Total Questions', 'Correct Answers', 'Accuracy'];
    const rows = results.map(result => [
      result.fileName,
      result.status,
      result.score || 0,
      result.totalQuestions || 0,
      result.correctAnswers || 0,
      result.totalQuestions ? ((result.correctAnswers || 0) / result.totalQuestions * 100).toFixed(1) + '%' : '0%'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const viewAnnotatedImage = (result: ProcessingResult) => {
    if (!result.annotatedImage) return;
    
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>Annotated Result - ${result.fileName}</title></head>
          <body style="margin: 0; padding: 20px; text-align: center;">
            <h2>${result.fileName}</h2>
            <img src="data:image/jpeg;base64,${result.annotatedImage}" style="max-width: 100%; height: auto;" />
          </body>
        </html>
      `);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': 'secondary',
      'processing': 'default',
      'completed': 'default',
      'error': 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const completedCount = processingResults.filter(r => r.status === 'completed').length;
  const errorCount = processingResults.filter(r => r.status === 'error').length;
  const averageScore = processingResults.length > 0 
    ? processingResults.reduce((sum, r) => sum + (r.score || 0), 0) / processingResults.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>OMR Processing Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="images">Select Images</Label>
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
                Select multiple images to process in batch
              </p>
            </div>

            <div>
              <Label htmlFor="answer-key">Answer Key (Excel)</Label>
              <Input
                id="answer-key"
                type="file"
                ref={answerKeyInputRef}
                accept=".xlsx,.xls"
                onChange={handleAnswerKeySelect}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Optional: Upload answer key for automatic scoring
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="model">YOLO Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(model => (
                    <SelectItem key={model.name} value={model.path}>
                      {model.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="models/best.pt">best.pt (default)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="confidence">Confidence Threshold</Label>
              <Input
                id="confidence"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
              />
            </div>

            <div className="flex items-center space-x-2 mt-6">
              <Checkbox
                id="auto-align"
                checked={autoAlign}
                onCheckedChange={(checked) => setAutoAlign(checked as boolean)}
              />
              <Label htmlFor="auto-align">Auto Align Images</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={startProcessing} 
              disabled={isProcessing || selectedFiles.length === 0}
            >
              <Play className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Start Processing'}
            </Button>
            
            {processingResults.length > 0 && (
              <Button variant="outline" onClick={downloadResults}>
                <Download className="w-4 h-4 mr-2" />
                Download Results
              </Button>
            )}
          </div>

          {isProcessing && (
            <div>
              <Label>Processing Progress</Label>
              <Progress value={processingProgress} className="mt-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      {processingResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Processing Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{selectedFiles.length}</div>
                <div className="text-sm text-gray-500">Total Images</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                <div className="text-sm text-gray-500">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{averageScore.toFixed(1)}</div>
                <div className="text-sm text-gray-500">Avg Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {processingResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processingResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <div className="font-medium">{result.fileName}</div>
                      <div className="text-sm text-gray-500">
                        {result.status === 'completed' && (
                          `Score: ${result.score}/${result.totalQuestions} (${result.correctAnswers} correct)`
                        )}
                        {result.status === 'error' && result.error}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(result.status)}
                    
                    {result.status === 'completed' && result.annotatedImage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewAnnotatedImage(result)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {result.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 