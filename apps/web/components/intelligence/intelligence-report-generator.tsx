"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FileText,
  ArrowRight,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Search,
  FileSpreadsheet,
} from "lucide-react";

type ReportType = {
  id: string;
  label: string;
  icon: typeof FileText;
  prompt: string;
  color: string;
};

const REPORT_TYPES: ReportType[] = [
  {
    id: "board",
    label: "Board Report",
    icon: BarChart3,
    prompt:
      "Generate a comprehensive board report covering financial performance, key metrics, and strategic recommendations.",
    color: "text-signal-indigo bg-signal-indigo/10",
  },
  {
    id: "investor",
    label: "Investor Update",
    icon: TrendingUp,
    prompt:
      "Create an investor update with revenue growth, burn rate, runway, and milestone progress.",
    color: "text-balanced-green bg-balanced-green/10",
  },
  {
    id: "management",
    label: "Management Accounts",
    icon: FileSpreadsheet,
    prompt:
      "Prepare management accounts including P&L, Balance Sheet, and Cash Flow with variance analysis.",
    color: "text-cyan-500 bg-cyan-500/10",
  },
  {
    id: "cash",
    label: "Cash Review",
    icon: DollarSign,
    prompt:
      "Generate a detailed cash review with position, forecast, and working capital analysis.",
    color: "text-attention-amber bg-attention-amber/10",
  },
  {
    id: "profitability",
    label: "Profitability Analysis",
    icon: BarChart3,
    prompt:
      "Analyse profitability by product line, customer segment, and department with recommendations.",
    color: "text-purple-500 bg-purple-500/10",
  },
  {
    id: "tax",
    label: "Tax Summary",
    icon: FileText,
    prompt:
      "Prepare a tax summary for the current period with liabilities, filings, and payment schedule.",
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    id: "custom",
    label: "Custom Report",
    icon: Search,
    prompt: "Help me create a custom report. I'll describe what I need.",
    color: "text-rose-500 bg-rose-500/10",
  },
];

export function IntelligenceReportGenerator({
  className,
}: {
  className?: string;
}) {
  const [customPrompt, setCustomPrompt] = useState("");
  const router = useRouter();

  const handleGenerate = (prompt: string) => {
    router.push(`/dashboard/chat?initial=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Report Generator
        </h3>
      </div>

      <p className="text-xs text-muted-foreground/60 px-1">What do you need?</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          return (
            <button
              key={rt.id}
              type="button"
              onClick={() => handleGenerate(rt.prompt)}
              className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-center transition-all hover:shadow-sm hover:border-signal-indigo/30"
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  rt.color,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium text-foreground/80 leading-tight">
                {rt.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-3">
        <p className="text-[10px] font-medium text-muted-foreground mb-2">
          Or describe what you need:
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g., Monthly financial summary for Q3..."
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-signal-indigo/50 transition-colors"
          />
          <button
            type="button"
            onClick={() =>
              customPrompt.trim() && handleGenerate(customPrompt.trim())
            }
            disabled={!customPrompt.trim()}
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all",
              customPrompt.trim()
                ? "bg-signal-indigo text-white hover:bg-signal-indigo"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            Generate <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
