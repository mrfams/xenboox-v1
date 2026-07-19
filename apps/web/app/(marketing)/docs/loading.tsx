export default function DocsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-muted" />
        <div className="flex-1 space-y-3">
          <div className="h-8 w-3/4 rounded-lg bg-muted" />
          <div className="h-5 w-full rounded-lg bg-muted" />
        </div>
      </div>
      <div className="h-40 rounded-lg bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-32 rounded-lg bg-muted" />
        <div className="h-32 rounded-lg bg-muted" />
      </div>
      <div className="h-24 rounded-lg bg-muted" />
    </div>
  )
}
