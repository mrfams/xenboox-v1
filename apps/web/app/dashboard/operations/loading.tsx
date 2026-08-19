import { Skeleton } from "@/components/shared/loading";

export default function OperationsLoading() {
  return (
    <div className="space-y-4 p-3 sm:p-6">
      {/* Money Flow Summary */}
      <div className="rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-lg mb-4" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-background/50 p-3">
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Section cards */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/50 bg-card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div
                key={j}
                className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2"
              >
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Banking cards */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <Skeleton className="h-4 w-28 mb-3" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/50 bg-background/50 p-3"
            >
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-6 w-20 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
