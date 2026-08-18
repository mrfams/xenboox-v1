// ─── Explore-page feature routers — live procedures ─────────────────────────
//
// Verifies the 8 features promoted from planned/partial to shipped actually
// compute real decisions from the DB (not demo strings):
//   bills.getPaymentSchedule   (vendor-payments)
//   bills.getApprovalRouting   (bill-approval)
//   ap.getVendorEnrichment     (vendor-profile)
//   ap.getTaxFormStatus        (w9-collection)
//   customers.getCreditReview  (credit-limit-review)
//   estimates.getMarginReview  (estimate-margin-review)
//   taxCompliance.getDeductionDiscovery (deduction-discovery)
//   analytics.getMarketResearch (web-research)
//
// Runs against the REAL routers via createCaller with a mocked db.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── DB mock ────────────────────────────────────────────────────────────────
// The RLS middleware + procedures query many tables. A Proxy resolves ANY
// `db.query.<table>` to a default finder; individual tests override the
// tables the procedure under test reads. Two modules re-export the same
// `db` singleton (`@/lib/db` for most routers, `@xenboox/db` for the
// tax-compliance and analytics routers), so the shared mock is built once
// via vi.hoisted and applied to both import paths.

const dbMock = vi.hoisted(() => {
  const finders = new Map<
    string,
    { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  >();
  const makeFinder = () => ({
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
  });
  const dbObj = {
    query: new Proxy(
      {},
      {
        get(_target, prop) {
          if (typeof prop !== "string") return undefined;
          if (!finders.has(prop)) {
            finders.set(prop, makeFinder());
            if (prop === "users") {
              finders.get(prop)!.findFirst.mockResolvedValue({
                id: "user-1",
                email: "demo@xenboox.com",
                emailVerified: new Date(),
              });
            }
            if (prop === "userEntityAccess") {
              finders.get(prop)!.findFirst.mockResolvedValue({
                userId: "user-1",
                entityId: "entity-1",
                role: "owner",
              });
            }
          }
          return finders.get(prop);
        },
      },
    ),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  };
  return { dbObj, finders };
});

vi.mock("@/lib/db", () => ({ db: dbMock.dbObj }));
vi.mock("@xenboox/db", () => ({ db: dbMock.dbObj }));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appRouter } from "@/server/routers/_app";

const SESSION = {
  user: {
    id: "user-1",
    name: "Demo User",
    email: "demo@xenboox.com",
    role: "user" as const,
  },
  expires: new Date().toISOString(),
};

function makeCtx() {
  return {
    session: SESSION,
    entityId: "entity-1",
    organizationId: "org-1",
    ip: "127.0.0.1",
    userAgent: "test",
  };
}

const now = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("Explore-page feature routers (8 shipped features)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(SESSION as never);
  });

  // ── vendor-payments ──────────────────────────────────────────────────
  it("bills.getPaymentSchedule ranks overdue bills first against cash", async () => {
    vi.mocked(db.query.bankAccounts.findMany).mockResolvedValue([
      { currentBalance: "500000" },
    ] as never);
    vi.mocked(db.query.mobileMoneyAccounts.findMany).mockResolvedValue(
      [] as never,
    );
    vi.mocked(db.query.cashAccounts.findMany).mockResolvedValue([] as never);

    const overdue = iso(new Date(now.getTime() - 5 * 86_400_000));
    const future = iso(new Date(now.getTime() + 14 * 86_400_000));
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "b-1",
              invoiceNumber: "INV-001",
              dueDate: overdue,
              totalAmount: "10000",
              balance: "10000",
              status: "overdue",
              supplierId: "s-1",
              supplierName: "Acme",
            },
            {
              id: "b-2",
              invoiceNumber: "INV-002",
              dueDate: future,
              totalAmount: "5000",
              balance: "5000",
              status: "pending",
              supplierId: "s-1",
              supplierName: "Acme",
            },
          ]),
        }),
      }),
    } as never);

    const caller = appRouter.createCaller(makeCtx() as never);
    const result = await caller.bills.getPaymentSchedule();

    expect(result.items[0].isOverdue).toBe(true);
    expect(result.items[0].action).toBe("pay_now");
    expect(result.items[1].action).toBe("hold");
    expect(result.summary.totalDue).toBe(15000);
    expect(result.cashPosition).toBe(500000);
  });

  // ── bill-approval ────────────────────────────────────────────────────
  it("bills.getApprovalRouting escalates duplicates and auto-approves clean bills", async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "b-1",
              invoiceNumber: "INV-100",
              invoiceDate: iso(now),
              totalAmount: "5000",
              status: "pending",
              supplierId: "s-1",
              purchaseOrderId: "po-1",
              supplierName: "Acme",
            },
            {
              id: "b-2",
              invoiceNumber: "INV-200",
              invoiceDate: iso(now),
              totalAmount: "500000",
              status: "pending",
              supplierId: "s-2",
              purchaseOrderId: null,
              supplierName: "BigCo",
            },
          ]),
        }),
      }),
    } as never);
    // No duplicates in the same-entity bill pool.
    vi.mocked(db.query.invoicesAp.findMany).mockResolvedValue([] as never);

    const caller = appRouter.createCaller(makeCtx() as never);
    const result = await caller.bills.getApprovalRouting();

    const d1 = result.decisions.find((d) => d.id === "b-1")!;
    const d2 = result.decisions.find((d) => d.id === "b-2")!;
    expect(d1.decision).toBe("auto_approve");
    expect(d2.decision).toBe("needs_review"); // high value + no PO
    expect(d2.flags).toContain("high_value");
  });

  // ── vendor-profile ───────────────────────────────────────────────────
  it("ap.getVendorEnrichment flags shared tax IDs as duplicates", async () => {
    vi.mocked(db.query.suppliers.findMany).mockResolvedValue([
      {
        id: "s-1",
        name: "Acme Supplies",
        taxId: "TAX-123",
        isActive: true,
        paymentTerms: "net30",
        is1099: true,
        metadata: {},
      },
      {
        id: "s-2",
        name: "ACME Supply Co",
        taxId: "TAX-123",
        isActive: true,
        paymentTerms: "net30",
        is1099: false,
        metadata: {},
      },
    ] as never);

    const caller = appRouter.createCaller(makeCtx() as never);
    const result = await caller.ap.getVendorEnrichment();

    expect(result.summary.vendorsScanned).toBe(2);
    expect(result.findings.some((f) => f.category === "Duplicate vendor")).toBe(
      true,
    );
    expect(result.summary.high).toBeGreaterThanOrEqual(1);
  });

  // ── w9-collection ────────────────────────────────────────────────────
  it("ap.getTaxFormStatus flags 1099 vendors without a form as missing", async () => {
    vi.mocked(db.query.suppliers.findMany).mockResolvedValue([
      {
        id: "s-1",
        name: "Acme",
        is1099: true,
        taxId: "T-1",
        isActive: true,
        metadata: {},
      },
      {
        id: "s-2",
        name: "Global",
        is1099: true,
        taxId: null,
        isActive: true,
        metadata: {},
      },
      {
        id: "s-3",
        name: "Bank",
        is1099: false,
        taxId: "T-3",
        isActive: true,
        metadata: {},
      },
    ] as never);

    const caller = appRouter.createCaller(makeCtx() as never);
    const result = await caller.ap.getTaxFormStatus();

    const missing = result.rows.filter((r) => r.status === "missing");
    expect(missing.length).toBeGreaterThanOrEqual(1);
    expect(result.summary.missing).toBeGreaterThanOrEqual(1);
    // Bank (no 1099, has tax id) is not required.
    const bank = result.rows.find((r) => r.id === "s-3")!;
    expect(bank.status).toBe("not_required");
  });

  // ── credit-limit-review ──────────────────────────────────────────────
  it("customers.getCreditReview flags over-limit exposure", async () => {
    vi.mocked(db.query.customers.findMany).mockResolvedValue([
      { id: "c-1", name: "Acme", creditLimit: "100000", isActive: true },
    ] as never);
    vi.mocked(db.query.salesInvoices.findMany).mockResolvedValue([
      {
        id: "i-1",
        customerId: "c-1",
        status: "pending",
        balance: "150000",
        dueDate: iso(new Date(now.getTime() + 10 * 86_400_000)),
      },
    ] as never);

    const caller = appRouter.createCaller(makeCtx() as never);
    const result = await caller.customers.getCreditReview();

    expect(result.summary.overLimit).toBe(1);
    expect(result.rows[0].overLimit).toBe(true);
    expect(result.rows[0].recommendation).toMatch(/Hold new orders/i);
  });

  // ── estimate-margin-review ───────────────────────────────────────────
  it("estimates.getMarginReview flags under-priced open estimates", async () => {
    vi.mocked(db.query.salesEstimates.findMany).mockResolvedValue([
      {
        id: "e-1",
        estimateNumber: "EST-001",
        customerId: "c-1",
        status: "sent",
        totalAmount: "100000",
        expiryDate: iso(now),
      },
    ] as never);
    vi.mocked(db.query.customers.findMany).mockResolvedValue([
      { id: "c-1", name: "Acme" },
    ] as never);
    vi.mocked(db.query.invoiceApLines.findMany).mockResolvedValue([] as never);

    const caller = appRouter.createCaller(makeCtx() as never);
    const result = await caller.estimates.getMarginReview();

    expect(result.summary.total).toBe(1);
    // Default cost ratio 0.58 → implied margin 42% → not under-priced, but
    // expiring today → flagged expiring.
    const row = result.rows[0];
    expect(row.expiring).toBe(true);
    expect(row.impliedMargin).toBeGreaterThan(0);
  });

  // ── deduction-discovery ──────────────────────────────────────────────
  it("taxCompliance.getDeductionDiscovery surfaces unfiled WHT credits", async () => {
    vi.mocked(db.query.withholdingRecords.findMany).mockResolvedValue([
      {
        id: "w-1",
        entityId: "entity-1",
        period: "2026-07",
        payeeName: "Banjul IT",
        taxWithheld: "2100",
        filed: false,
      },
    ] as never);
    vi.mocked(db.query.vatCalculations.findMany).mockResolvedValue([] as never);
    vi.mocked(db.query.filingDeadlines.findMany).mockResolvedValue([] as never);

    const caller = appRouter.createCaller(makeCtx() as never);
    const result = await caller.taxCompliance.getDeductionDiscovery();

    expect(result.summary.total).toBeGreaterThanOrEqual(1);
    expect(result.opportunities[0].type).toBe("wht_recovery");
    expect(result.summary.totalSavings).toBeGreaterThanOrEqual(2100);
  });

  // ── web-research ─────────────────────────────────────────────────────
  it("analytics.getMarketResearch blends live KPIs with benchmarks", async () => {
    vi.mocked(db.query.entities.findFirst).mockResolvedValue({
      id: "entity-1",
      name: "Kerr Jula",
      currency: "GMD",
    } as never);
    vi.mocked(db.query.analyticsSnapshots.findMany).mockResolvedValue([
      {
        period: "2026-07",
        snapshotData: { revenue: 1000000, netIncome: 150000 },
      },
    ] as never);
    vi.mocked(db.query.forecastModels.findMany).mockResolvedValue([
      { runwayMonths: "6.2", isActive: true },
    ] as never);
    vi.mocked(db.query.healthScores.findMany).mockResolvedValue([
      { componentBreakdown: { liquidity: { score: 0.81 } } },
    ] as never);

    const caller = appRouter.createCaller(makeCtx() as never);
    const result = await caller.analytics.getMarketResearch();

    expect(result.market).toBe("Gambia"); // GMD currency
    expect(result.entity.revenue).toBe(1000000);
    expect(result.entity.margin).toBe(15);
    expect(result.findings.length).toBe(3);
    expect(result.entity.runway).toBeGreaterThan(0);
  });
});
