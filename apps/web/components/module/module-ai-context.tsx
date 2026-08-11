"use client";

import { createContext, useCallback, useContext, useState } from "react";

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
  const ctx = useContext(ModuleAiContext);
  // Outside a shell (e.g. a component preview) the action degrades to a no-op
  // instead of crashing — the button just won't do anything.
  if (!ctx) {
    return {
      focusRequest: null,
      openWithFocus: () => {},
    };
  }
  return ctx;
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
