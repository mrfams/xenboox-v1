"use client";

import { useEffect, useRef, useCallback } from "react";

// ─── Focus Trap ────────────────────────────────────────────────────────────
//
// Traps keyboard focus within a container (modal, drawer, dialog).
// Follows WAI-ARIA Dialog Pattern:
// https://www.w3.org/WAI/ARIA/apd/patterns/dialog-modal/
//
// - Tab/Shift+Tab cycles through focusable elements within the container
// - Escape key calls onClose (if provided)
// - Focus is restored to the trigger element when the trap is released
// - Focus is moved to the first focusable element when the trap is activated

const FOCUSABLE_SELECTORS = [
  'a[href]:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]:not([tabindex="-1"])',
].join(", ");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
    (el) => el.offsetParent !== null, // visible
  ) as HTMLElement[];
}

interface UseFocusTrapOptions {
  /** Whether the trap is active */
  enabled?: boolean;
  /** Called when Escape is pressed */
  onClose?: () => void;
  /** Whether to restore focus to the trigger element on release */
  restoreFocus?: boolean;
  /** Whether to auto-focus the first element on activate */
  autoFocus?: boolean;
}

export function useFocusTrap({
  enabled = true,
  onClose,
  restoreFocus = true,
  autoFocus = true,
}: UseFocusTrapOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the currently focused element before trapping
  useEffect(() => {
    if (enabled) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [enabled]);

  // Focus the first element when the trap is activated
  useEffect(() => {
    if (!enabled || !containerRef.current || !autoFocus) return;

    // Small delay to let the DOM render
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      // Try to focus the first focusable element
      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        // If no focusable elements, focus the container itself
        container.focus();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [enabled, autoFocus]);

  // Restore focus when the trap is released
  useEffect(() => {
    return () => {
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    };
  }, [restoreFocus]);

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onClose]);

  return containerRef;
}

// ─── Focus Restore ─────────────────────────────────────────────────────────
//
// Saves and restores focus when a modal/drawer opens and closes.
// Use this instead of useFocusTrap when you don't need the full trap behavior.

export function useFocusRestore() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const save = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restore = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, []);

  return { save, restore };
}

// ─── Roving Tab Index ──────────────────────────────────────────────────────
//
// Implements roving tabindex for tab lists (WAI-ARIA Tabs pattern).
// Arrow keys move focus between tabs, Home/End jump to first/last.

export function useRovingTabIndex({
  containerRef,
  itemSelector = '[role="tab"]',
  orientation = "horizontal",
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  itemSelector?: string;
  orientation?: "horizontal" | "vertical";
}) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleKeyDown(e: KeyboardEvent) {
      const tabs = Array.from(
        container!.querySelectorAll(itemSelector),
      ) as HTMLElement[];
      const currentIndex = tabs.indexOf(document.activeElement as HTMLElement);

      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      switch (e.key) {
        case orientation === "horizontal" ? "ArrowRight" : "ArrowDown":
          e.preventDefault();
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case orientation === "horizontal" ? "ArrowLeft" : "ArrowUp":
          e.preventDefault();
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      // Update tabindex values
      tabs.forEach((tab, i) => {
        tab.setAttribute("tabindex", i === nextIndex ? "0" : "-1");
      });

      // Focus the next tab
      tabs[nextIndex].focus();
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, itemSelector, orientation]);
}
