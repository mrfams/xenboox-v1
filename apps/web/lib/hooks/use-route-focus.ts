"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// ─── Route Focus Manager ──────────────────────────────────────────────────
//
// WCAG 2.4.3 (Focus Order) + 4.1.3 (Status Messages):
// When navigating between surfaces, focus moves to the main content area
// and screen readers announce the new page title via an aria-live region.

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Command Center",
  "/dashboard/activity-hub": "Activity Hub",
  "/dashboard/financial-pulse": "Financial Pulse",
  "/dashboard/ledger": "Ledger",
  "/dashboard/operations": "Operations",
  "/dashboard/settings": "Settings",
  "/dashboard/help": "Help & Support",
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  // Prefix match for sub-routes
  for (const [route, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(route + "/")) return title;
  }

  return "Dashboard";
}

export function useRouteFocus() {
  const pathname = usePathname() ?? "/";
  const prevPathnameRef = useRef(pathname);
  const announceRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Only act on actual route changes (not initial mount)
    if (prevPathnameRef.current === pathname) return;
    prevPathnameRef.current = pathname;

    // Find the main content element
    if (!mainRef.current) {
      mainRef.current = document.getElementById("main-content");
    }

    // Focus the main content so screen readers start reading from the top
    if (mainRef.current) {
      mainRef.current.focus({ preventScroll: false });
    }

    // Announce the page title to screen readers
    if (announceRef.current) {
      const title = getPageTitle(pathname);
      announceRef.current.textContent = `Navigated to ${title}`;
    }
  }, [pathname]);

  // Helper to get the announce ref for rendering
  const getAnnounceProps = () => ({
    ref: announceRef,
    role: "status" as const,
    "aria-live": "polite" as const,
    "aria-atomic": "true" as const,
    className: "sr-only" as const,
  });

  return { getAnnounceProps };
}
