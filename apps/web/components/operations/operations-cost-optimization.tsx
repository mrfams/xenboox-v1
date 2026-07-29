"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Star, ArrowRight, DollarSign } from "lucide-react";

type CostOptimization = {
  id: string;
  priority: number;
  action: string;
  savings: string;
  reason: string;
  detail: string;
  color: string;
};

type OperationsCostOptimizationProps = {
  items?: CostOptimization[];
  className?: string;
};

const DEFAULT_ITEMS: CostOptimization[] = [
  {
    id: "co1",
    priority: 5,
    action: "Reduce AWS Spend",
    savings: "$4,800/month",
    reason: "Right-size unused instances",
    detail:
      "Analysis shows 3 EC2 instances have been idle for 60+ days. Rightsizing and reserved instance pricing could save $4,800/month.",
    color: "text-signal-indigo bg-signal-indigo/10",
  },
  {
    id: "co2",
    priority: 5,
    action: "Cancel Unused Software Licenses",
    savings: "$2,300/month",
    reason: "Licenses not accessed in 90 days",
    detail:
      "12 software licenses across 4 tools have not been accessed in 90+ days. Canceling would save $2,300/month without impacting operations.",
    color: "text-balanced-green bg-balanced-green/10",
  },
  {
    id: "co3",
    priority: 4,
    action: "Dispose of Idle Assets",
    savings: "$42,000 one-time",
    reason: "8 assets idle for 6+ months",
    detail:
      "8 fixed assets (laptops, monitors, office equipment) valued at $42,000 have been idle for over 6 months. Recommend disposal or repurposing.",
    color: "text-attention-amber bg-attention-amber/10",
  },
  {
    id: "co4",
    priority: 4,
    action: "Optimize Inventory Orders",
    savings: "$18,000 working capital",
    reason: "Reduce safety stock levels",
    detail:
      "Inventory analysis shows safety stock levels for 6 SKUs can be reduced by 30% without impacting service levels, freeing $18,000 in working capital.",
    color: "text-cyan-500 bg-cyan-500/10",
  },
  {
    id: "co5",
    priority: 3,
    action: "Renegotiate Vendor Contracts",
    savings: "$12,000/year",
    reason: "Contract renewal in 45 days",
    detail:
      "3 vendor contracts are up for renewal in the next 60 days. Based on usage benchmarks, negotiating 10% reductions could save $12,000/year.",
    color: "text-purple-500 bg-purple-500/10",
  },
];

export function OperationsCostOptimization({
  items = DEFAULT_ITEMS,
  className,
}: OperationsCostOptimizationProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-balanced-green" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Cost Optimization
          </h3>
        </div>
        <span className="text-[10px] text-balanced-green font-medium">
          {items.length} opportunities
        </span>
      </div>

      <div className="space-y-1.5">
        {items.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border bg-card p-3 transition-all hover:shadow-sm",
                isSelected && "ring-1 ring-balanced-green/30",
              )}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    item.color,
                  )}
                >
                  <DollarSign className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-0.5 mb-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < item.priority
                            ? "text-attention-amber fill-attention-amber"
                            : "text-muted-foreground/20",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-foreground/80">
                    {item.action}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-medium text-balanced-green">
                      {item.savings}
                    </span>
                    <span className="text-[10px] text-muted-foreground/30">
                      ·
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {item.reason}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-2.5 ml-[42px]">
                <button
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : item.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-signal-indigo/10 px-2 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/20 transition-colors"
                >
                  Review <ArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>

              {isSelected && (
                <div className="mt-2.5 ml-[42px] rounded-md bg-muted/20 border px-2.5 py-2 text-[10px] text-muted-foreground/70 leading-relaxed">
                  <p className="font-medium text-foreground/80 mb-0.5">
                    AI Analysis
                  </p>
                  <p>{item.detail}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
