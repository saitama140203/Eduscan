'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api/base';

interface PasswordRequest {
  maYeuCau: string;
  lyDo: string;
  trangThai: 'PENDING' | 'APPROVED' | 'REJECTED';
  thoiGianTao: string;
  thoiGianXuLy?: string;
  ghiChuAdmin?: string;
  hoTenAdminXuLy?: string;
}

export default function ManagerPasswordRequestPage() {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState<PasswordRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const { toast } = useToast();

  const loadMyRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const data = await apiRequest('/password-reset-requests/my-requests');
      setRequests(data);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tải danh sách yêu cầu",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập lý do yêu cầu reset password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await apiRequest('/password-reset-requests', {
        method: 'POST',
        body: {
          lyDo: reason.trim()
        }
      });

      toast({
        title: "Thành công",
        description: "Yêu cầu reset password đã được gửi thành công",
      });

      setReason('');
      loadMyRequests(); // Refresh danh sách
    } catch (error: any) {
      toast({
        title: "Lỗi", 
        description: error.message || "Không thể gửi yêu cầu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            Đang chờ
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Đã phê duyệt
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <X className="w-3 h-3 mr-1" />
            Đã từ chối
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load requests on mount
  React.useEffect(() => {
    loadMyRequests();
  }, []);

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Yêu cầu Reset Password</h1>
          <p className="text-muted-foreground">
            Gửi yêu cầu reset password cho admin xem xét
          </p>
        </div>

        {/* Form tạo yêu cầu mới */}
        <Card>
          <CardHeader>
            <CardTitle>Tạo yêu cầu mới</CardTitle>
            <CardDescription>
              Nếu bạn quên mật khẩu hoặc cần reset password, hãy gửi yêu cầu với lý do cụ thể
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Lý do yêu cầu reset password *</Label>
                <Textarea
                  id="reason"
                  placeholder="Ví dụ: Quên mật khẩu, bị khóa tài khoản, nghi ngờ bị hack..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={3}
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={isLoading || !reason.trim()}
                className="w-full"
              >
                {isLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danh sách yêu cầu của tôi */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Yêu cầu của tôi</CardTitle>
              <CardDescription>
                Danh sách các yêu cầu reset password đã gửi
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={loadMyRequests}
              disabled={isLoadingRequests}
            >
              {isLoadingRequests ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingRequests ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Đang tải...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-6">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có yêu cầu nào</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.maYeuCau}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(request.trangThai)}
                          <span className="text-sm text-muted-foreground">
                            {formatDate(request.thoiGianTao)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium text-sm">Lý do:</p>
                      <p className="text-sm text-muted-foreground">{request.lyDo}</p>
                    </div>

                    {request.trangThai !== 'PENDING' && (
                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Xử lý bởi: {request.hoTenAdminXuLy || 'N/A'}
                          </span>
                          {request.thoiGianXuLy && (
                            <span className="text-muted-foreground">
                              {formatDate(request.thoiGianXuLy)}
                            </span>
                          )}
                        </div>
                        {request.ghiChuAdmin && (
                          <div className="mt-2">
                            <p className="font-medium text-sm">Ghi chú admin:</p>
                            <p className="text-sm text-muted-foreground">{request.ghiChuAdmin}</p>
                          </div>
                        )}
                        {request.trangThai === 'APPROVED' && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                            <p className="text-sm text-green-700">
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              Mật khẩu đã được reset về "123456". Vui lòng đăng nhập và đổi mật khẩu mới.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 