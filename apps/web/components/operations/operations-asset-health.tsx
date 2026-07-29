"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Package, Brain, ArrowRight } from "lucide-react";

type OperationsAssetHealthProps = {
  totalAssets?: number;
  inService?: number;
  maintenanceDue?: number;
  idleAssets?: number;
  depreciationThisMonth?: number;
  aiRecommendation?: string;
  className?: string;
};

export function OperationsAssetHealth({
  totalAssets = 482,
  inService = 470,
  maintenanceDue = 4,
  idleAssets = 8,
  depreciationThisMonth = 18400,
  aiRecommendation = "Dispose of unused equipment worth $42,000.",
  className,
}: OperationsAssetHealthProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Package className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Asset Health
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          {
            label: "Total Assets",
            value: totalAssets.toString(),
            color: "text-foreground/80",
          },
          {
            label: "In Service",
            value: inService.toString(),
            color: "text-balanced-green",
          },
          {
            label: "Maintenance Due",
            value: maintenanceDue.toString(),
            color:
              maintenanceDue > 0
                ? "text-attention-amber"
                : "text-balanced-green",
          },
          {
            label: "Idle Assets",
            value: idleAssets.toString(),
            color:
              idleAssets > 0 ? "text-attention-amber" : "text-balanced-green",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {item.label}
            </p>
            <p className={cn("text-lg font-bold mt-1", item.color)}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-muted-foreground/60">
          Depreciation this month
        </span>
        <span className="font-bold tabular-nums text-attention-amber">
          {formatCurrency(depreciationThisMonth)}
        </span>
      </div>

      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Brain className="h-3.5 w-3.5 text-signal-indigo" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase">
            AI Recommendation
          </span>
        </div>
        <p className="text-xs text-foreground/70">{aiRecommendation}</p>
        <button
          type="button"
          className="mt-1.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-all"
        >
          Review Assets <ArrowRight className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}
