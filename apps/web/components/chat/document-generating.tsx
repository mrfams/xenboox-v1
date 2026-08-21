"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Document Generation Progress ──────────────────────────────────────────
//
// Shows a Devin-style progress indicator while the AI generates a document.
// Displays the current step and progress through the generation pipeline.

type GenerationStep = {
  label: string;
  status: "pending" | "active" | "completed";
};

const DOCUMENT_GENERATION_STEPS: GenerationStep[] = [
  { label: "Gathering data", status: "pending" },
  { label: "Building layout", status: "pending" },
  { label: "Generating content", status: "pending" },
  { label: "Finalizing document", status: "pending" },
];

interface DocumentGeneratingProps {
  /** Document type being generated */
  docType?: string;
  /** Document name */
  name?: string;
  /** Auto-progress through steps (for demo/UX) */
  autoProgress?: boolean;
  /** Callback when generation is "complete" */
  onComplete?: () => void;
}

export function DocumentGenerating({
  docType = "Report",
  name,
  autoProgress = true,
  onComplete,
}: DocumentGeneratingProps) {
  const [steps, setSteps] = useState<GenerationStep[]>(
    DOCUMENT_GENERATION_STEPS,
  );

  // Auto-progress through steps for visual feedback
  useEffect(() => {
    if (!autoProgress) return;

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex >= DOCUMENT_GENERATION_STEPS.length) {
        clearInterval(interval);
        onComplete?.();
        return;
      }

      setSteps((prev) =>
        prev.map((step, i) => ({
          ...step,
          status:
            i < stepIndex
              ? "completed"
              : i === stepIndex
                ? "active"
                : "pending",
        })),
      );

      stepIndex++;
    }, 1500);

    return () => clearInterval(interval);
  }, [autoProgress, onComplete]);

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-primary/10">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {name ?? `Generating ${docType}...`}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {docType} • {completedCount}/{steps.length} steps complete
          </p>
        </div>
        <Loader2 className="h-4 w-4 text-primary animate-spin" />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-primary/10">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="p-3 space-y-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2.5 text-xs transition-opacity duration-300",
              step.status === "pending" && "opacity-40",
            )}
          >
            {step.status === "completed" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : step.status === "active" ? (
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
            ) : (
              <div className="h-3.5 w-3.5 rounded-full border border-border/50 shrink-0" />
            )}
            <span
              className={
                step.status === "active"
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }
            >
              {step.label}
            </span>
            {step.status === "active" && (
              <span className="text-[10px] text-primary">...</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
