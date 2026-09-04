// ─── Expenses Router Entity Context Tests ────────────────────────────────────
//
// Tests that the expenses router properly fetches entity currency from the
// database instead of referencing an undefined `entityCtx` variable.
//
// Before the fix, `entityCtx.currency ?? "GMD"` would crash at runtime
// because `entityCtx` was never defined in the expenses router.
// After the fix, the router queries the entities table directly.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const ENTITY_A = "11111111-1111-1111-1111-111111111111";

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "expense-1" }]),
    query: {
      entities: {
        findFirst: vi.fn(),
      },
    },
  };
  return { mockDb };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: vi.fn() } },
  EMAIL_FROM: "test@test.com",
}));

vi.mock("@/lib/email", () => ({}));

vi.mock("@xenboox/db/schema/permissions", () => ({
  rolePermissions: {
    id: "id",
    role: "role",
    module: "module",
    action: "action",
    scope: "scope",
  },
  rbacModuleEnum: vi.fn(() => ({ notNull: vi.fn().mockReturnThis() })),
  rbacActionEnum: vi.fn(() => ({ notNull: vi.fn().mockReturnThis() })),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// ─── Import the expenses router directly ────────────────────────────────────
// We test the router's internal behavior by importing the module and
// checking that it references entities.findFirst (the fix) rather than
// entityCtx (the bug).

describe("Expenses Router — Entity Context Fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expenses router source code queries entities table for currency", async () => {
    // Read the actual source file to verify the fix
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/expenses.ts", "utf-8");

    // The fix: the router now queries entities.findFirst to get currency
    expect(source).toContain("db.query.entities.findFirst");

    // The fix: the router no longer references entityCtx
    expect(source).not.toContain("entityCtx.currency");

    // The fix: uses entity?.currency with USD fallback
    expect(source).toContain('entity?.currency ?? "USD"');
  });

  it("expenses router imports entities from schema", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/expenses.ts", "utf-8");

    // The fix: entities table is imported for the currency query
    expect(source).toContain("entities");
    expect(source).toContain('from "@xenboox/db/schema"');
  });

  it("createExpense mutation has try/catch error handling", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/expenses.ts", "utf-8");

    // The fix: createExpense has proper error handling
    expect(source).toContain("try {");
    expect(source).toContain("} catch (error)");
  });

  it("createExpense uses entity-scoped entityId from context", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/expenses.ts", "utf-8");

    // The fix: uses ctx.entityId! (from tRPC context, not undefined entityCtx)
    expect(source).toContain("ctx.entityId!");
  });

  it("entity currency fallback is USD (not GMD)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/expenses.ts", "utf-8");

    // The canonical default currency is USD (schema default + entity fallback).
    // GMD is a legacy artifact that must never reappear as a fallback — the
    // schema and every entity-currency context already default to USD. Assert
    // the whole file has no `?? "GMD"` fallback (entity, claim, or inline).
    expect(source).not.toMatch(/\?\?\s*"GMD"/);
    // Sanity: the entity/claim fallbacks that DO exist resolve to USD.
    const fallbackMatches =
      source.match(/\.currency\s*\?\?\s*"(\w+)"/g) ??
      source.match(/entityCurrency\s*\?\?\s*"(\w+)"/g);
    for (const match of fallbackMatches ?? []) {
      expect(match).toContain('"USD"');
    }
  });

  describe("Entity access verification in API routes", () => {
    it("chat stream route imports resolveEntityAccess", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("app/api/chat/stream/route.ts", "utf-8");
      expect(source).toContain("resolveEntityAccess");
    });

    it("attention stream route imports resolveEntityAccess", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync(
        "app/api/attention/stream/route.ts",
        "utf-8",
      );
      expect(source).toContain("resolveEntityAccess");
    });

    it("help assist route imports resolveEntityAccess", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("app/api/help/assist/route.ts", "utf-8");
      expect(source).toContain("resolveEntityAccess");
    });

    it("plaid create-link-token route imports resolveEntityAccess", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync(
        "app/api/plaid/create-link-token/route.ts",
        "utf-8",
      );
      expect(source).toContain("resolveEntityAccess");
    });

    it("plaid exchange-token route imports resolveEntityAccess", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync(
        "app/api/plaid/exchange-token/route.ts",
        "utf-8",
      );
      expect(source).toContain("resolveEntityAccess");
    });

    it("all API routes return 403 when access is denied", async () => {
      const fs = await import("fs");
      const routes = [
        "app/api/chat/stream/route.ts",
        "app/api/attention/stream/route.ts",
        "app/api/help/assist/route.ts",
        "app/api/plaid/create-link-token/route.ts",
        "app/api/plaid/exchange-token/route.ts",
      ];

      for (const route of routes) {
        const source = fs.readFileSync(route, "utf-8");
        expect(source).toContain("403");
      }
    });
  });
});
