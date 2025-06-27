'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Gọi API thực để gửi yêu cầu reset password
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Có lỗi xảy ra khi gửi yêu cầu');
      }

      setIsSubmitted(true);
    } catch (error: unknown) {
      console.error('Forgot password error:', error);
      
      // Xử lý các loại lỗi khác nhau
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      if (errorMessage.includes('fetch')) {
        setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet và thử lại.');
      } else {
        setError(errorMessage || 'Có lỗi xảy ra. Vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-green-800">Yêu cầu đã được gửi</CardTitle>
            <CardDescription>
              Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu của bạn. 
              Admin sẽ xem xét và phản hồi sớm nhất có thể.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <strong>Email đã gửi:</strong> {email}
              </AlertDescription>
            </Alert>
            
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
              <p className="font-medium mb-1">Các bước tiếp theo:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Admin sẽ xem xét yêu cầu của bạn</li>
                <li>Nếu được chấp thuận, mật khẩu sẽ được reset về "123456"</li>
                <li>Bạn có thể đăng nhập bằng mật khẩu mới và đổi lại</li>
              </ul>
            </div>
            
            <Link href="/auth/login">
              <Button className="w-full" variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại đăng nhập
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Quên mật khẩu</CardTitle>
          <CardDescription>
            Nhập email của bạn để gửi yêu cầu đặt lại mật khẩu cho admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Nhập email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md">
              <p className="font-medium mb-1">Lưu ý:</p>
              <p className="text-xs">
                Yêu cầu sẽ được gửi đến admin để xem xét. 
                Admin có quyền chấp thuận hoặc từ chối yêu cầu của bạn.
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu'}
            </Button>
            
            <Link href="/auth/login">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại đăng nhập
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
