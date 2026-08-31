"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  getPostHog,
  identifyUser,
  resetIdentity,
} from "@/lib/analytics/posthog";
import { trackPageView } from "@/lib/analytics/events";

/**
 * PostHog Analytics Provider
 *
 * Initializes PostHog on the client side, handles pageview tracking,
 * and provides user identification when auth state changes.
 *
 * Must be wrapped in a SessionProvider (next-auth) to access auth state.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize PostHog on mount
  useEffect(() => {
    try {
      getPostHog();
    } catch {
      // PostHog init failure should not crash the app
    }
  }, []);

  // Track pageviews on route change
  useEffect(() => {
    try {
      const url =
        pathname +
        (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      trackPageView(url);
    } catch {
      // Pageview tracking failure should not crash the app
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}

/**
 * Hook to identify the current user with PostHog.
 * Call this in the dashboard layout after auth succeeds.
 */
export function usePostHogIdentify(
  userId: string | undefined,
  properties?: Record<string, string | number | boolean>,
) {
  useEffect(() => {
    if (userId) {
      identifyUser(userId, properties);
    }
  }, [userId, properties]);
}

/**
 * Hook to reset PostHog identity on logout.
 */
export function usePostHogReset(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) {
      resetIdentity();
    }
  }, [isAuthenticated]);
}
