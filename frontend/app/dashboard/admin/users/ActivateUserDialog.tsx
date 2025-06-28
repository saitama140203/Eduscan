"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { User } from "@/hooks/use-users";

interface ActivateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onActivate: () => void;
  loading?: boolean;
}

// Thêm prop user (có thể null)
export function ActivateUserDialog({ open, onOpenChange, user, onActivate, loading = false }: ActivateUserDialogProps) {
  // Nếu không có user thì không render (bảo vệ lỗi hydration)
  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kích hoạt lại người dùng?</AlertDialogTitle>
          <AlertDialogDescription>
            {`Bạn muốn kích hoạt lại tài khoản `}
            <span className="font-semibold text-blue-700">{user.email}</span>
            {` để người dùng có thể đăng nhập và sử dụng hệ thống?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={onActivate} disabled={loading}>
            {loading ? "Đang kích hoạt..." : "Kích hoạt lại"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
