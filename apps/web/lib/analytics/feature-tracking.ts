"use client";

import { track } from "@/lib/analytics/events";

/**
 * Track feature adoption (typed event).
 * Use this when a user interacts with a specific feature.
 */
export function trackFeatureAdoption(
  feature: string,
  props: Record<string, unknown> = {},
) {
  try {
    track("feature_used", {
      entityId: (props.entityId as string) ?? "",
      feature,
      surface: (props.surface as string) ?? "unknown",
    });
  } catch {}
}

/**
 * Track activation funnel steps.
 * Use this for onboarding and activation milestones.
 */
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

/**
 * Track activation milestone.
 */
export function trackActivation(
  entityId: string,
  props: Record<string, unknown> = {},
) {
  trackFunnel("activation", { entityId, ...props });
  trackFeatureAdoption("activation", { entityId, ...props });
}

// ─── Activation Funnel Helpers ───────────────────────────────────────────

/**
 * Track first-value moments in the activation funnel.
 * These are the key milestones that indicate a user has experienced
 * the core value of Xenboox.
 */
export const activationEvents = {
  /** User sends their first AI chat message */
  firstChatMessage: (entityId: string, conversationId: string) => {
    track("ai_chat_message_sent", { entityId, conversationId });
    trackFunnel("first_chat_message", { entityId });
  },

  /** User creates their first invoice */
  firstInvoice: (
    entityId: string,
    type: "sales" | "ap",
    amount: number,
    currency: string,
  ) => {
    track("invoice_created", { entityId, type, amount, currency });
    trackFunnel("first_invoice", { entityId, type });
  },

  /** User posts their first journal entry */
  firstJournalEntry: (
    entityId: string,
    lineCount: number,
    source: "manual" | "agent",
  ) => {
    track("journal_entry_posted", { entityId, lineCount, source });
    trackFunnel("first_journal_entry", { entityId, source });
  },

  /** User completes their first month-end close */
  firstMonthEndClose: (
    entityId: string,
    period: string,
    durationSeconds: number,
    confidence: number,
  ) => {
    track("month_end_close_completed", {
      entityId,
      period,
      duration_seconds: durationSeconds,
      confidence,
    });
    trackFunnel("first_month_close", { entityId, period });
  },

  /** User connects their first bank account */
  firstBankConnection: (
    entityId: string,
    provider: string,
    accountCount: number,
  ) => {
    track("bank_connection_completed", {
      entityId,
      provider,
      accountCount,
    });
    trackFunnel("first_bank_connection", { entityId, provider });
  },

  /** User generates their first report */
  firstReport: (
    entityId: string,
    reportType: string,
    format: "pdf" | "excel" | "csv",
  ) => {
    track("report_generated", { entityId, reportType, format });
    trackFunnel("first_report", { entityId, reportType });
  },

  /** User records their first payment */
  firstPayment: (
    entityId: string,
    type: "sales" | "ap",
    amount: number,
    method: string,
  ) => {
    track("payment_recorded", { entityId, type, amount, method });
    trackFunnel("first_payment", { entityId, type });
  },

  /** User visits the Command Center for the first time (once per session per entity) */
  commandCenterFirstVisit: (entityId: string) => {
    // Session-level dedup: prevents firing on every mount/re-render
    const dedupKey = `cmd_center_first_visit:${entityId}`;
    try {
      if (sessionStorage.getItem(dedupKey)) return;
      sessionStorage.setItem(dedupKey, "1");
    } catch {
      // sessionStorage unavailable (SSR/incognito) — allow the event
    }
    trackFunnel("command_center_first_visit", { entityId });
  },

  /** User views a financial narrative */
  financialNarrativeViewed: (entityId: string, surface: string) => {
    track("ai_narrative_generated", { entityId, surface });
    trackFunnel("narrative_viewed", { entityId, surface });
  },

  // ── Checklist & Onboarding Funnel ───────────────────────────────────

  /** User views a checklist step */
  checklistStepViewed: (entityId: string, stepId: string) => {
    trackFunnel("checklist_step_viewed", { entityId, stepId });
  },

  /** User completes a checklist step */
  checklistStepCompleted: (entityId: string, stepId: string) => {
    trackFunnel("checklist_step_completed", { entityId, stepId });
  },

  /** User dismisses the getting-started checklist */
  checklistDismissed: (entityId: string, completedSteps: number) => {
    trackFunnel("checklist_dismissed", { entityId, completedSteps });
  },

  // ── AI Interaction Funnel ───────────────────────────────────────────

  /** User clicks a suggestion chip */
  suggestionChipClicked: (entityId: string, chipText: string) => {
    track("suggestion_chip_clicked", { entityId, chipText });
    trackFunnel("suggestion_chip_click", { entityId });
  },

  /** User approves an AI suggestion */
  aiSuggestionApproved: (entityId: string, suggestionType: string) => {
    track("ai_suggestion_approved", { entityId, suggestionType });
    trackFunnel("ai_suggestion_approved", { entityId, suggestionType });
  },

  /** User rejects an AI suggestion */
  aiSuggestionRejected: (entityId: string, suggestionType: string) => {
    track("ai_suggestion_rejected", { entityId, suggestionType });
    trackFunnel("ai_suggestion_rejected", { entityId, suggestionType });
  },

  // ── Content Actions ─────────────────────────────────────────────────

  /** User regenerates AI content */
  contentRegenerated: (entityId: string, contentType: string) => {
    track("content_regenerated", { entityId, contentType });
  },

  /** User pins content */
  contentPinned: (entityId: string, contentType: string) => {
    track("content_pinned", { entityId, contentType });
  },

  /** User copies content */
  contentCopied: (entityId: string, contentType: string) => {
    track("content_copied", { entityId, contentType });
  },

  // ── Export Actions ──────────────────────────────────────────────────

  /** User exports data */
  dataExported: (entityId: string, format: string, dataType: string) => {
    track("data_exported", { entityId, format, dataType });
    trackFunnel("data_exported", { entityId, format });
  },
};
