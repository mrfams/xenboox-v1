"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Layers,
  FileText,
  CheckCircle2,
  Clock,
  Truck,
  ShoppingCart,
} from "lucide-react";

type POStage = {
  id: string;
  label: string;
  count: number;
  icon: typeof FileText;
  color: string;
};

type ProcurementPOPipelineProps = {
  stages?: POStage[];
  className?: string;
};

const DEFAULT_STAGES: POStage[] = [
  {
    id: "draft",
    label: "Draft",
    count: 8,
    icon: FileText,
    color: "text-muted-foreground bg-muted/30",
  },
  {
    id: "pending",
    label: "Pending Approval",
    count: 14,
    icon: Clock,
    color: "text-attention-amber bg-attention-amber/10",
  },
  {
    id: "approved",
    label: "Approved",
    count: 42,
    icon: CheckCircle2,
    color: "text-balanced-green bg-balanced-green/10",
  },
  {
    id: "ordered",
    label: "Ordered",
    count: 37,
    icon: ShoppingCart,
    color: "text-signal-indigo bg-signal-indigo/10",
  },
  {
    id: "received",
    label: "Received",
    count: 29,
    icon: Truck,
    color: "text-cyan-500 bg-cyan-500/10",
  },
  {
    id: "completed",
    label: "Completed",
    count: 540,
    icon: CheckCircle2,
    color: "text-emerald-500 bg-emerald-500/10",
  },
];

export function ProcurementPOPipeline({
  stages = DEFAULT_STAGES,
  className,
}: ProcurementPOPipelineProps) {
  const total = stages.reduce((s, s_) => s + s_.count, 0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Purchase Order Pipeline
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground/50">
          {total} total
        </span>
      </div>

      <div className="space-y-1.5">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isHovered = hoveredId === stage.id;
          const maxCount = Math.max(...stages.map((s) => s.count));

          return (
            <div
              key={stage.id}
              className="flex items-center gap-3 px-1"
              onMouseEnter={() => setHoveredId(stage.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                  stage.color,
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={cn(
                      "text-xs font-medium transition-all",
                      isHovered ? "text-foreground" : "text-foreground/80",
                    )}
                  >
                    {stage.label}
                  </span>
                  <span className="text-xs font-bold tabular-nums">
                    {stage.count}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 bg-muted-foreground/30"
                    style={{ width: `${(stage.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
