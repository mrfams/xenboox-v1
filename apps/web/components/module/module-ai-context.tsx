"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";

import type { PageFocus } from "@/lib/chat/page-context";

/**
 * Focus-request channel between row AI actions and the page copilot.
 *
 * When a user clicks the ✨ action on a table row, the row calls
 * `openWithFocus(focus)` and the ModulePageShell (which renders the copilot)
 * forwards it down with a fresh nonce so the copilot re-opens and targets
 * that record — the Cursor/VSCode "pick something up, then ask" pattern.
 */

export type FocusRequest = {
  nonce: number;
  focus: PageFocus;
  /**
   * Optional command to run immediately on open — e.g. "Explain this entry".
   * Used by the row right-click menu so a menu item feels like a real action
   * instead of just opening the panel.
   */
  initialPrompt?: string;
};

type ModuleAiContextValue = {
  /** The most recent focus request, if any. */
  focusRequest: FocusRequest | null;
  /**
   * Open the page copilot targeted at a specific record.
   * Pass an optional `initialPrompt` to auto-run a command on open
   * (right-click menu items like "Explain this entry").
   */
  openWithFocus: (focus: PageFocus, initialPrompt?: string) => void;
};

const ModuleAiContext = createContext<ModuleAiContextValue | null>(null);

export function useModuleAi(): ModuleAiContextValue {
  const router = useRouter();
  const ctx = useContext(ModuleAiContext);
  if (ctx) return ctx;

  // Outside a shell (pages without a module copilot — e.g. Ledger,
  // Operations) the request must not vanish silently: route it to the
  // Command Center as a real prompt, carrying the record context so the
  // AI can target the same thing the user was looking at.
  return {
    focusRequest: null,
    openWithFocus: (focus, initialPrompt) => {
      if (typeof window === "undefined") return;
      const parts: string[] = [];
      if (initialPrompt) parts.push(initialPrompt);
      const focusBits = [
        focus.kind ? `this ${focus.kind.toLowerCase()}` : "",
        focus.name || "",
        ...(focus.fields ?? [])
          .slice(0, 5)
          .map((f) => `${f.label}: ${f.value}`),
      ].filter(Boolean);
      if (focusBits.length) {
        parts.push(`Context — ${focusBits.join(", ")}`);
      }
      const prompt =
        parts.join("\n") || "Help me with the record I was just looking at.";
      router.push(`/dashboard?prompt=${encodeURIComponent(prompt)}`);
    },
  };
}

export function ModuleAiProvider({ children }: { children: React.ReactNode }) {
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  const openWithFocus = useCallback(
    (focus: PageFocus, initialPrompt?: string) => {
      setFocusRequest({ nonce: Date.now(), focus, initialPrompt });
    },
    [],
  );

  return (
    <ModuleAiContext.Provider value={{ focusRequest, openWithFocus }}>
      {children}
    </ModuleAiContext.Provider>
  );
}
