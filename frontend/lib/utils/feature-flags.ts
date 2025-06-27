// Feature flags utility functions

/**
 * Check if a feature flag is enabled
 * @param featureKey The feature flag key to check
 * @param defaultValue The default value if the feature flag is not found
 * @returns Whether the feature flag is enabled
 */
export async function isFeatureEnabled(featureKey: string, defaultValue = false): Promise<boolean> {
  try {
    // In server components, we need to fetch the feature flags directly
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/feature-flags`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    if (!response.ok) {
      return defaultValue
    }

    const data = await response.json()
    return data.features?.[featureKey] ?? defaultValue
  } catch (error) {
    console.error(`Error checking feature flag ${featureKey}:`, error)
    return defaultValue
  }
}

/**
 * Get all feature flags
 * @returns All feature flags
 */
export async function getAllFeatureFlags(): Promise<Record<string, boolean>> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/feature-flags`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    if (!response.ok) {
      return {}
    }

    const data = await response.json()
    return data.features ?? {}
  } catch (error) {
    console.error("Error fetching feature flags:", error)
    return {}
  }
}
