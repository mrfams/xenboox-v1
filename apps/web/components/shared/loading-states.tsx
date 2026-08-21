"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, AlertTriangle, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Inline Loading Spinner ────────────────────────────────────────────────
//
// Lightweight spinner for inline operations (approve, reject, submit).
// Shows next to the button text, doesn't take up extra space.

export function InlineSpinner({
  size = "sm",
  className,
}: {
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
  };

  return (
    <Loader2
      className={cn("animate-spin", sizeClasses[size], className)}
      aria-hidden="true"
    />
  );
}

// ─── Operation Status ──────────────────────────────────────────────────────
//
// Shows the status of an inline operation (processing, success, error).
// Used in Activity Hub, Command Center, and forms.

type OperationStatus = "idle" | "processing" | "success" | "error";

export function OperationStatus({
  status,
  message,
  errorMessage,
  className,
}: {
  status: OperationStatus;
  message?: string;
  errorMessage?: string;
  className?: string;
}) {
  if (status === "idle") return null;

  const config = {
    processing: {
      icon: Loader2,
      iconClass: "animate-spin text-primary",
      bgClass: "bg-primary/5 border-primary/20",
      textClass: "text-primary",
      message: message || "Processing...",
    },
    success: {
      icon: CheckCircle2,
      iconClass: "text-emerald-500",
      bgClass: "bg-emerald-500/5 border-emerald-500/20",
      textClass: "text-emerald-600",
      message: message || "Done",
    },
    error: {
      icon: AlertTriangle,
      iconClass: "text-red-500",
      bgClass: "bg-red-500/5 border-red-500/20",
      textClass: "text-red-600",
      message: errorMessage || "Something went wrong",
    },
  };

  const c = config[status];
  const Icon = c.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
        c.bgClass,
        className,
      )}
      role="status"
      aria-live={status === "error" ? "assertive" : "polite"}
    >
      <Icon
        className={cn("h-3.5 w-3.5 shrink-0", c.iconClass)}
        aria-hidden="true"
      />
      <span className={c.textClass}>{c.message}</span>
    </div>
  );
}

// ─── Loading Progress ──────────────────────────────────────────────────────
//
// Shows a progress bar with steps for multi-step operations.
// Used in document ingestion, batch processing, AI generation.

export function LoadingProgress({
  steps,
  currentStep,
  title,
  className,
}: {
  steps: string[];
  currentStep: number;
  title?: string;
  className?: string;
}) {
  const progress = steps.length > 0 ? (currentStep / steps.length) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/5 p-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={title || "Loading progress"}
    >
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <Loader2
            className="h-4 w-4 text-primary animate-spin"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">
            {currentStep}/{steps.length}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-primary/10 mb-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {steps.map((step, i) => {
          const isComplete = i < currentStep;
          const isCurrent = i === currentStep;
          const isPending = i > currentStep;

          return (
            <div key={step} className="flex items-center gap-2">
              {isComplete && (
                <CheckCircle2
                  className="h-3.5 w-3.5 text-emerald-500 shrink-0"
                  aria-hidden="true"
                />
              )}
              {isCurrent && (
                <Loader2
                  className="h-3.5 w-3.5 text-primary animate-spin shrink-0"
                  aria-hidden="true"
                />
              )}
              {isPending && (
                <div
                  className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "text-xs",
                  isComplete && "text-emerald-600",
                  isCurrent && "text-foreground font-medium",
                  isPending && "text-muted-foreground",
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI Processing Indicator ───────────────────────────────────────────────
//
// Shows AI processing status with animated steps.
// Used in Command Center when AI is thinking/generating.

export function AiProcessingIndicator({
  steps,
  currentStep,
  elapsed,
  className,
}: {
  steps: Array<{
    label: string;
    status: "pending" | "active" | "complete" | "error";
  }>;
  currentStep?: string;
  elapsed?: number;
  className?: string;
}) {
  const completedCount = steps.filter((s) => s.status === "complete").length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/5 p-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="AI is processing your request"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          </div>
          <span className="text-sm font-medium text-foreground">
            {currentStep || "Processing..."}
          </span>
        </div>
        {elapsed !== undefined && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {(elapsed / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-primary/10 mb-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            {step.status === "complete" && (
              <CheckCircle2
                className="h-3 w-3 text-emerald-500 shrink-0"
                aria-hidden="true"
              />
            )}
            {step.status === "active" && (
              <Loader2
                className="h-3 w-3 text-primary animate-spin shrink-0"
                aria-hidden="true"
              />
            )}
            {step.status === "pending" && (
              <div
                className="h-3 w-3 rounded-full border border-muted-foreground/30 shrink-0"
                aria-hidden="true"
              />
            )}
            {step.status === "error" && (
              <AlertTriangle
                className="h-3 w-3 text-red-500 shrink-0"
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                "text-[11px]",
                step.status === "complete" && "text-emerald-600",
                step.status === "active" && "text-foreground font-medium",
                step.status === "pending" && "text-muted-foreground",
                step.status === "error" && "text-red-600",
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton with Content Hint ────────────────────────────────────────────
//
// Enhanced skeleton that shows what's loading (better perceived performance).

export function SkeletonWithHint({
  hint,
  className,
}: {
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {hint && (
        <p className="text-xs text-muted-foreground/60 animate-pulse">{hint}</p>
      )}
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
    </div>
  );
}

// ─── Suspense Fallback ─────────────────────────────────────────────────────
//
// Standard Suspense fallback for React.lazy() components.

export function SuspenseFallback({
  message = "Loading...",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[200px] p-6 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="h-6 w-6 text-primary animate-spin mb-3"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
