export default function AuditTrailLoading() {
  return (
    <div className="space-y-4 p-3 pb-20 sm:p-6 md:pb-6">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-7 w-16 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-64 rounded-lg bg-muted animate-pulse" />
        <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
