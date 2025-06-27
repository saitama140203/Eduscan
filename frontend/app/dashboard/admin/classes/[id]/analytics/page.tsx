"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useClass, useClassAnalytics } from "@/hooks/useClasses";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, TrendingUp, Users, BookOpen, Trophy, AlertTriangle,
  BarChart3, PieChart, Calendar, Download, Filter
} from "lucide-react";
import { ExamStatistic } from "@/lib/api/classes";

export default function AdminClassAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const classId = Number(params.id);

  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedMetric, setSelectedMetric] = useState("average");

  // Fetch data
  const { data: classData, isLoading: classLoading } = useClass(classId);
  const { data: analytics, isLoading: analyticsLoading } = useClassAnalytics(classId, selectedPeriod, selectedMetric);

  const isLoading = classLoading || analyticsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Đang tải dữ liệu phân tích...</p>
        </div>
      </div>
    );
  }

  if (!classData || !analytics) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy dữ liệu</h3>
        <p className="text-gray-500">Lớp học hoặc dữ liệu phân tích không tồn tại.</p>
      </div>
    );
  }

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "down": return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
      default: return <TrendingUp className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case "up": return "text-green-600";
      case "down": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const handleExportReport = () => {
    console.log("Xuất báo cáo analytics");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/admin/classes/${classId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Phân tích lớp học</h1>
            <p className="text-gray-600">{classData.tenLop} - {classData.tenToChuc}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={handleExportReport}>
            <Download className="w-4 h-4" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <CardTitle>Bộ lọc phân tích</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Khoảng thời gian</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="semester1">Học kỳ 1</SelectItem>
                  <SelectItem value="semester2">Học kỳ 2</SelectItem>
                  <SelectItem value="recent">Gần đây</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Chỉ số</label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="average">Điểm trung bình</SelectItem>
                  <SelectItem value="pass_rate">Tỷ lệ đậu</SelectItem>
                  <SelectItem value="participation">Tỷ lệ tham gia</SelectItem>
                  <SelectItem value="improvement">Xu hướng cải thiện</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng học sinh</p>
                <p className="text-3xl font-bold text-blue-600">{analytics.totalStudents}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Học sinh hoạt động</p>
                <p className="text-3xl font-bold text-green-600">{analytics.activeStudents}</p>
              </div>
              <BookOpen className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Điểm TB chung</p>
                <p className="text-3xl font-bold text-orange-600">{analytics.overallAverage}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng số bài thi</p>
                <p className="text-3xl font-bold text-purple-600">{analytics.totalExams}</p>
              </div>
              <Trophy className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best & Worst Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-600" />
              Bài thi tốt nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.bestExam ? (
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{analytics.bestExam.tenKyThi}</h4>
                    <p className="text-sm text-gray-600">{analytics.bestExam.ngayThi}</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-50 text-green-700">
                    {analytics.bestExam.diemTrungBinh.toFixed(1)}/10
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Tham gia</p>
                    <p className="font-medium">{analytics.bestExam.soLuongHocSinh} học sinh</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Điểm cao nhất</p>
                    <p className="font-medium">{analytics.bestExam.diemCao}/10</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Bài thi cần cải thiện
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.worstExam ? (
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{analytics.worstExam.tenKyThi}</h4>
                    <p className="text-sm text-gray-600">{analytics.worstExam.ngayThi}</p>
                  </div>
                  <Badge variant="secondary" className="bg-red-50 text-red-700">
                    {analytics.worstExam.diemTrungBinh.toFixed(1)}/10
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Tham gia</p>
                    <p className="font-medium">{analytics.worstExam.soLuongHocSinh} học sinh</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Điểm thấp nhất</p>
                    <p className="font-medium">{analytics.worstExam.diemThap}/10</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Exam Trend Table */}
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng kết quả các bài thi</CardTitle>
          <CardDescription>
            Chi tiết kết quả từng bài kiểm tra theo thời gian
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.examTrend.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên bài thi</TableHead>
                  <TableHead>Ngày thi</TableHead>
                  <TableHead>Học sinh tham gia</TableHead>
                  <TableHead>Điểm TB</TableHead>
                  <TableHead>Cao nhất</TableHead>
                  <TableHead>Thấp nhất</TableHead>
                  <TableHead>Xu hướng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.examTrend.map((exam: ExamStatistic) => (
                  <TableRow key={exam.maKyThi}>
                    <TableCell className="font-medium">{exam.tenKyThi}</TableCell>
                    <TableCell>{exam.ngayThi}</TableCell>
                    <TableCell>{exam.soLuongHocSinh}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        exam.diemTrungBinh >= 8 ? "border-green-200 text-green-700" :
                        exam.diemTrungBinh >= 6.5 ? "border-orange-200 text-orange-700" :
                        "border-red-200 text-red-700"
                      }>
                        {exam.diemTrungBinh.toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{exam.diemCao.toFixed(1)}</TableCell>
                    <TableCell>{exam.diemThap.toFixed(1)}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${getTrendColor(exam.trend)}`}>
                        {getTrendIcon(exam.trend)}
                        <span className="text-sm font-medium">
                          {exam.trend === "up" ? "Tăng" : 
                           exam.trend === "down" ? "Giảm" : "Ổn định"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có dữ liệu bài thi</h3>
              <p className="text-gray-500">Lớp học này chưa có bài kiểm tra nào.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 