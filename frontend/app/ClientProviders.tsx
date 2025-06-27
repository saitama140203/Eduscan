"use client"

import { ReactNode, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/contexts/authContext"
import { AnalyticsProvider } from "@/providers/analytics-provider"
import { ThemeProvider } from "@/components/theme-provider"
// ...import các provider khác nếu cần

export default function ClientProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15,
        refetchOnWindowFocus: false,
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        placeholderData: (previousData: unknown) => previousData,
      },
      mutations: {
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AnalyticsProvider>
          <ThemeProvider {...{attribute:"class", defaultTheme:"light", enableSystem:true, disableTransitionOnChange:true} as any}>
            {children}
          </ThemeProvider>
        </AnalyticsProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
