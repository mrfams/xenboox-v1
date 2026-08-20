// ─── Payment Links Router Tests ──────────────────────────────────────────
//
// Tests the full payment links tRPC router via createCaller with mocked db.
// Covers: CRUD, token generation, click tracking, expiry handling, payment
// recording, entity scoping, duplicate prevention, and edge cases.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────

let dbData: Record<string, unknown[]> = {
  paymentLinks: [],
  salesInvoices: [],
  customers: [],
};
let insertReturning: unknown[] = [];
let updateReturning: unknown[] = [];

function resetDb() {
  dbData = { paymentLinks: [], salesInvoices: [], customers: [] };
  insertReturning = [];
  updateReturning = [];
}

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn().mockReturnThis(),
      returning: vi
        .fn()
        .mockImplementation(() => Promise.resolve(insertReturning)),
    })),
    update: vi.fn(() => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi
        .fn()
        .mockImplementation(() => Promise.resolve(updateReturning)),
    })),
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ cnt: 0 }]),
    })),
    execute: vi.fn().mockResolvedValue(undefined),
    query: {
      paymentLinks: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      salesInvoices: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      customers: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      sessions: { findFirst: vi.fn().mockResolvedValue({ id: "sess-1" }) },
      users: {
        findFirst: vi.fn().mockResolvedValue({
          id: "user-1",
          emailVerified: true,
        }),
      },
      orgRoles: {
        findFirst: vi.fn().mockResolvedValue({
          userId: "user-1",
          orgId: "org-1",
          role: "owner",
        }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      organizations: {
        findFirst: vi.fn().mockResolvedValue({ plan: "growth" }),
      },
      entities: {
        findFirst: vi.fn().mockResolvedValue({
          id: "entity-1",
          organizationId: "org-1",
        }),
      },
      userEntityAccess: { findFirst: vi.fn() },
      rolePermissions: {
        findFirst: vi.fn().mockResolvedValue({ scope: "full" }),
      },
    },
  },
}));

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

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { appRouter } from "@/server/routers/_app";

// ─── Helpers ─────────────────────────────────────────────────────────────

const session = { user: { id: "user-1", email: "u@example.com", name: "U" } };

function createCaller() {
  return appRouter.createCaller({
    session,
    entityId: "entity-1",
    entityRole: "owner",
    headers: {},
  } as never);
}

const INV_ID = "00000000-0000-4000-8000-000000000001";
const LINK_ID = "00000000-0000-4000-8000-000000000002";
const CUST_ID = "00000000-0000-4000-8000-000000000003";

const MOCK_INVOICE = {
  id: INV_ID,
  entityId: "entity-1",
  customerId: CUST_ID,
  invoiceNumber: "SI-2026-0001",
  totalAmount: "5000.00",
  balance: "3000.00",
  paidAmount: "2000.00",
  status: "pending",
  currency: "GMD",
  invoiceDate: "2026-08-01",
  dueDate: "2026-08-31",
};

const MOCK_CUSTOMER = {
  id: CUST_ID,
  name: "Acme Corp",
  contactEmail: "billing@acme.com",
};

const MOCK_LINK = {
  id: LINK_ID,
  entityId: "entity-1",
  invoiceId: INV_ID,
  token: "abc123def456",
  amount: "3000.00",
  currency: "GMD",
  status: "active",
  clickCount: 0,
  lastClickedAt: null,
  paidAt: null,
  paidAmount: null,
  expiresAt: new Date("2026-09-20"),
  paymentMethods: "card,bank_transfer,mobile_money",
  createdBy: "user-1",
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  resetDb();
  vi.mocked(auth).mockResolvedValue(session as never);
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe("paymentLinks.list", () => {
  it("returns payment links with enriched data", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findMany).mockResolvedValue([
      MOCK_LINK,
    ] as never);
    vi.mocked(db.query.salesInvoices.findMany).mockResolvedValue([
      {
        id: INV_ID,
        invoiceNumber: "SI-2026-0001",
        status: "pending",
        customerId: CUST_ID,
      },
    ] as never);
    vi.mocked(db.query.customers.findMany).mockResolvedValue([
      MOCK_CUSTOMER,
    ] as never);

    // Override the count mock for this test
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ cnt: 1 }]),
    } as never);

    const result = await caller.paymentLinks.list({});

    expect(result.links).toHaveLength(1);
    expect(result.links[0].invoiceNumber).toBe("SI-2026-0001");
    expect(result.links[0].customerName).toBe("Acme Corp");
    expect(result.totalCount).toBe(1);
  });

  it("filters by status", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findMany).mockResolvedValue([] as never);

    await caller.paymentLinks.list({ status: "paid" });

    expect(db.query.paymentLinks.findMany).toHaveBeenCalled();
  });

  it("returns empty list when no links exist", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findMany).mockResolvedValue([] as never);

    const result = await caller.paymentLinks.list({});

    expect(result.links).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });
});

describe("paymentLinks.get", () => {
  it("returns a single payment link with invoice and customer details", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue(
      MOCK_LINK as never,
    );
    vi.mocked(db.query.salesInvoices.findFirst).mockResolvedValue(
      MOCK_INVOICE as never,
    );
    vi.mocked(db.query.customers.findFirst).mockResolvedValue(
      MOCK_CUSTOMER as never,
    );

    const result = await caller.paymentLinks.get({ linkId: LINK_ID });

    expect(result).not.toBeNull();
    expect(result?.invoice?.invoiceNumber).toBe("SI-2026-0001");
    expect(result?.customerName).toBe("Acme Corp");
    expect(result?.customerEmail).toBe("billing@acme.com");
  });

  it("returns null for non-existent link", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue(null);

    const result = await caller.paymentLinks.get({ linkId: LINK_ID });

    expect(result).toBeNull();
  });
});

describe("paymentLinks.create", () => {
  it("creates a payment link for a valid pending invoice", async () => {
    const caller = createCaller();

    vi.mocked(db.query.salesInvoices.findFirst).mockResolvedValue(
      MOCK_INVOICE as never,
    ); // invoice lookup

    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue(null); // no existing active link

    insertReturning = [{ ...MOCK_LINK, token: "new-token-123" }];

    const result = await caller.paymentLinks.create({
      invoiceId: INV_ID,
      expiresInDays: 30,
    });

    expect(result).toBeDefined();
    expect(result.token).toBe("new-token-123");
    expect(db.insert).toHaveBeenCalled();
  });

  it("returns existing active link instead of creating duplicate", async () => {
    const caller = createCaller();
    const existingLink = { ...MOCK_LINK, status: "active" };

    vi.mocked(db.query.salesInvoices.findFirst).mockResolvedValue(
      MOCK_INVOICE as never,
    );
    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue(
      existingLink as never,
    );

    const result = await caller.paymentLinks.create({
      invoiceId: INV_ID,
    });

    expect(result.id).toBe(LINK_ID);
    // Should NOT have called insert since it returned existing
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects creation for a paid invoice", async () => {
    const caller = createCaller();

    vi.mocked(db.query.salesInvoices.findFirst).mockResolvedValue({
      ...MOCK_INVOICE,
      status: "paid",
    } as never);

    await expect(
      caller.paymentLinks.create({ invoiceId: INV_ID }),
    ).rejects.toThrow("Invoice is already fully paid");
  });

  it("rejects creation for a voided invoice", async () => {
    const caller = createCaller();

    vi.mocked(db.query.salesInvoices.findFirst).mockResolvedValue({
      ...MOCK_INVOICE,
      status: "voided",
    } as never);

    await expect(
      caller.paymentLinks.create({ invoiceId: INV_ID }),
    ).rejects.toThrow("Cannot create payment link for voided invoice");
  });

  it("rejects creation when invoice not found", async () => {
    const caller = createCaller();

    vi.mocked(db.query.salesInvoices.findFirst).mockResolvedValue(null);

    await expect(
      caller.paymentLinks.create({ invoiceId: INV_ID }),
    ).rejects.toThrow("Invoice not found");
  });
});

describe("paymentLinks.cancel", () => {
  it("cancels an active payment link", async () => {
    const caller = createCaller();
    const cancelledLink = { ...MOCK_LINK, status: "cancelled" };

    updateReturning = [cancelledLink];

    const result = await caller.paymentLinks.cancel({ linkId: LINK_ID });

    expect(result.status).toBe("cancelled");
    expect(db.update).toHaveBeenCalled();
  });

  it("throws when link not found or already inactive", async () => {
    const caller = createCaller();
    updateReturning = [];

    await expect(
      caller.paymentLinks.cancel({ linkId: LINK_ID }),
    ).rejects.toThrow("Payment link not found or already inactive");
  });
});

describe("paymentLinks.reactivate", () => {
  it("reactivates a cancelled link with new token", async () => {
    const caller = createCaller();
    const reactivatedLink = {
      ...MOCK_LINK,
      status: "active",
      token: "new-token",
    };

    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue({
      ...MOCK_LINK,
      status: "cancelled",
    } as never);
    updateReturning = [reactivatedLink];

    const result = await caller.paymentLinks.reactivate({ linkId: LINK_ID });

    expect(result.status).toBe("active");
    expect(result.token).toBe("new-token");
  });

  it("rejects reactivation of a paid link", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue({
      ...MOCK_LINK,
      status: "paid",
    } as never);

    await expect(
      caller.paymentLinks.reactivate({ linkId: LINK_ID }),
    ).rejects.toThrow("Cannot reactivate a paid payment link");
  });

  it("throws when link not found", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue(null);

    await expect(
      caller.paymentLinks.reactivate({ linkId: LINK_ID }),
    ).rejects.toThrow("Payment link not found");
  });
});

describe("paymentLinks.resolveByToken", () => {
  it("resolves a valid active link and increments click count", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue(
      MOCK_LINK as never,
    );
    vi.mocked(db.query.salesInvoices.findFirst)
      .mockResolvedValueOnce(MOCK_INVOICE as never) // full invoice
      .mockResolvedValueOnce({ customerId: CUST_ID } as never) // customerId lookup
      .mockResolvedValueOnce({ customerId: CUST_ID } as never); // resolveByToken 3rd call
    vi.mocked(db.query.customers.findFirst).mockResolvedValue(
      MOCK_CUSTOMER as never,
    );

    const result = await caller.paymentLinks.resolveByToken({
      token: "abc123def456",
    });

    expect(result.found).toBe(true);
    expect(result.amount).toBe("3000.00");
    expect(result.customerName).toBe("Acme Corp");
    expect(db.update).toHaveBeenCalled(); // click increment
  });

  it("returns found: false for expired link and auto-expires it", async () => {
    const caller = createCaller();
    const expiredLink = {
      ...MOCK_LINK,
      expiresAt: new Date("2026-01-01"), // past date
    };

    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue(
      expiredLink as never,
    );

    const result = await caller.paymentLinks.resolveByToken({
      token: "abc123def456",
    });

    expect(result.found).toBe(false);
    expect(result.reason).toBe("expired");
  });

  it("returns found: false for cancelled link", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue({
      ...MOCK_LINK,
      status: "cancelled",
    } as never);

    const result = await caller.paymentLinks.resolveByToken({
      token: "abc123def456",
    });

    expect(result.found).toBe(false);
    expect(result.reason).toBe("cancelled");
  });

  it("returns found: false for already paid link", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue({
      ...MOCK_LINK,
      status: "paid",
    } as never);

    const result = await caller.paymentLinks.resolveByToken({
      token: "abc123def456",
    });

    expect(result.found).toBe(false);
    expect(result.reason).toBe("paid");
  });

  it("returns found: false for non-existent token", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue(null);

    const result = await caller.paymentLinks.resolveByToken({
      token: "nonexistent",
    });

    expect(result.found).toBe(false);
  });
});

describe("paymentLinks.recordPayment", () => {
  it("records a payment and marks link as paid", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findFirst)
      .mockResolvedValueOnce(MOCK_LINK as never) // link lookup
      .mockResolvedValueOnce({ paidAmount: "0" } as never); // invoice paidAmount

    const result = await caller.paymentLinks.recordPayment({
      token: "abc123def456",
      amount: 3000,
      method: "card",
    });

    expect(result.success).toBe(true);
    expect(db.update).toHaveBeenCalledTimes(2); // link + invoice
  });

  it("rejects payment on invalid/inactive link", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue(null);

    await expect(
      caller.paymentLinks.recordPayment({
        token: "invalid",
        amount: 1000,
        method: "card",
      }),
    ).rejects.toThrow("Invalid or inactive payment link");
  });

  it("rejects payment on cancelled link", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findFirst).mockResolvedValue({
      ...MOCK_LINK,
      status: "cancelled",
    } as never);

    await expect(
      caller.paymentLinks.recordPayment({
        token: "abc123def456",
        amount: 1000,
        method: "card",
      }),
    ).rejects.toThrow("Invalid or inactive payment link");
  });
});

describe("paymentLinks.getSummary", () => {
  it("returns aggregated stats", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findMany).mockResolvedValue([
      { ...MOCK_LINK, status: "active", amount: "1000" },
      {
        ...MOCK_LINK,
        id: "link-2",
        status: "paid",
        amount: "2000",
        paidAmount: "2000",
      },
      { ...MOCK_LINK, id: "link-3", status: "expired", amount: "500" },
    ] as never);

    const result = await caller.paymentLinks.getSummary();

    expect(result.active).toBe(1);
    expect(result.paid).toBe(1);
    expect(result.expired).toBe(1);
    expect(result.total).toBe(3);
    expect(result.totalAmount).toBe(3500);
    expect(result.paidAmount).toBe(2000);
  });

  it("returns zeros when no links exist", async () => {
    const caller = createCaller();

    vi.mocked(db.query.paymentLinks.findMany).mockResolvedValue([] as never);

    const result = await caller.paymentLinks.getSummary();

    expect(result.active).toBe(0);
    expect(result.paid).toBe(0);
    expect(result.total).toBe(0);
    expect(result.conversionRate).toBe(0);
  });
});
