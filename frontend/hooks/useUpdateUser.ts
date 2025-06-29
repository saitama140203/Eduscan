// hooks/useUpdateUser.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users";

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: any }) =>
      usersApi.updateUser(userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
};
