import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the R2 + trigger modules so we can assert on behavior without
// network or a running Trigger.dev worker.
const uploadToR2 = vi.fn();
const triggerCalls: Array<{
  task: string;
  payload: Record<string, unknown>;
  opts?: Record<string, unknown>;
}> = [];

vi.mock("../lib/r2", () => ({
  uploadToR2: (...args: unknown[]) =>
    (uploadToR2 as ReturnType<typeof vi.fn>)(...args),
}));

vi.mock("../trigger-client", () => ({
  triggerClient: {
    tasks: {
      trigger: (
        task: string,
        payload: Record<string, unknown>,
        opts?: Record<string, unknown>,
      ) => {
        triggerCalls.push({ task, payload, opts });
        return Promise.resolve({});
      },
    },
  },
}));

// Import the pure helper we test — the full task runner needs a Trigger.dev
// context, so we extract the per-attachment orchestration into a testable
// module used by the task.
import {
  shouldTriggerBankImport,
  buildEmailStoragePath,
} from "../lib/email-processing-helpers";

beforeEach(() => {
  vi.clearAllMocks();
  triggerCalls.length = 0;
});

describe("buildEmailStoragePath", () => {
  it("builds a stable email-scoped R2 path", () => {
    expect(buildEmailStoragePath("email-1", "invoice.pdf")).toBe(
      "email/email-1/invoice.pdf",
    );
  });

  it("never returns an empty path", () => {
    expect(
      buildEmailStoragePath("email-1", "invoice.pdf").length,
    ).toBeGreaterThan(0);
  });
});

describe("shouldTriggerBankImport", () => {
  it("triggers bank import only for bank statements", () => {
    expect(shouldTriggerBankImport("bank_statement")).toBe(true);
    expect(shouldTriggerBankImport("invoice")).toBe(false);
    expect(shouldTriggerBankImport("receipt")).toBe(false);
    expect(shouldTriggerBankImport("contract")).toBe(false);
  });
});
