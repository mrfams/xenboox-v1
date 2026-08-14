// ─── §19.2 Webhook dedup — mono/email duplicate delivery is dropped ────────
//
// Webhook providers deliver at-least-once: Mono and Resend retry until they
// get a 2xx. Without dedup, a retried event double-applies (duplicate inbound
// email records, double job triggers, re-synced connections). The shared
// claimWebhookEvent helper atomically claims an event key in the
// idempotency_keys table; a duplicate delivery gets a 200 with `duplicate:
// true` and the handler body never runs again.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  /** Remaining idempotency_keys claims before inserts start "conflicting". */
  claimsRemaining: 1,
  /** Table most recently passed to db.insert(...) — drives returning(). */
  lastTable: null as unknown,
  updateSpy: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn((table: unknown) => {
      mocks.lastTable = table; // reference-equality check in returning()
      return db; // chain methods all live on the same mock object
    }),
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn(async () => {
      if (mocks.lastTable === idempotencyKeys) {
        // First claim inserts a row; duplicates conflict → empty result.
        return mocks.claimsRemaining-- > 0 ? [{ key: "claimed" }] : [];
      }
      // Business-table inserts (inboundEmails, etc.) succeed with a row.
      return [{ id: "row-1" }];
    }),
    update: mocks.updateSpy.mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue(undefined),
    query: {
      bankConnections: { findFirst: vi.fn() },
      emailForwardingRules: { findFirst: vi.fn() },
      inboundEmails: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("@/lib/webhook-verify", () => ({
  verifyMonoSignature: vi.fn(() => true),
  verifyWebhookSignature: vi.fn(() => true),
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

import { claimWebhookEvent } from "@/lib/webhooks/dedup";
import { db } from "@/lib/db";
import { idempotencyKeys } from "@xenboox/db/schema";
import { POST as monoPOST } from "@/app/api/webhooks/mono/route";
import { POST as emailPOST } from "@/app/api/webhooks/email/route";

describe("claimWebhookEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.claimsRemaining = 1;
    mocks.lastTable = null;
  });

  it("claims a fresh event (first delivery wins)", async () => {
    expect(await claimWebhookEvent("mono:mono.account.connected:conn-1")).toBe(
      true,
    );
  });

  it("rejects a duplicate delivery", async () => {
    mocks.claimsRemaining = 0; // key already claimed
    expect(await claimWebhookEvent("mono:mono.account.connected:conn-1")).toBe(
      false,
    );
  });

  it("reclaims an expired claim", async () => {
    // First call: no expired rows to clear, claims fresh.
    expect(await claimWebhookEvent("k")).toBe(true);
    // Second call: the expired row is cleared by the delete (simulated by a
    // fresh claim slot) → the claim succeeds again.
    mocks.claimsRemaining = 1;
    expect(await claimWebhookEvent("k")).toBe(true);
    expect(db.delete).toHaveBeenCalled();
  });
});

describe("mono webhook — duplicate events are not re-processed", () => {
  const fakeReq = (body: unknown) =>
    ({
      text: async () => JSON.stringify(body),
      headers: { get: (h: string) => (h === "mono-signature" ? "sig" : null) },
    }) as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.claimsRemaining = 1;
    mocks.lastTable = null;
    mocks.updateSpy.mockReturnThis();
  });

  it("processes the first delivery and skips the retried duplicate", async () => {
    const body = { event: "mono.account.connected", data: { id: "conn-1" } };

    const res1 = await monoPOST(fakeReq(body));
    expect(res1.status).toBe(200);
    expect(await res1.json()).toEqual({ received: true });
    expect(mocks.updateSpy).toHaveBeenCalledTimes(1);

    // Retry with the same signature-verified payload → duplicate.
    const res2 = await monoPOST(fakeReq(body));
    expect(res2.status).toBe(200);
    expect(await res2.json()).toMatchObject({
      received: true,
      duplicate: true,
    });
    expect(mocks.updateSpy).toHaveBeenCalledTimes(1); // not applied twice
  });
});

describe("email webhook — duplicate deliveries do not double-insert", () => {
  const fakeReq = (body: unknown) =>
    ({
      text: async () => JSON.stringify(body),
      headers: {
        get: (h: string) =>
          h === "svix-signature" || h === "x-webhook-signature" ? "sig" : null,
      },
    }) as never;

  const emailBody = (id = "msg-1") => ({
    type: "email.received",
    data: {
      id,
      from: "sender@example.com",
      to: "inbox@xenboox.com",
      subject: "Invoice from supplier",
      text: "Please pay this invoice",
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.claimsRemaining = 1;
    mocks.lastTable = null;
    vi.mocked(db.query.emailForwardingRules.findFirst).mockResolvedValue({
      id: "rule-1",
      entityId: "entity-1",
      emailAddress: "inbox@xenboox.com",
      autoClassify: false,
    } as never);
  });

  it("inserts one inbound email for a delivered-then-retried message", async () => {
    const res1 = await emailPOST(fakeReq(emailBody()));
    expect(res1.status).toBe(200);
    expect(await res1.json()).toMatchObject({ received: true });

    const res2 = await emailPOST(fakeReq(emailBody()));
    expect(res2.status).toBe(200);
    expect(await res2.json()).toMatchObject({ duplicate: true });
  });
});
