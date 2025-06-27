"use client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export function DeactivateUserDialog({
  open,
  onOpenChange,
  user,
  onDeactivate,
  loading = false,
}) {
  // Không có user thì không render (tránh lỗi khi user bị null)
  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bạn có chắc chắn muốn vô hiệu hóa người dùng?</AlertDialogTitle>
          <AlertDialogDescription>
            Người dùng <span className="font-semibold text-blue-700">{user.email}</span> sẽ không đăng nhập được nữa.<br />
            Bạn có thể kích hoạt lại bất cứ lúc nào.<br />
            Hành động này <span className="text-orange-700 font-semibold">không xóa dữ liệu</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={onDeactivate} disabled={loading}>
            {loading ? "Đang vô hiệu..." : "Xác nhận vô hiệu hóa"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
