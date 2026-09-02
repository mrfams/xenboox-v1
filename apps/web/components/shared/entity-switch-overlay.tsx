"use client";

import { useEntity } from "@/lib/entity-context";
import { Building2, Loader2 } from "lucide-react";
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
      <div className="flex flex-col items-center gap-4">
        {/* Animated icon */}
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </div>
        </div>

        {/* Entity name */}
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Switching to</p>
          <p className="mt-0.5 text-lg font-bold text-foreground">
            {switchingToName}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
