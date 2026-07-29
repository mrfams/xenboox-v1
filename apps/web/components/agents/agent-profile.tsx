"use client";

import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  Activity,
} from "lucide-react";

type AgentStatus = "active" | "idle" | "busy" | "error";

interface AgentProfileProps {
  name: string;
  emoji: string;
  role: string;
  status: AgentStatus;
  mission: string;
  capabilities: string[];
  restrictions?: string[];
  recentActions?: { time: string; action: string }[];
  className?: string;
}

const STATUS_STYLES: Record<
  AgentStatus,
  { dot: string; label: string; bg: string }
> = {
  active: {
    dot: "bg-emerald-500",
    label: "Active",
    bg: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
  },
  idle: {
    dot: "bg-muted-foreground/50",
    label: "Idle",
    bg: "bg-muted/50 text-muted-foreground border-border",
  },
  busy: {
    dot: "bg-attention-amber",
    label: "Busy",
    bg: "bg-attention-amber/10 text-attention-amber border-attention-amber/20",
  },
  error: {
    dot: "bg-error-clay",
    label: "Error",
    bg: "bg-error-clay/10 text-error-clay border-error-clay/20",
  },
};

export function AgentProfile({
  name,
  emoji,
  role,
  status,
  mission,
  capabilities,
  restrictions,
  recentActions = [],
  className,
}: AgentProfileProps) {
  const statusStyle = STATUS_STYLES[status];

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-md",
        className,
      )}
    >
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-accent/50 to-transparent px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-lg">
              {emoji}
            </div>
            <div>
              <h3 className="text-sm font-semibold">{name}</h3>
              <p className="text-[10px] text-muted-foreground">{role}</p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-medium",
              statusStyle.bg,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", statusStyle.dot)} />
            {statusStyle.label}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Current Mission */}
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Current Mission
          </p>
          <div className="flex items-start gap-2 rounded-lg bg-accent/30 p-2.5">
            <Activity className="h-3 w-3 text-signal-indigo mt-0.5 shrink-0" />
            <p className="text-xs text-foreground">{mission}</p>
          </div>
        </div>

        {/* Capabilities */}
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
            Capabilities
          </p>
          <div className="flex flex-wrap gap-1">
            {capabilities.map((cap, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-0.5 rounded-md bg-balanced-green/10 px-1.5 py-0.5 text-[9px] font-medium text-balanced-green"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Restrictions */}
        {restrictions && restrictions.length > 0 && (
          <div>
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
              Restrictions
            </p>
            <div className="flex flex-wrap gap-1">
              {restrictions.map((res, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-0.5 rounded-md bg-attention-amber/10 px-1.5 py-0.5 text-[9px] font-medium text-attention-amber"
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {res}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentActions.length > 0 && (
          <div>
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
              Recent Activity
            </p>
            <div className="space-y-1">
              {recentActions.slice(0, 3).map((action, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[10px]">
                  <Clock className="h-2.5 w-2.5 text-muted-foreground/60 shrink-0" />
                  <span className="text-muted-foreground">{action.time}</span>
                  <span className="text-foreground">{action.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action button */}
        <button className="flex w-full items-center justify-center gap-1 rounded-lg border bg-accent/30 px-3 py-2 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          View full activity <ArrowRight className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}
