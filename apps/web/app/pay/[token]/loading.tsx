export default function PayLoading() {
  return (
    <div className="w-full max-w-lg space-y-4">
      {/* Invoice card skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-6 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="mb-3 h-4 w-40 animate-pulse rounded bg-slate-100" />
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
              <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="space-y-2 text-right">
              <div className="h-3 w-12 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Payment methods skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 h-4 w-36 animate-pulse rounded bg-slate-200" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"
            >
              <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Button skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-11 w-full animate-pulse rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}
