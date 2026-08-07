"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Bot,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface AgentActivity {
  agent: string;
  status: "started" | "completed" | "failed";
  action: string;
  confidence?: number;
  durationMs?: number;
}

interface AgentActivityBlockProps {
  activities: AgentActivity[];
  delegations?: Array<{ from: string; to: string; reason: string }>;
  isStreaming?: boolean;
}

export function AgentActivityBlock({
  activities,
  delegations = [],
  isStreaming = false,
}: AgentActivityBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (activities.length === 0 && !isStreaming) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">
            Agent Activity
          </span>
          {activities.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              ({activities.length} action{activities.length !== 1 ? "s" : ""})
            </span>
          )}
          {isStreaming && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 text-primary animate-spin" />
              <span className="text-[10px] text-primary">Working...</span>
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Activities */}
          {activities.map((activity, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <div className="mt-0.5">
                {activity.status === "completed" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : activity.status === "failed" ? (
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground">
                    {activity.agent}
                  </span>
                  <span className="text-muted-foreground">—</span>
                  <span className="text-muted-foreground truncate">
                    {activity.action}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  {activity.confidence !== undefined && (
                    <span
                      className={cn(
                        "font-medium",
                        activity.confidence >= 85
                          ? "text-emerald-600"
                          : activity.confidence >= 70
                            ? "text-amber-600"
                            : "text-red-600",
                      )}
                    >
                      {activity.confidence}% confidence
                    </span>
                  )}
                  {activity.durationMs !== undefined && (
                    <span>{(activity.durationMs / 1000).toFixed(1)}s</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Delegations */}
          {delegations.map((delegation, i) => (
            <div key={`del-${i}`} className="flex items-start gap-2 text-xs">
              <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground">
                    {delegation.from}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium text-foreground">
                    {delegation.to}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {delegation.reason}
                </span>
              </div>
            </div>
          ))}

          {/* Streaming indicator */}
          {isStreaming && activities.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Processing your request...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
