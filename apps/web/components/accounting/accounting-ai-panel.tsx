"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Brain,
  Eye,
  AlertTriangle,
  FileText,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Bot,
} from "lucide-react";

type AccountingAIPanelProps = {
  onAction?: (action: string) => void;
  className?: string;
};

const DEFAULT_FOCUS = [
  { icon: "monitoring", label: "Monitoring", value: "4,382 Accounts" },
  { icon: "managing", label: "Managing", value: "3,842 Transactions" },
  { icon: "preparing", label: "Preparing", value: "Month-End Close" },
  { icon: "watching", label: "Watching", value: "7 Exceptions" },
];

const DEFAULT_SUGGESTIONS = [
  "Close July after reviewing tax adjustments",
  "Review three unusual account variances",
  "Verify intercompany mismatch",
  "Generate missing accruals for payroll",
];

export function AccountingAIPanel({
  onAction,
  className,
}: AccountingAIPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className={cn(
          "fixed bottom-24 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl",
          className,
        )}
      >
        <Bot className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card shadow-lg transition-all duration-200 w-64",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600">
            <Brain className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-semibold">AI Controller</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-5 w-5 items-center justify-center rounded text-xs text-muted-foreground hover:bg-accent"
        >
          ✕
        </button>
      </div>

      {/* Current Focus */}
      <div className="space-y-1.5 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Current Focus
        </p>
        {DEFAULT_FOCUS.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {item.icon === "monitoring" && (
              <Eye className="h-3 w-3 text-muted-foreground" />
            )}
            {item.icon === "managing" && (
              <FileText className="h-3 w-3 text-muted-foreground" />
            )}
            {item.icon === "preparing" && (
              <BarChart3 className="h-3 w-3 text-muted-foreground" />
            )}
            {item.icon === "watching" && (
              <AlertTriangle className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <span className="ml-auto text-xs font-medium text-foreground">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Suggestions */}
      <div className="space-y-1.5 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <Lightbulb className="h-3 w-3 text-amber-500" />
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Suggested
          </p>
        </div>
        {DEFAULT_SUGGESTIONS.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onAction?.(suggestion)}
            className="group flex w-full items-start gap-1.5 rounded-md px-1 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowRight className="mt-0.5 h-2.5 w-2.5 shrink-0 text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100" />
            <span>{suggestion}</span>
          </button>
        ))}
      </div>

      {/* Confidence */}
      <div className="border-t px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Confidence</span>
          <span className="text-[11px] font-semibold text-emerald-600">
            98%
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
            style={{ width: "98%" }}
          />
        </div>
      </div>
    </div>
  );
}
