// Sentry integration for production error tracking
import { debugLog, debugWarn, debugError } from "../utils/debug"

interface SentryConfig {
  dsn?: string
  environment: string
  tracesSampleRate: number
  replaysSessionSampleRate: number
  replaysOnErrorSampleRate: number
}

class SentryManager {
  private isInitialized = false

  async initialize(config: SentryConfig) {
    if (this.isInitialized || typeof window === "undefined") return

    try {
      // Dynamic import to avoid bundling Sentry in development
      const Sentry = await import("@sentry/nextjs")

      Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        tracesSampleRate: config.tracesSampleRate,
        replaysSessionSampleRate: config.replaysSessionSampleRate,
        replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,

        beforeSend(event) {
          // Filter out development errors
          if (config.environment === "development") {
            return null
          }

          // Filter out known non-critical errors
          const ignoredErrors = [
            "ResizeObserver loop limit exceeded",
            "Non-Error promise rejection captured",
            "ChunkLoadError",
          ]

          if (event.exception?.values?.[0]?.value) {
            const errorMessage = event.exception.values[0].value
            if (ignoredErrors.some((ignored) => errorMessage.includes(ignored))) {
              return null
            }
          }

          return event
        },

        beforeSendTransaction(event) {
          // Sample transactions based on URL patterns
          const url = event.request?.url
          if (url?.includes("/api/health") || url?.includes("/_next/")) {
            return null
          }
          return event
        },

        integrations: [
          new Sentry.Replay({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
      })

      this.isInitialized = true
      debugLog("Sentry initialized successfully")
    } catch (error) {
      debugWarn("Failed to initialize Sentry:", error)
    }
  }

  captureException(error: Error, context?: Record<string, any>) {
    if (!this.isInitialized) {
      debugError("Sentry not initialized, logging error:", error)
      return
    }

import("@sentry/nextjs").then((Sentry) => {
      Sentry.withScope((scope) => {
        if (context) {
          Object.entries(context).forEach(([key, value]) => {
            scope.setContext(key, value)
          })
        }
        Sentry.captureException(error)
      })
    })
  }

  setUser(user: { id: string; email?: string; role?: string }) {
    if (!this.isInitialized) return

    import("@sentry/nextjs").then((Sentry) => {
      Sentry.setUser(user)
    })
  }

  addBreadcrumb(message: string, category: string, level: "info" | "warning" | "error" = "info") {
    if (!this.isInitialized) return

    import("@sentry/nextjs").then((Sentry) => {
      Sentry.addBreadcrumb({
        message,
        category,
        level,
        timestamp: Date.now() / 1000,
      })
    })
  }
}

export const sentryManager = new SentryManager()

// Initialize Sentry in production
if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  sentryManager.initialize({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
  })
}
