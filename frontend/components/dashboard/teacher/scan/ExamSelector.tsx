"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, CheckCircle, AlertCircle, Target } from 'lucide-react';
import clsx from 'clsx';
import type { Exam } from "@/lib/api/exams";
import { Skeleton } from '@/components/ui/skeleton';

export const ExamSelector = ({ exams, selectedExam, onSelect, isLoading }: { 
  exams: Exam[] | undefined; 
  selectedExam: Exam | null; 
  onSelect: (exam: Exam) => void; 
  isLoading: boolean 
}) => {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (!exams || exams.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>2. Chọn bài thi</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Lớp này chưa có bài thi nào được giao.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                <CardTitle>2. Chọn bài thi</CardTitle>
                <p className="text-sm text-muted-foreground">Lựa chọn đề thi cần chấm điểm</p>
                </div>
            </div>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.map((exam) => (
                <div key={exam.maBaiKiemTra} className={clsx(
                    "p-4 rounded-lg border transition-all duration-200 cursor-pointer group",
                    "hover:shadow-md hover:border-green-300",
                    selectedExam?.maBaiKiemTra === exam.maBaiKiemTra 
                    ? "border-green-500 bg-green-50 shadow-md" 
                    : "border-gray-200 hover:bg-gray-50"
                )} onClick={() => onSelect(exam)}>
                    <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                        <h3 className={clsx(
                            "font-semibold transition-colors",
                            selectedExam?.maBaiKiemTra === exam.maBaiKiemTra 
                            ? "text-green-900" 
                            : "text-gray-900"
                        )}>
                            {exam.tieuDe}
                        </h3>
                        <Badge className={clsx(
                            selectedExam?.maBaiKiemTra === exam.maBaiKiemTra 
                            ? "bg-green-600 text-white" 
                            : "bg-gray-100 text-gray-700"
                        )}>
                            {exam.tongSoCau} câu
                        </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{exam.moTa || 'Không có mô tả'}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(exam.thoiGianTao).toLocaleDateString('vi-VN')}
                        </span>
                        <span className={clsx(
                            "flex items-center gap-1",
                            exam.trangThai === 'xuatBan' ? "text-green-600" : "text-red-600"
                        )}>
                            {exam.trangThai === 'xuatBan' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {exam.trangThai === 'xuatBan' ? "Sẵn sàng" : "Nháp"}
                        </span>
                        </div>
                    </div>
                    <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                        selectedExam?.maBaiKiemTra === exam.maBaiKiemTra 
                        ? "bg-green-600 text-white scale-110" 
                        : "bg-gray-100 text-gray-400 group-hover:bg-green-100 group-hover:text-green-600"
                    )}>
                        <Target className="w-4 h-4" />
                    </div>
                    </div>
                </div>
                ))}
            </div>
            </CardContent>
        </Card>
    )
} 