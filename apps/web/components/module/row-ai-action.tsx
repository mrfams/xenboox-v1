"use client";

import { Sparkles } from "lucide-react";

import type { PageFocus } from "@/lib/chat/page-context";
import { cn } from "@/lib/utils";
import { useModuleAi } from "./module-ai-context";

/**
 * RowAI —— the hover-reveal "ask about this row" action (Cursor/VSCode style).
 *
 * Drop it inside a table row (`<tr className="group relative ...">`) and a
 * small ✨ chip appears on hover. Clicking it opens the page copilot already
 * focused on that record, so the user can ask "why is the tax 5%?" without
 * naming the row.
 */
export function RowAiAction({
  focus,
  className,
  label = "Ask AI",
}: {
  focus: PageFocus;
  className?: string;
  label?: string;
}) {
  const { openWithFocus } = useModuleAi();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openWithFocus(focus);
      }}
      title={`Ask Xenboox about this ${focus.kind.toLowerCase()}`}
      aria-label={`Ask Xenboox about ${focus.name}`}
      className={cn(
        // Floating overlay: sits at the row's right edge, revealed on hover.
        // The row needs `group relative` so this positions inside it.
        "absolute right-3 top-1/2 z-10 -translate-y-1/2",
        "inline-flex items-center gap-1 rounded-full border border-primary/25 bg-card px-2.5 py-1 text-[11px] font-medium text-primary shadow-sm",
        "opacity-0 transition-all duration-150 group-hover:opacity-100 focus:opacity-100",
        "hover:border-primary/50 hover:bg-primary/5 hover:shadow-md",
        "active:scale-95",
        className,
      )}
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}
