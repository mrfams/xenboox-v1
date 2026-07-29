"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Brain, TrendingDown } from "lucide-react";

type CashImpactProps = {
  currentCash?: number;
  afterPayments?: number;
  expectedCollections?: number;
  projectedCash?: number;
  aiAssessment?: string;
  className?: string;
};

export function ProcurementCashImpact({
  currentCash = 1840000,
  afterPayments = 1736000,
  expectedCollections = 126000,
  projectedCash = 1862000,
  aiAssessment = "Cash remains healthy. No liquidity concerns detected.",
  className,
}: CashImpactProps) {
  const paymentImpact = currentCash - afterPayments;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <TrendingDown className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Cash Impact Forecast
        </h3>
      </div>

      {/* Flow visualization */}
      <div className="space-y-2">
        {[
          {
            label: "Current Cash",
            amount: currentCash,
            color: "bg-balanced-green",
          },
          {
            label: "After Payments",
            amount: afterPayments,
            color: "bg-attention-amber",
            deduct: paymentImpact,
          },
          {
            label: "Expected Collections",
            amount: expectedCollections,
            color: "bg-balanced-green",
            add: true,
          },
          {
            label: "Projected Cash",
            amount: projectedCash,
            color: "bg-balanced-green",
            final: true,
          },
        ].map((step, i) => (
          <div key={step.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1.5">
                {step.deduct && (
                  <span className="text-[10px] text-attention-amber">
                    −{formatCurrency(step.deduct)}
                  </span>
                )}
                {step.add && (
                  <span className="text-[10px] text-balanced-green">
                    +{formatCurrency(expectedCollections)}
                  </span>
                )}
                <span
                  className={cn(
                    "font-medium",
                    i === 0 && "text-foreground/80",
                    i === 3 && "text-balanced-green font-bold",
                  )}
                >
                  {step.label}
                </span>
              </div>
              <span
                className={cn(
                  "font-bold tabular-nums",
                  i === 3 && "text-balanced-green",
                )}
              >
                {formatCurrency(step.amount)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  step.final
                    ? "bg-gradient-to-r from-attention-amber to-balanced-green"
                    : step.color,
                )}
                style={{ width: `${(step.amount / currentCash) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* AI Assessment */}
      <div className="rounded-xl border bg-card p-3.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Brain className="h-3.5 w-3.5 text-balanced-green" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase">
            AI Assessment
          </span>
        </div>
        <p className="text-xs text-foreground/70 leading-relaxed">
          {aiAssessment}
        </p>
      </div>
    </div>
  );
}
