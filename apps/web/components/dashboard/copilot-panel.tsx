"use client";

import { useState } from "react";
import {
  Bot,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  FileText,
  TrendingUp,
  AlertTriangle,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

type CopilotPanelProps = {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
  className?: string;
};

type QuickAction = {
  label: string;
  icon: typeof FileText;
  prompt: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Generate Report",
    icon: FileText,
    prompt: "Generate a financial report",
  },
  {
    label: "Check Cash Flow",
    icon: TrendingUp,
    prompt: "What is my current cash position?",
  },
  {
    label: "Review Anomalies",
    icon: AlertTriangle,
    prompt: "Check for anomalies in transactions",
  },
];

export function CopilotPanel({
  open,
  onClose,
  onOpen,
  className,
}: CopilotPanelProps) {
  const [input, setInput] = useState("");

  return (
    <>
      {/* Toggle button (visible when panel is closed) */}
      {!open && (
        <button
          type="button"
          onClick={() => onOpen?.()}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1 rounded-l-lg border border-r-0 border-border/50 bg-card px-1.5 py-3 text-xs text-muted-foreground shadow-lg hover:bg-accent hover:text-foreground transition-all"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
      )}

      {/* Panel */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-[var(--copilot-width)] flex-col border-l border-border/50 bg-card transition-transform duration-300 ease-in-out",
          "lg:static",
          open
            ? "translate-x-0"
            : "translate-x-full lg:translate-x-0 lg:hidden",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal-indigo-bg">
              <Bot className="h-4 w-4 text-signal-indigo" />
            </div>
            <div>
              <p className="text-sm font-semibold">Xenboox AI Copilot</p>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-muted-foreground">
                  Online
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-3 border-b border-border/50">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Quick Actions
          </p>
          <div className="space-y-1.5">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-lg border border-border/30 bg-background/50 px-3 py-2 text-left text-xs text-muted-foreground transition-all hover:border-signal-indigo/30 hover:text-foreground hover:bg-signal-indigo/5"
                >
                  <Icon className="h-3.5 w-3.5 text-signal-indigo/70" />
                  <span className="flex-1">{action.label}</span>
                  <ChevronRight className="h-3 w-3 opacity-30" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Agent Status */}
        <div className="px-4 py-3 border-b border-border/50">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Active Agents
          </p>
          <div className="space-y-2">
            {[
              { name: "CFO Agent", status: "Monitoring", active: true },
              {
                name: "Treasury Agent",
                status: "Reconciling 3 accounts",
                active: true,
              },
              { name: "Document Agent", status: "Idle", active: false },
            ].map((agent) => (
              <div key={agent.name} className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    agent.active ? "bg-emerald-500" : "bg-muted-foreground/30",
                  )}
                />
                <span className="font-medium text-foreground/80">
                  {agent.name}
                </span>
                <span className="text-muted-foreground/60 ml-auto text-[10px]">
                  {agent.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-signal-indigo-bg mb-3">
              <Sparkles className="h-6 w-6 text-signal-indigo" />
            </div>
            <p className="text-sm font-medium text-foreground">Ask anything</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your AI copilot can analyze data, generate reports, and answer
              financial questions.
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border/50 p-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your copilot..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
            <Button
              size="icon"
              className="h-7 w-7 rounded-lg bg-signal-indigo hover:bg-signal-indigo-hover text-white"
              disabled={!input.trim()}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
