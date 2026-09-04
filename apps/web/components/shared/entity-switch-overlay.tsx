"use client";

import { useEntity } from "@/lib/entity-context";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Full-screen overlay that appears when switching entities.
 * Shows a blurred backdrop + centered card with the target entity name.
 * Auto-dismisses after the switch completes (~1.2s).
 */
export function EntitySwitchOverlay() {
  const { isSwitching, switchingToName } = useEntity();

  if (!isSwitching || !switchingToName) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center",
        "bg-background/60 backdrop-blur-md",
        "transition-opacity duration-300",
      )}
      role="status"
      aria-label={`Switching to ${switchingToName}`}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Icon — larger, no blue rounding circle */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-9 w-9 text-primary" />
        </div>

        {/* Entity name — bigger */}
        <div className="text-center">
          <p className="text-base font-semibold text-foreground">
            Switching to
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {switchingToName}
          </p>
        </div>

        {/* Progress dots — bigger */}
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
