"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

export function DeploymentStatus() {
  const [verification, setVerification] = useState<DeploymentVerification | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVerification = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/deployment/verify")
      const data = await response.json()

      setVerification(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch deployment status")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchVerification()
  }, [])

  const getStatusIcon = (status: "pass" | "fail" | "warning") => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: "pass" | "fail" | "warning") => {
    const variants = {
      pass: "bg-green-100 text-green-800 border-green-200",
      fail: "bg-red-100 text-red-800 border-red-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    }

    return <Badge className={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
  }

  if (error) {
    return (
      <Alert>
        <XCircle className="h-4 w-4" />
        <AlertDescription>Failed to load deployment status: {error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Deployment Status
              {verification && getStatusIcon(verification.overall)}
            </CardTitle>
            <CardDescription>Current deployment verification and health checks</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchVerification} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Checking deployment status...</span>
          </div>
        ) : verification ? (
          <div className="space-y-6">
            {/* Overall Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Overall Status</h3>
                <p className="text-sm text-muted-foreground">
                  Version {verification.version} • Region: {verification.region}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last checked: {new Date(verification.timestamp).toLocaleString()}
                </p>
              </div>
              {getStatusBadge(verification.overall)}
            </div>

            {/* Individual Checks */}
            <div className="space-y-3">
              <h3 className="font-medium">System Checks</h3>
              {verification.checks.map((check, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getStatusIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{check.name}</h4>
                      {getStatusBadge(check.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{check.message}</p>
                    {check.details && (
                      <p className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded">{check.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-green-600 font-medium">
                    {verification.checks.filter((c) => c.status === "pass").length}
                  </span>
                  <span className="text-muted-foreground"> Passed</span>
                </div>
                <div>
                  <span className="text-yellow-600 font-medium">
                    {verification.checks.filter((c) => c.status === "warning").length}
                  </span>
                  <span className="text-muted-foreground"> Warnings</span>
                </div>
                <div>
                  <span className="text-red-600 font-medium">
                    {verification.checks.filter((c) => c.status === "fail").length}
                  </span>
                  <span className="text-muted-foreground"> Failed</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
