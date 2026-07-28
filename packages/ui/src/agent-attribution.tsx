import * as React from "react";
import { cn } from "./lib";
import { Brain, Clock } from "lucide-react";
import { ConfidenceIndicator } from "./confidence-indicator";

export interface AgentAttributionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Agent name (e.g. "Ledger Agent", "AP Agent") */
  agentName: string;
  /** Relative time string (e.g. "2h ago") */
  timestamp: string;
  /** Confidence score 0–1 (optional — if provided, shows confidence bar) */
  confidence?: number;
  /** Variant for display density */
  variant?: "default" | "compact" | "full";
  /** Whether to show the agent icon */
  showIcon?: boolean;
}

const agentConfidenceDot = (confidence?: number) => {
  if (!confidence || confidence >= 0.9) return "agent-tag__dot";
  if (confidence >= 0.7) return "agent-tag__dot agent-tag__dot--low";
  return "agent-tag__dot agent-tag__dot--critical";
};

/**
 * Agent Attribution Tag — every agent-touched record shows a small,
 * consistent tag: `[icon] Ledger Agent · 2h ago · 96%`
 *
 * Same format everywhere, never varies field order.
 */
function AgentAttribution({
  agentName,
  timestamp,
  confidence,
  variant = "default",
  showIcon = true,
  className,
  ...props
}: AgentAttributionProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn("agent-tag", className)}
        title={`${agentName} · ${timestamp}`}
        {...props}
      >
        <span className={agentConfidenceDot(confidence)} />
        <span>{agentName}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "agent-tag gap-2",
        variant === "full" && "text-xs",
        className,
      )}
      {...props}
    >
      {showIcon && (
        <Brain className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
      )}
      <span className="font-medium text-foreground/80">{agentName}</span>
      <span aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" aria-hidden="true" />
        {timestamp}
      </span>
      {confidence !== undefined && (
        <>
          <span aria-hidden="true">·</span>
          <ConfidenceIndicator confidence={confidence} />
        </>
      )}
    </div>
  );
}

AgentAttribution.displayName = "AgentAttribution";

export { AgentAttribution };
