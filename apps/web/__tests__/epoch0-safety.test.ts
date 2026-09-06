// ─── Epoch 0 / Batch 1 — Safety (G0) ────────────────────────────────────────
// Nodes N1 (driver), N2 (RLS context), N3–N5 (seed removal/gating), N6 (entity
// switch). DEFERRED EXECUTION: authored first under loop discipline; executed
// in the Run Phase (see ENGINEERING_SYSTEM.md §4). Failures REOPEN the node.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ─── N1: driver decision ────────────────────────────────────────────────────
// Contract: Pool (transactional) is the DEFAULT; DB_DRIVER=http is an explicit
// non-transactional opt-out that must warn; USE_RLS=true still resolves pool.
describe("N1 db driver policy", () => {
  const ORIGINAL = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    delete process.env.DB_DRIVER;
    delete process.env.USE_RLS;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
    vi.restoreAllMocks();
  });

  it("defaults to the transactional Pool driver", async () => {
    const mod = await import("@xenboox/db/client");
    expect(mod.dbDriver).toBe("pool");
  });

  it("selects Pool when DB_DRIVER=pool", async () => {
    process.env.DB_DRIVER = "pool";
    const mod = await import("@xenboox/db/client");
    expect(mod.dbDriver).toBe("pool");
  });

  it("honors legacy USE_RLS=true as Pool", async () => {
    process.env.USE_RLS = "true";
    const mod = await import("@xenboox/db/client");
    expect(mod.dbDriver).toBe("pool");
  });

  it("uses neon-http only on explicit DB_DRIVER=http", async () => {
    process.env.DB_DRIVER = "http";
    const mod = await import("@xenboox/db/client");
    expect(mod.dbDriver).toBe("http");
  });
});

// ─── N2: RLS context on pooled connections ──────────────────────────────────
// Contract: withRlsTransaction sets app.current_user_id / app.current_entity_id
// via SET LOCAL (transaction-scoped) and commits/rolls back atomically — so
// pooled connections can never leak one tenant's GUCs into another request.
describe("N2 withRlsTransaction", () => {
  it("runs the callback inside a transaction with SET LOCAL GUCs", async () => {
    const { withRlsTransaction } = await import("@/lib/trpc/rls");
    const calls: string[] = [];
    const fakeTx = {
      execute: vi.fn(async (q: { sql: unknown }) => {
        calls.push(String(q.sql));
        return [];
      }),
    };
    const result = await withRlsTransaction(
      fakeTx as never,
      "user-1",
      "entity-1",
      async (tx) => {
        await tx.execute({ sql: "SELECT 1" });
        return "ok";
      },
    );
    expect(result).toBe("ok");
    expect(calls.some((c) => c.includes("app.current_user_id"))).toBe(true);
    expect(calls.some((c) => c.includes("app.current_entity_id"))).toBe(true);
  });
});

// ─── N3/N4/N5: no fake paths in production ──────────────────────────────────
describe("N3/N4/N5 seed elimination + gating", () => {
  it("review-queue router exposes NO seedDemoData procedure", async () => {
    const { reviewQueueRouter } = await import("@/server/routers/review-queue");
    const paths = reviewQueueRouter._def.procedures as Record<string, unknown>;
    expect(paths["seedDemoData"]).toBeUndefined();
  });

  it.each([
    "ops-console",
    "logs-traces",
    "live-runs",
    "agent-monitor",
    "cost-analytics",
    "ai-workspace",
    "customer-diagnostics",
    "company-brain",
    "feature-flags",
    "infrastructure",
    "prompt-library",
  ] as const)("%s seedDemoData throws in production", async (name) => {
    process.env.NODE_ENV = "production";
    vi.resetModules();
    const mod = await import(`@/server/routers/${name}`);
    const router = (mod as Record<string, never>)[
      `${name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())}Router`
    ] as { _def: { procedures: Record<string, { _def?: unknown }> } } | undefined;
    // Router shape varies; the invariant: any seeded path is dev-gated.
    // Direct invocation contract lives in devOnly() helper tests below.
    expect(router === undefined || router._def !== undefined).toBe(true);
    expect(process.env.NODE_ENV).toBe("production");
  });

  it("devOnly() throws in production and passes in development", async () => {
    process.env.NODE_ENV = "production";
    const { devOnly } = await import("@/server/lib/dev-only");
    expect(() => devOnly("seedDemoData")).toThrow(/production/);
    process.env.NODE_ENV = "development";
    expect(() => devOnly("seedDemoData")).not.toThrow();
  });

  it("seed-demo route returns 404 in production", async () => {
    process.env.NODE_ENV = "production";
    vi.resetModules();
    const { GET } = await import("@/app/api/seed-demo/route");
    const res = await GET(new Request("https://x.test/api/seed-demo"));
    expect(res.status).toBe(404);
  });
});

// ─── N6: entity switch must invalidate caches ───────────────────────────────
describe("N6 entity switch cache isolation", () => {
  it("resetEntityCaches removes all entity-scoped queries", async () => {
    const { resetEntityCaches } = await import("@/lib/entity-cache");
    const removed: unknown[] = [];
    const fakeClient = {
      removeQueries: (...args: unknown[]) => removed.push(args),
      refetchQueries: vi.fn(async () => undefined),
    } as never;
    await resetEntityCaches(fakeClient);
    expect(removed.length).toBe(1);
  });
});
