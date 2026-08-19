"use client";

import { AlertTriangle, TrendingDown, TrendingUp, Clock, DollarSign, FileWarning, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── AI Proactive Alert ───────────────────────────────────────────────────
//
// Proactive intelligence cards that appear on the dashboard when AI
// detects something that needs attention. Not triggered by user action —
// AI pushes these based on pattern analysis.

type AlertSeverity = "critical" | "warning" | "info" | "success";

type AlertAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "destructive";
};

type AiProactiveAlertProps = {
  severity: AlertSeverity;
  title: string;
  description: string;
  metric?: {
    label: string;
    value: string;
    change?: number; // percentage change
    trend?: "up" | "down" | "flat";
  };
  actions?: AlertAction[];
  dismissible?: boolean;
  onDismiss?: () => void;
  timestamp?: Date;
  className?: string;
};

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    border: string;
    bg: string;
    icon: LucideIcon;
    iconColor: string;
    titleColor: string;
  }
> = {
  critical: {
    border: "border-red-500/30",
    bg: "bg-red-500/[0.03]",
    icon: AlertTriangle,
    iconColor: "text-red-500",
    titleColor: "text-red-700",
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/[0.03]",
    icon: FileWarning,
    iconColor: "text-amber-500",
    titleColor: "text-amber-700",
  },
  info: {
    border: "border-primary/20",
    bg: "bg-primary/[0.03]",
    icon: TrendingUp,
    iconColor: "text-primary",
    titleColor: "text-foreground",
  },
  success: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/[0.03]",
    icon: TrendingUp,
    iconColor: "text-emerald-500",
    titleColor: "text-emerald-700",
  },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function AiProactiveAlert({
  severity,
  title,
  description,
  metric,
  actions,
  dismissible,
  onDismiss,
  timestamp,
  className,
}: AiProactiveAlertProps) {
  const config = SEVERITY_CONFIG[severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all hover:shadow-md",
        config.border,
        config.bg,
        className,
      )}
      role="alert"
      aria-label={`${severity} alert: ${title}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            config.bg,
          )}
        >
          <Icon className={cn("h-5 w-5", config.iconColor)} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn("text-sm font-semibold", config.titleColor)}>
              {title}
            </h3>
            {dismissible && onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Dismiss alert"
              >
                ×
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>

          {/* Metric */}
          {metric && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm font-semibold text-foreground">
                {metric.value}
              </span>
              <span className="text-xs text-muted-foreground">{metric.label}</span>
              {metric.change !== undefined && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium",
                    metric.change > 0 ? "text-emerald-600" : metric.change < 0 ? "text-red-600" : "text-muted-foreground",
                  )}
                >
                  {metric.change > 0 ? (
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  ) : metric.change < 0 ? (
                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                  ) : null}
                  {metric.change > 0 ? "+" : ""}{metric.change}%
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {actions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={action.onClick}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    action.variant === "primary" &&
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                    action.variant === "destructive" &&
                      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                    !action.variant &&
                      "border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Timestamp */}
          {timestamp && (
            <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatTimeAgo(timestamp)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
