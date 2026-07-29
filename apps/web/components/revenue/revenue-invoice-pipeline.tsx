"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Layers,
  FileText,
  Send,
  Eye,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type PipelineStage = {
  id: string;
  label: string;
  count: number;
  icon: typeof FileText;
  color: string;
};

type RevenueInvoicePipelineProps = {
  stages?: PipelineStage[];
  className?: string;
};

const DEFAULT_STAGES: PipelineStage[] = [
  {
    id: "draft",
    label: "Draft",
    count: 12,
    icon: FileText,
    color: "text-muted-foreground bg-muted/30",
  },
  {
    id: "sent",
    label: "Sent",
    count: 48,
    icon: Send,
    color: "text-signal-indigo bg-signal-indigo/10",
  },
  {
    id: "viewed",
    label: "Viewed",
    count: 39,
    icon: Eye,
    color: "text-cyan-500 bg-cyan-500/10",
  },
  {
    id: "partial",
    label: "Partially Paid",
    count: 14,
    icon: CreditCard,
    color: "text-attention-amber bg-attention-amber/10",
  },
  {
    id: "paid",
    label: "Paid",
    count: 421,
    icon: CheckCircle2,
    color: "text-balanced-green bg-balanced-green/10",
  },
  {
    id: "overdue",
    label: "Overdue",
    count: 7,
    icon: AlertTriangle,
    color: "text-error-clay bg-error-clay/10",
  },
];

export function RevenueInvoicePipeline({
  stages = DEFAULT_STAGES,
  className,
}: RevenueInvoicePipelineProps) {
  const total = stages.reduce((s, s_) => s + s_.count, 0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Invoice Pipeline
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground/50">
          {total} total
        </span>
      </div>

      {/* Pipeline funnel */}
      <div className="space-y-1.5">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isHovered = hoveredId === stage.id;
          const barWidth = idx === 0 ? 35 : idx === stages.length - 1 ? 25 : 45; // funnel shape

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
                <div className="flex justify-center">
                  <div
                    className="h-1.5 rounded-full bg-muted overflow-hidden"
                    style={{ width: `${barWidth}%` }}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        stage.color.split(" ")[0].replace("text-", "bg-"),
                      )}
                      style={{
                        width: `${(stage.count / Math.max(...stages.map((s) => s.count))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
