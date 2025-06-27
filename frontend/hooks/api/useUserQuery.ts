import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, UserUpdate, UserCreate } from '@/lib/api/users'

const CACHE_TIME = 1000 * 60 * 10 // 10 phút
const STALE_TIME = 1000 * 60 * 5 // 5 phút

export function useUsers(params: { skip?: number; limit?: number } = {}) {
  const { skip = 0, limit = 100 } = params
  return useQuery({
    queryKey: ['users', skip, limit],
    queryFn: () => usersApi.getUsers(skip, limit),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    placeholderData: (previousData) => previousData,
  })
}

export function useUsersByOrganization(orgId: number, params: { skip?: number; limit?: number } = {}) {
  const { skip = 0, limit = 100 } = params
  return useQuery({
    queryKey: ['users', 'organization', orgId, skip, limit],
    queryFn: () => usersApi.getUsersByOrganization(orgId, skip, limit),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!orgId,
    placeholderData: (previousData) => previousData,
  })
}

export function useTeachers(params: { orgId?: number; skip?: number; limit?: number } = {}) {
  const { orgId, skip = 0, limit = 100 } = params
  return useQuery({
    queryKey: ['users', 'teachers', orgId, skip, limit],
    queryFn: () => usersApi.getTeachers(orgId, skip, limit),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    placeholderData: (previousData) => previousData,
  })
}

export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => (userId ? usersApi.getUser(userId) : null),
    enabled: !!userId,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: UserCreate) => usersApi.createUser(data),
    onSuccess: () => {
      // Cập nhật cache khi mutation thành công
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserUpdate }) => 
      usersApi.updateUser(userId, data),
    onSuccess: (data, variables) => {
      // Cập nhật cache khi mutation thành công
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] })
    }
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (userId: string) => usersApi.deleteUser(userId),
    onSuccess: () => {
      // Cập nhật cache khi mutation thành công
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}
