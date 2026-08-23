"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Bell,
  TrendingUp,
  BookOpen,
  ArrowLeftRight,
  Check,
  X,
  ChevronRight,
  Sparkles,
  Bot,
} from "lucide-react";

// ─── Product Tour ──────────────────────────────────────────────────────────
//
// Interactive walkthrough that highlights key dashboard surfaces.
// Triggers after onboarding wizard completes. Shows once per user.
// Stored in localStorage to prevent re-showing.

const TOUR_KEY = "xenboox_product_tour_completed";
const TOUR_STEP_KEY = "xenboox_product_tour_step";

type TourStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target: string; // CSS selector for the element to highlight
  position: "top" | "bottom" | "left" | "right";
  surface: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "command-center",
    title: "Command Center",
    description:
      "This is your AI accounting assistant. Ask anything — 'Show me my P&L', 'What's my cash position?', 'Create an invoice for Acme Corp'. The AI handles it.",
    icon: <MessageSquare className="h-5 w-5" />,
    target: '[data-tour="command-center"]',
    position: "bottom",
    surface: "Command Center",
  },
  {
    id: "activity-hub",
    title: "Activity Hub",
    description:
      "Your human-in-the-loop queue. When the AI isn't sure about something — a transaction categorization, a payment approval, a journal entry — it surfaces it here for your decision.",
    icon: <Bell className="h-5 w-5" />,
    target: '[data-tour="activity-hub"]',
    position: "bottom",
    surface: "Activity Hub",
  },
  {
    id: "financial-pulse",
    title: "Financial Pulse",
    description:
      "Your AI-narrated financial health dashboard. The AI explains what the numbers mean — not just shows them. Cash flow, P&L, balance sheet, exchange rates — all in plain English.",
    icon: <TrendingUp className="h-5 w-5" />,
    target: '[data-tour="financial-pulse"]',
    position: "bottom",
    surface: "Financial Pulse",
  },
  {
    id: "ledger",
    title: "Ledger",
    description:
      "The record of truth. Journal entries, chart of accounts, trial balance, fixed assets, reconciliation. When you need to look at the books directly, this is where you go.",
    icon: <BookOpen className="h-5 w-5" />,
    target: '[data-tour="ledger"]',
    position: "bottom",
    surface: "Ledger",
  },
  {
    id: "operations",
    title: "Operations",
    description:
      "Money in, money out. The AI manages invoicing, bills, bank feeds, and mobile money. You approve the decisions. This is where the daily work happens.",
    icon: <ArrowLeftRight className="h-5 w-5" />,
    target: '[data-tour="operations"]',
    position: "bottom",
    surface: "Operations",
  },
  {
    id: "ai-agent",
    title: "Your AI Agent",
    description:
      "Every surface has an AI assistant. Click 'Ask AI' or use the chat to get insights, create entries, generate reports, or just ask questions. The AI knows your data.",
    icon: <Bot className="h-5 w-5" />,
    target: '[data-tour="ai-agent"]',
    position: "left",
    surface: "AI Assistant",
  },
];

// ─── Tour Overlay ──────────────────────────────────────────────────────────

function TourOverlay({
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}: {
  step: TourStep;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}) {
  const isLast = currentStepIndex === totalSteps - 1;

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onSkip}
      />

      {/* Tour Card */}
      <div
        className={cn(
          "absolute z-[210] w-80 max-w-[calc(100vw-2rem)]",
          step.position === "bottom" && "top-20 left-1/2 -translate-x-1/2",
          step.position === "top" && "bottom-20 left-1/2 -translate-x-1/2",
          step.position === "left" && "top-1/2 left-4 -translate-y-1/2",
          step.position === "right" && "top-1/2 right-4 -translate-y-1/2",
        )}
      >
        <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {step.icon}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {step.surface}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {step.title}
                </p>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-border/50 bg-muted/30">
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === currentStepIndex
                      ? "bg-primary w-6"
                      : i < currentStepIndex
                        ? "bg-primary/40 w-1.5"
                        : "bg-muted w-1.5",
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <Button variant="ghost" size="sm" onClick={onPrev}>
                  Back
                </Button>
              )}
              {isLast ? (
                <Button size="sm" onClick={onComplete}>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Got it!
                </Button>
              ) : (
                <Button size="sm" onClick={onNext}>
                  Next
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Highlight pulse on target */}
      <TargetHighlight target={step.target} />
    </div>
  );
}

// ─── Target Highlight ──────────────────────────────────────────────────────

function TargetHighlight({ target }: { target: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = document.querySelector(target);
    if (el) {
      setRect(el.getBoundingClientRect());
    }
  }, [target]);

  if (!rect) return null;

  return (
    <div
      className="absolute z-[205] rounded-lg border-2 border-primary/50 bg-primary/5 pointer-events-none"
      style={{
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
        boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.4)",
      }}
    >
      {/* Pulse ring */}
      <div className="absolute inset-0 rounded-lg border-2 border-primary/30 animate-ping" />
    </div>
  );
}

// ─── Main Product Tour Component ───────────────────────────────────────────

export function ProductTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (completed !== "true") {
      // Delay tour start to let dashboard render
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1500);
      setIsLoaded(true);
      return () => clearTimeout(timer);
    }
    setIsLoaded(true);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      localStorage.setItem(TOUR_STEP_KEY, String(currentStepIndex + 1));
    }
  }, [currentStepIndex]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      localStorage.setItem(TOUR_STEP_KEY, String(currentStepIndex - 1));
    }
  }, [currentStepIndex]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "true");
    localStorage.removeItem(TOUR_STEP_KEY);
    setIsActive(false);
  }, []);

  const handleSkip = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "true");
    localStorage.removeItem(TOUR_STEP_KEY);
    setIsActive(false);
  }, []);

  if (!isLoaded || !isActive) return null;

  return (
    <TourOverlay
      step={TOUR_STEPS[currentStepIndex]}
      currentStepIndex={currentStepIndex}
      totalSteps={TOUR_STEPS.length}
      onNext={handleNext}
      onPrev={handlePrev}
      onSkip={handleSkip}
      onComplete={handleComplete}
    />
  );
}

// ─── data-tour attributes to add to dashboard surfaces ─────────────────────
//
// Add these to the sidebar navigation items:
//   data-tour="command-center"  → Command Center link
//   data-tour="activity-hub"    → Activity Hub link
//   data-tour="financial-pulse" → Financial Pulse link
//   data-tour="ledger"          → Ledger link
//   data-tour="operations"      → Operations link
//   data-tour="ai-agent"        → AI assistant button
