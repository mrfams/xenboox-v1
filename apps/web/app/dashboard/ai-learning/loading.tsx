export default function AiLearningLoading() {
  return (
    <div className="p-6">
      <div className="mb-6 space-y-2">
        <div className="h-8 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border bg-white p-4"
          >
            <div className="h-3 w-20 rounded bg-slate-200" />
            <div className="mt-2 h-6 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="mb-6 h-20 animate-pulse rounded-lg border bg-violet-50" />

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="h-3 w-56 rounded bg-slate-100" />
              </div>
              <div className="h-6 w-20 rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
