"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AlertType = "error" | "warning" | "success" | "info";

const alertConfig: Record<
  AlertType,
  {
    icon: LucideIcon;
    border: string;
    bg: string;
    iconColor: string;
    iconBg: string;
  }
> = {
  error: {
    icon: AlertTriangle,
    border: "border-red-500/20",
    bg: "bg-red-500/[0.03]",
    iconColor: "text-red-500",
    iconBg: "bg-red-500/10",
  },
  warning: {
    icon: Clock,
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.03]",
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
  },
  success: {
    icon: CheckCircle2,
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/[0.03]",
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
  },
  info: {
    icon: Info,
    border: "border-border/50",
    bg: "bg-card/60",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
};

export function AlertCard({
  type = "info",
  title,
  description,
  actions,
  className,
}: {
  type?: AlertType;
  title: string;
  description?: string;
  actions?: Array<{
    label: string;
    variant?: "default" | "outline" | "ghost";
    onClick?: () => void;
  }>;
  className?: string;
}) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-200 hover:shadow-md",
        config.border,
        config.bg,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            config.iconBg,
          )}
        >
          <Icon className={cn("h-5 w-5", config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
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
                      : action.variant === "ghost"
                        ? "text-muted-foreground hover:text-foreground hover:bg-accent"
                        : "bg-primary text-primary-foreground hover:bg-primary/90",
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
