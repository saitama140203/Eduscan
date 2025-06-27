import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-full max-w-7xl px-4">
        <div className="mb-8">
          <Skeleton className="h-10 w-[250px] mb-2" />
          <Skeleton className="h-4 w-[350px]" />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-36" />
              <div className="flex space-x-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Table Loading */}
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-24" />
                ))}
              </div>
              
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className={`h-4 ${j === 1 ? 'w-40' : 'w-24'}`} />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Loading Indicator */}
        <div className="flex justify-center items-center mt-6">
          <div className="h-8 w-8 rounded-full border-4 border-t-indigo-600 border-indigo-200 animate-spin"></div>
          <span className="ml-3 text-gray-600">Đang tải dữ liệu...</span>
        </div>
      </div>
    </div>
  )
}
