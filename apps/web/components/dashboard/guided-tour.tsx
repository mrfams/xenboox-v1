"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, SkipForward, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TourStep = {
  id: string;
  title: string;
  description: string;
  /** CSS selector to highlight */
  selector: string;
  /** Preferred tooltip placement. Auto-detected if not set. */
  placement?: "top" | "bottom" | "left" | "right";
};

type GuidedTourProps = {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  onFinish?: () => void;
};

type ElementRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type TooltipPosition = {
  top: number;
  left: number;
  placement: "top" | "bottom" | "left" | "right";
};

// ─── Default Steps ─────────────────────────────────────────────────────────────

export const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    id: "chat",
    title: "🤖 Chat with Your CFO Agent",
    description:
      "This is where you can ask anything about your finances. Try: 'Show me unpaid invoices' or 'Run payroll for this month'. You can also drag and drop documents here for instant AI processing.",
    selector: 'input[placeholder*="Ask your AI"], [data-tour="chat-input"]',
    placement: "bottom",
  },
  {
    id: "sidebar",
    title: "📂 Navigate with the Sidebar",
    description:
      "All your accounting modules live here — Money, Sales, Purchases, Payroll, Reports, and more. Click any section to expand it and jump straight to work.",
    selector: "aside, [data-tour='sidebar']",
    placement: "right",
  },
  {
    id: "quick-actions",
    title: "⚡ Quick Actions at Your Fingertips",
    description:
      "Upload receipts, connect your bank, or forward invoices via email — all from here. These are your most common tasks, one click away.",
    selector: '[data-tour="quick-actions"], .grid-cols-2\\.sm\\:grid-cols-3',
    placement: "top",
  },
  {
    id: "chat-panel",
    title: "💬 Persistent AI Chat Panel",
    description:
      "Click the chat icon in the top bar to open a persistent chat panel on the right. It follows you across every page so you can ask questions without leaving your work.",
    selector:
      '[data-tour="chat-panel-toggle"], [aria-label*="Chat"], [aria-label*="chat"]',
    placement: "bottom",
  },
  {
    id: "approvals",
    title: "✅ Review & Approve",
    description:
      "The Approval Queue shows everything needing your attention — flagged transactions, agent suggestions, and review items. Clear this queue to keep your books healthy.",
    selector:
      '[data-tour="approvals"], a[href*="review-queue"], a[href*="approval"]',
    placement: "right",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function findTargetElement(selector: string): Element | null {
  try {
    // Clean escaped characters for CSS selector compatibility
    const cleaned = selector.replace(/\\([.\[\]#])/g, "$1");
    const el = cleaned ? document.querySelector(cleaned) : null;
    if (el && el instanceof HTMLElement) return el;
    // Fallback: try original selector
    const fallbackEl = document.querySelector(selector);
    if (fallbackEl && fallbackEl instanceof HTMLElement) return fallbackEl;
    return null;
  } catch {
    return null;
  }
}

function getElementRect(el: Element): ElementRect | null {
  if (!(el instanceof HTMLElement)) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function computeTooltipPosition(
  target: ElementRect,
  placement: "top" | "bottom" | "left" | "right",
  tooltipWidth: number,
  tooltipHeight: number,
  gap: number = 16,
): TooltipPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const placements: TooltipPosition[] = [
    {
      placement: "bottom",
      top: target.top + target.height + gap,
      left: target.left + target.width / 2 - tooltipWidth / 2,
    },
    {
      placement: "top",
      top: target.top - tooltipHeight - gap,
      left: target.left + target.width / 2 - tooltipWidth / 2,
    },
    {
      placement: "right",
      top: target.top + target.height / 2 - tooltipHeight / 2,
      left: target.left + target.width + gap,
    },
    {
      placement: "left",
      top: target.top + target.height / 2 - tooltipHeight / 2,
      left: target.left - tooltipWidth - gap,
    },
  ];

  // Find the best placement that fits in the viewport
  const preferred = placements.find((p) => p.placement === placement);
  const valid = placements.every((p) => {
    const pBounds = placements.find((pp) => pp.placement === p.placement)!;
    const fitsX = pBounds.left >= 16 && pBounds.left + tooltipWidth <= vw - 16;
    const fitsY = pBounds.top >= 16 && pBounds.top + tooltipHeight <= vh - 16;
    return fitsX && fitsY;
  });

  // If preferred placement fits, use it
  if (preferred) {
    const fitsX =
      preferred.left >= 16 && preferred.left + tooltipWidth <= vw - 16;
    const fitsY =
      preferred.top >= 16 && preferred.top + tooltipHeight <= vh - 16;
    if (fitsX && fitsY) return preferred;
  }

  // Otherwise use the first valid placement
  for (const p of placements) {
    const fitsX = p.left >= 16 && p.left + tooltipWidth <= vw - 16;
    const fitsY = p.top >= 16 && p.top + tooltipHeight <= vh - 16;
    if (fitsX && fitsY) return p;
  }

  // Last resort: center on screen
  return {
    placement: "bottom",
    top: vh / 2 + 50,
    left: Math.max(16, (vw - tooltipWidth) / 2),
  };
}

// ─── Guided Tour Component ─────────────────────────────────────────────────────

export function GuidedTour({
  steps,
  open,
  onClose,
  onFinish,
}: GuidedTourProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  // ─── Re-measure ─────────────────────────────────────────────────────────

  const measure = useCallback(() => {
    if (!open || !currentStep) return;

    const el = findTargetElement(currentStep.selector);
    const rect = el ? getElementRect(el) : null;

    if (rect) {
      setTargetRect(rect);

      // Measure tooltip dimensions for accurate positioning
      let tooltipW = 320;
      let tooltipH = 200;
      if (tooltipRef.current) {
        tooltipW = tooltipRef.current.offsetWidth || 320;
        tooltipH = tooltipRef.current.offsetHeight || 200;
      }

      const pos = computeTooltipPosition(
        rect,
        currentStep.placement ?? "bottom",
        tooltipW,
        tooltipH,
      );
      setTooltipPos(pos);
      setVisible(true);
    } else {
      // Element not found — use fallback centered position
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setTargetRect({
        top: vh / 2 - 75,
        left: vw / 2 - 150,
        width: 300,
        height: 150,
      });
      setTooltipPos({
        placement: "bottom",
        top: vh / 2 + 80,
        left: Math.max(16, (vw - 320) / 2),
      });
      setVisible(true);
    }
  }, [open, currentStep]);

  useEffect(() => {
    if (open) {
      // Wait for render, then measure
      requestAnimationFrame(() => {
        requestAnimationFrame(measure);
      });
    } else {
      setVisible(false);
    }
  }, [open, measure]);

  // Measure on scroll and resize
  useEffect(() => {
    if (!open) return;
    const handleChange = () => {
      setAnimating(true);
      measure();
      setTimeout(() => setAnimating(false), 300);
    };
    window.addEventListener("scroll", handleChange, { passive: true });
    window.addEventListener("resize", handleChange, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleChange);
      window.removeEventListener("resize", handleChange);
    };
  }, [open, measure]);

  // ─── Navigation ─────────────────────────────────────────────────────────

  const goTo = useCallback(
    (index: number) => {
      setAnimating(true);
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex(index);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            measure();
            setAnimating(false);
          });
        });
      }, 250);
    },
    [measure],
  );

  const handleNext = () => {
    if (isLast) {
      onFinish?.();
      onClose();
    } else {
      goTo(currentIndex + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) goTo(currentIndex - 1);
  };

  const handleSkip = () => {
    onFinish?.();
    onClose();
  };

  // ─── Skip if no step ────────────────────────────────────────────────────

  if (!open || !currentStep) return null;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[60]"
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      {/* Dark overlay with spotlight cutout — the box-shadow creates the darkening */}
      {targetRect && (
        <div
          className="fixed z-[60] rounded-lg transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Pulse ring around spotlight */}
      {targetRect && !animating && (
        <div
          className="fixed z-[61] rounded-lg border-2 border-primary/60 animate-pulse"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip card */}
      {tooltipPos && visible && (
        <div
          ref={tooltipRef}
          className={cn(
            "fixed z-[70] w-[clamp(280px,90vw,380px)] rounded-xl border bg-card shadow-2xl transition-all duration-300 ease-out",
            animating ? "opacity-0 scale-95" : "opacity-100 scale-100",
          )}
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            pointerEvents: "auto",
          }}
        >
          {/* Arrow pointing to the target */}
          <div
            className={cn(
              "absolute h-3 w-3 rotate-45 border bg-card",
              tooltipPos.placement === "top" &&
                "bottom-[-6px] border-t-0 border-l-0",
              tooltipPos.placement === "bottom" &&
                "top-[-6px] border-b-0 border-r-0",
              tooltipPos.placement === "left" &&
                "right-[-6px] border-t-0 border-l-0",
              tooltipPos.placement === "right" &&
                "left-[-6px] border-b-0 border-r-0",
            )}
          />

          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Step {currentIndex + 1} of {steps.length}
            </span>
            <button
              onClick={handleSkip}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-3 px-5 py-4">
            <h3 className="text-base font-semibold leading-snug">
              {currentStep.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {currentStep.description}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-5 py-3">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goTo(idx)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    idx === currentIndex
                      ? "w-6 bg-primary"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50",
                  )}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
                  isLast
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {isLast ? (
                  <>
                    Done
                    <Check className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Skip link */}
          {!isLast && (
            <button
              onClick={handleSkip}
              className="flex w-full items-center justify-center gap-1 border-t px-5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipForward className="h-3 w-3" />
              Skip tour
            </button>
          )}
        </div>
      )}
    </div>
  );
}
