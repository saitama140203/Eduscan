"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const loadingVariants = cva(
  "flex items-center justify-center",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        default: "h-6 w-6", 
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
      variant: {
        spinner: "",
        dots: "",
        pulse: "",
        skeleton: "",
      }
    },
    defaultVariants: {
      size: "default",
      variant: "spinner",
    },
  }
)

export interface LoadingProps extends VariantProps<typeof loadingVariants> {
  className?: string
  text?: string
}

export function Loading({ size, variant, className, text }: LoadingProps) {
  if (variant === "spinner") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className={cn("animate-spin", loadingVariants({ size }))} />
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    )
  }

  if (variant === "dots") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex space-x-1">
          <div className={cn("rounded-full bg-primary animate-bounce", 
            size === "sm" ? "w-1 h-1" :
            size === "lg" ? "w-3 h-3" :
            size === "xl" ? "w-4 h-4" : "w-2 h-2"
          )} style={{ animationDelay: "0ms" }} />
          <div className={cn("rounded-full bg-primary animate-bounce", 
            size === "sm" ? "w-1 h-1" :
            size === "lg" ? "w-3 h-3" :
            size === "xl" ? "w-4 h-4" : "w-2 h-2"
          )} style={{ animationDelay: "150ms" }} />
          <div className={cn("rounded-full bg-primary animate-bounce", 
            size === "sm" ? "w-1 h-1" :
            size === "lg" ? "w-3 h-3" :
            size === "xl" ? "w-4 h-4" : "w-2 h-2"
          )} style={{ animationDelay: "300ms" }} />
        </div>
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    )
  }

  if (variant === "pulse") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn("rounded-full bg-primary animate-pulse-subtle", loadingVariants({ size }))} />
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    )
  }

  return null
}

// Skeleton Components
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "shimmer"
}

export function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        variant === "shimmer" ? "loading-shimmer" : "loading-skeleton",
        className
      )}
      {...props}
    />
  )
}

// Pre-built skeleton layouts
export function SkeletonCard() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex space-x-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    default: "h-10 w-10", 
    lg: "h-12 w-12"
  }
  
  return <Skeleton className={cn("rounded-full", sizeClasses[size])} />
}

// Full page loading component
export function PageLoading({ text = "Đang tải..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] flex-col space-y-4">
      <Loading size="xl" text={text} />
    </div>
  )
}

// Overlay loading component
export function LoadingOverlay({ show, text }: { show: boolean; text?: string }) {
  if (!show) return null
  
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="center-absolute">
        <Loading size="xl" text={text} />
      </div>
    </div>
  )
} 