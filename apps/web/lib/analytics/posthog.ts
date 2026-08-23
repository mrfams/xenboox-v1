/**
 * PostHog Analytics Client
 *
 * Provides a singleton PostHog client for browser and server usage.
 * In production, uses UPSTASH_REDIS_REST_URL env var pattern —
 * PostHog uses its own POSTHOG_KEY env var.
 *
 * Falls back gracefully when PostHog is not configured (dev/test).
 */

import posthog from "posthog-js";

let posthogClient: typeof posthog | null = null;

/**
 * Get or initialize the PostHog browser client.
 * Safe to call multiple times — returns the same instance.
 */
export function getPostHog(): typeof posthog | null {
  if (posthogClient) return posthogClient;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // We handle pageviews manually
    capture_pageleave: true,
    autocapture: true, // Auto-capture clicks, inputs, etc.
    session_recording: {
      maskTextSelector: ".ph-no-capture",
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
        email: true,
      },
    },
    persistence: "localStorage+cookie",
    cross_subdomain_cookie: true,
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        ph.debug();
      }
    },
  });

  posthogClient = posthog;
  return posthogClient;
}

/**
 * Identify the current user with PostHog.
 * Call this after auth succeeds.
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, string | number | boolean>,
): void {
  const ph = getPostHog();
  if (!ph) return;

  ph.identify(userId, properties);
}

/**
 * Reset PostHog identity (on logout).
 */
export function resetIdentity(): void {
  const ph = getPostHog();
  if (!ph) return;

  ph.reset();
}

/**
 * Capture a custom event.
 */
export function captureEvent(
  event: string,
  properties?: Record<string, string | number | boolean>,
): void {
  const ph = getPostHog();
  if (!ph) return;

  ph.capture(event, properties);
}

/**
 * Get the PostHog distinct ID (for linking to user records).
 */
export function getDistinctId(): string | null {
  const ph = getPostHog();
  if (!ph) return null;

  return ph.get_distinct_id();
}
