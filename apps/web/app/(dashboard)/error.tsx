"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui";

export default function DashboardGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        {error.message || "An unexpected error occurred"}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
