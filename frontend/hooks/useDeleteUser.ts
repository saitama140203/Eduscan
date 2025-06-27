// hooks/useDeleteUser.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUser } from "@/lib/api/users";

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
};
