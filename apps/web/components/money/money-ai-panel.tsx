"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Brain,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  Lightbulb,
  ArrowRight,
  Bot,
} from "lucide-react";

type AIFocusItem = {
  id: string;
  label: string;
  icon: typeof CheckCircle2;
  active: boolean;
};

type AISuggestion = {
  id: string;
  text: string;
  action: string;
};

type MoneyAIPanelProps = {
  confidence?: number;
  focusItems?: AIFocusItem[];
  suggestions?: AISuggestion[];
  onAction?: (action: string) => void;
  className?: string;
};

const DEFAULT_FOCUS: AIFocusItem[] = [
  { id: "f1", label: "Monitoring liquidity", icon: TrendingUp, active: true },
  { id: "f2", label: "Reconciling banks", icon: RefreshCw, active: true },
  { id: "f3", label: "Forecasting cash", icon: Brain, active: true },
  {
    id: "f4",
    label: "Reviewing transactions",
    icon: ShieldCheck,
    active: false,
  },
];

const DEFAULT_SUGGESTIONS: AISuggestion[] = [
  {
    id: "s1",
    text: "Delay supplier payment by 3 days",
    action: "Analyze impact",
  },
  { id: "s2", text: "Move $100k idle cash to savings", action: "Simulate" },
  {
    id: "s3",
    text: "Investigate Access Bank low balance",
    action: "Investigate",
  },
  {
    id: "s4",
    text: "Improve collections for overdue invoices",
    action: "Action plan",
  },
];

export function MoneyAIPanel({
  confidence = 0.97,
  focusItems = DEFAULT_FOCUS,
  suggestions = DEFAULT_SUGGESTIONS,
  onAction,
  className,
}: MoneyAIPanelProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-signal-indigo/20 to-blue-500/10">
          <Bot className="h-4 w-4 text-signal-indigo" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground/80">
            AI Treasury Assistant
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Always monitoring
          </p>
        </div>
      </div>

      {/* Current Focus */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground/60 uppercase tracking-wider px-1">
          <Brain className="h-3 w-3" />
          Current Focus
        </p>
        <div className="space-y-1">
          {focusItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all",
                item.active ? "bg-muted/20" : "opacity-40",
              )}
            >
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md",
                  item.active ? "bg-signal-indigo/10" : "bg-muted/30",
                )}
              >
                <item.icon
                  className={cn(
                    "h-3 w-3",
                    item.active
                      ? "text-signal-indigo"
                      : "text-muted-foreground",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs",
                  item.active
                    ? "text-foreground/80"
                    : "text-muted-foreground/50",
                )}
              >
                {item.label}
              </span>
              {item.active && (
                <span className="relative flex h-2 w-2 ml-auto">
                  <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-balanced-green opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-balanced-green" />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confidence */}
      <div className="rounded-xl border bg-card p-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Confidence
          </span>
          <span className="text-xs font-bold tabular-nums text-balanced-green">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-balanced-green transition-all duration-500"
            style={{ width: `${Math.round(confidence * 100)}%` }}
          />
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground/60 uppercase tracking-wider px-1">
          <Lightbulb className="h-3 w-3" />
          Suggested
        </p>
        <div className="space-y-1">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="group rounded-lg border bg-card px-3 py-2.5 transition-all hover:shadow-sm"
            >
              <p className="text-xs text-foreground/80 leading-relaxed">
                {suggestion.text}
              </p>
              <button
                type="button"
                onClick={() => onAction?.(suggestion.action)}
                className="mt-1.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-all"
              >
                {suggestion.action}
                <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
