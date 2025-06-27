// Performance monitoring utilities

type PerformanceMetric = {
  name: string
  value: number
  unit: string
}

type PerformanceMarks = {
  [key: string]: number
}

class PerformanceMonitor {
  private marks: PerformanceMarks = {}
  private customMetrics: Record<string, number> = {}
  private longTasks: PerformanceEntry[] = []
  private resourceErrors: string[] = []
  private isInitialized = false

  initialize() {
    if (typeof window === "undefined" || this.isInitialized) return
    this.isInitialized = true

    // Track long tasks
    if ("PerformanceObserver" in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          this.longTasks = [...this.longTasks, ...entries]

          // Report long tasks over 200ms
          entries.forEach((entry) => {
            if (entry.duration > 200) {
              console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`)
              this.reportCustomMetric("long-task", entry.duration)
            }
          })
        })

        longTaskObserver.observe({ entryTypes: ["longtask"] })
      } catch (e) {
        console.error("Failed to observe long tasks:", e)
      }

      // Track resource errors
      try {
        window.addEventListener(
          "error",
          (event) => {
            if (event.target && (event.target as HTMLElement).tagName) {
              const target = event.target as HTMLElement
              if (["IMG", "SCRIPT", "LINK", "AUDIO", "VIDEO"].includes(target.tagName)) {
                const resource =
                  target.tagName === "LINK"
                    ? (target as HTMLLinkElement).href
                    : (target as HTMLImageElement | HTMLScriptElement | HTMLAudioElement | HTMLVideoElement).src

                this.resourceErrors.push(`Failed to load ${target.tagName.toLowerCase()}: ${resource}`)
                console.error(`Resource error: ${target.tagName.toLowerCase()}`, resource)
              }
            }
          },
          true,
        )
      } catch (e) {
        console.error("Failed to track resource errors:", e)
      }

      // Track Core Web Vitals
      try {
        const webVitalsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === "largest-contentful-paint") {
              this.reportCustomMetric("lcp", entry.startTime)
            } else if (entry.entryType === "layout-shift") {
              // @ts-ignore - LayoutShift has a value property
              this.reportCustomMetric("cls", entry.value)
            } else if (entry.entryType === "first-input") {
              // @ts-ignore - FirstInput has a processingStart and startTime properties
              this.reportCustomMetric("fid", entry.processingStart - entry.startTime)
            }
          })
        })

        webVitalsObserver.observe({
          entryTypes: ["largest-contentful-paint", "layout-shift", "first-input"],
        })
      } catch (e) {
        console.error("Failed to observe web vitals:", e)
      }
    }
  }

  markStart(name: string) {
    this.marks[`${name}_start`] = performance.now()
  }

  markEnd(name: string) {
    const startMark = this.marks[`${name}_start`]
    if (startMark) {
      const duration = performance.now() - startMark
      this.reportCustomMetric(name, duration)
      return duration
    }
    return 0
  }

  reportCustomMetric(name: string, value: number) {
    this.customMetrics[name] = value

    // Report to analytics if available
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "performance_metric", {
        event_category: "Performance",
        event_label: name,
        value: Math.round(value),
        non_interaction: true,
      })
    }
  }

  getMetrics() {
    const metrics: PerformanceMetric[] = []

    // Add navigation timing metrics if available
    if (typeof window !== "undefined" && window.performance) {
      const navigationTiming = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming

      if (navigationTiming) {
        metrics.push(
          {
            name: "Time to First Byte",
            value: navigationTiming.responseStart - navigationTiming.requestStart,
            unit: "ms",
          },
          {
            name: "DOM Content Loaded",
            value: navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart,
            unit: "ms",
          },
          {
            name: "Load Complete",
            value: navigationTiming.loadEventEnd - navigationTiming.fetchStart,
            unit: "ms",
          },
          {
            name: "First Paint",
            value: performance.getEntriesByName("first-paint")[0]?.startTime || 0,
            unit: "ms",
          },
        )
      }
    }

    // Add custom metrics
    Object.entries(this.customMetrics).forEach(([name, value]) => {
      metrics.push({
        name,
        value,
        unit: "ms",
      })
    })

    return {
      metrics,
      customMetrics: this.customMetrics,
      longTasks: this.longTasks,
      resourceErrors: this.resourceErrors,
    }
  }
}

export const performanceMonitor = new PerformanceMonitor()

// TẮT performance monitoring để giảm delay
// if (typeof window !== "undefined") {
//   performanceMonitor.initialize()
// }
