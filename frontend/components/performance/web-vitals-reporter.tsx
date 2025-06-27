"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { performanceMonitor } from "@/lib/monitoring/performance"

export function WebVitalsReporter() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Initialize performance monitoring
    performanceMonitor.initialize()

    // Mark route change start
    const routeId = `${pathname}${searchParams ? `?${searchParams}` : ""}`
    performanceMonitor.markStart(`route-${routeId}`)

    // Mark route change end after a short delay to capture rendering
    const timer = setTimeout(() => {
      performanceMonitor.markEnd(`route-${routeId}`)

      // Report route change metrics
      const metrics = performanceMonitor.getMetrics()

      // Send metrics to server
      fetch("/api/metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "route-change",
          route: pathname,
          metrics: metrics.customMetrics,
          timestamp: Date.now(),
        }),
        // Use keepalive to ensure the request completes even if the page is unloaded
        keepalive: true,
      }).catch((err) => {
        console.error("Failed to report metrics:", err)
      })
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [pathname, searchParams])

  return null
}
