"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import {
  type DataType,
  detectDataType,
  extractDataAttributes,
  getPageFromRoute,
  type ContextAction,
  buildActions,
} from "@/lib/data-context";

export type DataSelection = {
  /** The raw selected text. */
  text: string;
  /** Detected or attributed data type. */
  dataType: DataType;
  /** Page name derived from the current route. */
  page: string | null;
  /** Record context extracted from DOM data attributes. */
  record?: { id?: string; type?: string; name?: string };
  /** Screen coordinates for positioning the menu (center-top of selection). */
  x: number;
  y: number;
  /** The computed context-aware actions. */
  actions: ContextAction[];
};

/**
 * useDataSelection — listens for mouseup text selections and builds a
 * DataSelection object when the selected text lives inside a data element
 * (has `data-ai-context` ancestor) or matches a data-type regex.
 *
 * Returns null when there's no valid selection, and provides `clear()` to
 * dismiss the menu programmatically.
 */
export function useDataSelection() {
  const pathname = usePathname();
  const page = getPageFromRoute(pathname ?? "/");
  const [selection, setSelection] = useState<DataSelection | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const clear = useCallback(() => setSelection(null), []);

  useEffect(() => {
    function handleMouseUp() {
      // Defer to next frame so the selection is finalized.
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim() ?? "";
        if (!text || text.length < 2) {
          // Don't show for single characters or empty selections.
          return;
        }

        // Don't show if the selection is inside the menu itself.
        if (menuRef.current?.contains(sel?.anchorNode as Node)) {
          return;
        }

        const range = sel?.getRangeAt(0);
        if (!range) return;

        const rect = range.getBoundingClientRect();

        // Extract data attributes from the DOM.
        const target = range.startContainer.parentElement;
        const attrs = target
          ? extractDataAttributes(target as HTMLElement)
          : {};

        const dataType = detectDataType(text, attrs.context);

        // For "generic" type without any DOM context, skip — we don't want
        // to show the menu on random text like labels or welcome messages.
        if (dataType === "generic" && !attrs.context) {
          return;
        }

        const record = attrs.recordId
          ? {
              id: attrs.recordId,
              type: attrs.recordType,
              name: attrs.recordName,
            }
          : undefined;

        const actions = buildActions(dataType, text, page, record);

        setSelection({
          text,
          dataType,
          page,
          record,
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
          actions,
        });
      });
    }

    function handleMouseDown(e: MouseEvent) {
      // Dismiss when clicking outside the menu.
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setSelection(null);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelection(null);
      }
    }

    function handleScroll() {
      setSelection(null);
    }

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [page]);

  return { selection, clear, menuRef };
}
