"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { SimulationOverlay } from "./simulation-overlay";

import { useSimulation } from "@/lib/ai-ux/simulation-provider";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "inverse";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20",
  outline:
    "border border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-500/40 dark:bg-transparent dark:text-indigo-400 dark:hover:bg-indigo-500/10",
  ghost:
    "text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10",
  inverse: "bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm",
};

/**
 * Drop-in trigger that plays an AI-native workflow simulation.
 *
 * Inside the dashboard layout the trigger opens the **global** simulation via
 * SimulationProvider, so the run survives page navigation and the Agents-at-work
 * pill tracks it. Without a provider (e.g. unit tests) it falls back to a
 * self-contained local overlay.
 *
 *   <AiSimulationTrigger traceId="month-end-close" label="Run autonomous close" />
 */
export function AiSimulationTrigger({
  traceId,
  label = "Run AI simulation",
  variant = "primary",
  className,
  iconOnly = false,
}: {
  traceId: string;
  label?: string;
  variant?: Variant;
  className?: string;
  /** Render just the sparkle icon (title carries the label). */
  iconOnly?: boolean;
}) {
  const sim = useSimulation();
  const [localOpen, setLocalOpen] = useState(false);

  const handleClick = () => {
    if (sim) {
      sim.openSimulation(traceId);
    } else {
      setLocalOpen(true);
    }
  };

  const handleClose = () => {
    if (sim) {
      sim.minimizeSimulation();
    } else {
      setLocalOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={iconOnly ? label : undefined}
        aria-label={iconOnly ? label : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150",
          iconOnly && "px-2",
          VARIANTS[variant],
          className,
        )}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        {!iconOnly && label}
      </button>

      {/* Fallback overlay only when no global provider exists. */}
      {!sim && (
        <SimulationOverlay
          open={localOpen}
          onClose={handleClose}
          traceId={traceId}
        />
      )}
    </>
  );
}
