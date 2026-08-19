"use client";

import { Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiNarrativeHeader({
  title,
  icon: Icon,
  actions,
  className,
  children,
}: {
  title?: string;
  icon?: LucideIcon;
  actions?: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: "default" | "outline";
  }>;
  className?: string;
  children: React.ReactNode;
}) {
  const IconComp = Icon ?? Sparkles;

  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10" aria-hidden="true">
          <IconComp className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {title && (
              <span className="text-xs font-semibold text-foreground">
                {title}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
              AI-generated
            </span>
          </div>
          <div className="text-sm leading-relaxed text-foreground/80">
            {children}
          </div>
          {actions && actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    action.variant === "outline"
                      ? "border border-border bg-background text-foreground hover:bg-accent"
                      : "bg-primary/10 text-primary hover:bg-primary/20",
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
