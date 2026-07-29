"use client";

import { cn } from "@/lib/utils";
import {
  Brain,
  Eye,
  AlertTriangle,
  Mail,
  Lightbulb,
  ArrowRight,
  Bot,
} from "lucide-react";

type FocusItem = {
  id: string;
  label: string;
  icon: typeof Eye;
  active: boolean;
};

type RevenueAIPanelProps = {
  confidence?: number;
  className?: string;
  onAction?: (action: string) => void;
};

const DEFAULT_FOCUS: FocusItem[] = [
  { id: "f1", label: "Monitoring 248 invoices", icon: Eye, active: true },
  {
    id: "f2",
    label: "Watching 12 high-risk accounts",
    icon: AlertTriangle,
    active: true,
  },
  { id: "f3", label: "Preparing reminder emails", icon: Mail, active: true },
  { id: "f4", label: "Analyzing revenue trends", icon: Brain, active: false },
];

const DEFAULT_SUGGESTIONS = [
  {
    id: "s1",
    text: "Collect BlueWave $12,300 today",
    action: "Start collection",
  },
  { id: "s2", text: "Review Nova Tech dispute resolution", action: "Review" },
  { id: "s3", text: "Send monthly statements to 8 customers", action: "Send" },
  { id: "s4", text: "Escalate Metro Group to collections", action: "Escalate" },
];

export function RevenueAIPanel({
  confidence = 0.96,
  className,
  onAction,
}: RevenueAIPanelProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-signal-indigo/20 to-blue-500/10">
          <Bot className="h-4 w-4 text-signal-indigo" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground/80">
            AI Credit Controller
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Always monitoring
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground/60 uppercase tracking-wider px-1">
          <Brain className="h-3 w-3" />
          Current Focus
        </p>
        <div className="space-y-1">
          {DEFAULT_FOCUS.map((item) => (
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

      <div className="rounded-xl border bg-card p-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Collection Confidence
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

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground/60 uppercase tracking-wider px-1">
          <Lightbulb className="h-3 w-3" />
          Suggested
        </p>
        <div className="space-y-1">
          {DEFAULT_SUGGESTIONS.map((s) => (
            <div
              key={s.id}
              className="group rounded-lg border bg-card px-3 py-2.5 transition-all hover:shadow-sm"
            >
              <p className="text-xs text-foreground/80 leading-relaxed">
                {s.text}
              </p>
              <button
                type="button"
                onClick={() => onAction?.(s.action)}
                className="mt-1.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-all"
              >
                {s.action} <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
