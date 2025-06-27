"use client"

import { useEffect } from "react"
import { useAnalytics } from "@/providers/analytics-provider"

export function PerformanceMonitor() {
  const { trackEvent } = useAnalytics()

  useEffect(() => {
    if (typeof window === "undefined") return

    // Track page load performance
    window.addEventListener("load", () => {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming

      if (navigation) {
        // Track key performance metrics
        trackEvent("page_load_time", "performance", "total", navigation.loadEventEnd - navigation.fetchStart)
        trackEvent(
          "dom_content_loaded",
          "performance",
          "dcl",
          navigation.domContentLoadedEventEnd - navigation.fetchStart,
        )
        trackEvent("first_byte", "performance", "ttfb", navigation.responseStart - navigation.fetchStart)
      }
    })

    // Track resource loading errors
    window.addEventListener("error", (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement
        trackEvent("resource_error", "performance", target.tagName || "unknown")
      }
    })

    // Track long tasks (performance bottlenecks)
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              trackEvent("long_task", "performance", "duration", Math.round(entry.duration))
            }
          }
        })
        observer.observe({ entryTypes: ["longtask"] })
      } catch (e) {
        // PerformanceObserver not supported
      }
    }
  }, [trackEvent])

  return null
}
