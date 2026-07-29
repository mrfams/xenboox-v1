"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ArrowDown, Clock, AlertTriangle } from "lucide-react";

const STAGES = [
  { label: "Employee", status: "complete" as const },
  { label: "Manager", status: "complete" as const },
  { label: "Finance", status: "bottleneck" as const },
  { label: "CEO", status: "pending" as const },
];

export function KnowledgeApprovalWorkflow() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Approval Workflow</h3>
      </div>
      <div className="p-4">
        {/* Flow stages */}
        <div className="space-y-1">
          {STAGES.map((stage, idx) => (
            <div key={stage.label}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  stage.status === "bottleneck"
                    ? "bg-attention-amber/10 border border-attention-amber/20"
                    : stage.status === "complete"
                      ? "bg-balanced-green/5"
                      : "bg-muted/30",
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold",
                    stage.status === "complete" &&
                      "bg-balanced-green/20 text-balanced-green",
                    stage.status === "bottleneck" &&
                      "bg-attention-amber/20 text-attention-amber",
                    stage.status === "pending" &&
                      "bg-muted-foreground/10 text-muted-foreground",
                  )}
                >
                  {idx + 1}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    stage.status === "bottleneck" && "text-attention-amber",
                    stage.status === "complete" && "text-foreground",
                    stage.status === "pending" && "text-muted-foreground",
                  )}
                >
                  {stage.label}
                </span>
                {stage.status === "bottleneck" && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-attention-amber" />
                    <span className="text-[9px] text-attention-amber">
                      8 items · 2.4 day delay
                    </span>
                  </div>
                )}
              </div>
              {/* Arrow connector */}
              {idx < STAGES.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDown className="h-3 w-3 text-muted-foreground/30" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottleneck callout */}
        <div className="mt-3 rounded-lg bg-accent/30 p-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 text-attention-amber mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              <span className="font-medium text-attention-amber">
                Current Bottleneck:
              </span>{" "}
              Finance Review — 8 items waiting. Average delay: 2.4 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
