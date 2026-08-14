// ─── §19.2 Idempotency enforcement — client key derivation + middleware ────
//
// Two layers are locked in here:
//   1. The client derives a STABLE key per logical mutation (entityId + path +
//      canonical input hashed), so retries/double-clicks dedupe — a fresh
//      random UUID per request (the old behavior) defeats the server
//      middleware entirely.
//   2. The server middleware (rlsMutateProcedure) replays a completed
//      operation's stored response for the same key + owner, re-executes for
//      a foreign key, and 409s while a request is still in flight.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (mirrors create-transaction-router.test.ts conventions) ─────────

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ key: "k" }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue(undefined),
    query: {
      users: { findFirst: vi.fn() },
      entities: { findFirst: vi.fn() },
      organizations: { findFirst: vi.fn() },
      orgRoles: { findFirst: vi.fn() },
      userEntityAccess: { findFirst: vi.fn() },
      idempotencyKeys: { findFirst: vi.fn() },
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
import { router, rlsMutateProcedure } from "@/lib/trpc/server";
import {
  buildIdempotencySource,
  idempotencySourceForBatch,
  deriveIdempotencyKey,
} from "@/lib/trpc/idempotency-key";

// ─── Client-side key derivation ────────────────────────────────────────────

describe("deriveIdempotencyKey (client)", () => {
  it("is stable for the same entityId + path + input", async () => {
    const input = { amount: "150.00", description: "Office supplies" };
    const a = await deriveIdempotencyKey(
      buildIdempotencySource("entity-1", "expenses.create", input),
    );
    const b = await deriveIdempotencyKey(
      buildIdempotencySource("entity-1", "expenses.create", input),
    );
    expect(a).toBe(b);
  });

  it("differs when the input changes (different operations never collide)", async () => {
    const a = await deriveIdempotencyKey(
      buildIdempotencySource("entity-1", "expenses.create", { amount: "100" }),
    );
    const b = await deriveIdempotencyKey(
      buildIdempotencySource("entity-1", "expenses.create", { amount: "200" }),
    );
    expect(a).not.toBe(b);
  });

  it("differs across entities (no cross-tenant key collisions)", async () => {
    const input = { amount: "150.00" };
    const a = await deriveIdempotencyKey(
      buildIdempotencySource("entity-1", "expenses.create", input),
    );
    const b = await deriveIdempotencyKey(
      buildIdempotencySource("entity-2", "expenses.create", input),
    );
    expect(a).not.toBe(b);
  });

  it("differs across procedures", async () => {
    const input = { amount: "150.00" };
    const a = await deriveIdempotencyKey(
      buildIdempotencySource("entity-1", "expenses.create", input),
    );
    const b = await deriveIdempotencyKey(
      buildIdempotencySource("entity-1", "journal.postEntry", input),
    );
    expect(a).not.toBe(b);
  });

  it("produces a key that fits the DB column (max 255 chars)", async () => {
    const key = await deriveIdempotencyKey(
      buildIdempotencySource("entity-1", "expenses.create", {
        amount: "150.00",
        description: "x".repeat(500),
      }),
    );
    expect(key.length).toBeLessThanOrEqual(255);
  });

  it("only proposes a key for a single-mutation batch", () => {
    const mutation = { type: "mutation", path: "expenses.create", input: {} };
    const query = { type: "query", path: "expenses.list", input: {} };
    expect(idempotencySourceForBatch("entity-1", [mutation])).toBeTruthy();
    expect(idempotencySourceForBatch("entity-1", [query])).toBeNull();
    expect(idempotencySourceForBatch("entity-1", [mutation, query])).toBeNull();
  });
});

// ─── Server middleware behavior ─────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  executions: 0,
  /** Current row the middleware will find for the idempotency key. */
  existingRow: null as null | Record<string, unknown>,
  /** When set, the *second* claim attempt is treated as a duplicate. */
  secondInsertDuplicates: false,
}));

describe("rlsMutateProcedure idempotency middleware", () => {
  const testRouter = router({
    bump: rlsMutateProcedure.mutation(async () => {
      mocks.executions++;
      return { executions: mocks.executions };
    }),
  });

  const caller = (entityId: string, idempotencyKey?: string) =>
    testRouter.createCaller({
      headers: idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {},
      entityId,
      userId: "user-1",
      orgId: "org-1",
      role: "owner",
    } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executions = 0;
    mocks.existingRow = null;

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      expires: "2099-01-01",
    } as never);
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      emailVerified: true,
    } as never);
    vi.mocked(db.query.entities.findFirst).mockResolvedValue({
      id: "entity-1",
      organizationId: "org-1",
    } as never);
    // Entity belongs to an org → billing plan lookup (entityScopingMiddleware).
    vi.mocked(db.query.organizations.findFirst).mockResolvedValue({
      plan: "free",
    } as never);
    // No org-level role → falls through to user_entity_access.
    vi.mocked(db.query.orgRoles.findFirst).mockResolvedValue(null as never);
    vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue({
      id: "access-1",
      role: "owner",
    } as never);

    // By default the middleware sees a fresh key (no existing row). Reads the
    // mutable mocks.existingRow on every call so tests can simulate the
    // stored row mid-flow.
    vi.mocked(db.query.idempotencyKeys.findFirst).mockImplementation(
      (async () => mocks.existingRow) as never,
    );
  });

  it("executes on first call and replays the stored response on a same-key retry", async () => {
    const key = await deriveIdempotencyKey(
      buildIdempotencySource("entity-1", "test.bump", {}),
    );

    const first = await caller("entity-1", key).bump();
    expect(mocks.executions).toBe(1);
    expect(first).toEqual({ executions: 1 });

    // Second call: middleware finds a completed row owned by the caller.
    mocks.existingRow = {
      key,
      userId: "user-1",
      entityId: "entity-1",
      route: "test.bump",
      expiresAt: new Date(Date.now() + 60_000),
      lockedAt: null,
      responseBody: { executions: 1 },
    };

    const second = await caller("entity-1", key).bump();
    expect(mocks.executions).toBe(1); // NOT executed again
    expect(second).toEqual({ executions: 1 }); // replay returned
  });

  it("does NOT replay a foreign key (different entity) — re-executes instead", async () => {
    const key = await deriveIdempotencyKey(
      buildIdempotencySource("entity-1", "test.bump", {}),
    );

    // Completed row, but owned by a different entity than the caller.
    mocks.existingRow = {
      key,
      userId: "user-1",
      entityId: "entity-9",
      route: "test.bump",
      expiresAt: new Date(Date.now() + 60_000),
      lockedAt: null,
      responseBody: { executions: 1 },
    };

    const result = await caller("entity-1", key).bump();
    expect(mocks.executions).toBe(1); // executed (no replay)
    expect(result).toEqual({ executions: 1 });
  });

  it("returns CONFLICT while a same-key request is still in flight", async () => {
    const key = await deriveIdempotencyKey(
      buildIdempotencySource("entity-1", "test.bump", {}),
    );

    mocks.existingRow = {
      key,
      userId: "user-1",
      entityId: "entity-1",
      route: "test.bump",
      expiresAt: new Date(Date.now() + 60_000),
      lockedAt: new Date(), // fresh lock, no response yet
      responseBody: null,
    };

    await expect(caller("entity-1", key).bump()).rejects.toThrow(
      /still being processed/,
    );
    expect(mocks.executions).toBe(0);
  });

  it("skips the middleware entirely when no idempotency key is sent", async () => {
    const first = await caller("entity-1").bump();
    const second = await caller("entity-1").bump();
    expect(first).toEqual({ executions: 1 });
    expect(second).toEqual({ executions: 2 }); // both executed
  });
});
