import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { Skeleton } from "@/components/shared/loading"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-1 h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-1 h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-1 h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-1 h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}