"use client";

import { useState } from "react";
import { Info, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── AI Confidence Explainer ──────────────────────────────────────────────
//
// Shows confidence score with expandable explanation of why the AI
// made a particular decision. Used in approval cards, auto-categorization,
// and any AI decision point.

type ConfidenceLevel = "high" | "medium" | "low";

type ConfidenceReason = {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  detail: string;
};

type AiConfidenceExplainerProps = {
  score: number; // 0-100
  reasons: ConfidenceReason[];
  title?: string;
  showOverride?: boolean;
  onOverride?: () => void;
  className?: string;
};

function getLevel(score: number): ConfidenceLevel {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function getLevelConfig(level: ConfidenceLevel) {
  switch (level) {
    case "high":
      return {
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        icon: CheckCircle2,
        label: "High confidence",
      };
    case "medium":
      return {
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        icon: AlertTriangle,
        label: "Medium confidence",
      };
    case "low":
      return {
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        icon: XCircle,
        label: "Low confidence — review needed",
      };
  }
}

export function AiConfidenceExplainer({
  score,
  reasons,
  title = "AI Confidence",
  showOverride,
  onOverride,
  className,
}: AiConfidenceExplainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const level = getLevel(score);
  const config = getLevelConfig(level);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        config.border,
        className,
      )}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex w-full items-center gap-3 p-3 text-left transition-colors",
          config.bg,
          "hover:opacity-90",
        )}
        aria-expanded={isExpanded}
        aria-controls="confidence-explanation"
      >
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.bg)}>
          <Icon className={cn("h-4 w-4", config.color)} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-semibold", config.color)}>
              {score}%
            </span>
            <span className="text-xs text-muted-foreground">{config.label}</span>
          </div>
          {/* Confidence bar */}
          <div className="h-1.5 rounded-full bg-black/5 mt-1.5 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                level === "high" && "bg-emerald-500",
                level === "medium" && "bg-amber-500",
                level === "low" && "bg-red-500",
              )}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
        <div className="shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Expandable explanation */}
      {isExpanded && (
        <div
          id="confidence-explanation"
          className="border-t border-border/50 bg-background p-3"
        >
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Why this confidence level:
          </p>
          <div className="space-y-2">
            {reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="mt-0.5">
                  {reason.impact === "positive" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                  )}
                  {reason.impact === "negative" && (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                  )}
                  {reason.impact === "neutral" && (
                    <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{reason.factor}</p>
                  <p className="text-[10px] text-muted-foreground">{reason.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {showOverride && onOverride && (
            <button
              type="button"
              onClick={onOverride}
              className="mt-3 text-xs text-primary hover:underline"
            >
              Override AI decision
            </button>
          )}
        </div>
      )}
    </div>
  );
}
