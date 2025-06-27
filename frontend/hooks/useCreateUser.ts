// hooks/useCreateUser.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "@/lib/api/users";

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
};
