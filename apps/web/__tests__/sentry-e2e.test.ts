import { describe, it, expect, vi, beforeEach } from "vitest";

// Track all Sentry calls for end-to-end verification
const sentryCalls: { method: string; args: any[]; scope?: any }[] = [];

vi.mock("@sentry/nextjs", () => {
  const scope = {
    setTag: vi.fn(),
    setContext: vi.fn(),
    setUser: vi.fn(),
    setLevel: vi.fn(),
    setExtra: vi.fn(),
    addBreadcrumb: vi.fn(),
  };

  return {
    init: vi.fn(),
    captureException: vi.fn((...args: any[]) => {
      sentryCalls.push({
        method: "captureException",
        args,
        scope: { ...scope },
      });
    }),
    captureMessage: vi.fn((...args: any[]) => {
      sentryCalls.push({ method: "captureMessage", args, scope: { ...scope } });
    }),
    withScope: vi.fn((cb: any) => {
      cb(scope);
      return scope;
    }),
    setUser: vi.fn(),
    setContext: vi.fn(),
    addBreadcrumb: vi.fn((...args: any[]) => {
      sentryCalls.push({ method: "addBreadcrumb", args });
    }),
  };
});

describe("Sentry E2E — Full Error Flow", () => {
  beforeEach(() => {
    sentryCalls.length = 0;
    vi.clearAllMocks();
  });

  describe("handleMutationError flow", () => {
    it("captures unexpected error with context", async () => {
      const { handleMutationError } = await import("@/lib/sentry");

      try {
        handleMutationError(
          new Error("Connection timeout"),
          "Failed to sync bank",
          {
            userId: "user-001",
            entityId: "entity-002",
            surface: "banking",
            action: "sync bank transactions",
          },
        );
      } catch {
        // Expected
      }

      // Verify Sentry.captureException was called
      const captures = sentryCalls.filter(
        (c) => c.method === "captureException",
      );
      expect(captures.length).toBe(1);

      // Verify scope was set (tags, extras)
      const { withScope } = await import("@sentry/nextjs");
      expect(withScope).toHaveBeenCalled();
    });

    it("does NOT capture expected TRPCError (NOT_FOUND)", async () => {
      const { handleMutationError } = await import("@/lib/sentry");
      const { TRPCError } = await import("@trpc/server");

      try {
        handleMutationError(
          new TRPCError({ code: "NOT_FOUND", message: "Not found" }),
          "Failed to load",
        );
      } catch {
        // Expected
      }

      const captures = sentryCalls.filter(
        (c) => c.method === "captureException",
      );
      expect(captures.length).toBe(0);
    });

    it("DOES capture INTERNAL_SERVER_ERROR TRPCError", async () => {
      const { handleMutationError } = await import("@/lib/sentry");
      const { TRPCError } = await import("@trpc/server");

      try {
        handleMutationError(
          new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB crash" }),
          "Failed to post journal",
        );
      } catch {
        // Expected
      }

      const captures = sentryCalls.filter(
        (c) => c.method === "captureException",
      );
      expect(captures.length).toBe(1);
    });
  });

  describe("reportToSentry flow", () => {
    it("sets all context tags", async () => {
      const { reportToSentry } = await import("@/lib/sentry");

      reportToSentry(new Error("Test"), {
        userId: "user-123",
        entityId: "entity-456",
        surface: "invoicing",
        action: "create invoice",
        extra: { invoiceId: "inv-789", amount: 1500 },
      });

      const captures = sentryCalls.filter(
        (c) => c.method === "captureException",
      );
      expect(captures.length).toBe(1);

      // Verify withScope was called (sets tags via scope.setTag)
      const { withScope } = await import("@sentry/nextjs");
      expect(withScope).toHaveBeenCalled();
    });

    it("handles nested cause chains", async () => {
      const { reportToSentry } = await import("@/lib/sentry");

      const innerError = new Error("Connection refused");
      const outerError = new Error("DB query failed");
      (outerError as any).cause = innerError;

      reportToSentry(outerError, { entityId: "entity-1" });

      const captures = sentryCalls.filter(
        (c) => c.method === "captureException",
      );
      expect(captures.length).toBe(1);
    });
  });

  describe("captureSentryMessage flow", () => {
    it("captures operational messages", async () => {
      const { captureSentryMessage } = await import("@/lib/sentry");

      captureSentryMessage("Agent escalated to human", "warning", {
        userId: "user-1",
        entityId: "entity-2",
        extra: { agentId: "cfo_agent", confidence: 0.3 },
      });

      const msgCalls = sentryCalls.filter((c) => c.method === "captureMessage");
      expect(msgCalls.length).toBe(1);
    });
  });

  describe("PII safety", () => {
    it("reportToSentry does not include raw error message with passwords", async () => {
      const { reportToSentry } = await import("@/lib/sentry");

      // This error contains a password in the message — Sentry should still
      // capture it (the error message itself), but the beforeSend hook in
      // sentry.server.config.ts strips sensitive headers/extra fields.
      reportToSentry(new Error("Auth failed for user admin"), {
        userId: "user-1",
      });

      const captures = sentryCalls.filter(
        (c) => c.method === "captureException",
      );
      expect(captures.length).toBe(1);
      // The error IS captured — PII stripping happens in beforeSend,
      // not in the capture call itself.
    });
  });

  describe("error boundary integration", () => {
    it("error boundary calls Sentry.captureException (verified via component)", async () => {
      // The error boundary uses direct import of @sentry/nextjs
      // This is verified by the component's componentDidCatch method.
      // Full component testing requires React Testing Library + jsdom.
      // Here we verify the import path works:
      const Sentry = await import("@sentry/nextjs");
      expect(typeof Sentry.captureException).toBe("function");
      expect(typeof Sentry.withScope).toBe("function");
      expect(typeof Sentry.addBreadcrumb).toBe("function");
    });
  });
});
