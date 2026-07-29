"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Bot, Loader2, CheckCircle2, ChevronRight } from "lucide-react";

type WorkflowStatus = "running" | "complete" | "pending";

type ActiveWorkflow = {
  id: string;
  label: string;
  status: WorkflowStatus;
  progress: number; // 0-100
  agent: string;
  detail?: string;
};

type ActiveWorkflowsProps = {
  workflows: ActiveWorkflow[];
  className?: string;
};

const AGENT_COLORS: Record<string, string> = {
  treasury: "from-emerald-500 to-teal-500",
  reconciliation: "from-cyan-500 to-blue-500",
  reporting: "from-purple-500 to-indigo-500",
  analytics: "from-orange-500 to-amber-500",
  document: "from-pink-500 to-rose-500",
  cfo: "from-signal-indigo to-blue-600",
};

function WorkflowRow({ workflow }: { workflow: ActiveWorkflow }) {
  const isRunning = workflow.status === "running";
  const isComplete = workflow.status === "complete";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300",
        isRunning && "bg-muted/30",
        isComplete && "opacity-60",
      )}
    >
      {/* Status icon */}
      <div className="shrink-0">
        {isRunning && (
          <Loader2 className="h-4 w-4 text-signal-indigo motion-safe:animate-spin" />
        )}
        {isComplete && <CheckCircle2 className="h-4 w-4 text-balanced-green" />}
        {workflow.status === "pending" && (
          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-medium",
              isRunning && "text-foreground",
              isComplete && "text-muted-foreground",
            )}
          >
            {workflow.label}
          </span>
          {isRunning && (
            <span className="flex items-center gap-1 rounded-full bg-signal-indigo/10 px-1.5 py-0.5 text-[9px] font-medium text-signal-indigo">
              <span className="h-1 w-1 rounded-full bg-signal-indigo motion-safe:animate-pulse" />
              Processing
            </span>
          )}
        </div>

        {workflow.detail && (
          <p className="mt-0.5 text-[10px] text-muted-foreground/70 truncate max-w-[200px]">
            {workflow.detail}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-20 shrink-0">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              isRunning &&
                "bg-gradient-to-r from-signal-indigo to-blue-500 motion-safe:animate-pulse",
              isComplete && "bg-balanced-green",
              workflow.status === "pending" && "bg-muted-foreground/20",
            )}
            style={{ width: `${workflow.progress}%` }}
          />
        </div>
        <p className="mt-0.5 text-right text-[9px] tabular-nums text-muted-foreground/60">
          {isComplete ? "Done" : `${workflow.progress}%`}
        </p>
      </div>
    </div>
  );
}

export function ActiveWorkflows({
  workflows,
  className,
}: ActiveWorkflowsProps) {
  const runningCount = useMemo(
    () => workflows.filter((w) => w.status === "running").length,
    [workflows],
  );

  if (workflows.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Active Workflows
          </h2>
        </div>
        <div className="rounded-xl border border-dashed py-6 text-center">
          <p className="text-xs text-muted-foreground">No active workflows</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-signal-indigo" />
          <h2 className="text-sm font-semibold text-foreground">
            Active Workflows
          </h2>
          {runningCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-signal-indigo/10 px-2 py-0.5 text-[10px] font-medium text-signal-indigo">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-indigo motion-safe:animate-ping" />
              {runningCount} running
            </span>
          )}
        </div>
      </div>

      <div className="space-y-0.5">
        {workflows.map((workflow) => (
          <WorkflowRow key={workflow.id} workflow={workflow} />
        ))}
      </div>
    </div>
  );
}

// ─── Default Workflows Factory ──────────────────────────────────────────────

export function createDefaultWorkflows(): ActiveWorkflow[] {
  return [
    {
      id: "wf-1",
      label: "Reconciling Bank",
      status: "running",
      progress: 82,
      agent: "reconciliation",
      detail: "Matching 45 transactions for Main Operating Account",
    },
    {
      id: "wf-2",
      label: "Generating July Financial Statements",
      status: "running",
      progress: 55,
      agent: "reporting",
      detail: "Compiling P&L, Balance Sheet, and Cash Flow",
    },
    {
      id: "wf-3",
      label: "Analyzing Expenses",
      status: "running",
      progress: 90,
      agent: "analytics",
      detail: "Running anomaly detection on expense patterns",
    },
    {
      id: "wf-4",
      label: "Preparing Cash Forecast",
      status: "running",
      progress: 35,
      agent: "treasury",
      detail: "Projecting 90-day cash position",
    },
    {
      id: "wf-5",
      label: "Processing Incoming Documents",
      status: "complete",
      progress: 100,
      agent: "document",
      detail: "3 invoices classified and linked",
    },
  ];
}
