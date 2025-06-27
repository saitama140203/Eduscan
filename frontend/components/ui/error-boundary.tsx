"use client"

import type React from "react"
import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error("Error Boundary caught an error:", error, errorInfo)

    // Send to error tracking
    if (typeof window !== "undefined") {
      // Send to analytics
      if (window.gtag) {
        window.gtag("event", "exception", {
          description: error.message,
          fatal: true,
        })
      }

      // Send to error tracking service
      fetch("/api/errors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        }),
      }).catch((err) => {
        console.error("Failed to send error report:", err)
      })
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                We encountered an unexpected error. Our team has been notified and is working on a fix.
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-4 p-4 bg-muted rounded-lg text-left">
                  <summary className="cursor-pointer font-medium">Error Details</summary>
                  <pre className="mt-2 text-sm overflow-auto whitespace-pre-wrap">
                    {this.state.error.message}
                    {this.state.error.stack && `\n\nStack trace:\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}
            </CardContent>

            <CardFooter className="flex gap-2 justify-center">
              <Button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
