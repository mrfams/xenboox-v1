/**
 * Typed Analytics Events for PostHog
 *
 * Every event tracked in the app is defined here with its properties.
 * This serves as a single source of truth for what we track and why.
 *
 * Categories:
 *   - Acquisition: How users find us
 *   - Activation: Onboarding and first-value moments
 *   - Engagement: Feature usage and depth
 *   - Revenue: Billing and conversion
 *   - Retention: Comeback and churn signals
 */

import { captureEvent } from "./posthog";

// ─── Event Definitions ──────────────────────────────────────────────────

export type AnalyticsEvent =
  // Acquisition
  | {
      event: "landing_page_viewed";
      properties: { page: string; referrer?: string };
    }
  | { event: "pricing_page_viewed"; properties: { plan_viewed?: string } }
  | {
      event: "signup_started";
      properties: { method: "email" | "google" | "github" };
    }
  | {
      event: "signup_completed";
      properties: { method: "email" | "google" | "github"; userId: string };
    }

  // Activation
  | { event: "onboarding_started"; properties: { entityId: string } }
  | {
      event: "onboarding_step_completed";
      properties: { entityId: string; step: number; stepName: string };
    }
  | {
      event: "onboarding_completed";
      properties: { entityId: string; duration_seconds: number };
    }
  | {
      event: "onboarding_skipped";
      properties: { entityId: string; lastStep: string };
    }
  | { event: "product_tour_started"; properties: { entityId: string } }
  | { event: "product_tour_completed"; properties: { entityId: string } }
  | {
      event: "product_tour_skipped";
      properties: { entityId: string; step: number };
    }

  // Bank & Data Connection
  | {
      event: "bank_connection_started";
      properties: { entityId: string; provider: string };
    }
  | {
      event: "bank_connection_completed";
      properties: { entityId: string; provider: string; accountCount: number };
    }
  | {
      event: "bank_connection_failed";
      properties: { entityId: string; provider: string; error: string };
    }
  | {
      event: "exchange_rate_synced";
      properties: { entityId: string; rateCount: number };
    }

  // AI Engagement
  | {
      event: "ai_chat_message_sent";
      properties: { entityId: string; conversationId: string };
    }
  | {
      event: "ai_chat_response_received";
      properties: {
        entityId: string;
        agentId: string;
        confidence: number;
        latencyMs: number;
      };
    }
  | {
      event: "ai_chat_escalated_to_human";
      properties: { entityId: string; agentId: string; reason: string };
    }
  | {
      event: "ai_narrative_generated";
      properties: { entityId: string; surface: string };
    }

  // Financial Operations
  | {
      event: "invoice_created";
      properties: {
        entityId: string;
        type: "sales" | "ap";
        amount: number;
        currency: string;
      };
    }
  | {
      event: "invoice_sent";
      properties: {
        entityId: string;
        type: "sales" | "ap";
        deliveryMethod: "email" | "payment_link";
      };
    }
  | {
      event: "payment_recorded";
      properties: {
        entityId: string;
        type: "sales" | "ap";
        amount: number;
        method: string;
      };
    }
  | {
      event: "journal_entry_posted";
      properties: {
        entityId: string;
        lineCount: number;
        source: "manual" | "agent";
      };
    }
  | {
      event: "month_end_close_initiated";
      properties: { entityId: string; period: string; triggerSource: string };
    }
  | {
      event: "month_end_close_completed";
      properties: {
        entityId: string;
        period: string;
        duration_seconds: number;
        confidence: number;
      };
    }
  | {
      event: "report_generated";
      properties: {
        entityId: string;
        reportType: string;
        format: "pdf" | "excel" | "csv";
      };
    }

  // Feature Usage
  | {
      event: "feature_used";
      properties: { entityId: string; feature: string; surface: string };
    }
  | {
      event: "search_performed";
      properties: {
        entityId: string;
        query_length: number;
        resultCount: number;
      };
    }
  | {
      event: "export_performed";
      properties: { entityId: string; format: string; recordCount: number };
    }
  | {
      event: "bulk_action_performed";
      properties: { entityId: string; action: string; count: number };
    }

  // Navigation
  | { event: "surface_navigated"; properties: { from: string; to: string } }
  | { event: "command_palette_opened"; properties: { entityId?: string } }
  | { event: "command_palette_action_selected"; properties: { action: string } }

  // Revenue / Billing
  | {
      event: "plan_upgraded";
      properties: { fromPlan: string; toPlan: string; entityId: string };
    }
  | {
      event: "plan_downgraded";
      properties: { fromPlan: string; toPlan: string; entityId: string };
    }
  | {
      event: "subscription_cancelled";
      properties: { plan: string; entityId: string; reason?: string };
    }

  // Retention
  | {
      event: "session_started";
      properties: { entityId: string; isFirstSession: boolean };
    }
  | {
      event: "returning_user_detected";
      properties: { entityId: string; daysSinceLastVisit: number };
    }
  | {
      event: "feedback_submitted";
      properties: {
        entityId: string;
        type: "nps" | "bug" | "feature_request";
        rating?: number;
      };
    };

// ─── Tracking Functions ─────────────────────────────────────────────────

type EventMap = {
  [K in AnalyticsEvent["event"]]: Extract<
    AnalyticsEvent,
    { event: K }
  >["properties"];
};

/**
 * Track an analytics event with full type safety.
 *
 * @example
 * track("signup_completed", { method: "email", userId: "123" });
 * track("ai_chat_message_sent", { entityId: "abc", conversationId: "def" });
 */
export function track<T extends AnalyticsEvent["event"]>(
  event: T,
  properties: EventMap[T],
): void {
  captureEvent(event, properties as Record<string, string | number | boolean>);
}

/**
 * Track a page view manually (we disable auto pageview in PostHog config).
 */
export function trackPageView(
  url: string,
  properties?: Record<string, string | number | boolean>,
): void {
  captureEvent("$pageview", {
    $current_url: url,
    ...properties,
  } as Record<string, string | number | boolean>);
}

/**
 * Track a feature usage event (convenience wrapper).
 */
export function trackFeature(
  feature: string,
  entityId: string,
  surface: string = "dashboard",
): void {
  track("feature_used", { entityId, feature, surface });
}
