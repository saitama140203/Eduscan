"use client"
import { createContext, useContext, useEffect, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { analytics, trackWebVitals } from "@/lib/monitoring/analytics"
import { errorTracker } from "@/lib/monitoring/error-tracking"
import type { User } from "@/contexts/authContext"

interface AnalyticsContextType {
  trackEvent: (action: string, category: string, label?: string, value?: number) => void
  trackUserAction: (action: string, details?: Record<string, any>) => void
  trackError: (error: Error, context?: string) => void
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined)

export function AnalyticsProvider({ children, user }: { children: ReactNode, user?: User | null }) {
  const pathname = usePathname()

  // Track page views
  useEffect(() => {
    analytics.pageView(pathname)
  }, [pathname])

  // Set user ID for error tracking
  useEffect(() => {
    if (user?.id) {
      errorTracker.setUserId(user.id)
    }
  }, [user?.id])

  // Initialize performance tracking
  useEffect(() => {
    if (typeof window !== "undefined") {
      trackWebVitals()
    }
  }, [])

  const trackEvent = (action: string, category: string, label?: string, value?: number) => {
    analytics.event(action, category, label, value)
  }

  const trackUserAction = (action: string, details?: Record<string, any>) => {
    analytics.trackUserAction(action, details)
  }

  const trackError = (error: Error, context?: string) => {
    errorTracker.reportError(error, context)
  }

  return (
    <AnalyticsContext.Provider
      value={{
        trackEvent,
        trackUserAction,
        trackError,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider")
  }
  return context
}
