"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

import { useModuleAi } from "./module-ai-context";
import {
  RowAiMenu,
  rowActionPrompt,
  type RowAiAction as RowMenuAction,
} from "./row-ai-menu";

import type { PageFocus } from "@/lib/chat/page-context";
import { cn } from "@/lib/utils";

/**
 * RowAI —— the hover-reveal "ask about this row" action (Cursor/VSCode style).
 *
 * Drop it inside a table row (`<tr className="group relative ...">`) and a
 * small ✨ chip appears on hover. Clicking it opens the page copilot already
 * focused on that record, so the user can ask "why is the tax 5%?" without
 * naming the row.
 *
 * Right-clicking the row opens a context menu (RowAiMenu) with ready-made AI
 * commands — "Explain this", "Flag anomaly", "Reverse this" — that open the
 * copilot focused on the row with the command already running.
 */
export function RowAiAction({
  focus,
  className,
  label = "Ask AI",
  reversible = false,
}: {
  focus: PageFocus;
  className?: string;
  label?: string;
  /** Whether this record supports reversal (transactions, journal entries…). */
  reversible?: boolean;
}) {
  const { openWithFocus } = useModuleAi();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  // Attach the right-click handler to the *row* (the button's parent <tr>),
  // so right-clicking anywhere on the row opens the context menu. The menu
  // portal itself lives on document.body, so overflow containers don't clip it.
  useEffect(() => {
    const btn = buttonRef.current;
    const row = btn?.closest("tr");
    if (!row) return;
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY });
    };
    row.addEventListener("contextmenu", onContextMenu);
    return () => row.removeEventListener("contextmenu", onContextMenu);
  }, []);

  const handleSelect = (action: RowMenuAction) => {
    // "Ask about this row" opens the panel focused and ready to type;
    // the command actions auto-run their prompt once the focus is applied.
    if (action.kind === "ask") {
      openWithFocus(focus);
    } else {
      openWithFocus(focus, rowActionPrompt(action, focus));
    }
    setMenu(null);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openWithFocus(focus);
        }}
        title={`Ask Xenboox about this ${focus.kind.toLowerCase()} · right-click for actions`}
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

      {menu && (
        <RowAiMenu
          x={menu.x}
          y={menu.y}
          focus={focus}
          reversible={reversible}
          onSelect={handleSelect}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}
