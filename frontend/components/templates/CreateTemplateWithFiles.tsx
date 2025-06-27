'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle, CheckCircle, Eye, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface CreateTemplateWithFilesProps {
  onSuccess?: (result: any) => void;
  onCancel?: () => void;
}

export default function CreateTemplateWithFiles({ onSuccess, onCancel }: CreateTemplateWithFilesProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tenMauPhieu: '',
    soCauHoi: 12,
    soLuaChonMoiCau: 4,
    khoGiay: 'A4',
    coTuLuan: false,
    coThongTinHocSinh: true,
    coLogo: false,
    laCongKhai: false,
    laMacDinh: false,
  });
  
  // Chỉ cần PDF template
  const [templatePdf, setTemplatePdf] = useState<File | null>(null);
  
  const pdfInputRef = useRef<HTMLInputElement>(null);

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
      toast.success(`✅ Đã chọn file PDF template: ${file.name}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!templatePdf) {
      toast.error('❌ Vui lòng chọn file PDF template');
      return;
    }

    if (!formData.tenMauPhieu.trim()) {
      toast.error('❌ Vui lòng nhập tên template');
      return;
    }

    setLoading(true);
    
    try {
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
        const error = await response.json();
        throw new Error(error.detail || 'Lỗi tạo template');
      }

      const result = await response.json();
      toast.success('🎉 Template đã được tạo thành công! Bây giờ hãy cấu hình OMR.');
      onSuccess?.(result);
      
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast.error(error.message || 'Lỗi tạo template');
    } finally {
      setLoading(false);
    }
  };

  const previewPdf = () => {
    if (templatePdf) {
      const url = URL.createObjectURL(templatePdf);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Tạo Template OMR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>📋 Hệ thống 3 File Template:</strong>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-blue-800">File PDF Template</strong>
                    <p className="text-sm text-blue-700 mt-1">
                      Dùng để giáo viên tải về và in ra cho học sinh làm bài.
                      File này có thể chứa logo trường, thông tin đề thi.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-green-800">Ảnh Template Chuẩn</strong>
                    <p className="text-sm text-green-700 mt-1">
                      Ảnh PNG/JPG chất lượng cao làm chuẩn để hệ thống căn chỉnh 
                      và nhận dạng vị trí các ô bubble trên bài làm của học sinh.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <span className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-purple-800">File JSON Config</strong>
                    <p className="text-sm text-purple-700 mt-1">
                      Định nghĩa chính xác vị trí các vùng nhận dạng: SBD, mã đề, 
                      các câu hỏi trắc nghiệm. Có thể tạo bằng Template Builder.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <strong className="text-amber-800">⚠️ Quan trọng:</strong>
                <p className="text-sm text-amber-700 mt-1">
                  Cả 3 file đều <strong>BẮT BUỘC</strong> để hệ thống OMR hoạt động hoàn chỉnh. 
                  Thiếu bất kỳ file nào sẽ không thể preview hoặc chấm bài tự động.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Thông tin cơ bản</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="tenMauPhieu">Tên Template *</Label>
                  <Input
                    id="tenMauPhieu"
                    value={formData.tenMauPhieu}
                    onChange={(e) => setFormData(prev => ({ ...prev, tenMauPhieu: e.target.value }))}
                    placeholder="VD: Template 12 câu - Toán lớp 12"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="soCauHoi">Số câu hỏi</Label>
                  <Input
                    id="soCauHoi"
                    type="number"
                    min="1"
                    max="200"
                    value={formData.soCauHoi}
                    onChange={(e) => setFormData(prev => ({ ...prev, soCauHoi: parseInt(e.target.value) }))}
                  />
                </div>

                <div>
                  <Label htmlFor="soLuaChonMoiCau">Số lựa chọn mỗi câu</Label>
                  <Select 
                    value={formData.soLuaChonMoiCau.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, soLuaChonMoiCau: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 (True/False)</SelectItem>
                      <SelectItem value="4">4 (A, B, C, D)</SelectItem>
                      <SelectItem value="5">5 (A, B, C, D, E)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="khoGiay">Khổ giấy</Label>
                  <Select 
                    value={formData.khoGiay} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, khoGiay: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A3">A3</SelectItem>
                      <SelectItem value="Letter">Letter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="coTuLuan"
                        checked={formData.coTuLuan}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, coTuLuan: !!checked }))}
                      />
                      <Label htmlFor="coTuLuan">Có phần tự luận</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="coThongTinHocSinh"
                        checked={formData.coThongTinHocSinh}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, coThongTinHocSinh: !!checked }))}
                      />
                      <Label htmlFor="coThongTinHocSinh">Có thông tin học sinh</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="coLogo"
                        checked={formData.coLogo}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, coLogo: !!checked }))}
                      />
                      <Label htmlFor="coLogo">Có logo trường</Label>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="laCongKhai"
                        checked={formData.laCongKhai}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, laCongKhai: !!checked }))}
                      />
                      <Label htmlFor="laCongKhai">Công khai (cho tổ chức khác sử dụng)</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="laMacDinh"
                        checked={formData.laMacDinh}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, laMacDinh: !!checked }))}
                      />
                      <Label htmlFor="laMacDinh">Đặt làm template mặc định</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PDF Upload */}
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <FileText className="h-5 w-5" />
                  File PDF Template
                  {templatePdf && <Badge variant="secondary" className="bg-green-100 text-green-700">✓</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <strong>Mục đích:</strong> File PDF để giáo viên tải về và in ra sử dụng
                </div>
                
                <div 
                  className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => pdfInputRef.current?.click()}
                >
                  <FileText className="h-12 w-12 mx-auto text-blue-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
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
                    • Chất lượng in tốt, rõ nét<br/>
                    • Có thể chứa logo, thông tin trường
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Next Steps Info */}
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>🔄 Bước tiếp theo:</strong><br/>
                Sau khi tạo template thành công, bạn sẽ được chuyển đến trang <strong>Edit Template</strong> để:
                <ul className="mt-2 ml-4 list-disc">
                  <li>Upload <strong>ảnh template</strong> (để làm chuẩn căn chỉnh)</li>
                  <li>Upload <strong>file JSON config</strong> (cấu hình vùng nhận dạng)</li>
                  <li>Sử dụng <strong>Template Builder</strong> để tạo/chỉnh sửa config trực quan</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Hủy
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading || !templatePdf}
                className="min-w-[200px]"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang tạo template...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Tạo Template
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 