/**
 * Cache Invalidation Utility for tRPC
 *
 * §4.7 — After every mutation, the affected queries must be invalidated
 * so the UI reflects the latest data. Without this, users see stale data
 * after creating, updating, or deleting records.
 *
 * Usage:
 *   const invalidate = invalidateAfterMutation(utils, [
 *     "ar.listInvoices",
 *     "ar.getOverdueCount",
 *     "dashboard.getDashboardData",
 *   ]);
 *   // In mutation onSuccess:
 *   onSuccess: () => invalidate(),
 */

import type { AppRouter } from "@/server/routers/_app";

type TRPCUtils = {
  [key: string]: {
    invalidate: () => void;
    [key: string]: { invalidate: () => void } | (() => void);
  };
};

/**
 * Navigate a dot-separated path to reach the query object's invalidate method.
 *
 * @param utils - The tRPC utils object from useUtils()
 * @param path - Dot-separated query path (e.g. "ar.listInvoices")
 * @returns The invalidate function, or null if path is invalid
 */
function resolveQueryPath(utils: TRPCUtils, path: string): (() => void) | null {
  const parts = path.split(".");
  let current: any = utils;

  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return null;
    }
    current = current[part];
  }

  if (typeof current === "function") {
    return current;
  }

  if (
    current &&
    typeof current === "object" &&
    typeof current.invalidate === "function"
  ) {
    return current.invalidate.bind(current);
  }

  return null;
}

/**
 * Create an invalidation function that invalidates specific queries.
 *
 * @param utils - The tRPC utils object from useUtils()
 * @param queryPaths - Array of dot-separated query paths to invalidate
 * @returns A function that invalidates all specified queries when called
 *
 * @example
 * ```tsx
 * const invalidate = invalidateAfterMutation(utils, [
 *   "ar.listInvoices",
 *   "ar.getOverdueCount",
 *   "dashboard.getDashboardData",
 * ]);
 *
 * const createInvoice = trpc.ar.createInvoice.useMutation({
 *   onSuccess: () => invalidate(),
 * });
 * ```
 */
export function invalidateAfterMutation(
  utils: TRPCUtils,
  queryPaths: string[],
): () => void {
  return () => {
    for (const path of queryPaths) {
      const invalidate = resolveQueryPath(utils, path);
      if (invalidate) {
        invalidate();
      }
    }
  };
}

/**
 * Invalidate ALL queries in the utils object.
 *
 * Use sparingly — prefer targeted invalidation via invalidateAfterMutation.
 * Only use when a mutation affects nearly everything (e.g. entity switch).
 *
 * @param utils - The tRPC utils object from useUtils()
 */
export function invalidateAll(utils: TRPCUtils): void {
  for (const key of Object.keys(utils)) {
    const module = utils[key];
    if (module && typeof module === "object") {
      for (const subKey of Object.keys(module)) {
        const sub = module[subKey];
        if (
          sub &&
          typeof sub === "object" &&
          typeof (sub as any).invalidate === "function"
        ) {
          (sub as any).invalidate();
        }
      }
    }
  }
}

/**
 * Batch invalidate multiple query paths.
 *
 * @param utils - The tRPC utils object from useUtils()
 * @param queryPaths - Array of dot-separated query paths to invalidate
 */
export function batchInvalidate(utils: TRPCUtils, queryPaths: string[]): void {
  for (const path of queryPaths) {
    const invalidate = resolveQueryPath(utils, path);
    if (invalidate) {
      invalidate();
    }
  }
}

// ─── Pre-defined Invalidation Maps ──────────────────────────────────────────
//
// Each mutation type maps to the queries it should invalidate.
// Use these as the single source of truth for invalidation rules.
// When adding a new mutation, add its invalidation map here.

export const INVALIDATION_MAP = {
  // Accounts Receivable
  "ar.createInvoice": [
    "ar.listInvoices",
    "ar.getOverdueCount",
    "dashboard.getDashboardData",
    "dashboard.getAiBriefing",
  ],
  "ar.createPayment": [
    "ar.listInvoices",
    "ar.getOverdueCount",
    "banking.listTransactions",
    "banking.getCashPosition",
    "dashboard.getDashboardData",
  ],
  "ar.createCustomer": ["ar.listInvoices", "customers.listCustomers"],

  // Accounts Payable
  "ap.createInvoice": [
    "ap.listBills",
    "ap.listSuppliers",
    "ap.getVendorsOverview",
    "dashboard.getDashboardData",
  ],
  "ap.createSupplier": ["ap.listSuppliers", "ap.getVendorsOverview"],

  // Journal / COA
  "journal.create": [
    "journal.list",
    "fiscal.getCurrent",
    "dashboard.getDashboardData",
  ],
  "coa.create": ["coa.list"],

  // Banking
  "banking.createRule": ["banking.listRules"],
  "banking.updateRule": ["banking.listRules"],
  "banking.deleteRule": ["banking.listRules"],
  "banking.batchCategorize": [
    "banking.listTransactions",
    "banking.getOverview",
  ],
  "treasury.createBankAccount": [
    "treasury.listBankAccounts",
    "banking.getOverview",
    "banking.getCashPosition",
    "dashboard.getDashboardData",
  ],
  "treasury.createReconciliation": [
    "reconciliation.getReconciliationData",
    "banking.listTransactions",
  ],

  // Payroll
  "payroll.createPayrollRun": ["dashboard.getDashboardData"],
  "payroll.createEmployee": ["dashboard.getDashboardData"],

  // Fixed Assets
  "fixedAssets.createAsset": [
    "fixedAssets.listAssets",
    "fixedAssets.getOverview",
  ],

  // Expenses
  "expenses.createExpense": [
    "expenses.getPendingCount",
    "dashboard.getDashboardData",
  ],

  // Settings
  "settings.updateProfile": ["settings.getProfile"],
  "settings.updateAppearancePrefs": ["settings.getAppearancePrefs"],
  "settings.updateSecurityPrefs": ["settings.getSecurityPrefs"],
  "settings.updateNotificationPrefs": ["settings.getNotificationPrefs"],
  "settings.createApiKey": ["settings.getApiKeys"],
  "settings.revokeApiKey": ["settings.getApiKeys"],

  // Notifications
  "notifications.markRead": ["notifications.list", "notifications.unreadCount"],

  // Organization
  "organization.update": ["organization.list"],
  "organization.updateEntity": ["organization.listEntities"],

  // Approvals
  "approvals.resolve": [
    "approvals.getCounts",
    "ar.getOverdueCount",
    "expenses.getPendingCount",
  ],
} as const;

export type InvalidationKey = keyof typeof INVALIDATION_MAP;
