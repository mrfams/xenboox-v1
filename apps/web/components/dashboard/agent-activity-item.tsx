"use client";

import { useState } from "react";
import { Bot, ChevronDown, ChevronUp, Clock, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfidenceBadge } from "@/components/dashboard/confidence-badge";

const agentIcons: Record<string, string> = {
  cfo: "CFO",
  controller: "CTR",
  treasury: "TRS",
  compliance: "CMP",
  payroll: "PRL",
  ledger: "LDG",
  ap: "AP",
  ar: "AR",
  cash: "CSH",
};

type AgentActivityItemProps = {
  agent: string;
  action: string;
  timestamp: string;
  entity?: string;
  confidence?: "high" | "medium" | "low";
  source?: string;
  reasoning?: string;
};

export function AgentActivityItem({
  agent,
  action,
  timestamp,
  entity,
  confidence = "high",
  source,
  reasoning,
}: AgentActivityItemProps) {
  const [expanded, setExpanded] = useState(false);
  const icon =
    agentIcons[agent.toLowerCase()] ?? agent.slice(0, 3).toUpperCase();

  return (
    <div className="group rounded-lg border bg-card transition-colors hover:bg-accent/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            <span className="font-semibold capitalize">{agent}</span>
            <span className="text-muted-foreground font-normal"> {action}</span>
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {timestamp}
            </span>
            {entity && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Tag className="h-3 w-3" />
                {entity}
              </span>
            )}
          </div>
        </div>

        <ConfidenceBadge level={confidence} />
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (source || reasoning) && (
        <div className="border-t px-3 py-3 space-y-2 bg-muted/30 rounded-b-lg">
          {source && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Source Document
              </p>
              <p className="text-sm text-foreground">{source}</p>
            </div>
          )}
          {reasoning && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Agent Reasoning
              </p>
              <p className="text-sm text-muted-foreground">{reasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
