"use client";

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
  countdownTotal: number;
  callbackUrl: string;
  expired: boolean;
  onSignIn: () => void;
  onStay?: () => void;
};

export function SessionExpiryModal({
  open,
  onOpenChange,
  countdown,
  countdownTotal,
  callbackUrl: _callbackUrl,
  expired,
  onSignIn,
  onStay,
}: Props) {
  const pct =
    countdownTotal > 0
      ? Math.max(0, Math.min(100, (countdown / countdownTotal) * 100))
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md border-border/60 bg-card p-0 overflow-hidden"
        aria-describedby="session-expiry-desc"
        onInteractOutside={(e) => {
          // Block overlay click when hard-expired — user must act via button.
          if (expired) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (expired) e.preventDefault();
        }}
      >
        <div className="px-6 pt-6">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/15">
                <ShieldAlert className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <DialogTitle className="text-base">
                {expired ? "Session expired" : "Session expiring soon"}
              </DialogTitle>
            </div>
            <DialogDescription
              id="session-expiry-desc"
              className="pt-2 text-[13.5px] leading-relaxed"
            >
              {expired
                ? "Your session expired due to inactivity. Your data is safe. Sign in again to continue, or you'll be redirected automatically in "
                : "Your session is expiring due to inactivity. Your data is safe. Stay signed in or sign in again — auto-redirect in "}
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
          {!expired && onStay ? (
            <Button
              variant="outline"
              onClick={onStay}
              className="rounded-full"
              data-testid="session-stay-button"
            >
              Stay signed in
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
              disabled={expired}
              data-testid="session-dismiss-button"
            >
              Dismiss
            </Button>
          )}
          <Button
            onClick={onSignIn}
            className="rounded-full gap-2"
            data-testid="session-signin-button"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in again
          </Button>
        </DialogFooter>

        {/* Progress bar — auto-redirect countdown */}
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
            aria-hidden="true"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
