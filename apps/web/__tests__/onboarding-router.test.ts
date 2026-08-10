import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────
//
// The web db wrapper re-exports the @xenboox/db barrel, so mocking @/lib/db
// covers the middleware + router queries. The pipeline module is partially
// mocked: pure functions stay REAL (legacyRoutingToSourceType, getFirstMessage,
// types), DB-touching pipeline functions are stubbed.

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue(undefined),
    query: {
      organizations: { findFirst: vi.fn() },
      entities: { findFirst: vi.fn(), update: vi.fn() },
      userEntityAccess: { findFirst: vi.fn() },
      orgRoles: { findFirst: vi.fn() },
      sessions: { findFirst: vi.fn().mockResolvedValue({ id: "session-1" }) },
      onboardingSessions: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/email", () => ({}));

vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: vi.fn() } },
  EMAIL_FROM: "test@test.com",
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

vi.mock("@xenboox/agents/core/onboarding-pipeline", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@xenboox/agents/core/onboarding-pipeline")
    >();
  return {
    ...actual,
    createOnboardingSession: vi
      .fn()
      .mockResolvedValue({ sessionId: "session-1" }),
    updateRoutingAnswer: vi.fn().mockResolvedValue(undefined),
    setBusinessStart: vi.fn().mockResolvedValue(undefined),
    setDetailDepth: vi.fn().mockResolvedValue(undefined),
    confirmOpeningBalance: vi.fn().mockResolvedValue({ saved: 2 }),
    confirmOpeningBalanceEscape: vi.fn().mockResolvedValue(undefined),
    getOpeningBalanceSummary: vi.fn().mockResolvedValue({
      sourceType: null,
      businessStartDate: null,
      balances: [],
      total: 0,
      escaped: false,
    }),
    getOnboardingStatus: vi.fn().mockResolvedValue(null),
    startHistoricalPull: vi
      .fn()
      .mockResolvedValue({ jobId: "job-1", needsPermission: false }),
    requestHistoricalPullPermission: vi.fn().mockResolvedValue(undefined),
    approveHistoricalPull: vi.fn().mockResolvedValue(undefined),
    getSuggestedCoA: vi
      .fn()
      .mockResolvedValue({ templateId: null, accounts: [] }),
    confirmCoA: vi.fn().mockResolvedValue({ accountCount: 0 }),
    completeOnboarding: vi
      .fn()
      .mockResolvedValue({ timeToFirstValueSeconds: 300 }),
    runOnboardingPipeline: vi.fn().mockResolvedValue({ success: true }),
    markCoAComplete: vi.fn().mockResolvedValue(undefined),
    createDataConnection: vi.fn().mockResolvedValue({
      connectionId: "conn-1",
      type: "bank_api",
      status: "pending",
      recordsProcessed: 0,
      failureReason: null,
      fallbackOffered: null,
    }),
    getFallbackForFailure: vi.fn().mockReturnValue(null),
  };
});

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appRouter } from "@/server/routers/_app";
import {
  confirmOpeningBalance as pipelineConfirm,
  confirmOpeningBalanceEscape as pipelineEscape,
  startHistoricalPull as pipelineStartPull,
  requestHistoricalPullPermission as pipelineRequestPermission,
  completeOnboarding as pipelineComplete,
  getOpeningBalanceSummary as pipelineGetOpeningBalanceSummary,
} from "@xenboox/agents/core/onboarding-pipeline";

describe("Onboarding Router — five-category flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      expires: "2099-01-01",
    } as any);
    // Middleware: entity exists, no org role → user_entity_access grants access
    vi.mocked(db.query.entities.findFirst).mockResolvedValue({
      id: "entity-1",
      organizationId: "org-1",
    } as any);
    vi.mocked(db.query.orgRoles.findFirst).mockResolvedValue(null as any);
    vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue({
      userId: "user-1",
      entityId: "entity-1",
      role: "admin",
    } as any);
    vi.mocked(db.query.organizations.findFirst).mockResolvedValue({
      id: "org-1",
    } as any);
  });

  function makeCaller(entityId: string | undefined = "entity-1") {
    return appRouter.createCaller({
      session: { user: { id: "user-1" }, expires: "2099" },
      entityId,
      headers: {},
    });
  }

  function makeCallerWithoutEntity() {
    return appRouter.createCaller({
      session: { user: { id: "user-1" }, expires: "2099" },
      entityId: undefined,
      headers: {},
    });
  }

  describe("updateRoutingAnswer — five-category enum", () => {
    it("accepts all five categories", async () => {
      const caller = makeCaller();
      const answers = [
        "brand_new",
        "professional_software",
        "manual_records",
        "statements_only",
        "no_records",
      ] as const;
      for (const answer of answers) {
        await expect(
          caller.onboarding.updateRoutingAnswer({ answer }),
        ).resolves.toMatchObject({ success: true });
      }
    });

    it("rejects anything outside the five-category enum", async () => {
      const caller = makeCaller();
      await expect(
        caller.onboarding.updateRoutingAnswer({
          answer: "excel" as never,
        }),
      ).rejects.toThrow();
      await expect(
        caller.onboarding.updateRoutingAnswer({
          answer: "quickbooks" as never,
        }),
      ).rejects.toThrow();
    });
  });

  describe("confirmOpeningBalance — zod validation", () => {
    it("rejects a batch with duplicate account codes", async () => {
      const caller = makeCaller();
      await expect(
        caller.onboarding.confirmOpeningBalance({
          rows: [
            { code: "1010", amount: 100 },
            { code: "1010", amount: 200 },
          ],
        }),
      ).rejects.toThrow("Duplicate account codes");
    });

    it("rejects non-finite amounts", async () => {
      const caller = makeCaller();
      await expect(
        caller.onboarding.confirmOpeningBalance({
          rows: [{ code: "1010", amount: Number.POSITIVE_INFINITY }],
        }),
      ).rejects.toThrow();
    });

    it("rejects empty rows without the escape flag", async () => {
      const caller = makeCaller();
      await expect(
        caller.onboarding.confirmOpeningBalance({ rows: [] }),
      ).rejects.toThrow("Enter at least one opening balance");
    });

    it("passes rows through to the pipeline with entityId + userId", async () => {
      const caller = makeCaller();
      const result = await caller.onboarding.confirmOpeningBalance({
        rows: [
          { code: "1010", amount: 15000 },
          { code: "2010", amount: -3000 },
        ],
      });

      expect(result).toEqual({ success: true, saved: 2, escaped: false });
      expect(pipelineConfirm).toHaveBeenCalledWith(
        "entity-1",
        [
          { code: "1010", amount: 15000 },
          { code: "2010", amount: -3000 },
        ],
        "user-1",
      );
    });

    it("routes the escape flag to the escape path", async () => {
      const caller = makeCaller();
      const result = await caller.onboarding.confirmOpeningBalance({
        rows: [],
        escape: true,
      });

      expect(result).toEqual({ success: true, saved: 0, escaped: true });
      expect(pipelineEscape).toHaveBeenCalledWith("entity-1");
      expect(pipelineConfirm).not.toHaveBeenCalled();
    });
  });

  describe("entity scoping", () => {
    it("rejects confirmOpeningBalance without an entityId", async () => {
      const caller = makeCallerWithoutEntity();
      await expect(
        caller.onboarding.confirmOpeningBalance({
          rows: [{ code: "1010", amount: 100 }],
        }),
      ).rejects.toThrow("Entity ID is required");
    });

    it("rejects getOpeningBalances when the user lacks entity access", async () => {
      vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue(
        undefined as any,
      );
      const caller = makeCaller("entity-other");
      await expect(caller.onboarding.getOpeningBalances()).rejects.toThrow(
        "do not have access",
      );
    });
  });

  describe("requestHistoricalPull — detail depth (spec §4.2)", () => {
    it("passes the selected depth through to the pipeline", async () => {
      const caller = makeCaller();
      await caller.onboarding.requestHistoricalPull({
        dateRangeStart: "2024-01-01",
        dateRangeEnd: "2025-12-31",
        detailDepth: "full_history",
      });

      expect(pipelineStartPull).toHaveBeenCalledWith(
        "entity-1",
        "2024-01-01",
        "2025-12-31",
        "full_history",
      );
    });

    it("requests permission when the pull exceeds 12 months", async () => {
      (pipelineStartPull as ReturnType<typeof vi.fn>).mockResolvedValue({
        jobId: "job-9",
        needsPermission: true,
      });
      const caller = makeCaller();
      const result = await caller.onboarding.requestHistoricalPull({
        dateRangeStart: "2023-01-01",
        dateRangeEnd: "2025-12-31",
        detailDepth: "last_3_years",
      });

      expect(result).toEqual({ jobId: "job-9", needsPermission: true });
      expect(pipelineRequestPermission).toHaveBeenCalledWith("job-9");
    });

    it("defaults depth to last_12_months when omitted", async () => {
      const caller = makeCaller();
      await caller.onboarding.requestHistoricalPull({
        dateRangeStart: "2025-01-01",
        dateRangeEnd: "2026-01-01",
      });

      const startPullMock = pipelineStartPull as unknown as ReturnType<
        typeof vi.fn
      >;
      const depthArg = (startPullMock.mock.calls[0]![3] ??
        "last_12_months") as string;
      expect(depthArg).toBe("last_12_months");
    });
  });

  describe("getStatus — legacy routing_answer mapping", () => {
    it("maps a legacy routing_answer to a five-category source", async () => {
      vi.mocked(db.query.onboardingSessions.findFirst).mockResolvedValue({
        id: "session-1",
        orgId: "org-1",
        status: "in_progress",
        currentStep: "entity_setup",
        completedSteps: ["signup", "routing"],
        routingAnswer: "quickbooks",
        sourceType: null,
        timeToFirstValueSeconds: null,
      } as any);

      const caller = makeCaller();
      const status = await caller.onboarding.getStatus();

      expect(status.sourceType).toBe("professional_software");
      expect(status.status).toBe("in_progress");
    });

    it("prefers the new source_type column over the legacy mapping", async () => {
      vi.mocked(db.query.onboardingSessions.findFirst).mockResolvedValue({
        id: "session-1",
        orgId: "org-1",
        status: "in_progress",
        currentStep: "routing",
        completedSteps: ["signup"],
        routingAnswer: "quickbooks", // would map to professional_software
        sourceType: "statements_only", // but the new column wins
        timeToFirstValueSeconds: null,
      } as any);

      const caller = makeCaller();
      const status = await caller.onboarding.getStatus();

      expect(status.sourceType).toBe("statements_only");
    });

    it("returns not_started when no org or session exists", async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValue(
        null as any,
      );
      const caller = makeCaller();
      await expect(caller.onboarding.getStatus()).resolves.toEqual({
        status: "not_started",
      });
    });
  });

  describe("completeFlow — Category E gate (spec honesty rule)", () => {
    beforeEach(() => {
      vi.mocked(db.query.onboardingSessions.findFirst).mockResolvedValue({
        id: "session-1",
        orgId: "org-1",
        status: "in_progress",
        routingAnswer: "nothing", // legacy value — ignored, source_type wins
        sourceType: "no_records",
        completedSteps: [],
        startedAt: new Date(),
        currentStep: "opening_balance",
      } as any);
    });

    it("blocks no_records completion until balances are confirmed or escaped", async () => {
      // getOpeningBalanceSummary mock default: balances [], escaped false
      const caller = makeCaller();
      await expect(caller.onboarding.completeFlow()).rejects.toThrow(
        "Confirm your opening balance",
      );
      expect(pipelineComplete).not.toHaveBeenCalled();
    });

    it("allows completion once the opening balance is escaped", async () => {
      (
        pipelineGetOpeningBalanceSummary as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        sourceType: "no_records",
        businessStartDate: null,
        balances: [],
        total: 0,
        escaped: true,
      } as any);

      const caller = makeCaller();
      const result = await caller.onboarding.completeFlow();

      expect(result.success).toBe(true);
      expect(pipelineComplete).toHaveBeenCalledWith("session-1");
      // First message must NOT imply records were found for Category E
      expect(result.firstMessage).toContain("opening balance");
    });
  });
});
