"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Brain, FileText, ArrowRight, X } from "lucide-react";

type IncomeStatementLine = {
  id: string;
  label: string;
  amount: number;
  type: "header" | "total" | "line";
};

type IntelligenceFinancialStatementsProps = {
  lines?: IncomeStatementLine[];
  aiExplanation?: string;
  className?: string;
};

const DEFAULT_LINES: IncomeStatementLine[] = [
  { id: "is1", label: "Revenue", amount: 842000, type: "header" },
  { id: "is2", label: "Cost of Sales", amount: 556000, type: "line" },
  { id: "is3", label: "Gross Profit", amount: 286000, type: "total" },
  { id: "is4", label: "Operating Expenses", amount: 192000, type: "header" },
  { id: "is5", label: "Net Profit", amount: 94000, type: "total" },
];

export function IntelligenceFinancialStatements({
  lines = DEFAULT_LINES,
  aiExplanation = "Revenue grew strongly, but operating costs increased faster. Main pressure points: Marketing, Software subscriptions, Contractor costs.",
  className,
}: IntelligenceFinancialStatementsProps) {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Profit & Loss
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all",
            showExplanation
              ? "bg-signal-indigo/10 text-signal-indigo"
              : "bg-muted/30 text-muted-foreground hover:text-foreground",
          )}
        >
          <Brain className="h-3 w-3" />
          Explain
        </button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {lines.map((line) => (
          <div
            key={line.id}
            className={cn(
              "flex items-center justify-between px-4 py-2.5",
              line.type === "header" && "bg-muted/20 font-medium",
              line.type === "total" &&
                "bg-signal-indigo/[0.02] border-t border-b font-bold",
            )}
          >
            <span
              className={cn(
                "text-xs",
                line.type === "total" && "text-foreground",
              )}
            >
              {line.label}
            </span>
            <span
              className={cn(
                "text-xs font-bold tabular-nums",
                line.id === "is3" || line.id === "is5"
                  ? "text-balanced-green"
                  : "text-foreground/80",
              )}
            >
              {formatCurrency(line.amount)}
            </span>
          </div>
        ))}
      </div>

      {showExplanation && (
        <div className="rounded-xl border bg-card p-3.5 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Brain className="h-3.5 w-3.5 text-signal-indigo" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                AI Analysis
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowExplanation(false)}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/30 hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="text-xs text-foreground/70 leading-relaxed">
            {aiExplanation}
          </p>
          <div className="flex gap-1.5 mt-2">
            <button
              type="button"
              className="rounded-md bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
            >
              Review recurring subscriptions
            </button>
            <button
              type="button"
              className="rounded-md bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
            >
              Compare with last month
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
