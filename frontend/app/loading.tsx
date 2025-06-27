import { Skeleton } from "@/components/ui/skeleton"

export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-6">
        {/* Logo skeleton */}
        <div className="flex justify-center">
          <Skeleton className="h-12 w-32" />
        </div>

        {/* Title skeleton */}
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>

        {/* Loading spinner */}
        <div className="flex justify-center">
          <div className="h-8 w-8 rounded-full border-4 border-t-primary border-primary/20 animate-spin" />
        </div>

        {/* Progress indicator */}
        <div className="space-y-2">
          <Skeleton className="h-2 w-full" />
          <div className="flex justify-center">
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    </div>
  )
}
