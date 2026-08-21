"use client";

import { useCallback } from "react";

// ─── Screen Reader Announcements ───────────────────────────────────────────
//
// Announce dynamic content changes to screen readers via aria-live regions.
// Use this for:
// - Loading states: "Loading journal entries..."
// - Success states: "Invoice created successfully"
// - Error states: "Failed to save. Please try again."
// - Status updates: "3 items approved"
// - Data changes: "Dashboard data refreshed"
//
// The announcement is made by updating the content of the live region.
// The screen reader will announce the new content.

const ANNOUNCEMENT_REGION_ID = "sr-announcements";

export function useSrAnnounce() {
  const announce = useCallback(
    (message: string, priority?: "polite" | "assertive") => {
      if (typeof window === "undefined") return;

      const region = document.getElementById(ANNOUNCEMENT_REGION_ID);
      if (!region) return;

      // Set the priority if specified
      if (priority) {
        region.setAttribute("aria-live", priority);
      }

      // Clear and set the message (clearing ensures the screen reader announces it)
      region.textContent = "";
      requestAnimationFrame(() => {
        region.textContent = message;
      });

      // Reset priority after a delay
      if (priority) {
        setTimeout(() => {
          region.setAttribute("aria-live", "polite");
        }, 1000);
      }
    },
    [],
  );

  return { announce };
}

// ─── Announce Loading ──────────────────────────────────────────────────────

export function useAnnounceLoading() {
  const { announce } = useSrAnnounce();

  const announceLoading = useCallback(
    (resource: string) => {
      announce(`Loading ${resource}...`);
    },
    [announce],
  );

  const announceLoaded = useCallback(
    (resource: string, count?: number) => {
      if (count !== undefined) {
        announce(`${count} ${resource} loaded`);
      } else {
        announce(`${resource} loaded`);
      }
    },
    [announce],
  );

  const announceError = useCallback(
    (resource: string, error?: string) => {
      announce(
        `Failed to load ${resource}${error ? `: ${error}` : ""}. Please try again.`,
        "assertive",
      );
    },
    [announce],
  );

  return { announceLoading, announceLoaded, announceError };
}

// ─── Announce Actions ──────────────────────────────────────────────────────

export function useAnnounceAction() {
  const { announce } = useSrAnnounce();

  const announceAction = useCallback(
    (action: string, result: "success" | "error", detail?: string) => {
      const message =
        result === "success"
          ? `${action} successfully${detail ? `: ${detail}` : ""}`
          : `Failed to ${action.toLowerCase()}${detail ? `: ${detail}` : ""}. Please try again.`;

      announce(message, result === "error" ? "assertive" : "polite");
    },
    [announce],
  );

  return { announceAction };
}
