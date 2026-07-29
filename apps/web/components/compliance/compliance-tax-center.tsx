"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DollarSign, FileText, Brain, ArrowRight } from "lucide-react";

type TaxItem = {
  id: string;
  name: string;
  due: string;
  liability: string;
  status: "ready" | "preparing" | "healthy";
  locked?: boolean;
};

const TAX_ITEMS: TaxItem[] = [
  {
    id: "vat",
    name: "VAT",
    due: "September 15",
    liability: "$42,800",
    status: "ready",
  },
  {
    id: "corporate",
    name: "Corporate Tax",
    due: "March 31",
    liability: "$184,000",
    status: "preparing",
  },
  {
    id: "payroll",
    name: "Payroll Taxes",
    due: "Ongoing",
    liability: "$18,400/month",
    status: "healthy",
  },
];

const STATUS_COLORS: Record<string, string> = {
  ready: "bg-balanced-green/10 text-balanced-green border-balanced-green/20",
  preparing:
    "bg-attention-amber/10 text-attention-amber border-attention-amber/20",
  healthy: "bg-balanced-green/10 text-balanced-green border-balanced-green/20",
};

const STATUS_LABELS: Record<string, string> = {
  ready: "Ready",
  preparing: "Preparing",
  healthy: "Healthy",
};

export function ComplianceTaxCenter() {
  const [selectedPeriod] = useState("Q3 2026");

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Tax Center</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {selectedPeriod}
        </span>
      </div>

      {/* Tax items */}
      <div className="divide-y">
        {TAX_ITEMS.map((item) => (
          <div
            key={item.id}
            className="px-4 py-3 transition-colors hover:bg-accent/30"
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <span className="text-sm font-medium">{item.name}</span>
                <span
                  className={cn(
                    "ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium",
                    STATUS_COLORS[item.status],
                  )}
                >
                  {STATUS_LABELS[item.status]}
                </span>
              </div>
              <span className="text-sm font-bold tabular-nums">
                {item.liability}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground/60">
                Due {item.due}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* AI Tax Assistant */}
      <div className="border-t bg-accent/30 p-3">
        <div className="flex items-start gap-2">
          <Brain className="h-3.5 w-3.5 text-signal-indigo mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground mb-1">
              AI Tax Assistant
            </p>
            <p className="text-xs text-muted-foreground">
              VAT increased by $12,400 this quarter. Sales grew 18% but input
              VAT decreased 6%.
            </p>
            <button className="mt-1.5 flex items-center gap-1 text-xs font-medium text-signal-indigo hover:underline">
              Recover missing input VAT <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
