'use client'
import { useEffect } from 'react'
import { debugLog } from '@/lib/utils/debug'

export function PerfMonitorClient() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            debugLog('Navigation timing:', {
              dns: navEntry.domainLookupEnd - navEntry.domainLookupStart,
              tcp: navEntry.connectEnd - navEntry.connectStart,
              request: navEntry.responseStart - navEntry.requestStart,
              response: navEntry.responseEnd - navEntry.responseStart,
              dom: navEntry.domContentLoadedEventEnd - navEntry.responseEnd,
              load: navEntry.loadEventEnd - navEntry.loadEventStart,
            });
          }
        }
      });
      observer.observe({ entryTypes: ['navigation'] });
      return () => observer.disconnect();
    }
  }, []);

  return null;
}
