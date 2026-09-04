import { describe, it, expect, vi, beforeEach } from "vitest";

// The claim procedures sit behind RLS middleware (auth, entity scoping,
// idempotency, setRlsContext) that itself queries several tables. A Proxy
// resolves ANY `db.query.<table>` to a default finder — returning null/[] —
// while individual tests override `expenseClaims.findFirst` for the claim
// under test. Without this, the middleware's `db.query.sessions/entities/…`
// lookups crash with "Cannot read properties of undefined".
vi.mock("@/lib/db", () => {
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
            // The RLS middleware requires an email-verified user to mutate.
            if (prop === "users") {
              finders.get(prop)!.findFirst.mockResolvedValue({
                id: "user-1",
                email: "demo@xenboox.com",
                emailVerified: new Date(),
              });
            }
            // …and an access grant to the entity in scope.
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
  return { db: dbObj };
});

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

const CLAIM_ID = "11111111-1111-4111-8111-111111111111";

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

describe("Expenses router — expense claims workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(SESSION as never);
  });

  it("decideClaim approves a submitted claim and writes an approval record", async () => {
    vi.mocked(db.query.expenseClaims.findFirst).mockResolvedValue({
      id: CLAIM_ID,
      entityId: "entity-1",
      status: "submitted",
      claimNumber: "EXP-2026-001",
      totalAmount: "18500",
      currency: "GMD",
    } as never);

    const caller = appRouter.createCaller(makeCtx() as never);
    const result = await caller.expenses.decideClaim({
      claimId: CLAIM_ID,
      decision: "approved",
    });

    expect(result).toEqual({ ok: true });
    // status update + approval record insert + audit log insert
    expect(db.update).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it("decideClaim rejects a non-reviewable claim", async () => {
    vi.mocked(db.query.expenseClaims.findFirst).mockResolvedValue({
      id: CLAIM_ID,
      entityId: "entity-1",
      status: "reimbursed",
    } as never);

    const caller = appRouter.createCaller(makeCtx() as never);
    await expect(
      caller.expenses.decideClaim({ claimId: CLAIM_ID, decision: "approved" }),
    ).rejects.toThrow(/status/);
  });

  it("reimburseClaim requires an approved claim", async () => {
    vi.mocked(db.query.expenseClaims.findFirst).mockResolvedValue({
      id: CLAIM_ID,
      entityId: "entity-1",
      status: "submitted",
    } as never);

    const caller = appRouter.createCaller(makeCtx() as never);
    await expect(
      caller.expenses.reimburseClaim({ claimId: CLAIM_ID }),
    ).rejects.toThrow(/status/);
  });

  it("reimburseClaim refuses to record a payment when the journal cannot post (books-first)", async () => {
    // P6-C hardening: reimbursement posts a ledger entry FIRST (Dr expense /
    // Cr bank); the claim is only marked reimbursed once the JE exists. In
    // this mocked environment there is no open fiscal period, so
    // createPostedJournal returns null and the router MUST refuse to record
    // the payment — otherwise the P&L never sees the cost while cash already
    // moved. This asserts the money-safety ordering, not the happy path (that
    // needs a real DB and lives in the DB-gated integration suites).
    vi.mocked(db.query.expenseClaims.findFirst).mockResolvedValue({
      id: CLAIM_ID,
      entityId: "entity-1",
      status: "approved",
      claimNumber: "EXP-2026-001",
      totalAmount: "9800",
      currency: "GMD",
      claimantName: "Ada",
    } as never);
    vi.mocked(db.query.claimLineItems.findMany).mockResolvedValue([
      {
        category: "travel",
        description: "Client site visit",
        amount: "9800",
      },
    ] as never);
    vi.mocked(db.query.chartOfAccounts.findMany).mockResolvedValue([
      {
        id: "acc-exp-1",
        name: "Travel",
        code: "5500",
        subtype: "travel_expense",
        type: "expense",
      },
      {
        id: "acc-bank-1",
        name: "Bank Account",
        code: "1020",
        subtype: "bank_account",
        type: "asset",
      },
    ] as never);

    const caller = appRouter.createCaller(makeCtx() as never);
    await expect(
      caller.expenses.reimburseClaim({
        claimId: CLAIM_ID,
        paymentMethod: "bank_transfer",
      }),
    ).rejects.toThrow(/could not be posted|period is closed/i);

    // Books-first: because the JE never posted, the claim must NOT be marked
    // reimbursed and no reimbursement record may exist — neither a status
    // update nor any insert may have happened before the refusal.
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
