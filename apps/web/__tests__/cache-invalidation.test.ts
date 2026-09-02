import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock tRPC utils
const mockInvalidate = vi.fn();
const mockUtils = {
  ar: {
    listInvoices: { invalidate: vi.fn() },
    getOverdueCount: { invalidate: vi.fn() },
    createInvoice: { invalidate: vi.fn() },
    createPayment: { invalidate: vi.fn() },
  },
  ap: {
    listBills: { invalidate: vi.fn() },
    listSuppliers: { invalidate: vi.fn() },
    createInvoice: { invalidate: vi.fn() },
    getVendorsOverview: { invalidate: vi.fn() },
  },
  journal: {
    list: { invalidate: vi.fn() },
    create: { invalidate: vi.fn() },
  },
  coa: {
    list: { invalidate: vi.fn() },
    create: { invalidate: vi.fn() },
  },
  banking: {
    listTransactions: { invalidate: vi.fn() },
    getOverview: { invalidate: vi.fn() },
    getCashPosition: { invalidate: vi.fn() },
    createRule: { invalidate: vi.fn() },
    updateRule: { invalidate: vi.fn() },
    deleteRule: { invalidate: vi.fn() },
  },
  treasury: {
    listBankAccounts: { invalidate: vi.fn() },
    createBankAccount: { invalidate: vi.fn() },
    createReconciliation: { invalidate: vi.fn() },
  },
  reconciliation: {
    getReconciliationData: { invalidate: vi.fn() },
  },
  dashboard: {
    getDashboardData: { invalidate: vi.fn() },
    getAiBriefing: { invalidate: vi.fn() },
  },
  payroll: {
    createPayrollRun: { invalidate: vi.fn() },
    createEmployee: { invalidate: vi.fn() },
  },
  fixedAssets: {
    listAssets: { invalidate: vi.fn() },
    createAsset: { invalidate: vi.fn() },
  },
  expenses: {
    createExpense: { invalidate: vi.fn() },
    getPendingCount: { invalidate: vi.fn() },
  },
  customers: {
    listCustomers: { invalidate: vi.fn() },
  },
  settings: {
    get: { invalidate: vi.fn() },
    getProfile: { invalidate: vi.fn() },
    getAppearancePrefs: { invalidate: vi.fn() },
    getSecurityPrefs: { invalidate: vi.fn() },
    getNotificationPrefs: { invalidate: vi.fn() },
    getApiKeys: { invalidate: vi.fn() },
  },
  notifications: {
    list: { invalidate: vi.fn() },
    unreadCount: { invalidate: vi.fn() },
  },
  fiscal: {
    list: { invalidate: vi.fn() },
    getCurrent: { invalidate: vi.fn() },
    getCloseStatus: { invalidate: vi.fn() },
  },
  invoicing: {
    listInvoices: { invalidate: vi.fn() },
    getCustomers: { invalidate: vi.fn() },
  },
  bills: {
    listBills: { invalidate: vi.fn() },
    getOverview: { invalidate: vi.fn() },
  },
  estimates: {
    getOverview: { invalidate: vi.fn() },
  },
  mobileMoney: {
    listAccounts: { invalidate: vi.fn() },
    listTransactions: { invalidate: vi.fn() },
  },
  currency: {
    listRates: { invalidate: vi.fn() },
    getSettings: { invalidate: vi.fn() },
  },
  dailyClose: {
    getToday: { invalidate: vi.fn() },
    getStats: { invalidate: vi.fn() },
  },
};

describe("Cache Invalidation Utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidateAfterMutation returns a function that invalidates specified queries", async () => {
    const { invalidateAfterMutation } = await import(
      "@/lib/cache-invalidation"
    );

    const invalidate = invalidateAfterMutation(mockUtils as any, [
      "ar.listInvoices",
      "ar.getOverdueCount",
    ]);

    invalidate();

    expect(mockUtils.ar.listInvoices.invalidate).toHaveBeenCalled();
    expect(mockUtils.ar.getOverdueCount.invalidate).toHaveBeenCalled();
  });

  it("invalidateAfterMutation supports nested query paths", async () => {
    const { invalidateAfterMutation } = await import(
      "@/lib/cache-invalidation"
    );

    const invalidate = invalidateAfterMutation(mockUtils as any, [
      "banking.listTransactions",
      "banking.getOverview",
      "banking.getCashPosition",
    ]);

    invalidate();

    expect(mockUtils.banking.listTransactions.invalidate).toHaveBeenCalled();
    expect(mockUtils.banking.getOverview.invalidate).toHaveBeenCalled();
    expect(mockUtils.banking.getCashPosition.invalidate).toHaveBeenCalled();
  });

  it("invalidateAfterMutation invalidates related queries for invoice creation", async () => {
    const { invalidateAfterMutation } = await import(
      "@/lib/cache-invalidation"
    );

    // When an invoice is created, these queries should be invalidated:
    // - ar.listInvoices (the list)
    // - ar.getOverdueCount (the badge)
    // - dashboard.getDashboardData (the dashboard)
    // - dashboard.getAiBriefing (the AI briefing)
    const invalidate = invalidateAfterMutation(mockUtils as any, [
      "ar.listInvoices",
      "ar.getOverdueCount",
      "dashboard.getDashboardData",
      "dashboard.getAiBriefing",
    ]);

    invalidate();

    expect(mockUtils.ar.listInvoices.invalidate).toHaveBeenCalled();
    expect(mockUtils.ar.getOverdueCount.invalidate).toHaveBeenCalled();
    expect(mockUtils.dashboard.getDashboardData.invalidate).toHaveBeenCalled();
    expect(mockUtils.dashboard.getAiBriefing.invalidate).toHaveBeenCalled();
  });

  it("invalidateAfterMutation handles invalid query paths gracefully", async () => {
    const { invalidateAfterMutation } = await import(
      "@/lib/cache-invalidation"
    );

    // Should not throw for invalid paths
    const invalidate = invalidateAfterMutation(mockUtils as any, [
      "nonexistent.query.path",
      "ar.listInvoices",
    ]);

    expect(() => invalidate()).not.toThrow();
    expect(mockUtils.ar.listInvoices.invalidate).toHaveBeenCalled();
  });

  it("invalidateAll invalidates all queries in the utils object", async () => {
    const { invalidateAll } = await import("@/lib/cache-invalidation");

    invalidateAll(mockUtils as any);

    // Verify at least some key queries were invalidated
    expect(mockUtils.ar.listInvoices.invalidate).toHaveBeenCalled();
    expect(mockUtils.banking.listTransactions.invalidate).toHaveBeenCalled();
    expect(mockUtils.journal.list.invalidate).toHaveBeenCalled();
    expect(mockUtils.coa.list.invalidate).toHaveBeenCalled();
  });

  it("batchInvalidate takes multiple query paths and invalidates all", async () => {
    const { batchInvalidate } = await import("@/lib/cache-invalidation");

    batchInvalidate(mockUtils as any, [
      "ar.listInvoices",
      "ap.listBills",
      "banking.listTransactions",
      "journal.list",
    ]);

    expect(mockUtils.ar.listInvoices.invalidate).toHaveBeenCalled();
    expect(mockUtils.ap.listBills.invalidate).toHaveBeenCalled();
    expect(mockUtils.banking.listTransactions.invalidate).toHaveBeenCalled();
    expect(mockUtils.journal.list.invalidate).toHaveBeenCalled();
  });
});
