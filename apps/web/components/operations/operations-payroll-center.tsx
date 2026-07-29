"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Users, Brain, CheckCircle2, ArrowRight } from "lucide-react";

type OperationsPayrollCenterProps = {
  employeeCount?: number;
  payrollDue?: string;
  netPayroll?: number;
  taxes?: string;
  benefits?: string;
  aiAssessment?: string;
  className?: string;
};

export function OperationsPayrollCenter({
  employeeCount = 148,
  payrollDue = "Friday",
  netPayroll = 182400,
  taxes = "Calculated",
  benefits = "Updated",
  aiAssessment = "Payroll is fully funded. No anomalies detected.",
  className,
}: OperationsPayrollCenterProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Payroll Center
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Employees", value: employeeCount.toString() },
          { label: "Payroll Due", value: payrollDue },
          { label: "Net Payroll", value: formatCurrency(netPayroll) },
          { label: "Taxes", value: taxes },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {item.label}
            </p>
            <p
              className={cn(
                "text-sm font-bold mt-1",
                item.label === "Net Payroll"
                  ? "tabular-nums text-attention-amber"
                  : "text-foreground/80",
              )}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5 text-balanced-green" />
        <span className="text-muted-foreground/60">{benefits} · </span>
        <Brain className="h-3.5 w-3.5 text-signal-indigo" />
        <span className="text-muted-foreground/70 italic">{aiAssessment}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          {
            label: "Detect payroll anomalies",
            color: "bg-signal-indigo/10 text-signal-indigo",
          },
          {
            label: "Review overtime",
            color: "bg-attention-amber/10 text-attention-amber",
          },
          {
            label: "Compare payroll vs revenue",
            color: "bg-cyan-500/10 text-cyan-500",
          },
          {
            label: "Forecast hiring impact",
            color: "bg-purple-500/10 text-purple-500",
          },
        ].map((suggestion) => (
          <button
            key={suggestion.label}
            type="button"
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-medium transition-all hover:opacity-80",
              suggestion.color,
            )}
          >
            {suggestion.label} <ArrowRight className="h-2.5 w-2.5" />
          </button>
        ))}
      </div>
    </div>
  );
}
