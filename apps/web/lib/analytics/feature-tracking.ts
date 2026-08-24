"use client";

export function trackFeatureAdoption(
  feature: string,
  props: Record<string, unknown> = {},
) {
  try {
    const posthog = (
      window as unknown as {
        posthog?: { capture: (e: string, p: unknown) => void };
      }
    ).posthog;
    posthog?.capture("feature_used", { feature, ...props });
    const { track } = require("@/lib/analytics/events");
    track("feature_used", { feature, ...props });
  } catch {}
}

export function trackFunnel(step: string, props: Record<string, unknown> = {}) {
  try {
    const posthog = (
      window as unknown as {
        posthog?: { capture: (e: string, p: unknown) => void };
      }
    ).posthog;
    posthog?.capture("funnel_step", { step, ...props });
  } catch {}
}
