"use client";

import Link from "next/link";
import { ShieldAlert, LogIn } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";
import { Button } from "@/components/ui";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countdown: number;
  callbackUrl: string;
};

export function SessionExpiryModal({
  open,
  onOpenChange,
  countdown,
  callbackUrl,
}: Props) {
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md border-border/60 bg-card p-0 overflow-hidden"
        aria-describedby="session-expiry-desc"
        // Prevent closing by overlay click when expired — user must act
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="px-6 pt-6">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/15">
                <ShieldAlert className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <DialogTitle className="text-base">Session expired</DialogTitle>
            </div>
            <DialogDescription
              id="session-expiry-desc"
              className="pt-2 text-[13.5px] leading-relaxed"
            >
              You&apos;ve been signed out after 60 minutes of inactivity — your
              data is safe, but the dashboard can&apos;t load without a fresh
              sign-in. You&apos;ll be redirected in{" "}
              <span className="font-mono font-medium text-foreground">
                {countdown}s
              </span>
              .
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="mx-6 mt-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
          No data was lost. Sign in again to continue where you left off.
        </div>

        <DialogFooter className="gap-2 px-6 pb-6 pt-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full"
          >
            Dismiss
          </Button>
          <Button asChild className="rounded-full gap-2">
            <Link href={loginHref}>
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Sign in again
            </Link>
          </Button>
        </DialogFooter>

        {/* Progress bar — auto-redirect countdown */}
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${(countdown / 10) * 100}%` }}
            aria-hidden="true"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
