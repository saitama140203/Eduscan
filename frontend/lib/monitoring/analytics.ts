// Analytics and performance monitoring utilities

// Khai báo gtag cho window
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

// Adapter trực tiếp để tránh circular dependency
const safeGtag = {
  call: (...args: any[]) => {
    try {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag(...args);
      }
    } catch (error) {
      // Fail silently in production, log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error calling gtag:', error);
      }
    }
  },
  
  pageView: (url: string) => {
    safeGtag.call('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_path: url,
    });
  },
  
  event: (action: string, params?: Record<string, any>) => {
    safeGtag.call('event', action, params);
  },
  
  exception: (description: string, fatal = false) => {
    safeGtag.call('event', 'exception', {
      description,
      fatal,
    });
  }
};

export const analytics = {
  // Track page views
  pageView: (url: string) => {
    safeGtag.pageView(url);
  },

  // Track custom events
  event: (action: string, category: string, label?: string, value?: number) => {
    safeGtag.event(action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  },

  // Track user interactions
  trackUserAction: (action: string, details?: Record<string, any>) => {
    analytics.event(action, "user_interaction", JSON.stringify(details))
  },

  // Track performance metrics
  trackPerformance: (metric: string, value: number) => {
    analytics.event("performance_metric", "performance", metric, value)
  },

  // Track errors
  trackError: (error: Error, context?: string) => {
    analytics.event("error", "application_error", `${context}: ${error.message}`)
  },
}

// Trực tiếp export safeGtag cho module khác sử dụng
export { safeGtag }

// Core Web Vitals tracking
export function trackWebVitals() {
  if (typeof window === "undefined") return

  // Track CLS (Cumulative Layout Shift)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === "layout-shift" && !(entry as any).hadRecentInput) {
        analytics.trackPerformance("CLS", (entry as any).value)
      }
    }
  }).observe({ entryTypes: ["layout-shift"] })

  // Track FID (First Input Delay)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Kiểu cho PerformanceEventTiming
      const fidEntry = entry as PerformanceEventTiming;
      analytics.trackPerformance("FID", fidEntry.processingStart - fidEntry.startTime)
    }
  }).observe({ entryTypes: ["first-input"] })

  // Track LCP (Largest Contentful Paint)
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1]
    analytics.trackPerformance("LCP", lastEntry.startTime)
  }).observe({ entryTypes: ["largest-contentful-paint"] })
}
