"use client";

import { Bot, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type AgentItem = {
  id: string;
  name: string;
  detail: string;
  progress: number;
  eta: string;
  color: string;
};

type ActiveAgentsProps = {
  className?: string;
};

export function ActiveAgents({ className }: ActiveAgentsProps) {
  const agents: AgentItem[] = [
    {
      id: "1",
      name: "Bank Reconciler",
      detail: "Reconciled 3 of 5 accounts",
      progress: 60,
      eta: "ETA 5m",
      color: "from-emerald-500 to-teal-500",
    },
    {
      id: "2",
      name: "Invoice Processor",
      detail: "Processing invoices",
      progress: 78,
      eta: "ETA 3m",
      color: "from-[#6366F1] to-blue-500",
    },
    {
      id: "3",
      name: "Payroll Agent",
      detail: "Calculating taxes",
      progress: 45,
      eta: "ETA 8m",
      color: "from-amber-500 to-orange-500",
    },
    {
      id: "4",
      name: "Report Generator",
      detail: "Generating P&L report",
      progress: 90,
      eta: "ETA 2m",
      color: "from-purple-500 to-indigo-500",
    },
    {
      id: "5",
      name: "Expense Categorizer",
      detail: "Categorizing expenses",
      progress: 30,
      eta: "ETA 10m",
      color: "from-sky-500 to-cyan-500",
    },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Active Agents</h2>
        <span className="text-[10px] text-muted-foreground">
          {agents.length} agents are currently working
        </span>
      </div>

      <div className="space-y-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:shadow-sm"
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                agent.color,
              )}
            >
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {agent.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {agent.detail}
              </p>
              {/* Progress bar */}
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000 bg-gradient-to-r",
                      agent.color,
                    )}
                    style={{ width: `${agent.progress}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {agent.progress}%
                </span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {agent.eta}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="flex items-center gap-1 text-[11px] font-medium text-[#6366F1] hover:text-[#6366F1]/80 transition-colors"
      >
        View all agents
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}
