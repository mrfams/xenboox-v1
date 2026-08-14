import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/**
 * Route-level loading shell for data-heavy dashboard segments (reports,
 * payroll, documents, ...). Replaces full-page blank with a header + table
 * skeleton so navigation feels instant and layout shift is minimised.
 */
export function DashboardTableLoading({
  title = "h-7 w-48",
  subtitle = "h-4 w-72",
  rows = 6,
  columns = 5,
}: {
  title?: string;
  subtitle?: string;
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className={title} />
        <Skeleton className={subtitle} />
      </div>
      <div className="rounded-lg border bg-card p-4">
        <TableSkeleton rows={rows} columns={columns} />
      </div>
    </div>
  );
}
