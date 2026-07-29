"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Brain, CheckCircle2, X, ArrowRight } from "lucide-react";

type FocusItem = {
  id: string;
  label: string;
  status: "active" | "completed";
};

type CFOmemoryProps = {
  items?: FocusItem[];
  className?: string;
};

const DEFAULT_ITEMS: FocusItem[] = [
  { id: "focus-1", label: "Preparing Board Report", status: "active" },
  { id: "focus-2", label: "Reviewing Payroll", status: "active" },
  { id: "focus-3", label: "Forecasting Q4 Cash Flow", status: "active" },
  {
    id: "focus-4",
    label: "Reconciling Bank Transactions",
    status: "completed",
  },
];

export function CFOmemory({
  items = DEFAULT_ITEMS,
  className,
}: CFOmemoryProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visible = items.filter((i) => !dismissedIds.has(i.id));
  const activeCount = visible.filter((i) => i.status === "active").length;

  if (visible.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 px-1">
        <Brain className="h-4 w-4 text-signal-indigo" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          AI Memory
        </h3>
        {activeCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-signal-indigo/10 px-1.5 py-0.5 text-[9px] font-medium text-signal-indigo">
            <span className="h-1 w-1 rounded-full bg-signal-indigo motion-safe:animate-pulse" />
            {activeCount} active
          </span>
        )}
      </div>

      <div className="space-y-1">
        {visible.map((item) => (
          <div
            key={item.id}
            className={cn(
              "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all",
              item.status === "active"
                ? "bg-muted/30 hover:bg-muted/50"
                : "opacity-50",
            )}
          >
            {item.status === "active" ? (
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-signal-indigo opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-signal-indigo" />
              </span>
            ) : (
              <CheckCircle2 className="h-3 w-3 shrink-0 text-balanced-green" />
            )}

            <span
              className={cn(
                "flex-1 text-[11px] truncate",
                item.status === "active"
                  ? "text-foreground/80"
                  : "text-muted-foreground/50 line-through",
              )}
            >
              {item.label}
            </span>

            <button
              type="button"
              onClick={() =>
                setDismissedIds((prev) => new Set(prev).add(item.id))
              }
              className="shrink-0 h-5 w-5 rounded flex items-center justify-center text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
