import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────
// Mirrors the onboarding-router test: mock the db + auth + logger so the full
// appRouter (and the rls middleware) imports and runs in vitest.

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn(),
    query: {
      sessions: { findFirst: vi.fn() },
      orgRoles: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      entities: { findFirst: vi.fn() },
      userEntityAccess: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
      auditLog: { findMany: vi.fn() },
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

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { appRouter } from "@/server/routers/_app";

// ─── Chain row fixtures ───────────────────────────────────────────────────

function makeChainRows() {
  return [
    {
      id: "evt-1",
      entityId: "entity-1",
      userId: "user-1",
      action: "create",
      entityType: "invoice",
      entityIdRef: "inv-1",
      oldValues: null,
      newValues: { amount: "100" },
      confidence: null,
      ipAddress: "10.0.0.1",
      userAgent: "test-agent",
      actorType: null,
      agentId: null,
      reason: null,
      sessionId: null,
      requestId: null,
      seq: null,
      prevHash: null,
      eventHash: null,
      payloadHashInput: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
    {
      id: "evt-2",
      entityId: "entity-1",
      userId: "user-1",
      action: "update",
      entityType: "invoice",
      entityIdRef: "inv-1",
      oldValues: { amount: "100" },
      newValues: { amount: "250" },
      confidence: null,
      ipAddress: "10.0.0.1",
      userAgent: "test-agent",
      actorType: null,
      agentId: null,
      reason: null,
      sessionId: null,
      requestId: null,
      seq: null,
      prevHash: null,
      eventHash: null,
      payloadHashInput: null,
      createdAt: new Date("2026-01-01T00:00:01Z"),
    },
  ];
}

// Build a fully-chained set of rows (like a backfilled or trigger-written set).
// IMPORTANT: the payload text is produced in Postgres' jsonb::text canonical
// form (spaces after `:` and `,`, sorted keys) — i.e. the SQL trigger's
// output — NOT the compact JS form. Verification must accept either, so the
// column-consistency check is semantic (parses + field-compares) rather than
// string comparison. This proves a tamper is caught regardless of whether the
// stored text came from the trigger or from JS-side tooling.
import { buildChain, canonicalize } from "@/lib/audit/chain";

// Postgres jsonb::text emits spaces after `:` and `,`; jsonb also sorts keys
// and strips trailing zeros from numbers. This is the SQL trigger's output.
// Implemented properly (NOT a naive regex on the compact form, which would
// corrupt timestamps like 00:00:00) — recursively spaced like jsonb::text.
function spacedJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    return `[${value.map((v) => spacedJson(v)).join(", ")}]`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const parts = Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}: ${spacedJson(obj[k])}`);
    return `{${parts.join(", ")}}`;
  }
  if (typeof value === "string") {
    return JSON.stringify(value); // string values are escaped, never spaced
  }
  return String(value); // numbers / booleans
}

function postgresCanonical(value: unknown): string {
  return spacedJson(value);
}

function chainedRows() {
  const rows = makeChainRows();
  const chain = buildChain(
    rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      payloadText: postgresCanonical({
        entityId: r.entityId,
        action: r.action,
        entityType: r.entityType,
        entityIdRef: r.entityIdRef ?? null,
        actorType: r.actorType ?? null,
        userId: r.userId ?? null,
        agentId: r.agentId ?? null,
        reason: r.reason ?? null,
        oldValues: r.oldValues ?? null,
        newValues: r.newValues ?? null,
        confidence: r.confidence != null ? String(Number(r.confidence)) : null,
        ipAddress: r.ipAddress ?? null,
        userAgent: r.userAgent ?? null,
        sessionId: r.sessionId ?? null,
        requestId: r.requestId ?? null,
        createdAt: r.createdAt.toISOString().slice(0, 19) + "Z",
      }),
    })),
  );
  return rows.map((r, i) => ({
    ...r,
    seq: chain[i].seq,
    prevHash: chain[i].prevHash,
    eventHash: chain[i].eventHash,
    payloadHashInput: chain[i].payloadText,
  }));
}

describe("auditRouter — tamper-evident chain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      expires: "2099-01-01",
    } as never);
    vi.mocked(db.query.sessions.findFirst).mockResolvedValue({
      id: "session-1",
    } as never);
    vi.mocked(db.query.orgRoles.findFirst).mockResolvedValue(null as never);
    vi.mocked(db.query.entities.findFirst).mockResolvedValue({
      id: "entity-1",
      organizationId: "org-1",
    } as never);
    vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue({
      userId: "user-1",
      entityId: "entity-1",
      role: "admin",
    } as never);
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: "user-1",
    } as never);
  });

  function caller() {
    return appRouter.createCaller({
      session: { user: { id: "user-1" }, expires: "2099" } as never,
      entityId: "entity-1",
      headers: {},
    });
  }

  it("verify returns valid with a checkedCount for an intact chain", async () => {
    vi.mocked(db.query.auditLog.findMany).mockResolvedValue(
      chainedRows() as never,
    );
    const result = await caller().audit.verify();
    expect(result.valid).toBe(true);
    expect(result.status).toBe("valid");
    expect(result.checkedCount).toBe(2);
    expect(result.firstBrokenSeq).toBeNull();
    expect(result.checkedAt).toBeInstanceOf(Date);
  });

  it("verify detects a tampered event and reports the first broken seq", async () => {
    const rows = chainedRows();
    rows[0] = { ...rows[0], newValues: { amount: "999" } };
    vi.mocked(db.query.auditLog.findMany).mockResolvedValue(rows as never);
    const result = await caller().audit.verify();
    expect(result.valid).toBe(false);
    expect(result.status).toBe("broken");
    expect(result.firstBrokenSeq).toBe(1);
  });

  it("verify reports unchained (pre-backfill) rows instead of false tampering", async () => {
    vi.mocked(db.query.auditLog.findMany).mockResolvedValue(
      makeChainRows() as never, // seq/hashes null
    );
    const result = await caller().audit.verify();
    expect(result.valid).toBe(false);
    expect(result.status).toBe("unchained");
  });

  it("export returns events with chain fields plus a verification report", async () => {
    vi.mocked(db.query.auditLog.findMany).mockResolvedValue(
      chainedRows() as never,
    );
    const result = await caller().audit.export({ format: "json" });
    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      id: "evt-1",
      seq: 1,
      action: "create",
    });
    expect(result.events[0].prevHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.events[0].eventHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.verification.valid).toBe(true);
  });

  it("export can produce CSV with a header row", async () => {
    vi.mocked(db.query.auditLog.findMany).mockResolvedValue(
      chainedRows() as never,
    );
    const result = await caller().audit.export({ format: "csv" });
    expect(typeof result.csv).toBe("string");
    expect(result.csv).toContain("seq");
    expect(result.csv).toContain("action");
    expect(result.csv).toContain("create");
  });

  it("list maps the new chain fields onto each event", async () => {
    vi.mocked(db.query.auditLog.findMany).mockResolvedValue(
      chainedRows() as never,
    );
    vi.mocked(db.execute).mockResolvedValue({
      rows: [{ total: "2" }],
    } as never);
    const result = await caller().audit.list({ limit: 50, offset: 0 });
    expect(result.logs[0]).toMatchObject({
      id: "evt-1",
      seq: 1,
      action: "create",
    });
    expect(result.logs[0].eventHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.total).toBe(2);
  });
});
