"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useClass, useClassSettings, useUpdateClassSettings } from "@/hooks/useClasses";
import { ClassSettingsUpdate } from "@/lib/api/classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  ArrowLeft, Settings, Save, Users, Bell, Shield, Database, Clock, 
  AlertCircle, CheckCircle2, Zap
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const settingsSchema = z.object({
  maxStudents: z.number().min(1, "Số học sinh tối đa phải lớn hơn 0").max(200, "Số học sinh tối đa không quá 200"),
  allowSelfEnroll: z.boolean(),
  requireApproval: z.boolean(),
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  parentNotifications: z.boolean(),
  autoGrading: z.boolean(),
  passingScore: z.number().min(0, "Điểm đạt phải từ 0").max(10, "Điểm đạt không quá 10"),
  retakeAllowed: z.boolean(),
  maxRetakeAttempts: z.number().min(1, "Số lần thi lại tối đa phải lớn hơn 0").max(10, "Số lần thi lại tối đa không quá 10"),
  showStudentList: z.boolean(),
  showScores: z.boolean(),
  allowStudentComments: z.boolean(),
  dataRetentionDays: z.number().min(30, "Thời gian lưu trữ tối thiểu 30 ngày").max(3650, "Thời gian lưu trữ tối đa 10 năm"),
  backupFrequency: z.string(),
  auditLogging: z.boolean(),
});

export default function AdminClassSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const classId = Number(params.id);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch data
  const { data: classData } = useClass(classId);
  const { data: settings, isLoading: settingsLoading } = useClassSettings(classId);
  const updateSettingsMutation = useUpdateClassSettings();

  const form = useForm<any>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      maxStudents: 30,
      allowSelfEnroll: false,
      requireApproval: true,
      emailNotifications: true,
      smsNotifications: false,
      parentNotifications: true,
      autoGrading: false,
      passingScore: 5.0,
      retakeAllowed: true,
      maxRetakeAttempts: 3,
      showStudentList: true,
      showScores: true,
      allowStudentComments: false,
      dataRetentionDays: 365,
      backupFrequency: "daily",
      auditLogging: true,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const onSubmit = async (values: ClassSettingsUpdate) => {
    try {
      setIsLoading(true);
      await updateSettingsMutation.mutateAsync({ classId, settings: values });
    } catch (error) {
      console.error("Failed to update settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      form.reset(settings);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Đang tải cài đặt...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Cài đặt lớp học</h1>
            <p className="text-gray-600">
              {classData?.tenLop} - Quản lý cài đặt và quyền hạn
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <CardTitle>Cài đặt cơ bản</CardTitle>
              </div>
              <CardDescription>
                Cấu hình các thiết lập cơ bản cho lớp học
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="maxStudents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số học sinh tối đa</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Giới hạn số lượng học sinh có thể tham gia lớp
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passingScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Điểm đạt</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          min="0"
                          max="10"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Điểm tối thiểu để đạt yêu cầu (0-10)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="allowSelfEnroll"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Cho phép tự đăng ký</FormLabel>
                        <FormDescription>
                          Học sinh có thể tự đăng ký vào lớp học
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requireApproval"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Yêu cầu phê duyệt</FormLabel>
                        <FormDescription>
                          Đăng ký vào lớp cần được phê duyệt bởi giáo viên
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <CardTitle>Thông báo</CardTitle>
              </div>
              <CardDescription>
                Cấu hình các loại thông báo cho lớp học
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Thông báo Email</FormLabel>
                      <FormDescription>
                        Gửi thông báo qua email cho học sinh và phụ huynh
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="smsNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Thông báo SMS</FormLabel>
                      <FormDescription>
                        Gửi tin nhắn SMS cho các thông báo quan trọng
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Thông báo phụ huynh</FormLabel>
                      <FormDescription>
                        Gửi thông báo kết quả học tập cho phụ huynh
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Assessment Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <CardTitle>Đánh giá & Kiểm tra</CardTitle>
              </div>
              <CardDescription>
                Cấu hình các thiết lập liên quan đến kiểm tra và đánh giá
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="autoGrading"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Chấm điểm tự động</FormLabel>
                        <FormDescription>
                          Tự động chấm điểm cho các bài kiểm tra trắc nghiệm
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retakeAllowed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Cho phép thi lại</FormLabel>
                        <FormDescription>
                          Học sinh có thể thi lại các bài kiểm tra
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("retakeAllowed") && (
                <FormField
                  control={form.control}
                  name="maxRetakeAttempts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số lần thi lại tối đa</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          max="10"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        Giới hạn số lần một học sinh có thể thi lại
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Privacy & Display Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <CardTitle>Quyền riêng tư & Hiển thị</CardTitle>
              </div>
              <CardDescription>
                Cấu hình quyền truy cập và hiển thị thông tin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="showStudentList"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Hiển thị danh sách học sinh</FormLabel>
                      <FormDescription>
                        Cho phép xem danh sách các học sinh trong lớp
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showScores"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Hiển thị điểm số</FormLabel>
                      <FormDescription>
                        Cho phép học sinh xem điểm của các bài kiểm tra
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowStudentComments"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Cho phép bình luận</FormLabel>
                      <FormDescription>
                        Học sinh có thể bình luận và thảo luận trong lớp
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                <CardTitle>Quản lý dữ liệu</CardTitle>
              </div>
              <CardDescription>
                Cấu hình lưu trữ và bảo mật dữ liệu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="dataRetentionDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thời gian lưu trữ (ngày)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="30"
                          max="3650"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 365)}
                        />
                      </FormControl>
                      <FormDescription>
                        Thời gian lưu trữ dữ liệu trước khi tự động xóa
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="backupFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tần suất sao lưu</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn tần suất" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Hàng ngày</SelectItem>
                          <SelectItem value="weekly">Hàng tuần</SelectItem>
                          <SelectItem value="monthly">Hàng tháng</SelectItem>
                          <SelectItem value="manual">Thủ công</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Tần suất tự động sao lưu dữ liệu lớp học
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="auditLogging"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Ghi nhật ký hoạt động</FormLabel>
                      <FormDescription>
                        Ghi lại tất cả các hoạt động trong lớp học cho mục đích kiểm tra
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={handleReset}>
              Đặt lại
            </Button>
            <Button
              type="submit"
              disabled={isLoading || updateSettingsMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {isLoading || updateSettingsMutation.isPending ? "Đang lưu..." : "Lưu cài đặt"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 