'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Search, UserCheck, Users, GraduationCap, Clock, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { SuccessNotification } from '@/components/ui/success-notification';
import { NotificationSettings, type NotificationMode } from '@/components/ui/notification-settings';
import { useManagerClasses, useManagerClass, useAvailableTeachers, useAssignTeacher } from '@/hooks/useManagerClasses';
import { TeacherAssignment } from '@/lib/api/manager-classes';
import Link from 'next/link';

// Types
interface ClassInfo {
  maLopHoc: number;
  tenLop: string;
  capHoc?: string;
  namHoc?: string;
  maGiaoVienChuNhiem?: number;
  tenGiaoVienChuNhiem?: string;
  moTa?: string;
  total_students?: number;
  trangThai: boolean;
}

export default function AssignTeacherPage({ params }: { params: Promise<{ classId: string }> }) {
  return <AssignTeacherContent params={params} />;
}

function AssignTeacherContent({ params }: { params: Promise<{ classId: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [classId, setClassId] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [assignedTeacher, setAssignedTeacher] = useState<TeacherAssignment | null>(null);
  
  // Notification settings
  const [notificationMode, setNotificationMode] = useState<NotificationMode>('popup');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  
  const debouncedSearch = useDebounce(search, 300);

  // Resolve params in useEffect
  useEffect(() => {
    params.then(p => setClassId(p.classId));
  }, [params]);

  // API hooks
  const { data: classData, isLoading: classLoading, error: classError } = useManagerClass(
    classId ? parseInt(classId) : 0
  );
  
  const { data: teachersData = [], isLoading: teachersLoading, error: teachersError } = useAvailableTeachers();

  // Transform teachers data and filter
  const teachers = teachersData || [];
  const filteredTeachers = teachers.filter(teacher => 
    teacher.tenGiaoVien.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    teacher.subject.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    teacher.email.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // Assign teacher mutation with custom success handler
  const assignTeacherMutation = useAssignTeacher((data, classId) => {
    const teacher = teachers.find(t => t.maGiaoVien.toString() === selectedTeacher);
    if (teacher) {
      // Handle different notification modes
      switch (notificationMode) {
        case 'popup':
          setAssignedTeacher(teacher);
          setShowSuccess(true);
          break;
          
        case 'page':
          const searchParams = new URLSearchParams({
            teacherName: teacher.tenGiaoVien,
            className: classData?.tenLop || '',
            teacherEmail: teacher.email,
            teacherPhone: teacher.soDienThoai || '',
            teacherSubject: teacher.subject,
            experience: teacher.experience.toString(),
            redirectTo: '/dashboard/manager/classes'
          });
          router.push(`/dashboard/manager/classes/${classId}/assign-teacher/success?${searchParams.toString()}`);
          break;
          
        case 'both':
          // Show popup first
          setAssignedTeacher(teacher);
          setShowSuccess(true);
          // Then redirect after popup auto-closes
          setTimeout(() => {
            const searchParams = new URLSearchParams({
              teacherName: teacher.tenGiaoVien,
              className: classData?.tenLop || '',
              teacherEmail: teacher.email,
              teacherPhone: teacher.soDienThoai || '',
              teacherSubject: teacher.subject,
              experience: teacher.experience.toString(),
              redirectTo: '/dashboard/manager/classes'
            });
            router.push(`/dashboard/manager/classes/${classId}/assign-teacher/success?${searchParams.toString()}`);
          }, 4000);
          break;
      }
    }
  });

  const handleAssign = async () => {
    if (!selectedTeacher) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn giáo viên để phân công.",
        variant: "destructive",
      });
      return;
    }

    if (!classId) {
      toast({
        title: "Lỗi", 
        description: "Không tìm thấy thông tin lớp học.",
        variant: "destructive",
      });
      return;
    }

    assignTeacherMutation.mutate({
      classId: parseInt(classId),
      teacherId: parseInt(selectedTeacher)
    });
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    // Only redirect if not using 'both' mode (which handles redirect separately)
    if (notificationMode === 'popup') {
      router.push(`/dashboard/manager/classes`);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/manager/classes`);
  };

  // Show loading if classId not yet resolved
  if (!classId) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show loading states
  if (classLoading || teachersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/manager/classes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Về danh sách lớp học
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Phân công giáo viên chủ nhiệm</h1>
            <p className="text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Show error states
  if (classError || teachersError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/manager/classes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Về danh sách lớp học
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Phân công giáo viên chủ nhiệm</h1>
            <p className="text-muted-foreground text-red-600">
              Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {showSuccess && assignedTeacher && classData && (
        <SuccessNotification
          title="Phân công thành công! 🎉"
          message={`Đã phân công ${assignedTeacher.tenGiaoVien} làm chủ nhiệm lớp ${classData.tenLop}. Giáo viên sẽ nhận được thông báo qua email.`}
          onClose={handleSuccessClose}
          autoClose={true}
          autoCloseDelay={notificationMode === 'both' ? 4000 : 3000}
          showGif={true}
        />
      )}

      {/* Notification Settings */}
      <NotificationSettings
        currentMode={notificationMode}
        onModeChange={setNotificationMode}
        isOpen={showNotificationSettings}
        onOpenChange={setShowNotificationSettings}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/manager/classes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Về danh sách lớp học
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Phân công giáo viên chủ nhiệm</h1>
            <p className="text-muted-foreground">
              Chọn giáo viên chủ nhiệm cho lớp {classData?.tenLop || 'N/A'}
            </p>
          </div>
        </div>
        
        {/* Settings button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNotificationSettings(true)}
        >
          <Settings className="mr-2 h-4 w-4" />
          Cài đặt thông báo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Tìm kiếm giáo viên</CardTitle>
              <CardDescription>
                Tìm kiếm theo tên, môn học hoặc email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm giáo viên..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  disabled={assignTeacherMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* Teachers List */}
          <Card>
            <CardHeader>
              <CardTitle>Danh sách giáo viên</CardTitle>
              <CardDescription>
                Hiển thị {filteredTeachers.length} / {teachers.length} giáo viên
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={selectedTeacher} 
                onValueChange={setSelectedTeacher} 
                disabled={assignTeacherMutation.isPending}
              >
                <div className="space-y-4">
                  {filteredTeachers.map((teacher) => (
                    <div
                      key={teacher.maGiaoVien}
                      className={`border rounded-lg p-4 transition-colors ${
                        selectedTeacher === teacher.maGiaoVien.toString()
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      } ${!teacher.available ? 'opacity-60' : ''} ${
                        assignTeacherMutation.isPending ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value={teacher.maGiaoVien.toString()} 
                          id={`teacher-${teacher.maGiaoVien}`}
                          disabled={!teacher.available || assignTeacherMutation.isPending}
                        />
                        <Label 
                          htmlFor={`teacher-${teacher.maGiaoVien}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <UserCheck className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{teacher.tenGiaoVien}</h3>
                                  {!teacher.available && (
                                    <Badge variant="secondary">Bận</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{teacher.email}</p>
                                <div className="flex items-center gap-4 mt-1">
                                  <div className="flex items-center gap-1">
                                    <GraduationCap className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">{teacher.subject}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">{teacher.experience} năm kinh nghiệm</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">
                                Đang chủ nhiệm: {teacher.currentClasses}/{teacher.maxClasses ?? 3} lớp
                              </div>
                              {teacher.soDienThoai && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  📞 {teacher.soDienThoai}
                                </div>
                              )}
                            </div>
                          </div>
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              {filteredTeachers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Không tìm thấy giáo viên
                  </h3>
                  <p className="text-muted-foreground">
                    {teachers.length === 0 ? 'Chưa có giáo viên nào trong hệ thống' : 'Thử thay đổi từ khóa tìm kiếm'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleAssign} 
              disabled={!selectedTeacher || assignTeacherMutation.isPending}
            >
              {assignTeacherMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                  Đang phân công...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Phân công
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancel} 
              disabled={assignTeacherMutation.isPending}
            >
              Hủy
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Class Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin lớp học</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Tên lớp</Label>
                <p className="font-medium">{classData?.tenLop || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Cấp học</Label>
                <p className="font-medium">{classData?.capHoc || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Năm học</Label>
                <p className="font-medium">{classData?.namHoc || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Số học sinh</Label>
                <p className="font-medium">{classData?.total_students || 0} học sinh</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">GVCN hiện tại</Label>
                <p className="font-medium text-orange-600">
                  {classData?.tenGiaoVienChuNhiem || "Chưa phân công"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Current notification mode */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg text-blue-800">📝 Cài đặt hiện tại</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {notificationMode === 'popup' && <Badge className="bg-blue-100 text-blue-800">Popup</Badge>}
                {notificationMode === 'page' && <Badge className="bg-green-100 text-green-800">Trang success</Badge>}
                {notificationMode === 'both' && <Badge className="bg-purple-100 text-purple-800">Cả hai</Badge>}
                <span className="text-sm text-blue-700">
                  {notificationMode === 'popup' && 'Hiển thị popup thông báo'}
                  {notificationMode === 'page' && 'Chuyển đến trang success'}
                  {notificationMode === 'both' && 'Popup + trang success'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Success Preview */}
          {selectedTeacher && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg text-green-800">✨ Sẵn sàng phân công</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const teacher = teachers.find(t => t.maGiaoVien.toString() === selectedTeacher);
                  return teacher ? (
                    <div className="space-y-2">
                      <p className="font-medium text-green-700">{teacher.tenGiaoVien}</p>
                      <p className="text-sm text-green-600">Môn: {teacher.subject}</p>
                      <p className="text-sm text-green-600">
                        {teacher.experience} năm kinh nghiệm
                      </p>
                      <p className="text-sm text-green-600">
                        Đang chủ nhiệm: {teacher.currentClasses}/{teacher.maxClasses ?? 3} lớp
                      </p>
                    </div>
                  ) : null;
                })()}
              </CardContent>
            </Card>
          )}

          {/* Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hướng dẫn phân công</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium">Kiểm tra khả năng</p>
                  <p className="text-sm text-muted-foreground">
                    Chọn giáo viên có thời gian và kinh nghiệm phù hợp
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-medium">Cân nhắc tải công việc</p>
                  <p className="text-sm text-muted-foreground">
                    Giáo viên đã chủ nhiệm nhiều lớp có thể ảnh hưởng chất lượng
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">3</span>
                </div>
                <div>
                  <p className="font-medium">Thông báo cho giáo viên</p>
                  <p className="text-sm text-muted-foreground">
                    Hệ thống sẽ tự động gửi thông báo đến giáo viên được chọn
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-lg text-amber-800">⚠️ Lưu ý</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-amber-700">
                <li>• Giáo viên sẽ nhận thông báo qua email</li>
                <li>• Có thể thay đổi GVCN bất kỳ lúc nào</li>
                <li>• Giáo viên bận có thể từ chối nhận lớp</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
