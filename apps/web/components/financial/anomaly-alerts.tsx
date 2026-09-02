"use client";

import { useState } from "react";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  X,
  Bot,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

// ─── Anomaly Alerts ────────────────────────────────────────────────────────
//
// Shows AI-detected anomalies in financial metrics.
// When a metric deviates >1.5 standard deviations from the 6-month average,
// it's flagged as an anomaly with an AI-generated insight.

export type Anomaly = {
  id: string;
  metric: string;
  current: number;
  average: number;
  deviation: number;
  severity: "high" | "medium" | "low";
  direction: "up" | "down";
  message: string;
  aiInsight: string;
};

const SEVERITY_CONFIG = {
  high: {
    border: "border-red-500/20",
    bg: "bg-red-500/[0.03]",
    icon: ShieldAlert,
    iconColor: "text-red-500",
    iconBg: "bg-red-500/10",
    badge: "bg-red-500/10 text-red-500",
    badgeLabel: "Critical",
  },
  medium: {
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.03]",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    badge: "bg-amber-500/10 text-amber-500",
    badgeLabel: "Warning",
  },
  low: {
    border: "border-blue-500/20",
    bg: "bg-blue-500/[0.03]",
    icon: ShieldCheck,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    badge: "bg-blue-500/10 text-blue-500",
    badgeLabel: "Info",
  },
};

function AnomalyCard({
  anomaly,
  onDismiss,
  onInvestigate,
}: {
  anomaly: Anomaly;
  onDismiss: (id: string) => void;
  onInvestigate: (anomaly: Anomaly) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = SEVERITY_CONFIG[anomaly.severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-200",
        config.border,
        config.bg,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            config.iconBg,
          )}
        >
          <Icon
            className={cn("h-5 w-5", config.iconColor)}
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                {anomaly.metric}
              </p>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                  config.badge,
                )}
              >
                {config.badgeLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(anomaly.id)}
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
              aria-label={`Dismiss ${anomaly.metric} alert`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {anomaly.message}
          </p>

          {/* Direction indicator */}
          <div className="mt-2 flex items-center gap-2">
            {anomaly.direction === "up" ? (
              <TrendingUp
                className="h-3.5 w-3.5 text-emerald-500"
                aria-hidden="true"
              />
            ) : (
              <TrendingDown
                className="h-3.5 w-3.5 text-red-500"
                aria-hidden="true"
              />
            )}
            <span className="text-[10px] text-muted-foreground">
              {anomaly.deviation > 0
                ? `${anomaly.deviation.toFixed(1)}σ from average`
                : "Below target"}
            </span>
          </div>

          {/* AI Insight — expandable */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 transition-colors"
            aria-expanded={isExpanded}
          >
            <Bot className="h-3 w-3" aria-hidden="true" />
            <span>AI Analysis</span>
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-2 rounded-lg border border-primary/10 bg-primary/[0.02] p-3">
              <p className="text-xs text-foreground leading-relaxed">
                {anomaly.aiInsight}
              </p>
            </div>
          )}

          {/* Investigate button */}
          <button
            type="button"
            onClick={() => onInvestigate(anomaly)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Bot className="h-3 w-3" />
            Investigate with AI
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Anomaly Alerts Container ──────────────────────────────────────────────

export function AnomalyAlerts({
  anomalies,
  onInvestigate,
}: {
  anomalies: Anomaly[];
  onInvestigate: (anomaly: Anomaly) => void;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAnomalies = anomalies.filter((a) => !dismissed.has(a.id));

  if (visibleAnomalies.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">
          Anomalies Detected
        </h3>
        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
          {visibleAnomalies.length}
        </span>
      </div>

      <div className="space-y-2">
        {visibleAnomalies.map((anomaly) => (
          <AnomalyCard
            key={anomaly.id}
            anomaly={anomaly}
            onDismiss={handleDismiss}
            onInvestigate={onInvestigate}
          />
        ))}
      </div>
    </div>
  );
}
