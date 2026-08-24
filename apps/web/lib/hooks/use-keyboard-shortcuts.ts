"use client";

import { useEffect } from "react";

export type ShortcutMap = Record<string, () => void>;

// Normalizes key combos: Cmd+K, Ctrl+K, ?, / etc.
// Map keys: "cmd+k", "cmd+n", "?", "/" — case-insensitive.
export function useKeyboardShortcuts(map: ShortcutMap) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null;
      const isTyping =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.isContentEditable);

      // Allow ? even when typing? No — block if typing.
      if (isTyping) return;

      // Don't hijack when a dialog handles Escape itself.
      const dialogOpen = !!document.querySelector('[role="dialog"]');
      if (e.key === "Escape" && dialogOpen) return;

      const cmd = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      let combo = "";
      if (cmd && key) combo = `cmd+${key}`;
      else if (key === "?" || key === "/") combo = key;

      const handler = map[combo] ?? map[key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [map]);
}
