import * as React from "react";
import { cn } from "./lib";
import { Check } from "lucide-react";

export interface BalanceCheckProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size variant: inline (small) next to entries, normal in summaries, large for month-end close hero moment */
  size?: "small" | "default" | "large";
  /** Whether to animate on mount */
  animate?: boolean;
  /** Optional label shown to the right */
  label?: string;
}

/**
 * Balance Check — Xenboox's signature element (§5).
 *
 * A thin horizontal line that animates into a checkmark-equals (✓) motif,
 * literally referencing "debits equal credits." Appears at three specific
 * moments: journal entry post, reconciliation close, and month-end close.
 *
 * Motion: 400ms ease-out, line draws left-to-right then resolves to a check.
 * No bounce, no confetti — this is a relief moment, not a celebration.
 */
function BalanceCheck({
  className,
  size = "default",
  animate = true,
  label,
  ...props
}: BalanceCheckProps) {
  return (
    <div
      className={cn(
        "balance-check",
        {
          "balance-check--small": size === "small",
          "balance-check--large": size === "large",
          "balance-check--animate": animate,
        },
        className,
      )}
      role="status"
      aria-label={label || "Balanced — debits equal credits"}
      {...props}
    >
      <span className="balance-check__line" aria-hidden="true" />
      <span
        className={cn(
          "balance-check__icon",
          animate && "animate-balance-appear",
        )}
        aria-hidden="true"
      >
        <Check
          className={cn(
            "text-balanced-green",
            size === "small" && "h-3 w-3",
            size === "default" && "h-4 w-4",
            size === "large" && "h-6 w-6",
          )}
          strokeWidth={size === "large" ? 2.5 : 2}
        />
      </span>
      {label && (
        <span className="text-body text-balanced-green font-medium ml-1">
          {label}
        </span>
      )}
    </div>
  );
}

BalanceCheck.displayName = "BalanceCheck";

export { BalanceCheck };
