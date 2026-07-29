"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  TrendingUp,
  AlertTriangle,
  TrendingDown,
  Lightbulb,
  ShieldCheck,
  Zap,
  ChevronRight,
  Info,
  CheckCircle2,
  X,
} from "lucide-react";

type InsightPriority = "high" | "medium" | "low";
type InsightCategory =
  | "revenue"
  | "risk"
  | "optimization"
  | "compliance"
  | "operations";

type AIInsight = {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  description: string;
  confidence: number;
  timestamp: Date;
  actionLabel?: string;
  actionUrl?: string;
};

type AIInsightsFeedProps = {
  insights: AIInsight[];
  className?: string;
};

const CATEGORY_STYLES: Record<
  InsightCategory,
  { icon: typeof TrendingUp; color: string; bg: string; border: string }
> = {
  revenue: {
    icon: TrendingUp,
    color: "text-balanced-green",
    bg: "bg-balanced-green-bg",
    border: "border-balanced-green/20",
  },
  risk: {
    icon: AlertTriangle,
    color: "text-attention-amber",
    bg: "bg-attention-amber-bg",
    border: "border-attention-amber/20",
  },
  optimization: {
    icon: Zap,
    color: "text-signal-indigo",
    bg: "bg-signal-indigo-bg",
    border: "border-signal-indigo/20",
  },
  compliance: {
    icon: ShieldCheck,
    color: "text-sky-500",
    bg: "bg-sky-50 dark:bg-sky-950/20",
    border: "border-sky-200 dark:border-sky-800",
  },
  operations: {
    icon: Lightbulb,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-800",
  },
};

const PRIORITY_STYLES: Record<InsightPriority, { dot: string; label: string }> =
  {
    high: { dot: "bg-error-clay", label: "High" },
    medium: { dot: "bg-attention-amber", label: "Medium" },
    low: { dot: "bg-balanced-green", label: "Low" },
  };

function InsightCard({
  insight,
  onDismiss,
}: {
  insight: AIInsight;
  onDismiss: (id: string) => void;
}) {
  const category = CATEGORY_STYLES[insight.category];
  const priority = PRIORITY_STYLES[insight.priority];
  const Icon = category.icon;
  const timeAgo = useMemo(
    () => formatDistanceToNow(insight.timestamp, { addSuffix: true }),
    [insight.timestamp],
  );

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card p-3.5 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        category.border,
        insight.priority === "high" && "border-l-[3px] border-l-error-clay",
        insight.priority === "medium" &&
          "border-l-[3px] border-l-attention-amber",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            category.bg,
          )}
        >
          <Icon className={cn("h-4 w-4", category.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-foreground">
              {insight.title}
            </span>
            <span
              className={cn(
                "flex items-center gap-1 text-[10px] font-medium",
                category.color,
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", priority.dot)} />
              {priority.label}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {insight.description}
          </p>

          <div className="mt-2 flex items-center gap-3">
            {/* Confidence */}
            <div className="flex items-center gap-1.5">
              <div className="h-1 w-12 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    insight.confidence >= 0.9
                      ? "bg-balanced-green"
                      : insight.confidence >= 0.7
                        ? "bg-attention-amber"
                        : "bg-error-clay",
                  )}
                  style={{ width: `${Math.round(insight.confidence * 100)}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {(insight.confidence * 100).toFixed(0)}%
              </span>
            </div>

            {/* Timestamp */}
            <span className="text-[10px] text-muted-foreground/60">
              {timeAgo}
            </span>

            {/* Action button */}
            {insight.actionLabel && (
              <button
                type="button"
                className="ml-auto inline-flex items-center gap-0.5 rounded-lg border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-signal-indigo/30 hover:text-signal-indigo hover:bg-signal-indigo/5"
              >
                {insight.actionLabel}
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => onDismiss(insight.id)}
          className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted transition-all"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function AIInsightsFeed({
  insights: initialInsights,
  className,
}: AIInsightsFeedProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const visibleInsights = useMemo(() => {
    const filtered = initialInsights.filter((i) => !dismissedIds.has(i.id));
    return showAll ? filtered : filtered.slice(0, 4);
  }, [initialInsights, dismissedIds, showAll]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  if (visibleInsights.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <h2 className="text-sm font-semibold text-foreground">
          Today's AI Insights
        </h2>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-balanced-green mb-2" />
          <p className="text-sm font-medium text-foreground">All caught up</p>
          <p className="text-xs text-muted-foreground mt-1">
            No new insights right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Today's AI Insights
        </h2>
        {!showAll && initialInsights.length > 4 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-[10px] font-medium text-signal-indigo hover:text-signal-indigo-hover transition-colors"
          >
            View all ({initialInsights.length})
          </button>
        )}
      </div>

      <div className="space-y-2">
        {visibleInsights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Default Insights Factory ──────────────────────────────────────────────

export function createDefaultInsights(): AIInsight[] {
  const now = new Date();
  return [
    {
      id: "insight-1",
      category: "revenue",
      priority: "high",
      title: "Revenue increased 18%",
      description:
        "Your revenue this month is 18% higher than the same period last month, driven primarily by increased sales from Brikama Market Traders (+GMD 45,000).",
      confidence: 0.94,
      timestamp: new Date(now.getTime() - 5 * 60 * 1000),
      actionLabel: "Explain",
    },
    {
      id: "insight-2",
      category: "risk",
      priority: "high",
      title: "4 invoices are overdue",
      description:
        "Four customer invoices totaling GMD 78,500 are past due. Two are overdue by more than 30 days. Consider sending automated reminders.",
      confidence: 0.98,
      timestamp: new Date(now.getTime() - 12 * 60 * 1000),
      actionLabel: "Fix",
    },
    {
      id: "insight-3",
      category: "optimization",
      priority: "medium",
      title: "Marketing spending increased 31%",
      description:
        "Marketing expenses are up 31% this month. The additional GMD 45,000 in radio advertising has not yet shown a measurable ROI in sales pipeline.",
      confidence: 0.87,
      timestamp: new Date(now.getTime() - 25 * 60 * 1000),
      actionLabel: "Investigate",
    },
    {
      id: "insight-4",
      category: "operations",
      priority: "medium",
      title: "Vendor costs increased 8%",
      description:
        "Three key suppliers raised prices this month. Global Supplies Ltd. increased prices by 12% across all product lines. Potential impact on margins.",
      confidence: 0.91,
      timestamp: new Date(now.getTime() - 40 * 60 * 1000),
      actionLabel: "Review",
    },
    {
      id: "insight-5",
      category: "compliance",
      priority: "low",
      title: "Payroll is fully funded",
      description:
        "Payroll for the current period is fully funded with GMD 147,050 available. All statutory deductions have been calculated and segregated.",
      confidence: 0.99,
      timestamp: new Date(now.getTime() - 60 * 60 * 1000),
      actionLabel: "Review",
    },
  ];
}
