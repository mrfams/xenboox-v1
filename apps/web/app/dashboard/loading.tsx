import { Skeleton } from "@/components/shared/loading";

export default function DashboardLoading() {
  return (
    <div className="flex h-full flex-col pb-16 md:pb-0">
      {/* Greeting */}
      <div className="px-4 pt-6 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>

      {/* Proactive Briefing */}
      <div className="px-4 pt-4 sm:px-6">
        <div className="space-y-3 rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 p-3"
              >
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversation Thread placeholder */}
      <div className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="max-w-[85%] space-y-2">
                <Skeleton className="h-10 w-64 rounded-2xl" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Input */}
      <div className="sticky bottom-0 border-t border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-3xl space-y-2 px-3 pb-4 sm:px-4">
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
