'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, X, Loader2, AlertCircle, FileText, Eye } from 'lucide-react';

interface CreateTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TemplateFormData {
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

interface FormErrors {
  tenMauPhieu?: string;
  soCauHoi?: string;
  soLuaChonMoiCau?: string;
  khoGiay?: string;
  [key: string]: string | undefined;
}

const CreateTemplateDialog: React.FC<CreateTemplateDialogProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<TemplateFormData>({
    tenMauPhieu: '',
    soCauHoi: 50,
    soLuaChonMoiCau: 4,
    khoGiay: 'A4',
    coTuLuan: false,
    coThongTinHocSinh: true,
    coLogo: true,
    laCongKhai: false,
    laMacDinh: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [templatePdf, setTemplatePdf] = useState<File | null>(null);
  
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Paper size options
  const paperSizes = [
    { value: 'A4', label: 'A4 (210 × 297 mm)' },
    { value: 'A3', label: 'A3 (297 × 420 mm)' },
    { value: 'Letter', label: 'Letter (8.5 × 11 inch)' },
    { value: 'Legal', label: 'Legal (8.5 × 14 inch)' }
  ];

  // Choice options
  const choiceOptions = [
    { value: 2, label: '2 lựa chọn (A, B)' },
    { value: 3, label: '3 lựa chọn (A, B, C)' },
    { value: 4, label: '4 lựa chọn (A, B, C, D)' },
    { value: 5, label: '5 lựa chọn (A, B, C, D, E)' }
  ];

  // Handle form changes
  const handleChange = (field: keyof TemplateFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle PDF selection
  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('File template phải là PDF');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File PDF không được vượt quá 50MB');
        return;
      }
      setTemplatePdf(file);
      toast.success(`✅ Đã chọn file PDF: ${file.name}`);
    }
  };

  // Preview PDF
  const previewPdf = () => {
    if (templatePdf) {
      const url = URL.createObjectURL(templatePdf);
      window.open(url, '_blank');
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.tenMauPhieu.trim()) {
      newErrors.tenMauPhieu = 'Tên template không được để trống';
    } else if (formData.tenMauPhieu.length < 3) {
      newErrors.tenMauPhieu = 'Tên template phải có ít nhất 3 ký tự';
    } else if (formData.tenMauPhieu.length > 100) {
      newErrors.tenMauPhieu = 'Tên template không được quá 100 ký tự';
    }

    if (formData.soCauHoi < 1) {
      newErrors.soCauHoi = 'Số câu hỏi phải lớn hơn 0';
    } else if (formData.soCauHoi > 200) {
      newErrors.soCauHoi = 'Số câu hỏi không được quá 200';
    }

    if (formData.soLuaChonMoiCau < 2) {
      newErrors.soLuaChonMoiCau = 'Số lựa chọn phải ít nhất là 2';
    } else if (formData.soLuaChonMoiCau > 5) {
      newErrors.soLuaChonMoiCau = 'Số lựa chọn không được quá 5';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    if (!templatePdf) {
      toast.error('❌ Vui lòng chọn file PDF template');
      return;
    }

    setLoading(true);
    setSubmitError('');

    try {
      // Use FormData for file upload
      const form = new FormData();
      
      // Append form fields
      Object.entries(formData).forEach(([key, value]) => {
        form.append(key, value.toString());
      });
      
      // Append PDF file
      form.append('template_pdf', templatePdf);

      const response = await fetch('/api/v1/answer-templates/create-with-pdf', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(errorData.message || errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Success
      toast.success('🎉 Template PDF đã được tạo thành công! Bây giờ hãy cấu hình OMR.');
      onSuccess();
      handleClose();
      
      // Redirect to edit page to configure OMR
      if (result.redirectUrl) {
        setTimeout(() => {
          window.location.href = result.redirectUrl;
        }, 1000);
      }
      
    } catch (error) {
      console.error('Error creating template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      setSubmitError(errorMessage);
      toast.error(`Lỗi khi tạo template: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!loading) {
      setFormData({
        tenMauPhieu: '',
        soCauHoi: 50,
        soLuaChonMoiCau: 4,
        khoGiay: 'A4',
        coTuLuan: false,
        coThongTinHocSinh: true,
        coLogo: true,
        laCongKhai: false,
        laMacDinh: false
      });
      setErrors({});
      setSubmitError('');
      setTemplatePdf(null);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Tạo Template OMR Mới</DialogTitle>
          <DialogDescription>
            Tạo template với file PDF để giáo viên có thể tải về và in sử dụng
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Workflow Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>📋 Workflow tạo template:</strong>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                  <strong>Upload file PDF template</strong> - Để giáo viên tải về và in
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                  <span className="text-gray-600">Sau đó vào <strong>Edit → OMR Config</strong> để cấu hình nhận dạng</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                  <span className="text-gray-600">Upload <strong>ảnh template + JSON config</strong> để hoàn thiện</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tenMauPhieu">Tên Template *</Label>
                <Input
                  id="tenMauPhieu"
                  value={formData.tenMauPhieu}
                  onChange={(e) => handleChange('tenMauPhieu', e.target.value)}
                  placeholder="VD: Template 50 câu - Toán lớp 12"
                  className={errors.tenMauPhieu ? 'border-red-500' : ''}
                />
                {errors.tenMauPhieu && (
                  <p className="text-red-500 text-sm mt-1">{errors.tenMauPhieu}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="soCauHoi">Số câu hỏi</Label>
                  <Input
                    id="soCauHoi"
                    type="number"
                    min="1"
                    max="200"
                    value={formData.soCauHoi}
                    onChange={(e) => handleChange('soCauHoi', parseInt(e.target.value) || 1)}
                    className={errors.soCauHoi ? 'border-red-500' : ''}
                  />
                  {errors.soCauHoi && (
                    <p className="text-red-500 text-sm mt-1">{errors.soCauHoi}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="soLuaChonMoiCau">Số lựa chọn mỗi câu</Label>
                  <Select 
                    value={formData.soLuaChonMoiCau.toString()} 
                    onValueChange={(value) => handleChange('soLuaChonMoiCau', parseInt(value))}
                  >
                    <SelectTrigger className={errors.soLuaChonMoiCau ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {choiceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.soLuaChonMoiCau && (
                    <p className="text-red-500 text-sm mt-1">{errors.soLuaChonMoiCau}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="khoGiay">Khổ giấy</Label>
                <Select 
                  value={formData.khoGiay} 
                  onValueChange={(value) => handleChange('khoGiay', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paperSizes.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* PDF Upload */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <FileText className="h-5 w-5" />
                File PDF Template *
                {templatePdf && <span className="text-green-600">✓</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                <strong>Mục đích:</strong> File PDF để giáo viên tải về và in ra sử dụng
              </div>
              
              <div 
                className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => pdfInputRef.current?.click()}
              >
                <FileText className="h-10 w-10 mx-auto text-blue-400 mb-3" />
                <p className="font-medium text-gray-700 mb-1">
                  {templatePdf ? templatePdf.name : 'Chọn file PDF template'}
                </p>
                <p className="text-sm text-gray-500">
                  {templatePdf 
                    ? `${(templatePdf.size / 1024 / 1024).toFixed(2)} MB`
                    : 'Kéo thả file PDF hoặc click để chọn'
                  }
                </p>
              </div>
              
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                onChange={handlePdfSelect}
                className="hidden"
              />
              
              {templatePdf && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={previewPdf}
                    className="flex-1"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Xem trước PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setTemplatePdf(null);
                      if (pdfInputRef.current) pdfInputRef.current.value = '';
                    }}
                    size="sm"
                  >
                    Xóa
                  </Button>
                </div>
              )}
              
              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Yêu cầu:</strong><br/>
                  • Format: PDF<br/>
                  • Kích thước: Tối đa 50MB<br/>
                  • Chất lượng in tốt, rõ nét
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Template Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tính năng template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>Có phần tự luận</Label>
                    <p className="text-xs text-muted-foreground">
                      Bao gồm khu vực để học sinh viết tự luận
                    </p>
                  </div>
                  <Switch
                    checked={formData.coTuLuan}
                    onCheckedChange={(checked) => handleChange('coTuLuan', checked)}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>Có thông tin học sinh</Label>
                    <p className="text-xs text-muted-foreground">
                      Khu vực điền họ tên, lớp, số báo danh
                    </p>
                  </div>
                  <Switch
                    checked={formData.coThongTinHocSinh}
                    onCheckedChange={(checked) => handleChange('coThongTinHocSinh', checked)}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>Có logo trường</Label>
                    <p className="text-xs text-muted-foreground">
                      Hiển thị logo và tên trường trên phiếu
                    </p>
                  </div>
                  <Switch
                    checked={formData.coLogo}
                    onCheckedChange={(checked) => handleChange('coLogo', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visibility Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cài đặt hiển thị</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>Công khai template</Label>
                    <p className="text-xs text-muted-foreground">
                      Cho phép giáo viên khác trong tổ chức sử dụng
                    </p>
                  </div>
                  <Switch
                    checked={formData.laCongKhai}
                    onCheckedChange={(checked) => handleChange('laCongKhai', checked)}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label>Đặt làm mặc định</Label>
                    <p className="text-xs text-muted-foreground">
                      Tự động chọn template này khi tạo đề thi mới
                    </p>
                  </div>
                  <Switch
                    checked={formData.laMacDinh}
                    onCheckedChange={(checked) => handleChange('laMacDinh', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Đang tạo...' : 'Tạo Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTemplateDialog; 