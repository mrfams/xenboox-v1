import * as React from "react";
import { cn } from "./lib";

export interface ConfidenceIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Confidence score 0–1 */
  confidence: number;
  /** Whether to show the numeric label */
  showLabel?: boolean;
  /** Size of the indicator bar */
  size?: "sm" | "md";
}

const confidenceVariant = (confidence: number) => {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.7) return "medium";
  return "low";
};

const confidenceLabel = (confidence: number) => {
  return `${Math.round(confidence * 100)}%`;
};

/**
 * Confidence Indicator — visual bar + percentage next to agent-produced figures.
 *
 * Per the design system (§6): "a small horizontal bar (not a percentage number
 * alone) next to any agent-produced figure below 90% confidence — visual +
 * numeric together, since a bare '73%' means nothing to a non-technical owner."
 */
function ConfidenceIndicator({
  confidence,
  showLabel = true,
  size = "sm",
  className,
  ...props
}: ConfidenceIndicatorProps) {
  const variant = confidenceVariant(confidence);
  const percentage = Math.min(100, Math.max(0, Math.round(confidence * 100)));

  return (
    <div
      className={cn(
        "confidence-bar",
        size === "sm" && "gap-1.5",
        size === "md" && "gap-2",
        className,
      )}
      role="meter"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Agent confidence: ${percentage}%`}
      {...props}
    >
      <span
        className={cn("confidence-bar__track", size === "md" && "!w-16 !h-2")}
      >
        <span
          className={cn(
            "confidence-bar__fill",
            `confidence-bar__fill--${variant}`,
            size === "md" && "!rounded-full",
          )}
          style={{ width: `${percentage}%` }}
        />
      </span>
      {showLabel && (
        <span
          className={cn(
            "confidence-bar__label",
            variant === "high" && "text-balanced-green",
            variant === "medium" && "text-attention-amber",
            variant === "low" && "text-error-clay",
          )}
        >
          {confidenceLabel(confidence)}
        </span>
      )}
    </div>
  );
}

ConfidenceIndicator.displayName = "ConfidenceIndicator";

export { ConfidenceIndicator };
