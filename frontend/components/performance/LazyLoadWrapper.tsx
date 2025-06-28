"use client"
import React from "react";
import { useState, useEffect, useRef, ReactNode, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react"

interface LazyLoadWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
  placeholder?: ReactNode
  errorFallback?: ReactNode
  retryable?: boolean
  className?: string
  animationDelay?: number
}

interface LazyComponentProps {
  isVisible: boolean
  children: ReactNode
  fallback?: ReactNode
  errorFallback?: ReactNode
  retryable?: boolean
  animationDelay?: number
}

// Hook for intersection observer
function useIntersectionObserver(
  threshold = 0.1,
  rootMargin = "50px",
  triggerOnce = true
) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (triggerOnce) {
            setHasTriggered(true)
          }
        } else if (!triggerOnce && !hasTriggered) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [threshold, rootMargin, triggerOnce, hasTriggered])

  return { elementRef, isVisible: isVisible || hasTriggered }
}

// Hook for network status
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string>('unknown')

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    
    const updateConnectionType = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      if (connection) {
        setConnectionType(connection.effectiveType || 'unknown')
      }
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    updateOnlineStatus()
    updateConnectionType()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  return { isOnline, connectionType }
}

// Skeleton components for different content types
const SkeletonCard = () => (
  <Card>
    <CardContent className="pt-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </CardContent>
  </Card>
)

const SkeletonTable = () => (
  <Card>
    <CardContent className="pt-6">
      <div className="space-y-3">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const SkeletonChart = () => (
  <Card>
    <CardContent className="pt-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
        <div className="h-64 bg-muted rounded flex items-end gap-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="flex-1" 
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
)

const SkeletonStats = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)

// Get appropriate skeleton based on content type
const getSkeletonByType = (type?: string) => {
  switch (type) {
    case 'card': return <SkeletonCard />
    case 'table': return <SkeletonTable />
    case 'chart': return <SkeletonChart />
    case 'stats': return <SkeletonStats />
    default: return <SkeletonCard />
  }
}

// Lazy component with error boundary
function LazyComponent({ 
  isVisible, 
  children, 
  fallback, 
  errorFallback, 
  retryable = true,
  animationDelay = 0 
}: LazyComponentProps) {
  const [hasError, setHasError] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const { isOnline, connectionType } = useNetworkStatus()

  const handleRetry = async () => {
    setIsRetrying(true)
    setHasError(false)
    
    // Simulate retry delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRetrying(false)
  }

  if (!isVisible) {
    return fallback || <SkeletonCard />
  }

  if (hasError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: animationDelay }}
      >
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-destructive">
                {isOnline ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <WifiOff className="h-5 w-5" />
                )}
                <span className="font-medium">
                  {isOnline ? "Lỗi tải nội dung" : "Không có kết nối mạng"}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {isOnline 
                  ? "Có lỗi xảy ra khi tải nội dung. Vui lòng thử lại."
                  : "Vui lòng kiểm tra kết nối mạng và thử lại."
                }
              </p>
              
              {!isOnline && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <WifiOff className="h-3 w-3" />
                  <span>Kết nối: {connectionType}</span>
                </div>
              )}
              
              {retryable && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Đang thử lại...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Thử lại
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: animationDelay,
        duration: 0.5,
        ease: "easeOut"
      }}
    >
      <Suspense fallback={fallback || <SkeletonCard />}>
        <ErrorBoundary 
          onError={() => setHasError(true)}
          fallback={errorFallback}
        >
          {children}
        </ErrorBoundary>
      </Suspense>
    </motion.div>
  )
}

// Simple error boundary component
class ErrorBoundary extends React.Component<{
  children: ReactNode
  fallback?: ReactNode
  onError?: () => void
}> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('LazyLoadWrapper Error:', error, errorInfo)
    this.props.onError?.()
  }

  render() {
    if ((this.state as any).hasError) {
      return this.props.fallback || null
    }

    return this.props.children
  }
}

// Main LazyLoadWrapper component
export default function LazyLoadWrapper({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = "50px",
  triggerOnce = true,
  placeholder,
  errorFallback,
  retryable = true,
  className = "",
  animationDelay = 0
}: LazyLoadWrapperProps) {
  const { elementRef, isVisible } = useIntersectionObserver(
    threshold,
    rootMargin,
    triggerOnce
  )

  return (
    <div ref={elementRef} className={className}>
      <LazyComponent
        isVisible={isVisible}
        fallback={fallback || placeholder}
        errorFallback={errorFallback}
        retryable={retryable}
        animationDelay={animationDelay}
      >
        {children}
      </LazyComponent>
    </div>
  )
}

// Export skeleton components for direct use
export {
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
  SkeletonStats,
  getSkeletonByType
}

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<LazyLoadWrapperProps, 'children'>
) {
  return function LazyLoadedComponent(props: P) {
    return (
      <LazyLoadWrapper {...options}>
        <Component {...props} />
      </LazyLoadWrapper>
    )
  }
}

// Hook for progressive loading
export function useProgressiveLoading(items: any[], batchSize = 10, delay = 100) {
  const [visibleItems, setVisibleItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (items.length === 0) return

    setIsLoading(true)
    setVisibleItems([])

    const loadBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + batchSize, items.length)
      const batch = items.slice(startIndex, endIndex)
      
      setTimeout(() => {
        setVisibleItems(prev => [...prev, ...batch])
        
        if (endIndex < items.length) {
          loadBatch(endIndex)
        } else {
          setIsLoading(false)
        }
      }, delay)
    }

    loadBatch(0)
  }, [items, batchSize, delay])

  return { visibleItems, isLoading, hasMore: visibleItems.length < items.length }
} 