"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type BackupProgressIndicatorProps = {
  /** Whether backup is currently being created */
  isPending: boolean;
  /** Whether backup just completed (shows success animation) */
  justCompleted: boolean;
  /** Tooltip content */
  tooltip?: React.ReactNode;
  /** Custom idle text */
  idleText?: string;
  /** Custom pending text */
  pendingText?: string;
  /** Custom completed text */
  completedText?: string;
};

/**
 * Simulated progress that fills from 0 to 85% during pending,
 * then jumps to 100% on completion.
 * Uses a curve that feels natural: fast start, slow near end.
 */
function useSimulatedProgress(isPending: boolean, justCompleted: boolean) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPending && !justCompleted) {
      setProgress(0);
      return;
    }

    if (justCompleted) {
      setProgress(100);
      return;
    }

    // Simulated progress curve: fast start → slows near 85%
    let frame: number;
    let startTime: number | null = null;
    const duration = 2000; // 2 seconds to reach ~85%

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Ease-out cubic: fast start, slow end
      // Max progress: 85% (remaining happens instantly on complete)
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 85));

      if (t < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isPending, justCompleted]);

  return progress;
}

export function BackupProgressIndicator({
  isPending,
  justCompleted,
  tooltip,
  idleText = "A backup will be created automatically.",
  pendingText = "Creating backup...",
  completedText = "Backup saved!",
}: BackupProgressIndicatorProps) {
  const progress = useSimulatedProgress(isPending, justCompleted);
  const showProgress = isPending || justCompleted;

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-lg border px-3 py-2 text-xs",
        "border-emerald-200 bg-emerald-50 text-emerald-700",
        "dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        isPending && "animate-pulse",
        justCompleted && "animate-[fadeOut_1.5s_ease-in-out]",
      )}
    >
      {/* Main row: icon + text */}
      <div className="flex items-center gap-2">
        {isPending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : justCompleted ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 animate-[scaleIn_0.3s_ease-out]" />
        ) : (
          <ShieldCheck className="h-4 w-4 shrink-0" />
        )}
        <span className="flex-1">
          {isPending ? pendingText : justCompleted ? completedText : idleText}
        </span>
        {showProgress && (
          <span className="tabular-nums text-[10px] opacity-70">
            {progress}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-800">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-out",
              justCompleted
                ? "bg-emerald-500"
                : "bg-emerald-400 dark:bg-emerald-500",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute bottom-full left-0 mb-2 hidden w-72 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-md group-hover:block z-50">
          {tooltip}
        </div>
      )}
    </div>
  );
}
