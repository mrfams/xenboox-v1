"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Circle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── AI Thinking Steps ────────────────────────────────────────────────────
//
// Shows animated step-by-step progress when AI is processing.
// Used in chat, document processing, batch operations, and form auto-fill.

type StepStatus = "pending" | "active" | "complete" | "error";

type ThinkingStep = {
  id: string;
  label: string;
  description?: string;
  status: StepStatus;
};

type AiThinkingStepsProps = {
  steps: ThinkingStep[];
  title?: string;
  showCancel?: boolean;
  onCancel?: () => void;
  className?: string;
};

export function AiThinkingSteps({
  steps,
  title = "Xenboox is working...",
  showCancel,
  onCancel,
  className,
}: AiThinkingStepsProps) {
  const completedCount = steps.filter((s) => s.status === "complete").length;
  const activeStep = steps.find((s) => s.status === "active");
  const hasError = steps.some((s) => s.status === "error");
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/5 p-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {hasError ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
          ) : (
            <Loader2
              className="h-4 w-4 text-primary animate-spin"
              aria-hidden="true"
            />
          )}
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-primary/10 mb-3 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            hasError ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-2">
            <div className="mt-0.5">
              {step.status === "complete" && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              )}
              {step.status === "active" && (
                <Loader2 className="h-4 w-4 text-primary animate-spin" aria-hidden="true" />
              )}
              {step.status === "pending" && (
                <Circle className="h-4 w-4 text-muted-foreground/40" aria-hidden="true" />
              )}
              {step.status === "error" && (
                <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-xs font-medium",
                  step.status === "complete" && "text-emerald-600",
                  step.status === "active" && "text-foreground",
                  step.status === "pending" && "text-muted-foreground",
                  step.status === "error" && "text-red-600",
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Cancel button */}
      {showCancel && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

// ─── Simplified Thinking Indicator ────────────────────────────────────────

type AiThinkingIndicatorProps = {
  message?: string;
  className?: string;
};

export function AiThinkingIndicator({
  message = "Thinking...",
  className,
}: AiThinkingIndicatorProps) {
  return (
    <div
      className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
      </div>
      <span>{message}</span>
    </div>
  );
}

// ─── AI Processing Overlay ────────────────────────────────────────────────

type AiProcessingOverlayProps = {
  isVisible: boolean;
  message?: string;
  onCancel?: () => void;
};

export function AiProcessingOverlay({
  isVisible,
  message = "Processing...",
  onCancel,
}: AiProcessingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl max-w-sm w-full mx-4">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{message}</p>
          <p className="text-xs text-muted-foreground">
            This may take a few moments
          </p>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
