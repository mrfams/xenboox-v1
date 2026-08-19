"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bot,
  HelpCircle,
  BarChart3,
  Flag,
  Calendar,
  RefreshCw,
  Calculator,
  Clock,
  Tag,
  Send,
  FileText,
  ScrollText,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  BookOpen,
  Wallet,
  History,
  CalendarClock,
  Landmark,
  Copy,
  Check,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useDataSelection } from "@/lib/hooks/use-data-selection";
import type { ContextAction } from "@/lib/data-context";

// ─── Icon Map ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Bot,
  HelpCircle,
  BarChart3,
  Flag,
  Calendar,
  RefreshCw,
  Calculator,
  Clock,
  Tag,
  Send,
  FileText,
  ScrollText,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  BookOpen,
  Wallet,
  History,
  CalendarClock,
  Landmark,
  Copy,
};

// ─── Menu Dimensions ──────────────────────────────────────────────────────

const MENU_MIN_WIDTH = 220;
const MENU_ITEM_HEIGHT = 36;
const VIEWPORT_PADDING = 12;

// ─── Data Type Badge ──────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  currency: {
    label: "Amount",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  date: {
    label: "Date",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  status: {
    label: "Status",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  percentage: {
    label: "Metric",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  "record-name": {
    label: "Record",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  generic: {
    label: "Text",
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

// ─── Component ────────────────────────────────────────────────────────────

export function DataAwareContextMenu({
  onOpenCopilot,
}: {
  /** Called when the user picks an AI action — receives the prompt to send. */
  onOpenCopilot: (prompt: string) => void;
}) {
  const { selection, clear, menuRef } = useDataSelection();
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef(0);
  const [copied, setCopied] = useState(false);

  // Clamp the menu to the viewport after it renders.
  useLayoutEffect(() => {
    if (!selection) return;
    const el = menuRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const totalHeight = (selection.actions.length + 1) * MENU_ITEM_HEIGHT + 60;
    setPos({
      x: Math.max(
        VIEWPORT_PADDING,
        Math.min(
          selection.x - rect.width / 2,
          window.innerWidth - rect.width - VIEWPORT_PADDING,
        ),
      ),
      y: Math.max(VIEWPORT_PADDING, selection.y - totalHeight),
    });
  }, [selection, menuRef]);

  // Keyboard navigation.
  useLayoutEffect(() => {
    if (!selection) return;
    const count = selection.actions.length;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(activeRef.current + 1, count - 1);
        activeRef.current = next;
        setActiveIndex(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(activeRef.current - 1, 0);
        activeRef.current = next;
        setActiveIndex(next);
      } else if (e.key === "Enter" && selection) {
        e.preventDefault();
        const action = selection.actions[activeRef.current];
        if (action) handleAction(action);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset active index when selection changes.
  useLayoutEffect(() => {
    setActiveIndex(0);
    activeRef.current = 0;
    setCopied(false);
  }, [selection?.text]);

  const handleAction = useCallback(
    (action: ContextAction) => {
      if (action.id === "copy" && selection) {
        navigator.clipboard.writeText(selection.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        return;
      }
      if (action.prompt) {
        onOpenCopilot(action.prompt);
        clear();
      }
    },
    [selection, onOpenCopilot, clear],
  );

  if (!selection) return null;

  const badge = TYPE_BADGE[selection.dataType] ?? TYPE_BADGE.generic;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Data actions"
      className="fixed z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/10 animate-in fade-in-0 zoom-in-95 duration-100"
      style={{
        left: pos.x,
        top: pos.y,
        minWidth: MENU_MIN_WIDTH,
      }}
    >
      {/* ── Header: selected text preview + data type badge ── */}
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground/80">
          {selection.text.length > 40
            ? `${selection.text.slice(0, 40)}…`
            : selection.text}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full border px-1.5 py-px text-[8px] font-bold uppercase tracking-wider",
            badge.className,
          )}
        >
          {badge.label}
        </span>
      </div>

      {/* ── Actions ── */}
      <div className="p-1">
        {selection.actions.map((action, i) => {
          const Icon = ICON_MAP[action.icon] ?? Bot;
          const isActive = i === activeIndex;

          return (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              onClick={() => handleAction(action)}
              onMouseEnter={() => {
                setActiveIndex(i);
                activeRef.current = i;
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-muted/50",
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", action.color)} />
              <span className="flex-1">{action.label}</span>
              {action.id === "copy" && copied && (
                <Check className="h-3 w-3 text-emerald-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
