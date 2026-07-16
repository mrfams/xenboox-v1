import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { Skeleton } from "@/components/shared/loading"
import { MessageSquare } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-4 lg:-m-6">
      {/* Conversation list sidebar */}
      <div className="hidden w-72 shrink-0 border-r bg-card lg:flex lg:flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8" />
        </div>

        <div className="border-b px-4 py-2">
          <Skeleton className="h-8 w-full" />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        <div className="border-b px-4 py-2 lg:px-8">
          <Skeleton className="h-5 w-24" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-3xl space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Card key={i} className="ml-0">
                <CardContent className="pt-3">
                  <Skeleton className="h-4 w-full max-w-[80%]" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="border-t bg-card px-4 py-4 lg:px-8">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}