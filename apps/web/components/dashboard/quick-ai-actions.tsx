"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FileText,
  TrendingUp,
  BarChart3,
  Search,
  FileSpreadsheet,
  UserCheck,
  Shield,
  DollarSign,
  ArrowRight,
} from "lucide-react";

type AIAction = {
  id: string;
  label: string;
  description: string;
  icon: typeof FileText;
  prompt: string;
  color: string;
};

type QuickAIActionsProps = {
  className?: string;
  limit?: number;
};

const AI_ACTIONS: AIAction[] = [
  {
    id: "management-accounts",
    label: "Prepare Management Accounts",
    description: "Generate P&L, balance sheet, and commentary",
    icon: FileSpreadsheet,
    prompt:
      "Prepare management accounts for this month with a summary of key changes",
    color: "from-signal-indigo/10 to-blue-500/5 border-signal-indigo/20",
  },
  {
    id: "forecast-cash",
    label: "Forecast Cash Flow",
    description: "Project cash position for the next 90 days",
    icon: TrendingUp,
    prompt:
      "Forecast my cash flow for the next 3 months and identify any shortfalls",
    color: "from-balanced-green/10 to-emerald-500/5 border-balanced-green/20",
  },
  {
    id: "analyze-expenses",
    label: "Analyze Expenses",
    description: "Find cost savings and spending patterns",
    icon: Search,
    prompt:
      "Analyze my expenses this month and find cost savings opportunities",
    color: "from-attention-amber/10 to-amber-500/5 border-attention-amber/20",
  },
  {
    id: "board-report",
    label: "Generate Board Report",
    description: "Executive summary with key metrics and narrative",
    icon: FileText,
    prompt:
      "Generate a board report for this quarter with financial highlights",
    color: "from-purple-500/10 to-indigo-500/5 border-purple-500/20",
  },
  {
    id: "review-payroll",
    label: "Review Payroll",
    description: "Verify payroll calculations and deductions",
    icon: UserCheck,
    prompt: "Review this month's payroll for accuracy and compliance",
    color: "from-sky-500/10 to-cyan-500/5 border-sky-500/20",
  },
  {
    id: "detect-fraud",
    label: "Detect Anomalies",
    description: "Run fraud detection on recent transactions",
    icon: Shield,
    prompt:
      "Check for anomalous transactions or potential fraud in recent activity",
    color: "from-error-clay/10 to-rose-500/5 border-error-clay/20",
  },
  {
    id: "working-capital",
    label: "Optimize Working Capital",
    description: "Improve cash conversion and liquidity",
    icon: DollarSign,
    prompt: "Analyze my working capital position and recommend improvements",
    color: "from-teal-500/10 to-emerald-500/5 border-teal-500/20",
  },
  {
    id: "variance-analysis",
    label: "Variance Analysis",
    description: "Budget vs actual with drill-down insights",
    icon: BarChart3,
    prompt:
      "Run a variance analysis comparing actuals to budget for this period",
    color: "from-orange-500/10 to-amber-500/5 border-orange-500/20",
  },
];

export function QuickAIActions({ className, limit = 4 }: QuickAIActionsProps) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? AI_ACTIONS : AI_ACTIONS.slice(0, limit);

  const handleAction = (action: AIAction) => {
    router.push(`/dashboard/chat?initial=${encodeURIComponent(action.prompt)}`);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Quick AI Actions
        </h2>
        {!showAll && AI_ACTIONS.length > limit && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-[10px] font-medium text-signal-indigo hover:text-signal-indigo-hover transition-colors"
          >
            View all ({AI_ACTIONS.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {visible.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleAction(action)}
              className={cn(
                "group relative flex flex-col items-start gap-2 rounded-xl border bg-card p-3.5 text-left transition-all duration-200",
                "hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]",
                "border-muted/40 hover:border-muted/60",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br",
                  action.color,
                )}
              >
                <Icon className="h-4 w-4 text-foreground/70" />
              </div>

              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground group-hover:text-signal-indigo transition-colors">
                  {action.label}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/70 leading-relaxed">
                  {action.description}
                </p>
              </div>

              <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-signal-indigo group-hover:translate-x-0.5 transition-all absolute right-3 top-3.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
