import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────
// Follows the onboarding-router test convention: mock @/lib/db and @/lib/auth,
// then drive the REAL appRouter via createCaller so zod validation, entity
// scoping, and role gating all run for real.

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockReturnThis(),
    query: {
      organizations: { findFirst: vi.fn() },
      entities: { findFirst: vi.fn() },
      userEntityAccess: { findFirst: vi.fn() },
      orgRoles: { findFirst: vi.fn(), findMany: vi.fn() },
      sessions: { findFirst: vi.fn().mockResolvedValue({ id: "session-1" }) },
      users: { findFirst: vi.fn() },
      jurisdictionTaxRules: { findFirst: vi.fn(), findMany: vi.fn() },
      taxRateOverrides: { findFirst: vi.fn(), findMany: vi.fn() },
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

const entityId = "entity-1";

function makeCaller(entityRole = "admin") {
  // The entity-scoping middleware derives entityRole from userEntityAccess
  // when no org-level role exists, so we drive the role through the mock.
  vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue({
    userId: "user-1",
    entityId,
    role: entityRole,
  } as never);
  return appRouter.createCaller({
    session: {
      user: { id: "user-1", email: "test@test.com" },
      expires: "2099",
    },
    entityId,
    headers: {},
  });
}

describe("taxConfigRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      expires: "2099-01-01",
    } as never);
    vi.mocked(db.query.entities.findFirst).mockResolvedValue({
      id: entityId,
      organizationId: "org-1",
    } as never);
    vi.mocked(db.query.orgRoles.findFirst).mockResolvedValue(null as never);
    vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue({
      userId: "user-1",
      entityId,
      role: "admin",
    } as never);
    vi.mocked(db.query.organizations.findFirst).mockResolvedValue({
      id: "org-1",
    } as never);
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: "user-1",
      emailVerified: new Date(),
    } as never);
  });

  describe("preview", () => {
    it("computes flat VAT exactly like the engine", async () => {
      const caller = makeCaller();
      const result = await caller.taxConfig.preview({
        rateConfig: { type: "rate", rate: 0.15 },
        amount: 1000,
      });
      expect(result).toMatchObject({ amount: 150, method: "flat" });
    });

    it("computes progressive bands", async () => {
      const caller = makeCaller();
      const result = await caller.taxConfig.preview({
        rateConfig: {
          type: "bands",
          bands: [
            { from: 0, to: 3000, rate: 0 },
            { from: 3000, to: 6000, rate: 0.1 },
            { from: 6000, to: null, rate: 0.2 },
          ],
        },
        amount: 8000,
      });
      // 3,000@0 + 3,000@10% (300) + 2,000@20% (400) = 700
      expect(result).toMatchObject({ amount: 700 });
    });

    it("computes the employer/employee split for social security", async () => {
      const caller = makeCaller();
      const result = await caller.taxConfig.preview({
        rateConfig: {
          type: "rate",
          employeeRate: 0.05,
          employerRate: 0.1,
          ceiling: 30000,
        },
        amount: 50000,
        split: true,
      });
      expect(result.split).toEqual({
        employee: 1500,
        employer: 3000,
        total: 4500,
      });
    });

    it("rejects an invalid rate config", async () => {
      const caller = makeCaller();
      await expect(
        caller.taxConfig.preview({
          rateConfig: { type: "rate", rate: 1.5 },
          amount: 100,
        }),
      ).rejects.toThrow();
    });
  });

  describe("createRule", () => {
    it("creates version 1 as active", async () => {
      (
        db as unknown as { returning: ReturnType<typeof vi.fn> }
      ).returning.mockResolvedValue([
        {
          id: "11111111-1111-4111-8111-111111111111",
          entityId,
          country: "GM",
          ruleType: "vat",
          version: 1,
          status: "active",
        } as never,
      ]);
      const caller = makeCaller();
      const result = await caller.taxConfig.createRule({
        country: "GM",
        ruleType: "vat",
        name: "Gambia VAT",
        rateConfig: { type: "rate", rate: 0.15 },
        effectiveFrom: "2026-01-01",
      });
      expect(result).toMatchObject({
        id: "11111111-1111-4111-8111-111111111111",
        version: 1,
      });
    });

    it("blocks non-owner/admin roles", async () => {
      const caller = makeCaller("member");
      await expect(
        caller.taxConfig.createRule({
          country: "GM",
          ruleType: "vat",
          name: "Gambia VAT",
          rateConfig: { type: "rate", rate: 0.15 },
          effectiveFrom: "2026-01-01",
        }),
      ).rejects.toThrow();
    });
  });

  describe("updateRule — versioning safety", () => {
    it("supersedes the old version and creates version+1 (never overwrites)", async () => {
      // Existing active v2 rule returned by getRule
      vi.mocked(db.query.jurisdictionTaxRules.findFirst).mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        entityId,
        country: "GM",
        ruleType: "vat",
        name: "Gambia VAT",
        version: 2,
        status: "active",
        rateOrBands: { type: "rate", rate: 0.15 },
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        notes: "original",
      } as never);
      // The new v3 row returned by the insert
      (
        db as unknown as { returning: ReturnType<typeof vi.fn> }
      ).returning.mockResolvedValue([
        {
          id: "22222222-2222-4222-8222-222222222222",
          entityId,
          country: "GM",
          ruleType: "vat",
          name: "Gambia VAT (updated)",
          version: 3,
          status: "active",
        } as never,
      ]);

      const caller = makeCaller();
      const result = await caller.taxConfig.updateRule({
        ruleId: "11111111-1111-4111-8111-111111111111",
        country: "GM",
        ruleType: "vat",
        name: "Gambia VAT (updated)",
        rateConfig: { type: "rate", rate: 0.18 },
        effectiveFrom: "2026-06-01",
        supersedeNote: "Law change effective June",
      });

      expect(result).toMatchObject({ version: 3 });
      // The old row was marked superseded, not deleted
      expect(db.update).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it("rejects update on a missing rule", async () => {
      vi.mocked(db.query.jurisdictionTaxRules.findFirst).mockResolvedValue(
        null as never,
      );
      const caller = makeCaller();
      await expect(
        caller.taxConfig.updateRule({
          ruleId: "99999999-9999-4999-8999-999999999999",
          country: "GM",
          ruleType: "vat",
          name: "X",
          rateConfig: { type: "rate", rate: 0.18 },
          effectiveFrom: "2026-06-01",
        }),
      ).rejects.toThrow();
    });
  });

  describe("deactivateRule / reactivateRule", () => {
    it("deactivates (supersedes) a rule", async () => {
      vi.mocked(db.query.jurisdictionTaxRules.findFirst).mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        entityId,
        country: "GM",
        ruleType: "vat",
        version: 1,
        status: "active",
      } as never);
      const caller = makeCaller();
      const result = await caller.taxConfig.deactivateRule({
        ruleId: "11111111-1111-4111-8111-111111111111",
        reason: "Rate no longer applies",
      });
      expect(result).toEqual({ success: true });
      expect(db.update).toHaveBeenCalled();
    });

    it("reactivates a superseded rule", async () => {
      vi.mocked(db.query.jurisdictionTaxRules.findFirst).mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        entityId,
        country: "GM",
        ruleType: "vat",
        version: 1,
        status: "superseded",
      } as never);
      const caller = makeCaller();
      const result = await caller.taxConfig.reactivateRule({
        ruleId: "11111111-1111-4111-8111-111111111111",
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("overrides", () => {
    it("creates a per-person rate override", async () => {
      vi.mocked(db.query.jurisdictionTaxRules.findFirst).mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        entityId,
        country: "GM",
        ruleType: "paye",
        version: 1,
        status: "active",
      } as never);
      vi.mocked(db.query.taxRateOverrides.findFirst).mockResolvedValue(
        null as never,
      );
      (
        db as unknown as { returning: ReturnType<typeof vi.fn> }
      ).returning.mockResolvedValue([
        {
          id: "33333333-3333-4333-8333-333333333333",
          entityId,
          taxRuleId: "11111111-1111-4111-8111-111111111111",
          appliesToType: "employee",
          appliesToId: "emp-7",
          rate: "0.12",
          fixedAmount: null,
          isActive: true,
        } as never,
      ]);

      const caller = makeCaller();
      const result = await caller.taxConfig.upsertOverride({
        taxRuleId: "11111111-1111-4111-8111-111111111111",
        appliesToType: "employee",
        appliesToId: "emp-7",
        rate: 0.12,
      });
      expect(result).toMatchObject({ appliesToId: "emp-7", rate: "0.12" });
    });

    it("deletes an override it owns", async () => {
      vi.mocked(db.query.taxRateOverrides.findFirst).mockResolvedValue({
        id: "33333333-3333-4333-8333-333333333333",
        entityId,
        taxRuleId: "11111111-1111-4111-8111-111111111111",
        appliesToType: "employee",
        appliesToId: "emp-7",
      } as never);
      const caller = makeCaller();
      const result = await caller.taxConfig.deleteOverride({
        overrideId: "33333333-3333-4333-8333-333333333333",
      });
      expect(result).toEqual({ success: true });
      expect(db.delete).toHaveBeenCalled();
    });

    it("rejects deleting another entity's override", async () => {
      vi.mocked(db.query.taxRateOverrides.findFirst).mockResolvedValue(
        null as never,
      );
      const caller = makeCaller();
      await expect(
        caller.taxConfig.deleteOverride({
          overrideId: "88888888-8888-4888-8888-888888888888",
        }),
      ).rejects.toThrow();
    });
  });

  describe("listRules", () => {
    it("returns entity-scoped rules with active flag", async () => {
      vi.mocked(db.query.jurisdictionTaxRules.findMany).mockResolvedValue([
        {
          id: "11111111-1111-4111-8111-111111111111",
          entityId,
          country: "GM",
          ruleType: "vat",
          name: "Gambia VAT",
          version: 2,
          status: "active",
          rateOrBands: { type: "rate", rate: 0.15 },
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
          createdAt: new Date(),
        } as never,
      ]);
      const caller = makeCaller();
      const result = await caller.taxConfig.listRules();
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toMatchObject({ country: "GM", version: 2 });
      expect(db.query.jurisdictionTaxRules.findMany).toHaveBeenCalled();
    });
  });
});
