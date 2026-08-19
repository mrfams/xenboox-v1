"use client";

import { cn } from "@/lib/utils";

type ConfidenceLevel = "high" | "review" | "low";

function getLevel(score: number): ConfidenceLevel {
  if (score >= 0.9) return "high";
  if (score >= 0.7) return "review";
  return "low";
}

const levelConfig: Record<
  ConfidenceLevel,
  { label: string; className: string; dotClassName: string }
> = {
  high: {
    label: "High confidence",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
  review: {
    label: "Review suggested",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClassName: "bg-amber-500",
  },
  low: {
    label: "Needs attention",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
    dotClassName: "bg-red-500",
  },
};

export function ConfidenceBadge({
  score,
  showLabel = true,
  className,
}: {
  score: number;
  showLabel?: boolean;
  className?: string;
}) {
  const level = getLevel(score);
  const config = levelConfig[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
        config.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClassName)} />
      {showLabel && config.label}
      {!showLabel && `${Math.round(score * 100)}%`}
    </span>
  );
}
