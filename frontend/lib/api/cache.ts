import { QueryClient } from "@tanstack/react-query"

// Create a singleton query client for server-side caching
let queryClient: QueryClient | undefined = undefined

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
        },
      },
    })
  } else {
    // Browser: make a new query client if we don't already have one
    if (!queryClient) {
      queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
          },
        },
      })
    }
    return queryClient
  }
}

// Cache keys factory
export const cacheKeys = {
  users: {
    all: ["users"] as const,
    lists: () => [...cacheKeys.users.all, "list"] as const,
    list: (filters: Record<string, any>) => [...cacheKeys.users.lists(), filters] as const,
    details: () => [...cacheKeys.users.all, "detail"] as const,
    detail: (id: string) => [...cacheKeys.users.details(), id] as const,
  },
  organizations: {
    all: ["organizations"] as const,
    lists: () => [...cacheKeys.organizations.all, "list"] as const,
    list: (filters: Record<string, any>) => [...cacheKeys.organizations.lists(), filters] as const,
    details: () => [...cacheKeys.organizations.all, "detail"] as const,
    detail: (id: string) => [...cacheKeys.organizations.details(), id] as const,
  },
  classes: {
    all: ["classes"] as const,
    lists: () => [...cacheKeys.classes.all, "list"] as const,
    list: (filters: Record<string, any>) => [...cacheKeys.classes.lists(), filters] as const,
    details: () => [...cacheKeys.classes.all, "detail"] as const,
    detail: (id: string) => [...cacheKeys.classes.details(), id] as const,
  },
  exams: {
    all: ["exams"] as const,
    lists: () => [...cacheKeys.exams.all, "list"] as const,
    list: (filters: Record<string, any>) => [...cacheKeys.exams.lists(), filters] as const,
    details: () => [...cacheKeys.exams.all, "detail"] as const,
    detail: (id: string) => [...cacheKeys.exams.details(), id] as const,
  },
} as const

// Cache invalidation helpers
export function invalidateUserCache(queryClient: QueryClient, userId?: string) {
  if (userId) {
    queryClient.invalidateQueries({ queryKey: cacheKeys.users.detail(userId) })
  } else {
    queryClient.invalidateQueries({ queryKey: cacheKeys.users.all })
  }
}

export function invalidateOrganizationCache(queryClient: QueryClient, orgId?: string) {
  if (orgId) {
    queryClient.invalidateQueries({ queryKey: cacheKeys.organizations.detail(orgId) })
  } else {
    queryClient.invalidateQueries({ queryKey: cacheKeys.organizations.all })
  }
}
