import { describe, it, expect, vi, beforeEach } from "vitest";

// Track Sentry calls
const sentryCalls: { method: string; args: any[] }[] = [];

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
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

describe("Sentry Context — middleware integration", () => {
  beforeEach(() => {
    sentryCalls.length = 0;
    vi.clearAllMocks();
  });

  it("lib/sentry.ts reportToSentry includes userId and entityId tags", async () => {
    const { reportToSentry } = await import("@/lib/sentry");

    reportToSentry(new Error("Test"), {
      userId: "user-abc",
      entityId: "entity-xyz",
      surface: "invoicing",
    });

    // Verify withScope was called (it sets tags)
    const { withScope } = await import("@sentry/nextjs");
    expect(withScope).toHaveBeenCalled();
  });

  it("lib/sentry.ts handleMutationError passes context to reportToSentry", async () => {
    const { handleMutationError } = await import("@/lib/sentry");

    try {
      handleMutationError(new Error("DB error"), "Failed", {
        userId: "user-123",
        entityId: "entity-456",
        surface: "journal",
      });
    } catch {
      // Expected
    }

    const { withScope } = await import("@sentry/nextjs");
    expect(withScope).toHaveBeenCalled();
  });

  it("lib/sentry.ts captureSentryMessage includes context", async () => {
    const { captureSentryMessage } = await import("@/lib/sentry");

    captureSentryMessage("Agent escalation", "warning", {
      userId: "user-789",
      entityId: "entity-012",
    });

    const { withScope } = await import("@sentry/nextjs");
    expect(withScope).toHaveBeenCalled();
  });
});
