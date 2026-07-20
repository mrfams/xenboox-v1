"use client";

import { cn } from "@/lib/utils";

type ConfidenceLevel = "high" | "medium" | "low";

const config: Record<
  ConfidenceLevel,
  { label: string; dot: string; bg: string; text: string }
> = {
  high: {
    label: "Auto-processed",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  medium: {
    label: "Needs review",
    dot: "bg-amber-500",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
  low: {
    label: "Needs decision",
    dot: "bg-red-500",
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
  },
};

export function ConfidenceBadge({
  level,
  showLabel = true,
  className,
}: {
  level: ConfidenceLevel;
  showLabel?: boolean;
  className?: string;
}) {
  const c = config[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        c.bg,
        c.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {showLabel && c.label}
    </span>
  );
}
