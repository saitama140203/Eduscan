"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("Application error:", error)

    // Send to error tracking service (e.g., Sentry)
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "exception", {
        description: error.message,
        fatal: false,
      })
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-xl">Oops! Something went wrong</CardTitle>
          <CardDescription>
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center">
          {process.env.NODE_ENV === "development" && (
            <details className="mt-4 p-4 bg-muted rounded-lg text-left">
              <summary className="cursor-pointer font-medium">Error Details</summary>
              <pre className="mt-2 text-sm overflow-auto">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
        </CardContent>

        <CardFooter className="flex gap-2 justify-center">
          <Button onClick={reset} variant="default" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
