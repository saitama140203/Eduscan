// hooks/useUpdateUser.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "@/lib/api/users";

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: any }) =>
      updateUser(userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
};
