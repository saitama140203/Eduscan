"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@/contexts/authContext"

type FeatureFlags = Record<string, boolean>

interface FeatureFlagsContextType {
  flags: FeatureFlags
  isLoading: boolean
  isEnabled: (featureKey: string) => boolean
  refresh: () => Promise<void>
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType>({
  flags: {},
  isLoading: true,
  isEnabled: () => false,
  refresh: async () => {},
})

export function FeatureFlagsProvider({ children, user }: { children: React.ReactNode; user?: User | null }) {
  const [flags, setFlags] = useState<FeatureFlags>({})
  const [isLoading, setIsLoading] = useState(true)

  const fetchFlags = async () => {
    try {
      setIsLoading(true)
      const userId = user?.id || "anonymous"
      const userRole = user?.role || "anonymous"

      const response = await fetch(`/api/feature-flags?userId=${userId}&role=${userRole}`)
      const data = await response.json()

      setFlags(data.features || {})
    } catch (error) {
      console.error("Failed to fetch feature flags:", error)
      // Fallback to default flags
      setFlags({})
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFlags()
  }, [user?.id, user?.role])

  const isEnabled = (featureKey: string): boolean => {
    return flags[featureKey] === true
  }

  return (
    <FeatureFlagsContext.Provider
      value={{
        flags,
        isLoading,
        isEnabled,
        refresh: fetchFlags,
      }}
    >
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export const useFeatureFlags = () => useContext(FeatureFlagsContext)
