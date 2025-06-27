"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState, type ReactNode } from "react"

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cache time: 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests
            retry: (failureCount, error: any) => {
              // Don't retry on AbortError
              if (error?.name === 'AbortError') {
                return false
              }
              // Don't retry on 4xx errors
              if (error?.status >= 400 && error?.status < 500) {
                return false
              }
              // Retry up to 3 times for other errors
              return failureCount < 3
            },
            // Refetch on window focus in production
            refetchOnWindowFocus: process.env.NODE_ENV === "production",
          },
          mutations: {
            // Retry failed mutations once, but not for AbortError
            retry: (failureCount, error: any) => {
              if (error?.name === 'AbortError') {
                return false
              }
              return failureCount < 1
            },
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
