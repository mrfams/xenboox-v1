"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Landmark,
  FileText,
  BookOpen,
  CalendarCheck,
  X,
  ChevronRight,
  Check,
  Rocket,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useActivationStatus } from "@/lib/hooks/use-activation-status";

// ─── Getting-Started Checklist ────────────────────────────────────────────
//
// Shown to first-time users (0 messages) in the Command Center.
// Guides them through the key activation milestones:
//   1. Ask a question (aha moment)
//   2. Connect bank (data source)
//   3. Review chart of accounts (setup)
//   4. Create first invoice (first value)
//   5. Close month-end (complete loop)
//
// Dismissible. Progress tracked in localStorage.

const DISMISSED_KEY = "xenboox_getting_started_dismissed";
// COMPLETED_KEY removed — now tracked server-side via activation events

type Step = {
  id: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  color: string;
  bgColor: string;
  action: { type: "message"; prompt: string } | { type: "link"; href: string };
};

const STEPS: Step[] = [
  {
    id: "ask-question",
    title: "Ask your first question",
    description:
      'Try "Show me my financial overview" or "What\'s my cash position?"',
    icon: Sparkles,
    color: "text-primary",
    bgColor: "bg-primary/10",
    action: {
      type: "message",
      prompt:
        "Give me a quick financial overview — cash position, pending approvals, and any deadlines coming up.",
    },
  },
  {
    id: "connect-bank",
    title: "Connect a bank account",
    description:
      "Sync transactions automatically so the AI can categorize them.",
    icon: Landmark,
    color: "text-balanced-green",
    bgColor: "bg-balanced-green/10",
    action: { type: "link", href: "/dashboard/operations/banking" },
  },
  {
    id: "review-coa",
    title: "Review your accounts",
    description: "Make sure your chart of accounts matches your business.",
    icon: BookOpen,
    color: "text-primary",
    bgColor: "bg-primary/10",
    action: {
      type: "message",
      prompt:
        "Show me my chart of accounts and highlight any that look unusual or incomplete.",
    },
  },
  {
    id: "first-invoice",
    title: "Create your first invoice",
    description: "Send an invoice to see the full accounts receivable flow.",
    icon: FileText,
    color: "text-attention-amber",
    bgColor: "bg-attention-amber/10",
    action: {
      type: "message",
      prompt: "Help me create my first invoice. Walk me through the fields.",
    },
  },
  {
    id: "month-end",
    title: "Close your first month",
    description: "Run the month-end close to see your P&L and balance sheet.",
    icon: CalendarCheck,
    color: "text-signal-indigo",
    bgColor: "bg-signal-indigo/10",
    action: {
      type: "message",
      prompt:
        "Help me close this month's books. What steps do I need to follow?",
    },
  },
];

export function GettingStartedChecklist({
  onSendMessage,
}: {
  onSendMessage: (text: string) => void;
}) {
  const { completedEvents, trackEvent, isLoading, events } = useActivationStatus();
  // Server-side: check if checklist was dismissed via activation events
  const dismissed = events?.some((e: { event: string }) => e.event === "checklist_dismissed") ?? false;

  // Map checklist steps to activation events
  const STEP_TO_EVENT: Record<string, string> = {
    "ask-question": "see_narrative",
    "connect-bank": "import_bank",
    "review-coa": "setup_business",
    "first-invoice": "create_invoice",
    // month-end maps to setup_business as a proxy since first_month_close
    // isn't in ACTIVATION_EVENTS yet — track as setup completion
    "month-end": "setup_business",
  };

  const handleDismiss = () => {
    // Track dismissal server-side (cross-device persistence)
    trackEvent("checklist_dismissed");
  };

  const handleStepClick = async (step: Step) => {
    if (step.action.type === "message") {
      onSendMessage(step.action.prompt);
    }
    // Track activation event server-side
    const event = STEP_TO_EVENT[step.id];
    if (event) {
      await trackEvent(event, { step: step.id, source: "checklist" });
    }
  };

  if (dismissed) return null;

  // Check which steps are completed based on server-side activation events
  const completedStepIds = new Set(
    STEPS.filter((step) => {
      const event = STEP_TO_EVENT[step.id];
      return event && completedEvents.includes(event);
    }).map((step) => step.id),
  );

  const completedCount = completedStepIds.size;
  const progress = (completedCount / STEPS.length) * 100;

  return (
    <div className="rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Get started with Xenboox
            </h2>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {completedCount === 0
                ? "Complete these steps to activate your AI accounting team."
                : `${completedCount} of ${STEPS.length} complete — you're making progress!`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Dismiss getting started checklist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isCompleted = completedStepIds.has(step.id);

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(step)}
              disabled={isCompleted}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                isCompleted
                  ? "border-balanced-green/20 bg-balanced-green/[0.03] cursor-default"
                  : "border-border/50 bg-card/60 hover:border-border/80 hover:shadow-md hover:-translate-y-px",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                  isCompleted ? "bg-balanced-green/10" : step.bgColor,
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 text-balanced-green" />
                ) : (
                  <Icon className={cn("h-4 w-4", step.color)} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCompleted
                      ? "text-balanced-green line-through decoration-balanced-green/30"
                      : "text-foreground",
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                  {step.description}
                </p>
              </div>
              {!isCompleted && (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      {completedCount === 0 && (
        <p className="mt-3 text-center text-[10px] text-muted-foreground/50">
          Or just type a question below — the AI handles anything.
        </p>
      )}
    </div>
  );
}
