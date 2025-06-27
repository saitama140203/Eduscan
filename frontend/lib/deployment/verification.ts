// Deployment verification utilities

interface DeploymentCheck {
  name: string
  status: "pass" | "fail" | "warning"
  message: string
  details?: string
}

interface DeploymentVerification {
  overall: "pass" | "fail" | "warning"
  checks: DeploymentCheck[]
  timestamp: string
  version: string
  region: string
}

export async function verifyDeployment(): Promise<DeploymentVerification> {
  const checks: DeploymentCheck[] = []
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "unknown"
  const region = process.env.VERCEL_REGION || "unknown"

  // Check environment variables
  const requiredEnvVars = [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_API_URL",
    "JWT_SECRET",
    "NEXT_PUBLIC_GA_ID",
    "GOOGLE_SITE_VERIFICATION",
    "NEXT_PUBLIC_SENTRY_DSN",
    "VERCEL_REGION",
    "NEXT_PUBLIC_APP_VERSION",
  ]

  const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

  if (missingEnvVars.length === 0) {
    checks.push({
      name: "Environment Variables",
      status: "pass",
      message: "All required environment variables are configured",
    })
  } else {
    checks.push({
      name: "Environment Variables",
      status: "fail",
      message: `Missing environment variables: ${missingEnvVars.join(", ")}`,
      details: "Configure missing environment variables in Vercel dashboard",
    })
  }

  // Check API connectivity
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (apiUrl) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${apiUrl}/health`, {
        method: "HEAD",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        checks.push({
          name: "API Connectivity",
          status: "pass",
          message: "Backend API is accessible and healthy",
        })
      } else {
        checks.push({
          name: "API Connectivity",
          status: "warning",
          message: `API returned status ${response.status}`,
          details: "Backend API may be experiencing issues",
        })
      }
    } else {
      checks.push({
        name: "API Connectivity",
        status: "fail",
        message: "API URL not configured",
        details: "Set NEXT_PUBLIC_API_URL environment variable",
      })
    }
  } catch (error) {
    checks.push({
      name: "API Connectivity",
      status: "fail",
      message: "Failed to connect to backend API",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }

  // Check Sentry configuration
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    checks.push({
      name: "Error Tracking",
      status: "pass",
      message: "Sentry error tracking is configured",
    })
  } else {
    checks.push({
      name: "Error Tracking",
      status: "warning",
      message: "Sentry DSN not configured",
      details: "Error tracking will not be available",
    })
  }

  // Check Analytics configuration
  if (process.env.NEXT_PUBLIC_GA_ID) {
    checks.push({
      name: "Analytics",
      status: "pass",
      message: "Google Analytics is configured",
    })
  } else {
    checks.push({
      name: "Analytics",
      status: "warning",
      message: "Google Analytics ID not configured",
      details: "User analytics will not be tracked",
    })
  }

  // Check SEO configuration
  if (process.env.GOOGLE_SITE_VERIFICATION) {
    checks.push({
      name: "SEO Verification",
      status: "pass",
      message: "Google Search Console verification is configured",
    })
  } else {
    checks.push({
      name: "SEO Verification",
      status: "warning",
      message: "Google site verification not configured",
      details: "Site may not appear in Google Search Console",
    })
  }

  // Determine overall status
  const hasFailures = checks.some((check) => check.status === "fail")
  const hasWarnings = checks.some((check) => check.status === "warning")

  let overall: "pass" | "fail" | "warning"
  if (hasFailures) {
    overall = "fail"
  } else if (hasWarnings) {
    overall = "warning"
  } else {
    overall = "pass"
  }

  return {
    overall,
    checks,
    timestamp: new Date().toISOString(),
    version,
    region,
  }
}
