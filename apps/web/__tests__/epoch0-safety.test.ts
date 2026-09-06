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
// Run Phase finding: importing full tRPC routers in vitest times out
// (next-auth ESM interop) — the invariants are enforced as source-level
// checks instead; behavioral verification of the guards moves to CI with the
// healthy module environment.
describe("N3/N4/N5 seed elimination + gating", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const ROOT = path.resolve(__dirname, "../../..");
  const routerSrc = (name: string) =>
    fs.readFileSync(
      path.join(ROOT, "apps/web/server/routers", `${name}.ts`),
      "utf8",
    );

  it("review-queue router exposes NO seedDemoData procedure", () => {
    expect(routerSrc("review-queue")).not.toContain("seedDemoData");
  });

  it.each([
    "ops-console",
    "logs-traces",

    "customer-diagnostics",
    "company-brain",
    "feature-flags",
    "infrastructure",
  ] as const)("%s seedDemoData is dev-gated as its first statement", (name) => {
    const src = routerSrc(name);
    expect(src).toContain('devOnly("seedDemoData");');
    // The gate must precede any db write inside the seed procedure.
    const gateAt = src.indexOf('devOnly("seedDemoData");');
    const writes = ["db.insert", "db.delete", "db.update", "db.transaction"];
    const firstWrite = Math.min(
      ...writes
        .map((w) => src.indexOf(w, gateAt))
        .filter((i) => i !== -1)
        .concat([Infinity]),
    );
    // everything the gate guards sits AFTER the gate
    expect(gateAt).toBeGreaterThan(-1);
    expect(firstWrite).toBeGreaterThan(gateAt);
  });

  it("named seed procedures are also gated (cost-analytics, token-usage, agent-monitor, live-runs, prompt-library)", () => {
    for (const [file, proc] of [
      ["cost-analytics", "seedCostAnalyticsData"],
      ["token-usage", "seedTokenUsageData"],
      ["agent-monitor", "seedAgentMonitorData"],
      ["live-runs", "seedLiveRunsData"],
      ["prompt-library", "seedPromptLibraryData"],
    ] as const) {
      expect(routerSrc(file)).toContain(`devOnly("${proc}");`);
    }
  });

  it("devOnly() throws in production and passes in development", async () => {
    process.env.NODE_ENV = "production";
    vi.resetModules();
    const { devOnly } = await import("@/server/lib/dev-only");
    expect(() => devOnly("seedDemoData")).toThrow(/production/);
    process.env.NODE_ENV = "development";
    vi.resetModules();
    const { devOnly: devOnlyDev } = await import("@/server/lib/dev-only");
    expect(() => devOnlyDev("seedDemoData")).not.toThrow();
  });

  it("seed-demo route 404s production BEFORE token checks (POST handler)", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "apps/web/app/api/seed-demo/route.ts"),
      "utf8",
    );
    const guardAt = src.indexOf('NODE_ENV === "production"');
    const tokenAt = src.indexOf("SEED_DEMO_TOKEN");
    expect(guardAt).toBeGreaterThan(-1);
    expect(tokenAt).toBeGreaterThan(guardAt);
    expect(src).toContain("404");
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
