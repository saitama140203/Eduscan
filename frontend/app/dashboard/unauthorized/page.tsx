'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Không có quyền truy cập</CardTitle>
          <CardDescription className="text-base">
            Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên để được cấp quyền.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => router.back()} 
            variant="outline" 
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại trang trước
          </Button>
          
          <Link href="/dashboard">
            <Button className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Về trang chủ
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
