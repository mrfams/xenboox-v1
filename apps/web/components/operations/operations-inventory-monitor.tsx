"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Boxes, Brain, ArrowRight } from "lucide-react";

type OperationsInventoryMonitorProps = {
  status?: string;
  lowStock?: number;
  outOfStock?: number;
  slowMoving?: number;
  fastMoving?: number;
  inventoryValue?: number;
  aiPrediction?: string;
  className?: string;
};

export function OperationsInventoryMonitor({
  status = "Healthy",
  lowStock = 12,
  outOfStock = 2,
  slowMoving = 16,
  fastMoving = 48,
  inventoryValue = 1240000,
  aiPrediction = "Reorder Product X within 6 days to avoid stockout.",
  className,
}: OperationsInventoryMonitorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Inventory Monitor
          </h3>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-medium",
            status === "Healthy"
              ? "bg-balanced-green/10 text-balanced-green"
              : "bg-attention-amber/10 text-attention-amber",
          )}
        >
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          {
            label: "Low Stock",
            value: lowStock.toString(),
            color: "text-attention-amber bg-attention-amber/10",
          },
          {
            label: "Out of Stock",
            value: outOfStock.toString(),
            color: "text-error-clay bg-error-clay/10",
          },
          {
            label: "Slow Moving",
            value: slowMoving.toString(),
            color: "text-attention-amber bg-attention-amber/10",
          },
          {
            label: "Fast Moving",
            value: fastMoving.toString(),
            color: "text-balanced-green bg-balanced-green/10",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-2.5">
            <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
              {item.label}
            </p>
            <p
              className={cn(
                "text-sm font-bold mt-0.5",
                item.color.split(" ")[0],
              )}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-muted-foreground/60">Inventory Value</span>
        <span className="font-bold tabular-nums text-balanced-green">
          {formatCurrency(inventoryValue)}
        </span>
      </div>

      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Brain className="h-3.5 w-3.5 text-signal-indigo" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase">
            AI Prediction
          </span>
        </div>
        <p className="text-xs text-foreground/70">{aiPrediction}</p>
        <button
          type="button"
          className="mt-1.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-all"
        >
          Reorder Now <ArrowRight className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}
