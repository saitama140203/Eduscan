"use client"

import { lazy, Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

// Lazy load heavy chart components
const DynamicChart = lazy(() => import("@/components/charts/DynamicChart"))

interface LazyChartProps {
  data: any[]
  type: "line" | "bar" | "pie"
  className?: string
}

function ChartSkeleton() {
  return (
    <div className="w-full h-[400px] space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[350px] w-full" />
    </div>
  )
}

export function LazyChart({ data, type, className }: LazyChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <DynamicChart data={data} type={type} className={className} />
    </Suspense>
  )
}
