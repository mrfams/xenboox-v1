"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Star, ArrowRight, X } from "lucide-react";

type RiskItem = {
  id: string;
  title: string;
  impact: "high" | "medium" | "low";
  action: string;
  priority: number;
};

const DEFAULT_RISKS: RiskItem[] = [
  {
    id: "r1",
    title: "Missing Supplier Tax Documents",
    impact: "medium",
    action: "Request documents",
    priority: 5,
  },
  {
    id: "r2",
    title: "Unusual Expense Pattern Detected",
    impact: "low",
    action: "Review transactions",
    priority: 4,
  },
  {
    id: "r3",
    title: "Late Filing Risk — Corporate Tax",
    impact: "high",
    action: "Prepare submission",
    priority: 5,
  },
];

const IMPACT_COLORS: Record<string, string> = {
  high: "bg-error-clay/10 text-error-clay border-error-clay/20",
  medium:
    "bg-attention-amber/10 text-attention-amber border-attention-amber/20",
  low: "bg-muted text-muted-foreground border-border",
};

export function ComplianceRiskMonitor() {
  const [risks, setRisks] = useState(DEFAULT_RISKS);

  const dismissRisk = (id: string) => {
    setRisks((prev) => prev.filter((r) => r.id !== id));
  };

  const resetRisks = () => {
    setRisks(DEFAULT_RISKS);
  };

  if (risks.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-balanced-green/10">
            <AlertTriangle className="h-5 w-5 text-balanced-green" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            All risks resolved
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            No compliance risks detected.
          </p>
          <button
            onClick={resetRisks}
            className="text-xs font-medium text-signal-indigo hover:underline"
          >
            Show mock data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-attention-amber" />
          <h3 className="text-sm font-medium">Risk Monitor</h3>
        </div>
      </div>
      <div className="divide-y">
        {risks.map((risk) => (
          <div
            key={risk.id}
            className="px-4 py-3 transition-colors hover:bg-accent/30"
          >
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{risk.title}</span>
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[9px] font-medium capitalize",
                      IMPACT_COLORS[risk.impact],
                    )}
                  >
                    {risk.impact}
                  </span>
                </div>
              </div>
              <button
                onClick={() => dismissRisk(risk.id)}
                className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              {/* Star priority */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={cn(
                      "h-2.5 w-2.5",
                      idx < risk.priority
                        ? "fill-attention-amber text-attention-amber"
                        : "text-muted-foreground/20",
                    )}
                  />
                ))}
              </div>
              <button className="flex items-center gap-1 text-[10px] font-medium text-signal-indigo hover:underline">
                {risk.action} <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {risks.length > 0 && risks.length < DEFAULT_RISKS.length && (
        <button
          onClick={resetRisks}
          className="flex w-full items-center justify-center border-t px-4 py-2 text-[10px] font-medium text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          Show all risks
        </button>
      )}
    </div>
  );
}
