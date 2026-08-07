"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-lg border bg-card p-8 shadow-sm max-w-md w-full">
        <h2 className="text-lg font-semibold text-foreground">
          Authentication Error
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Please try signing in again.
        </p>
        <div className="mt-4 flex gap-3 justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/login")}
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
