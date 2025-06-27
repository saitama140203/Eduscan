'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { classesApi, Class } from '@/lib/api/classes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Users, Eye, Calendar, User, Hash, FileText, Clock } from 'lucide-react';
import Link from 'next/link';

interface ClassDetailProps {
  params: Promise<{ classId: string }>;
}

const InfoItem = ({ icon: Icon, label, value, variant }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | React.ReactNode;
  variant?: 'default' | 'muted';
}) => (
  <div className={`flex items-start gap-3 ${variant === 'muted' ? 'text-muted-foreground' : ''}`}>
    <Icon className="h-4 w-4 mt-1 flex-shrink-0" />
    <div className="min-w-0 flex-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-5 w-32" />
    </div>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 mt-1" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 mt-1" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <div className="text-6xl">📚</div>
    <h2 className="text-xl font-semibold text-muted-foreground">{message}</h2>
    <Button variant="outline" asChild>
      <Link href="/dashboard/teacher/classes">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Về danh sách lớp
      </Link>
    </Button>
  </div>
);

export default function TeacherClassDetailPage({ params }: ClassDetailProps) {
  const router = useRouter();
  
  // Use React.use() to unwrap the promise
  const { classId: classIdParam } = React.use(params);
  const classId = Number(classIdParam);

  const [classDetail, setClassDetail] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId || isNaN(classId)) {
      setError('ID lớp học không hợp lệ');
      setLoading(false);
      return;
    }

    let ignore = false;
    
    const fetchClassDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await classesApi.getClass(classId);
        if (!ignore) {
          setClassDetail(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to fetch class detail:', err);
          setError('Không thể tải thông tin lớp học');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchClassDetail();
    
    return () => { ignore = true; };
  }, [classId]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: boolean) => (
    <Badge variant={status ? 'default' : 'destructive'} className="ml-2">
      {status ? 'Đang hoạt động' : 'Đã khóa'}
    </Badge>
  );

  if (loading) return <LoadingSkeleton />;
  if (error || !classDetail) return <ErrorState message={error || 'Không tìm thấy lớp học'} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button variant="outline" size="sm" asChild className="self-start">
          <Link href="/dashboard/teacher/classes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Về danh sách lớp
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
            Lớp {classDetail.tenLop}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{classDetail.capHoc}</Badge>
            <span className="text-sm text-muted-foreground">
              Năm học: {classDetail.namHoc}
            </span>
          </div>
        </div>
      </div>

      {/* Class Information Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Thông tin lớp học
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <InfoItem
                icon={Hash}
                label="Mã lớp học"
                value={classDetail.maLopHoc}
              />
              <InfoItem
                icon={User}
                label="Giáo viên chủ nhiệm"
                value={classDetail.tenGiaoVienChuNhiem || '—'}
              />
              <InfoItem
                icon={Users}
                label="Số học sinh"
                value={
                  <div className="flex items-center gap-2">
                    <span>{classDetail.total_students ?? 0}</span>
                    <Badge variant="outline" className="text-xs">
                      học sinh
                    </Badge>
                  </div>
                }
              />
              <InfoItem
                icon={FileText}
                label="Trạng thái"
                value={getStatusBadge(classDetail.trangThai)}
              />
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <InfoItem
                icon={FileText}
                label="Mô tả"
                value={classDetail.moTa || '—'}
                variant={classDetail.moTa ? 'default' : 'muted'}
              />
              <InfoItem
                icon={Clock}
                label="Ngày tạo"
                value={formatDate(classDetail.thoiGianTao)}
              />
              <InfoItem
                icon={Clock}
                label="Cập nhật lần cuối"
                value={formatDate(classDetail.thoiGianCapNhat)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Thao tác nhanh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Quản lý học sinh
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Xem bài tập
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Lịch học
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
