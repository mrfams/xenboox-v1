import { Skeleton } from "@/components/ui";

export default function MarketingLoading() {
  return (
    <div className="container mx-auto px-4 py-24">
      <Skeleton className="h-10 w-64 mx-auto mb-8" />
      <Skeleton className="h-4 w-96 mx-auto mb-12" />
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
