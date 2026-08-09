import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────
// The web db wrapper re-exports the @xenboox/db barrel, so mocking @/lib/db
// covers middleware + the createTransaction mutation's insert chain.

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      {
        id: "tx-1",
        entityId: "entity-1",
        bankAccountId: "ba-1",
        type: "withdrawal",
        amount: "150.00",
        description: "Office supplies",
        transactionDate: "2026-08-01",
        isReconciled: false,
      },
    ]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue(undefined),
    query: {
      entities: { findFirst: vi.fn() },
      userEntityAccess: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

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

describe("Transactions router — createTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      expires: "2099-01-01",
    } as any);
    vi.mocked(db.query.entities.findFirst).mockResolvedValue({
      id: "entity-1",
    } as any);
    vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue({
      id: "access-1",
    } as any);
  });

  const caller = appRouter.createCaller({
    entityId: "entity-1",
    userId: "user-1",
    orgId: "org-1",
    role: "owner",
  } as any);

  it("inserts a bank transaction with entity scoping", async () => {
    const result = await caller.transactions.createTransaction({
      bankAccountId: "11111111-1111-1111-1111-111111111111",
      type: "withdrawal",
      amount: "150.00",
      description: "Office supplies",
      transactionDate: "2026-08-01",
      reference: "REC-0001",
    });

    expect(result.id).toBe("tx-1");
    expect(db.insert).toHaveBeenCalled();
    expect((db as any).values).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: "entity-1",
        bankAccountId: "11111111-1111-1111-1111-111111111111",
        type: "withdrawal",
        amount: "150.00",
        isReconciled: false,
      }),
    );
  });

  it("rejects a non-uuid bankAccountId", async () => {
    await expect(
      caller.transactions.createTransaction({
        bankAccountId: "not-a-uuid",
        type: "deposit",
        amount: "10.00",
        description: "Cash deposit",
        transactionDate: "2026-08-01",
      }),
    ).rejects.toThrow();
  });

  it("rejects malformed amounts", async () => {
    await expect(
      caller.transactions.createTransaction({
        bankAccountId: "11111111-1111-1111-1111-111111111111",
        type: "deposit",
        amount: "abc",
        description: "Bad amount",
        transactionDate: "2026-08-01",
      }),
    ).rejects.toThrow();
  });

  it("rejects an empty description", async () => {
    await expect(
      caller.transactions.createTransaction({
        bankAccountId: "11111111-1111-1111-1111-111111111111",
        type: "deposit",
        amount: "10.00",
        description: "",
        transactionDate: "2026-08-01",
      }),
    ).rejects.toThrow();
  });
});
