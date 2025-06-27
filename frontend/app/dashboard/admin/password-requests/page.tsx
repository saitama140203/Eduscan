'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, AlertCircle, Clock, X, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api/base';

interface PasswordRequest {
  maYeuCau: string;
  maNguoiDung: number;
  hoTenNguoiYeuCau: string;
  emailNguoiYeuCau: string;
  vaiTroNguoiYeuCau: string;
  lyDo: string;
  trangThai: 'PENDING' | 'APPROVED' | 'REJECTED';
  thoiGianTao: string;
  thoiGianXuLy?: string;
  ghiChuAdmin?: string;
  hoTenAdminXuLy?: string;
}

export default function AdminPasswordRequestsPage() {
  const [requests, setRequests] = useState<PasswordRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<PasswordRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const filterParam = statusFilter === 'all' ? '' : `&status_filter=${statusFilter}`;
      const data = await apiRequest(`/password-reset-requests?page=1&size=50${filterParam}`);
      setRequests(data.items || []);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tải danh sách yêu cầu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingCount = async () => {
    try {
      const data = await apiRequest('/password-reset-requests/pending-count');
      setPendingCount(data.pending_count || 0);
    } catch (error: any) {
      console.error('Failed to load pending count:', error);
    }
  };

  const handleProcessRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(true);
    try {
      await apiRequest(`/password-reset-requests/${requestId}`, {
        method: 'PUT',
        body: {
          trangThai: status,
          ghiChuAdmin: adminNote.trim() || undefined
        }
      });

      toast({
        title: "Thành công",
        description: `Đã ${status === 'APPROVED' ? 'phê duyệt' : 'từ chối'} yêu cầu`,
      });

      setIsDialogOpen(false);
      setSelectedRequest(null);
      setAdminNote('');
      loadRequests();
      loadPendingCount();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xử lý yêu cầu",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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

  const getRoleBadge = (role: string) => {
    const roleMap: { [key: string]: { label: string; color: string } } = {
      'TEACHER': { label: 'Giáo viên', color: 'bg-blue-100 text-blue-800' },
      'MANAGER': { label: 'Quản lý', color: 'bg-purple-100 text-purple-800' },
      'ADMIN': { label: 'Admin', color: 'bg-red-100 text-red-800' }
    };

    const roleInfo = roleMap[role] || { label: role, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${roleInfo.color}`}>
        {roleInfo.label}
      </span>
    );
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

  const openProcessDialog = (request: PasswordRequest) => {
    setSelectedRequest(request);
    setAdminNote('');
    setIsDialogOpen(true);
  };

  useEffect(() => {
    loadRequests();
    loadPendingCount();
  }, [statusFilter]);

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý yêu cầu Reset Password</h1>
            <p className="text-muted-foreground">
              Xem và xử lý yêu cầu reset password từ giáo viên và quản lý
            </p>
          </div>
          <div className="flex items-center gap-4">
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {pendingCount} yêu cầu chờ xử lý
              </Badge>
            )}
            <Button variant="outline" onClick={() => { loadRequests(); loadPendingCount(); }}>
              Làm mới
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bộ lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label htmlFor="status-filter">Trạng thái</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="PENDING">Đang chờ</SelectItem>
                    <SelectItem value="APPROVED">Đã phê duyệt</SelectItem>
                    <SelectItem value="REJECTED">Đã từ chối</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách yêu cầu</CardTitle>
            <CardDescription>
              Tổng cộng {requests.length} yêu cầu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Đang tải...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-6">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Không có yêu cầu nào</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.maYeuCau}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{request.hoTenNguoiYeuCau}</span>
                          {getRoleBadge(request.vaiTroNguoiYeuCau)}
                          {getStatusBadge(request.trangThai)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {request.emailNguoiYeuCau} • {formatDate(request.thoiGianTao)}
                        </div>
                      </div>
                      {request.trangThai === 'PENDING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openProcessDialog(request)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Xử lý
                        </Button>
                      )}
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Process Request Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Xử lý yêu cầu reset password</DialogTitle>
            <DialogDescription>
              Xem xét và quyết định phê duyệt hoặc từ chối yêu cầu
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Người yêu cầu:</span>
                  <p>{selectedRequest.hoTenNguoiYeuCau}</p>
                </div>
                <div>
                  <span className="font-medium">Vai trò:</span>
                  <p>{selectedRequest.vaiTroNguoiYeuCau}</p>
                </div>
                <div>
                  <span className="font-medium">Email:</span>
                  <p>{selectedRequest.emailNguoiYeuCau}</p>
                </div>
                <div>
                  <span className="font-medium">Thời gian:</span>
                  <p>{formatDate(selectedRequest.thoiGianTao)}</p>
                </div>
              </div>
              
              <div>
                <span className="font-medium text-sm">Lý do yêu cầu:</span>
                <p className="text-sm text-muted-foreground mt-1">{selectedRequest.lyDo}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-note">Ghi chú (tùy chọn)</Label>
                <Textarea
                  id="admin-note"
                  placeholder="Nhập ghi chú cho quyết định của bạn..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isProcessing}
            >
              Hủy
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedRequest && handleProcessRequest(selectedRequest.maYeuCau, 'REJECTED')}
              disabled={isProcessing}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              <ThumbsDown className="w-4 h-4 mr-1" />
              Từ chối
            </Button>
            <Button
              onClick={() => selectedRequest && handleProcessRequest(selectedRequest.maYeuCau, 'APPROVED')}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <ThumbsUp className="w-4 h-4 mr-1" />
              {isProcessing ? 'Đang xử lý...' : 'Phê duyệt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 