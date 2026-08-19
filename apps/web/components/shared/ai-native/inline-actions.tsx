"use client";

import { ThumbsUp, ThumbsDown, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export function InlineActions({
  actions,
  className,
}: {
  actions: Array<{
    label: string;
    icon?: typeof ThumbsUp;
    variant?: "approve" | "reject" | "review" | "default";
    onClick?: () => void;
    disabled?: boolean;
  }>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 min-h-[36px]",
              "active:scale-[0.97]",
              "disabled:opacity-40 disabled:pointer-events-none",
              action.variant === "approve" &&
                "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400",
              action.variant === "reject" &&
                "bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400",
              action.variant === "review" &&
                "border border-border bg-background text-foreground hover:bg-accent",
              action.variant === "default" &&
                "bg-primary text-primary-foreground hover:bg-primary/90",
              !action.variant && "bg-muted text-foreground hover:bg-accent",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
