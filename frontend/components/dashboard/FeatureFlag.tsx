"use client"

import { useFeatureFlags } from "@/providers/feature-flags-provider"
import type { ReactNode } from "react"

interface FeatureFlagProps {
  feature: string
  fallback?: ReactNode
  children: ReactNode
}

export function FeatureFlag({ feature, fallback = null, children }: FeatureFlagProps) {
  const { isEnabled, isLoading } = useFeatureFlags()

  if (isLoading) {
    // Optional: Return a skeleton or loading state
    return null
  }

  if (isEnabled(feature)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
