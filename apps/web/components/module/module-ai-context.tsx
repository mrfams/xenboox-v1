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
};

type ModuleAiContextValue = {
  /** The most recent focus request, if any. */
  focusRequest: FocusRequest | null;
  /** Open the page copilot targeted at a specific record. */
  openWithFocus: (focus: PageFocus) => void;
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

  const openWithFocus = useCallback((focus: PageFocus) => {
    setFocusRequest({ nonce: Date.now(), focus });
  }, []);

  return (
    <ModuleAiContext.Provider value={{ focusRequest, openWithFocus }}>
      {children}
    </ModuleAiContext.Provider>
  );
}
