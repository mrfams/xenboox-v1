"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Zap,
  TrendingUp,
  Search,
  RefreshCw,
  FileText,
  ShieldAlert,
  Smartphone,
  ArrowRightLeft,
  X,
} from "lucide-react";

type QuickAction = {
  id: string;
  icon: typeof TrendingUp;
  label: string;
  prompt: string;
  color: string;
};

const ACTIONS: QuickAction[] = [
  {
    id: "qa1",
    icon: TrendingUp,
    label: "Forecast Cash",
    prompt:
      "Forecast my cash position for the next 90 days with scenario analysis.",
    color: "text-signal-indigo bg-signal-indigo/10",
  },
  {
    id: "qa2",
    icon: Search,
    label: "Find Missing Transactions",
    prompt:
      "Search for any unreconciled or missing bank transactions across all accounts.",
    color: "text-purple-500 bg-purple-500/10",
  },
  {
    id: "qa3",
    icon: RefreshCw,
    label: "Reconcile Everything",
    prompt:
      "Run full reconciliation across all bank accounts and mobile money wallets.",
    color: "text-balanced-green bg-balanced-green/10",
  },
  {
    id: "qa4",
    icon: ArrowRightLeft,
    label: "Optimize Payments",
    prompt:
      "Analyze my payment schedule and recommend optimal timing for upcoming obligations.",
    color: "text-cyan-500 bg-cyan-500/10",
  },
  {
    id: "qa5",
    icon: FileText,
    label: "Generate Treasury Report",
    prompt: "Generate a comprehensive treasury report for management review.",
    color: "text-attention-amber bg-attention-amber/10",
  },
  {
    id: "qa6",
    icon: ShieldAlert,
    label: "Detect Fraud",
    prompt:
      "Run fraud detection analysis on recent transactions and flag anomalies.",
    color: "text-error-clay bg-error-clay/10",
  },
  {
    id: "qa7",
    icon: Smartphone,
    label: "Review Mobile Money",
    prompt:
      "Review all mobile money transactions for the past 7 days and flag discrepancies.",
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    id: "qa8",
    icon: ArrowRightLeft,
    label: "Transfer Between Accounts",
    prompt:
      "Help me determine the optimal cash transfer between accounts to maximize interest.",
    color: "text-blue-500 bg-blue-500/10",
  },
];

type MoneyQuickActionsProps = {
  className?: string;
};

export function MoneyQuickActions({ className }: MoneyQuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleAction = (prompt: string) => {
    router.push(`/dashboard/chat?initial=${encodeURIComponent(prompt)}`);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-300",
          isOpen
            ? "bg-error-clay text-white rotate-90 scale-110"
            : "bg-signal-indigo text-white hover:bg-signal-indigo hover:scale-105",
        )}
        title={isOpen ? "Close quick actions" : "Quick AI Actions"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
      </button>

      {/* Action panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-30 w-72 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="rounded-xl border bg-card shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <p className="text-xs font-semibold text-foreground/80">
                ⚡ Quick Actions
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                AI-powered treasury tasks
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

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
