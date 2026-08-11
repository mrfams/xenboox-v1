"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRightLeft,
  Flag,
  HelpCircle,
  Sparkles,
  ScanSearch,
} from "lucide-react";

import type { PageFocus } from "@/lib/chat/page-context";
import { cn } from "@/lib/utils";

/**
 * RowAiMenu — the right-click context menu for table rows (Cursor-style).
 *
 * Rendered through a portal so it escapes `overflow` containers. Opens at the
 * cursor, clamps to the viewport, and offers AI actions that open the page
 * copilot focused on that row with a ready-made command ("Explain this entry",
 * "Flag anomaly", "Reverse this"). Reversible actions only appear for records
 * that can actually be reversed (transactions, journal entries, bills).
 */

export type RowAiAction =
  | { kind: "explain" }
  | { kind: "flag" }
  | { kind: "reverse" }
  | { kind: "ask" };

export type RowAiMenuProps = {
  x: number;
  y: number;
  focus: PageFocus;
  reversible?: boolean;
  onSelect: (action: RowAiAction) => void;
  onClose: () => void;
};

const MENU_WIDTH = 248;
const ITEM_HEIGHT = 44;
const PADDING = 8;

const LABELS: Record<RowAiAction["kind"], string> = {
  explain: "Explain this",
  flag: "Flag anomaly",
  reverse: "Reverse this",
  ask: "Ask about this row",
};

const ICONS: Record<RowAiAction["kind"], typeof HelpCircle> = {
  explain: HelpCircle,
  flag: Flag,
  reverse: ArrowRightLeft,
  ask: Sparkles,
};

/** Build the ready-made command sent to the copilot for each action. */
export function rowActionPrompt(action: RowAiAction, focus: PageFocus): string {
  const kind = focus.kind.toLowerCase();
  switch (action.kind) {
    case "explain":
      return `Explain this ${kind} in plain terms — what it is, its current state, and the key figures that stand out.`;
    case "flag":
      return `Review this ${kind} for anomalies, inconsistencies, or anything unusual — compare the figures against what you'd expect and flag any concerns.`;
    case "reverse":
      return `Walk me through reversing this ${kind}: draft the reversing entry, show the impact on the books, and flag anything to check before executing. Do not execute the reversal — propose it for my approval.`;
    case "ask":
      // The Ask action opens the panel ready to type — no auto command.
      return "";
  }
}

export function RowAiMenu({
  x,
  y,
  focus,
  reversible = false,
  onSelect,
  onClose,
}: RowAiMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  // Stable across renders so the window listeners bind only when the menu's
  // action set actually changes (reversible flag) — not on every keystroke.
  const actions = useMemo<RowAiAction[]>(
    () => [
      { kind: "explain" },
      { kind: "flag" },
      ...(reversible ? [{ kind: "reverse" as const }] : []),
      { kind: "ask" },
    ],
    [reversible],
  );

  // Clamp to the viewport after the first render.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const height = actions.length * ITEM_HEIGHT + 40;
    setPos({
      x: Math.max(
        PADDING,
        Math.min(x, window.innerWidth - rect.width - PADDING),
      ),
      y: Math.max(PADDING, Math.min(y, window.innerHeight - height - PADDING)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  // Close on outside click, Escape, scroll, or resize. Keyboard navigation
  // reads the active index through a ref so the listeners bind once.
  useEffect(() => {
    const moveActive = (delta: number) => {
      const next = Math.min(
        Math.max(activeIndexRef.current + delta, 0),
        actions.length - 1,
      );
      activeIndexRef.current = next;
      setActiveIndex(next);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveActive(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveActive(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const action = actions[activeIndexRef.current];
        if (action) onSelect(action);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [onClose, onSelect, actions]);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      aria-label={`Actions for ${focus.kind} ${focus.name}`}
      className="fixed z-[100] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ left: pos.x, top: pos.y, minWidth: MENU_WIDTH }}
    >
      {/* Header — what the actions target */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <ScanSearch className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-slate-900">
            {focus.kind}
          </p>
          <p className="truncate text-[10px] text-slate-400">{focus.name}</p>
        </div>
      </div>

      {/* AI actions */}
      {actions.map((action, i) => {
        const Icon = ICONS[action.kind];
        return (
          <button
            key={action.kind}
            type="button"
            role="menuitem"
            onClick={() => onSelect(action)}
            onMouseEnter={() => {
              setActiveIndex(i);
              activeIndexRef.current = i;
            }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors",
              i === activeIndex
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-700 hover:bg-slate-50",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {LABELS[action.kind]}
            {action.kind === "reverse" && (
              <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                propose
              </span>
            )}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
