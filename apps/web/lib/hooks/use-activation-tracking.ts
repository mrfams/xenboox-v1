"use client";

import { useEffect, useRef } from "react";
import { useEntity } from "@/lib/entity-context";
import { activationEvents } from "@/lib/analytics/feature-tracking";

/**
 * Track activation funnel events when key mutations succeed.
 *
 * This hook monitors localStorage flags to detect first-time actions
 * and fires the appropriate activation event. Once fired, the flag
 * is set so the event doesn't fire again.
 *
 * Usage:
 *   useActivationTracking(); // Place in dashboard layout
 */

const ACTIVATION_FLAGS = {
  firstChatMessage: "xenboox_activation_chat",
  firstInvoice: "xenboox_activation_invoice",
  firstJournalEntry: "xenboox_activation_journal",
  firstMonthClose: "xenboox_activation_month_close",
  firstBankConnection: "xenboox_activation_bank",
  firstReport: "xenboox_activation_report",
  firstPayment: "xenboox_activation_payment",
} as const;

type ActivationFlag = keyof typeof ACTIVATION_FLAGS;

function hasCompletedActivation(flag: ActivationFlag): boolean {
  try {
    return localStorage.getItem(ACTIVATION_FLAGS[flag]) === "true";
  } catch {
    return false;
  }
}

function markActivationComplete(flag: ActivationFlag): void {
  try {
    localStorage.setItem(ACTIVATION_FLAGS[flag], "true");
  } catch {}
}

/**
 * Check if a specific activation has been completed.
 * Exported for use in UI components (e.g., showing/hiding onboarding hints).
 */
export function isActivationComplete(flag: ActivationFlag): boolean {
  return hasCompletedActivation(flag);
}

/**
 * Mark an activation as complete.
 * Exported for use after mutations succeed.
 */
export function completeActivation(flag: ActivationFlag): void {
  markActivationComplete(flag);
}

/**
 * Listen for custom events on window to detect activation milestones.
 * Components dispatch these events after successful mutations.
 */
export function useActivationTracking() {
  const { entityId } = useEntity();
  const initialized = useRef(false);

  useEffect(() => {
    if (!entityId || initialized.current) return;
    initialized.current = true;

    const handleActivation = (e: CustomEvent) => {
      const { type, data } = e.detail;

      switch (type) {
        case "first_chat_message":
          if (!hasCompletedActivation("firstChatMessage")) {
            activationEvents.firstChatMessage(
              entityId,
              data.conversationId ?? "",
            );
            markActivationComplete("firstChatMessage");
          }
          break;

        case "first_invoice":
          if (!hasCompletedActivation("firstInvoice")) {
            activationEvents.firstInvoice(
              entityId,
              data.type ?? "sales",
              data.amount ?? 0,
              data.currency ?? "USD",
            );
            markActivationComplete("firstInvoice");
          }
          break;

        case "first_journal_entry":
          if (!hasCompletedActivation("firstJournalEntry")) {
            activationEvents.firstJournalEntry(
              entityId,
              data.lineCount ?? 0,
              data.source ?? "manual",
            );
            markActivationComplete("firstJournalEntry");
          }
          break;

        case "first_month_close":
          if (!hasCompletedActivation("firstMonthClose")) {
            activationEvents.firstMonthEndClose(
              entityId,
              data.period ?? "",
              data.durationSeconds ?? 0,
              data.confidence ?? 0,
            );
            markActivationComplete("firstMonthClose");
          }
          break;

        case "first_bank_connection":
          if (!hasCompletedActivation("firstBankConnection")) {
            activationEvents.firstBankConnection(
              entityId,
              data.provider ?? "",
              data.accountCount ?? 0,
            );
            markActivationComplete("firstBankConnection");
          }
          break;

        case "first_report":
          if (!hasCompletedActivation("firstReport")) {
            activationEvents.firstReport(
              entityId,
              data.reportType ?? "",
              data.format ?? "pdf",
            );
            markActivationComplete("firstReport");
          }
          break;

        case "first_payment":
          if (!hasCompletedActivation("firstPayment")) {
            activationEvents.firstPayment(
              entityId,
              data.type ?? "sales",
              data.amount ?? 0,
              data.method ?? "",
            );
            markActivationComplete("firstPayment");
          }
          break;
      }
    };

    window.addEventListener(
      "activation-event",
      handleActivation as EventListener,
    );
    return () =>
      window.removeEventListener(
        "activation-event",
        handleActivation as EventListener,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);
}

/**
 * Dispatch an activation event from a component.
 * Call this after a successful mutation.
 *
 * @example
 *   dispatchActivationEvent("first_invoice", {
 *     type: "sales",
 *     amount: 1500,
 *     currency: "USD",
 *   });
 */
export function dispatchActivationEvent(
  type: string,
  data: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("activation-event", {
      detail: { type, data },
    }),
  );
}
