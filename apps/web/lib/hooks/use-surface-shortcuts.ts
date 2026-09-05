"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Surface Keyboard Shortcuts ────────────────────────────────────────────
//
// Press 1-6 to jump between dashboard surfaces. Only active when the user
// is not focused on an input, textarea, select, or contenteditable element.
// This prevents conflicts with typing in the AI chat or form fields.

const SURFACE_SHORTCUTS: Record<string, { href: string; label: string }> = {
  "1": { href: "/dashboard", label: "Command Center" },
  "2": { href: "/dashboard/tasks", label: "Tasks" },
  "3": { href: "/dashboard/financial-pulse", label: "Financial Pulse" },
  "4": { href: "/dashboard/ledger", label: "Ledger" },
  "5": { href: "/dashboard/operations", label: "Operations" },
  "6": { href: "/dashboard/people", label: "People & Assets" },
};

const INTERACTIVE_TAG_NAMES = new Set([
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "BUTTON",
  "A",
]);

function isInteractiveElement(el: Element | null): boolean {
  if (!el) return false;
  if (INTERACTIVE_TAG_NAMES.has(el.tagName)) return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useSurfaceShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if modifier keys are held (Ctrl+1, Cmd+1, Alt+1, etc.)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Ignore if focused on an interactive element
      if (isInteractiveElement(document.activeElement)) return;

      const shortcut = SURFACE_SHORTCUTS[e.key];
      if (!shortcut) return;

      // Don't navigate if already on this surface
      if (window.location.pathname === shortcut.href) return;

      e.preventDefault();
      router.push(shortcut.href);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);
}

export { SURFACE_SHORTCUTS };
