"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

type AgentThinkingIndicatorProps = {
  agent: string;
  action?: string;
  detail?: string;
  confidence?: number;
  duration?: number; // ms
  variant?: "compact" | "full";
  className?: string;
};

const AGENT_COLORS: Record<string, string> = {
  cfo: "bg-indigo-500",
  controller: "bg-blue-500",
  treasury: "bg-emerald-500",
  compliance: "bg-violet-500",
  payroll: "bg-amber-500",
  ledger: "bg-sky-500",
  ap: "bg-rose-500",
  ar: "bg-teal-500",
  cash: "bg-orange-500",
  reconciliation: "bg-cyan-500",
  document: "bg-purple-500",
};

const AGENT_NAMES: Record<string, string> = {
  cfo: "CFO Agent",
  controller: "Controller",
  treasury: "Treasury",
  compliance: "Compliance",
  payroll: "Payroll Manager",
  ledger: "Ledger Agent",
  ap: "AP Agent",
  ar: "AR Agent",
  cash: "Cash Agent",
  reconciliation: "Reconciliation",
  document: "Document Agent",
};

function getAgentKey(agent: string): string {
  const key = agent.toLowerCase().replace(/-agent$/, "");
  return key;
}

function useThinkingDots() {
  // Generate a deterministic but varied animation delay
  return useMemo(() => {
    return [0, 0.15, 0.3].map((delay) => ({
      animationDelay: `${delay}s`,
    }));
  }, []);
}

export function AgentThinkingIndicator({
  agent,
  action = "processing",
  detail,
  confidence,
  duration,
  variant = "compact",
  className,
}: AgentThinkingIndicatorProps) {
  const dots = useThinkingDots();
  const agentKey = getAgentKey(agent);
  const color = AGENT_COLORS[agentKey] ?? "bg-primary";
  const displayName = AGENT_NAMES[agent.toLowerCase()] ?? agent;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2",
          className,
        )}
      >
        {/* Animated icon */}
        <span className="relative flex h-5 w-5 shrink-0">
          {" "}
          <span
            className={cn(
              "absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full opacity-75",
              color,
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-5 w-5 items-center justify-center rounded-full",
              color,
            )}
          >
            <Bot className="h-2.5 w-2.5 text-white" />
          </span>
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold">{displayName}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[11px] text-muted-foreground capitalize">
              {action.replace(/_/g, " ")}
            </span>
          </div>
          {detail && (
            <p className="mt-0.5 text-[10px] text-muted-foreground/70 truncate max-w-[200px]">
              {detail}
            </p>
          )}
        </div>

        {/* Animated dots */}
        <div className="flex items-center gap-0.5">
          {dots.map((style, i) => (
            <span
              key={i}
              className={cn(
                "h-1 w-1 rounded-full motion-safe:animate-bounce",
                color.replace("bg-", "bg-").replace("-500", "-400"),
              )}
              style={style}
            />
          ))}
        </div>

        {confidence != null && (
          <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
            {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br from-card to-muted/30 p-4",
        className,
      )}
    >
      {/* Background pulse */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={cn(
            "absolute -left-10 top-0 h-full w-20 motion-safe:animate-shimmer bg-gradient-to-r from-transparent via-primary/5 to-transparent",
          )}
        />
      </div>

      <div className="relative flex items-start gap-4">
        {/* Agent icon with ring */}
        <span className="relative flex h-10 w-10 shrink-0">
          <span
            className={cn(
              "absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full opacity-60",
              color,
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-10 w-10 items-center justify-center rounded-xl",
              color,
            )}
          >
            <Bot className="h-5 w-5 text-white" />
          </span>
        </span>

        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">{displayName}</h4>
              {/* Animated dots */}
              <div className="flex items-center gap-0.5">
                {dots.map((style, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full motion-safe:animate-bounce",
                      color.replace("bg-", "bg-").replace("-500", "-400"),
                    )}
                    style={style}
                  />
                ))}
              </div>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground capitalize">
              {action.replace(/_/g, " ")}
            </p>
          </div>{" "}
          {detail && (
            <p className="text-xs text-muted-foreground/80 leading-relaxed motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2 duration-300">
              {detail}
            </p>
          )}
          {/* Confidence + Duration bar */}
          {(confidence != null || duration != null) && (
            <div className="flex items-center gap-3 pt-1">
              {confidence != null && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        confidence >= 0.9
                          ? "bg-emerald-500"
                          : confidence >= 0.7
                            ? "bg-amber-500"
                            : "bg-red-500",
                      )}
                      style={{ width: `${Math.round(confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {(confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              {duration != null && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {(duration / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
