"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Brain,
  FileText,
  ShieldCheck,
  Lightbulb,
  ArrowRight,
  Bot,
  Clock,
  DollarSign,
} from "lucide-react";

type KnowledgeAIPanelProps = {
  onAction?: (action: string) => void;
  className?: string;
};

const CAPABILITIES = [
  { icon: <FileText className="h-3 w-3" />, label: "Documents" },
  { icon: <ShieldCheck className="h-3 w-3" />, label: "Policies" },
  { icon: <DollarSign className="h-3 w-3" />, label: "Transactions" },
  { icon: <FileText className="h-3 w-3" />, label: "Contracts" },
  { icon: <ShieldCheck className="h-3 w-3" />, label: "Approvals" },
  { icon: <Clock className="h-3 w-3" />, label: "Financial history" },
];

const DEFAULT_SUGGESTIONS = [
  "Review expiring supplier contracts",
  "Find missing receipt documents",
  "Analyze approval bottlenecks",
  "Search company policies",
];

export function KnowledgeAIPanel({
  onAction,
  className,
}: KnowledgeAIPanelProps) {
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
          <span className="text-xs font-semibold">Knowledge Assistant</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-5 w-5 items-center justify-center rounded text-xs text-muted-foreground hover:bg-accent"
        >
          ✕
        </button>
      </div>

      {/* Capabilities */}
      <div className="px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
          I can help you find
        </p>
        <div className="flex flex-wrap gap-1">
          {CAPABILITIES.map((cap, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-0.5 rounded-md bg-accent px-1.5 py-0.5 text-[9px] text-muted-foreground"
            >
              {cap.icon}
              {cap.label}
            </span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Understanding */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">
            Current Understanding
          </span>
          <span className="text-[11px] font-semibold text-balanced-green">
            96%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
            style={{ width: "96%" }}
          />
        </div>
      </div>

      {/* Suggestions */}
      <div className="border-t px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
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
    </div>
  );
}
