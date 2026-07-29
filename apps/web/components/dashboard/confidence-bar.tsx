"use client";

import { cn } from "@/lib/utils";

type ConfidenceBarProps = {
  confidence: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

const SIZE_CONFIG = {
  sm: { bar: "h-1 w-10", text: "text-[10px]" },
  md: { bar: "h-1.5 w-14", text: "text-[11px]" },
  lg: { bar: "h-2 w-20", text: "text-xs" },
};

export function ConfidenceBar({
  confidence,
  size = "sm",
  showLabel = false,
  className,
}: ConfidenceBarProps) {
  const config = SIZE_CONFIG[size];
  const clamped = Math.max(0, Math.min(1, confidence));

  const color =
    clamped >= 0.9
      ? "bg-emerald-400"
      : clamped >= 0.7
        ? "bg-amber-400"
        : "bg-red-400";

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "rounded-full bg-muted overflow-hidden inline-block",
          config.bar,
        )}
      >
        <span
          className={cn(
            "h-full rounded-full transition-all duration-500",
            color,
          )}
          style={{ width: `${Math.round(clamped * 100)}%` }}
        />
      </span>
      {showLabel && (
        <span className={cn("tabular-nums text-muted-foreground", config.text)}>
          {(clamped * 100).toFixed(0)}%
        </span>
      )}
    </span>
  );
}
