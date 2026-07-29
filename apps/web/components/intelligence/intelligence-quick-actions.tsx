"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Zap,
  BarChart3,
  TrendingUp,
  FileText,
  DollarSign,
  Target,
  Search,
  Beaker,
  Users,
  X,
} from "lucide-react";

type QuickAction = {
  id: string;
  icon: typeof Zap;
  label: string;
  prompt: string;
  color: string;
};

const ACTIONS: QuickAction[] = [
  {
    id: "qa1",
    icon: BarChart3,
    label: "Explain Performance",
    prompt:
      "Explain my financial performance this period. What drove revenue, costs, and profitability changes?",
    color: "text-signal-indigo bg-signal-indigo/10",
  },
  {
    id: "qa2",
    icon: FileText,
    label: "Create Board Report",
    prompt:
      "Generate a comprehensive board report with financial highlights, KPIs, and strategic recommendations.",
    color: "text-balanced-green bg-balanced-green/10",
  },
  {
    id: "qa3",
    icon: TrendingUp,
    label: "Forecast Next Quarter",
    prompt:
      "Forecast revenue, expenses, and cash position for the next quarter with confidence levels.",
    color: "text-cyan-500 bg-cyan-500/10",
  },
  {
    id: "qa4",
    icon: DollarSign,
    label: "Compare Periods",
    prompt:
      "Compare this period's financial performance against last period and highlight key changes.",
    color: "text-attention-amber bg-attention-amber/10",
  },
  {
    id: "qa5",
    icon: Target,
    label: "Analyze Margins",
    prompt:
      "Analyze gross and net profit margins, identify trends, and recommend improvement actions.",
    color: "text-purple-500 bg-purple-500/10",
  },
  {
    id: "qa6",
    icon: Search,
    label: "Find Savings",
    prompt:
      "Analyze all cost centers and identify the top 5 opportunities to reduce expenses.",
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    id: "qa7",
    icon: Beaker,
    label: "Run Scenario",
    prompt:
      "Run a financial scenario analysis. What happens if key variables change?",
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    id: "qa8",
    icon: Users,
    label: "Benchmark Business",
    prompt:
      "Benchmark my business performance against industry standards and identify gaps.",
    color: "text-rose-500 bg-rose-500/10",
  },
];

export function IntelligenceQuickActions({
  className,
}: {
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleAction = (prompt: string) => {
    router.push(`/dashboard/chat?initial=${encodeURIComponent(prompt)}`);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-300",
          isOpen
            ? "bg-error-clay text-white rotate-90 scale-110"
            : "bg-signal-indigo text-white hover:bg-signal-indigo hover:scale-105",
        )}
        title={isOpen ? "Close" : "Quick AI Actions"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-30 w-72 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="rounded-xl border bg-card shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <p className="text-xs font-semibold text-foreground/80">
                ⚡ Quick Actions
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                AI-powered analysis tasks
              </p>
            </div>
            <div className="max-h-[360px] overflow-y-auto p-1.5 space-y-0.5">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleAction(action.prompt)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-muted/50"
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md",
                        action.color,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-medium text-foreground/80">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
