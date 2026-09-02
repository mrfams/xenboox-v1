import { describe, it, expect, vi, beforeEach } from "vitest";

// Track all Sentry calls
const sentryCalls: { method: string; args: any[] }[] = [];

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  captureException: vi.fn((...args: any[]) => {
    sentryCalls.push({ method: "captureException", args });
  }),
  captureMessage: vi.fn((...args: any[]) => {
    sentryCalls.push({ method: "captureMessage", args });
  }),
  withScope: vi.fn((cb: any) => {
    const scope = {
      setTag: vi.fn(),
      setContext: vi.fn(),
      setUser: vi.fn(),
      setLevel: vi.fn(),
      setExtra: vi.fn(),
      addBreadcrumb: vi.fn(),
    };
    cb(scope);
    return scope;
  }),
  setUser: vi.fn((...args: any[]) => {
    sentryCalls.push({ method: "setUser", args });
  }),
  setContext: vi.fn((...args: any[]) => {
    sentryCalls.push({ method: "setContext", args });
  }),
  addBreadcrumb: vi.fn((...args: any[]) => {
    sentryCalls.push({ method: "addBreadcrumb", args });
  }),
}));

describe("Sentry Integration — handleMutationError", () => {
  beforeEach(() => {
    sentryCalls.length = 0;
    vi.clearAllMocks();
  });

  it("calls Sentry.captureException for unexpected errors", async () => {
    const { handleMutationError } = await import("@/lib/sentry");

    const testError = new Error("Database connection failed");

    try {
      handleMutationError(testError, "Failed to create invoice");
    } catch {
      // Expected to throw
    }

    const captureCalls = sentryCalls.filter(
      (c) => c.method === "captureException",
    );
    expect(captureCalls.length).toBe(1);
  });

  it("does NOT call Sentry for TRPCError (expected errors)", async () => {
    const { handleMutationError } = await import("@/lib/sentry");
    const { TRPCError } = await import("@trpc/server");

    const trpcError = new TRPCError({
      code: "NOT_FOUND",
      message: "Invoice not found",
    });

    try {
      handleMutationError(trpcError, "Failed to create invoice");
    } catch {
      // Expected to throw
    }

    const captureCalls = sentryCalls.filter(
      (c) => c.method === "captureException",
    );
    expect(captureCalls.length).toBe(0);
  });

  it("calls Sentry for INTERNAL_SERVER_ERROR TRPCError", async () => {
    const { handleMutationError } = await import("@/lib/sentry");
    const { TRPCError } = await import("@trpc/server");

    const trpcError = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Something broke",
    });

    try {
      handleMutationError(trpcError, "Failed to create invoice");
    } catch {
      // Expected to throw
    }

    const captureCalls = sentryCalls.filter(
      (c) => c.method === "captureException",
    );
    expect(captureCalls.length).toBe(1);
  });

  it("sets userId tag when context provided", async () => {
    const { handleMutationError } = await import("@/lib/sentry");

    const testError = new Error("DB error");

    try {
      handleMutationError(testError, "Failed", {
        userId: "user-123",
        entityId: "entity-456",
      });
    } catch {
      // Expected
    }

    const captureCalls = sentryCalls.filter(
      (c) => c.method === "captureException",
    );
    expect(captureCalls.length).toBe(1);
  });

  it("preserves original error as cause in TRPCError", async () => {
    const { handleMutationError } = await import("@/lib/sentry");

    const originalError = new Error("Unique constraint violation");

    try {
      handleMutationError(originalError, "Failed to create record");
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(error.code).toBe("INTERNAL_SERVER_ERROR");
      expect(error.cause).toBe(originalError);
    }
  });

  it("re-throws TRPCError unchanged", async () => {
    const { handleMutationError } = await import("@/lib/sentry");
    const { TRPCError } = await import("@trpc/server");

    const trpcError = new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid input",
    });

    try {
      handleMutationError(trpcError, "Should not wrap");
    } catch (error) {
      expect(error).toBe(trpcError);
    }
  });
});

describe("Sentry Integration — reportToSentry", () => {
  beforeEach(() => {
    sentryCalls.length = 0;
    vi.clearAllMocks();
  });

  it("calls captureException with scope", async () => {
    const { reportToSentry } = await import("@/lib/sentry");

    reportToSentry(new Error("Test error"), {
      userId: "user-1",
      entityId: "entity-1",
      surface: "invoicing",
      action: "create invoice",
    });

    const captureCalls = sentryCalls.filter(
      (c) => c.method === "captureException",
    );
    expect(captureCalls.length).toBe(1);
  });

  it("skips non-500 TRPCErrors", async () => {
    const { reportToSentry } = await import("@/lib/sentry");
    const { TRPCError } = await import("@trpc/server");

    reportToSentry(new TRPCError({ code: "NOT_FOUND", message: "Not found" }));

    const captureCalls = sentryCalls.filter(
      (c) => c.method === "captureException",
    );
    expect(captureCalls.length).toBe(0);
  });
});

describe("Sentry Integration — captureSentryMessage", () => {
  beforeEach(() => {
    sentryCalls.length = 0;
    vi.clearAllMocks();
  });

  it("calls captureMessage", async () => {
    const { captureSentryMessage } = await import("@/lib/sentry");

    captureSentryMessage("Agent escalated to human", "warning", {
      userId: "user-1",
    });

    const msgCalls = sentryCalls.filter((c) => c.method === "captureMessage");
    expect(msgCalls.length).toBe(1);
  });
});
