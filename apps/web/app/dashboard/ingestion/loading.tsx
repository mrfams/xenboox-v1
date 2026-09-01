/**
 * Batch Ingestion Loading State
 */

import { Skeleton } from "@/components/ui";

export default function IngestionLoading() {
  return (
    <div className="space-y-6 p-3 pb-20">
      {/* Page Header */}
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-20 mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed rounded-lg p-12">
        <div className="text-center">
          <Skeleton className="h-12 w-12 mx-auto mb-4" />
          <Skeleton className="h-6 w-64 mx-auto" />
          <Skeleton className="h-4 w-96 mx-auto mt-2" />
          <div className="flex justify-center gap-2 mt-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Content Area */}
      <div className="border rounded-lg p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
