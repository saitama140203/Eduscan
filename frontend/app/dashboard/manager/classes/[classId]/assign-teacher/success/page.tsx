'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowLeft, Home, Users, Mail, Phone, Calendar, Award, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AssignTeacherSuccessPage({ 
  params 
}: { 
  params: Promise<{ classId: string }> 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classId, setClassId] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Mock data hoặc từ URL params
  const assignmentData = {
    teacherName: searchParams.get('teacherName') || 'Nguyễn Văn An',
    className: searchParams.get('className') || '10A1',
    teacherEmail: searchParams.get('teacherEmail') || 'nva@school.edu.vn',
    teacherPhone: searchParams.get('teacherPhone') || '0901234567',
    teacherSubject: searchParams.get('teacherSubject') || 'Toán',
    experience: parseInt(searchParams.get('experience') || '8'),
    assignmentDate: new Date().toLocaleDateString('vi-VN'),
    redirectTo: searchParams.get('redirectTo') || `/dashboard/manager/classes/${classId}`
  };

  useEffect(() => {
    // Get classId from params
    params.then(p => setClassId(p.classId));
    
    // Entrance animation
    setTimeout(() => setIsVisible(true), 100);
  }, [params]);

  useEffect(() => {
    if (!classId) return;

    // Auto redirect countdown
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          router.push(assignmentData.redirectTo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [router, classId, assignmentData.redirectTo]);

  const handleGoToClass = () => {
    router.push(assignmentData.redirectTo);
  };

  // Show loading if classId not yet resolved
  if (!classId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className={`text-center space-y-4 transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
            <div className="relative bg-green-500 rounded-full w-24 h-24 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-12 h-12 text-white animate-bounce" />
            </div>
          </div>

          <div className="text-6xl animate-bounce">🎉</div>
          
          <h1 className="text-4xl font-bold text-green-700 mb-2">
            Phân công thành công!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Giáo viên <span className="font-semibold text-green-600">{assignmentData.teacherName}</span> đã được phân công làm chủ nhiệm lớp <span className="font-semibold text-blue-600">{assignmentData.className}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className={`flex flex-col sm:flex-row gap-4 items-center justify-center transition-all duration-1000 delay-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <Button onClick={handleGoToClass} size="lg" className="w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Về danh sách lớp học
          </Button>
        </div>

        {/* Auto redirect notification */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-amber-800">
                  Tự động chuyển về danh sách lớp học sau {countdown} giây
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleGoToClass}
                className="text-amber-700 hover:text-amber-900"
              >
                Chuyển ngay
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 