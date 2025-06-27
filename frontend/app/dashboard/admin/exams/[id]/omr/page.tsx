'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Target, FileSpreadsheet, BarChart3, Users } from 'lucide-react';
import { toast } from 'sonner';
import ExamOMRProcessor from '@/components/omr/ExamOMRProcessor';

interface Exam {
  maKyThi: number;
  tenKyThi: string;
  moTa: string;
  trangThai: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  toChuc: {
    tenToChuc: string;
  };
}

interface ClassRoom {
  maLopHoc: number;
  tenLopHoc: string;
  soLuongHocSinh: number;
}

export default function ExamOMRPage() {
  const params = useParams();
  const router = useRouter();
  const examId = parseInt(params.id as string);

  const [exam, setExam] = useState<Exam | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExamData();
    loadClasses();
  }, [examId]);

  const loadExamData = async () => {
    try {
      const response = await fetch(`/api/v1/exams/${examId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setExam(data);
      } else {
        toast.error('Không thể tải thông tin kỳ thi');
        router.push('/dashboard/admin/exams');
      }
    } catch (error) {
      console.error('Error loading exam:', error);
      toast.error('Có lỗi xảy ra khi tải thông tin kỳ thi');
    }
  };

  const loadClasses = async () => {
    try {
      const response = await fetch(`/api/v1/exams/${examId}/classes`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportAllResults = async () => {
    try {
      const url = `/api/v1/omr/export-excel/${examId}`;
      const response = await fetch(url, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `ket_qua_thi_${exam?.tenKyThi}_${examId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Đã xuất toàn bộ kết quả ra Excel');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Có lỗi xảy ra khi xuất file Excel');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy kỳ thi</p>
        <Button 
          onClick={() => router.push('/dashboard/admin/exams')} 
          className="mt-4"
        >
          Quay lại danh sách kỳ thi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/admin/exams')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{exam.tenKyThi}</h1>
            <p className="text-gray-600">Xử lý OMR và chấm điểm tự động</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={exam.trangThai === 'ACTIVE' ? 'default' : 'secondary'}>
            {exam.trangThai}
          </Badge>
          <Button onClick={exportAllResults}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Xuất toàn bộ kết quả
          </Button>
        </div>
      </div>

      {/* Exam Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Thông tin kỳ thi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Tên kỳ thi</p>
              <p className="font-medium">{exam.tenKyThi}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ngày bắt đầu</p>
              <p className="font-medium">{new Date(exam.ngayBatDau).toLocaleDateString('vi-VN')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ngày kết thúc</p>
              <p className="font-medium">{new Date(exam.ngayKetThuc).toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
          {exam.moTa && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Mô tả</p>
              <p className="text-sm">{exam.moTa}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Tất cả học sinh
          </TabsTrigger>
          {classes.map(classRoom => (
            <TabsTrigger key={classRoom.maLopHoc} value={`class-${classRoom.maLopHoc}`}>
              {classRoom.tenLopHoc}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All Students */}
        <TabsContent value="all" className="space-y-4">
          <ExamOMRProcessor
            examId={examId}
            templateId={1} // Default template, sẽ có thể chọn trong component
            examName={exam.tenKyThi}
          />
        </TabsContent>

        {/* Individual Classes */}
        {classes.map(classRoom => (
          <TabsContent key={classRoom.maLopHoc} value={`class-${classRoom.maLopHoc}`} className="space-y-4">
            <ExamOMRProcessor
              examId={examId}
              templateId={1} // Default template
              classId={classRoom.maLopHoc}
              examName={exam.tenKyThi}
              className={classRoom.tenLopHoc}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Stats */}
      {classes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Tổng quan lớp học
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {classes.map(classRoom => (
                <div key={classRoom.maLopHoc} className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{classRoom.soLuongHocSinh}</div>
                  <div className="text-sm text-gray-500">{classRoom.tenLopHoc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Hướng dẫn sử dụng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-gray-600">
            <p><strong>Bước 1:</strong> Chọn template phù hợp với định dạng bài thi</p>
            <p><strong>Bước 2:</strong> Upload ảnh bài thi (có thể chọn nhiều ảnh cùng lúc)</p>
            <p><strong>Bước 3:</strong> Bấm "Bắt đầu xử lý" để chấm điểm tự động</p>
            <p><strong>Bước 4:</strong> Hệ thống sẽ tự động khớp số báo danh (6 số cuối của mã học sinh)</p>
            <p><strong>Bước 5:</strong> Xuất kết quả ra file Excel để lưu trữ và báo cáo</p>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Lưu ý:</strong> Số báo danh được khớp dựa trên 6 số cuối của mã học sinh trong hệ thống. 
              Đảm bảo học sinh đã điền đúng số báo danh trên phiếu thi.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 