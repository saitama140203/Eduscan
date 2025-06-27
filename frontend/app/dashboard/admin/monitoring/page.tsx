import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { getAllFeatureFlags } from "@/lib/utils/feature-flags"

export const metadata = {
  title: "System Monitoring",
  description: "Monitor system health and performance",
}

export default async function MonitoringPage() {
  // Get feature flags
  const featureFlags = await getAllFeatureFlags()

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">System Monitoring</h1>

      <Tabs defaultValue="health">
        <TabsList className="mb-4">
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Current status of system components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <HealthStatusCard title="Frontend" status="healthy" description="Next.js application" />
                  <HealthStatusCard title="API" status="healthy" description="Backend API services" />
                  <HealthStatusCard title="Database" status="healthy" description="PostgreSQL database" />
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="text-lg font-medium mb-2">Health Check Endpoints</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <a
                        href="/health"
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Frontend Health Check
                      </a>
                    </li>
                    <li>
                      <a
                        href="/metrics"
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Performance Metrics
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>System performance and resource usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    title="Server Response"
                    value="124ms"
                    description="Average response time"
                    trend="down"
                    trendValue="12%"
                  />
                  <MetricCard
                    title="Memory Usage"
                    value="512MB"
                    description="Current memory usage"
                    trend="up"
                    trendValue="5%"
                  />
                  <MetricCard
                    title="Error Rate"
                    value="0.02%"
                    description="Last 24 hours"
                    trend="down"
                    trendValue="30%"
                  />
                  <MetricCard
                    title="Active Users"
                    value="1,245"
                    description="Current active users"
                    trend="up"
                    trendValue="8%"
                  />
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="text-lg font-medium mb-4">Core Web Vitals</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <WebVitalCard title="LCP" value="1.2s" description="Largest Contentful Paint" status="good" />
                    <WebVitalCard title="FID" value="18ms" description="First Input Delay" status="good" />
                    <WebVitalCard title="CLS" value="0.05" description="Cumulative Layout Shift" status="good" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Current feature flag configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(featureFlags).map(([key, enabled]) => (
                    <FeatureFlagCard key={key} name={key} enabled={enabled} description={getFeatureDescription(key)} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function HealthStatusCard({
  title,
  status,
  description,
}: { title: string; status: "healthy" | "degraded" | "unhealthy"; description: string }) {
  const statusColors = {
    healthy: "bg-green-100 text-green-800",
    degraded: "bg-yellow-100 text-yellow-800",
    unhealthy: "bg-red-100 text-red-800",
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
  trend,
  trendValue,
}: { title: string; value: string; description: string; trend: "up" | "down"; trendValue: string }) {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
  }

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="mt-1 flex items-baseline">
        <p className="text-2xl font-semibold">{value}</p>
        <p className={`ml-2 text-xs font-medium ${trendColors[trend]}`}>
          {trend === "up" ? "↑" : "↓"} {trendValue}
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function WebVitalCard({
  title,
  value,
  description,
  status,
}: { title: string; value: string; description: string; status: "good" | "needs-improvement" | "poor" }) {
  const statusColors = {
    good: "bg-green-100 text-green-800 border-green-200",
    "needs-improvement": "bg-yellow-100 text-yellow-800 border-yellow-200",
    poor: "bg-red-100 text-red-800 border-red-200",
  }

  return (
    <div className={`border rounded-lg p-4 ${statusColors[status]}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm">{description}</p>
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  )
}

function FeatureFlagCard({ name, enabled, description }: { name: string; enabled: boolean; description: string }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{formatFeatureName(name)}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div
          className={`px-2 py-1 rounded-full text-xs font-medium ${enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
        >
          {enabled ? "Enabled" : "Disabled"}
        </div>
      </div>
    </div>
  )
}

// Helper functions
function formatFeatureName(key: string): string {
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function getFeatureDescription(key: string): string {
  const descriptions: Record<string, string> = {
    "new-dashboard": "Updated dashboard UI with improved analytics",
    "advanced-analytics": "Enhanced analytics with predictive insights",
    "bulk-import": "Import multiple students or classes at once",
    "ai-grading": "AI-powered automatic grading of exams",
    "real-time-collaboration": "Collaborate on exam creation in real-time",
  }

  return descriptions[key] || "No description available"
}
