"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Users } from "lucide-react"
import Link from "next/link"
import { examsApi, Exam } from "@/lib/api/exams"
import { classesApi, Class } from "@/lib/api/classes"
import { Label } from "@/components/ui/label"

// API Functions
const fetchExamDetails = (examId: number) => examsApi.getExamById(examId);
const fetchTeacherClasses = () => classesApi.getClasses();
const fetchAssignedClasses = (examId: number) => examsApi.getAssignedClasses(examId);
const assignClassesToExam = (params: { examId: number; classIds: number[] }) => examsApi.assignToClasses(params.examId, params.classIds);

export default function AssignExamPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const examId = Number(params.examId);

  const [selectedClasses, setSelectedClasses] = useState<Set<number>>(new Set());

  const { data: exam, isLoading: isLoadingExam } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => fetchExamDetails(examId),
    enabled: !!examId,
  });

  const { data: allClasses, isLoading: isLoadingClasses } = useQuery({
    queryKey: ['teacherClasses'],
    queryFn: fetchTeacherClasses,
  });

  const { data: initiallyAssignedClasses, isLoading: isLoadingAssigned } = useQuery({
    queryKey: ['assignedClasses', examId],
    queryFn: () => fetchAssignedClasses(examId),
    enabled: !!examId,
  });

  useEffect(() => {
    if (initiallyAssignedClasses) {
      const initialIds = new Set(initiallyAssignedClasses.map((c: any) => c.class_id));
      setSelectedClasses(initialIds);
    }
  }, [initiallyAssignedClasses]);

  const mutation = useMutation({
    mutationFn: assignClassesToExam,
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã cập nhật danh sách lớp cho bài thi.",
      });
      queryClient.invalidateQueries({ queryKey: ['assignedClasses', examId] });
      router.push(`/dashboard/teacher/exams/${examId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: `Không thể gán lớp: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleToggleClass = (classId: number) => {
    setSelectedClasses(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(classId)) {
        newSelection.delete(classId);
      } else {
        newSelection.add(classId);
      }
      return newSelection;
    });
  };

  const handleSubmit = () => {
    mutation.mutate({ examId, classIds: Array.from(selectedClasses) });
  };

  const isLoading = isLoadingExam || isLoadingClasses || isLoadingAssigned;

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/teacher/exams/${examId}`}><Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Quay lại</Button></Link>
        <div>
          <h1 className="text-3xl font-bold">Gán bài thi cho lớp học</h1>
          {isLoadingExam ? <Skeleton className="h-5 w-64 mt-1" /> : <p className="text-muted-foreground">Bài thi: <span className="font-semibold text-primary">{exam?.tieuDe}</span></p>}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Chọn lớp học</CardTitle>
          <CardDescription>Chọn một hoặc nhiều lớp học để giao bài thi này.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="space-y-4">
              {allClasses && allClasses.map((cls: Class) => (
                <div key={cls.maLopHoc} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => handleToggleClass(cls.maLopHoc)}>
                  <Checkbox id={`class-${cls.maLopHoc}`} checked={selectedClasses.has(cls.maLopHoc)} onCheckedChange={() => handleToggleClass(cls.maLopHoc)} />
                  <Label htmlFor={`class-${cls.maLopHoc}`} className="text-base font-medium cursor-pointer flex-1">{cls.tenLop}</Label>
                  <div className="flex items-center text-sm text-muted-foreground"><Users className="mr-2 h-4 w-4" />{cls.total_students ?? 0} học sinh</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-6 flex justify-end gap-4">
        <Button variant="outline" asChild><Link href={`/dashboard/teacher/exams/${examId}`}>Hủy</Link></Button>
        <Button onClick={handleSubmit} disabled={mutation.isPending}><Save className="mr-2 h-4 w-4" />{mutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}</Button>
      </div>
    </div>
  )
}
