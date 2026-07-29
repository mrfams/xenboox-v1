"use client";

import { cn } from "@/lib/utils";
import { Brain, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

type IntelligenceFinancialBriefingProps = {
  date?: string;
  highlights?: string[];
  warnings?: string[];
  recommendation?: string;
  className?: string;
};

const DEFAULT_PROPS = {
  date: "Today's Financial Briefing",
  highlights: [
    "Enterprise customers grew 24% driving revenue growth",
    "Repeat purchases increased 12% month-over-month",
    "Cash conversion cycle improved by 3 days",
  ],
  warnings: [
    "Marketing expenses increased 31% — exceeding revenue growth rate",
    "Gross margin declined 2.4% due to higher supplier costs",
  ],
  recommendation:
    "Review marketing efficiency before increasing spend further. Consider renegotiating top 3 supplier contracts.",
};

export function IntelligenceFinancialBriefing({
  date = DEFAULT_PROPS.date,
  highlights = DEFAULT_PROPS.highlights,
  warnings = DEFAULT_PROPS.warnings,
  recommendation = DEFAULT_PROPS.recommendation,
  className,
}: IntelligenceFinancialBriefingProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Brain className="h-4 w-4 text-signal-indigo" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          {date}
        </h3>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        {/* Narrative intro */}
        <p className="text-sm text-foreground/80 leading-relaxed">
          Revenue increased{" "}
          <span className="font-bold text-balanced-green">18%</span> this month.
          The growth came mainly from:
        </p>

        {/* Highlights */}
        <div className="space-y-1.5">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-balanced-green mt-0.5" />
              <span className="text-xs text-foreground/70">{h}</span>
            </div>
          ))}
        </div>

        {/* Warnings */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-attention-amber">However:</p>
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-attention-amber mt-0.5" />
              <span className="text-xs text-foreground/70">{w}</span>
            </div>
          ))}
        </div>

        {/* Recommendation */}
        <div className="rounded-lg bg-signal-indigo/5 border border-signal-indigo/10 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Brain className="h-3.5 w-3.5 text-signal-indigo" />
            <span className="text-[10px] font-medium text-signal-indigo uppercase">
              Recommendation
            </span>
          </div>
          <p className="text-xs text-foreground/70">{recommendation}</p>
          <button
            type="button"
            className="mt-1.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-all"
          >
            Review Details <ArrowRight className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
