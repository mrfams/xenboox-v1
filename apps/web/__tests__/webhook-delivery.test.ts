import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    query: {
      webhookSubscriptions: { findMany: vi.fn() },
      webhookDeliveryLogs: { findMany: vi.fn() },
    },
  },
}));

import { db } from "@/lib/db";
import {
  signWebhookPayload,
  buildWebhookHeaders,
  computeBackoffDelayMs,
  isRetryableStatus,
  isDeliveryDue,
  deliverWebhook,
  enqueueWebhookDeliveries,
  processPendingWebhookDeliveries,
  DEFAULT_TIMEOUT_MS,
} from "@/lib/webhooks/delivery";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signWebhookPayload", () => {
  it("produces a deterministic HMAC-SHA256 hex signature", () => {
    const a = signWebhookPayload('{"x":1}', "secret-1");
    const b = signWebhookPayload('{"x":1}', "secret-1");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs when the secret changes", () => {
    const a = signWebhookPayload('{"x":1}', "secret-1");
    const b = signWebhookPayload('{"x":1}', "secret-2");
    expect(a).not.toBe(b);
  });

  it("differs when the body changes", () => {
    const a = signWebhookPayload('{"x":1}', "secret-1");
    const b = signWebhookPayload('{"x":2}', "secret-1");
    expect(a).not.toBe(b);
  });
});

describe("buildWebhookHeaders", () => {
  it("includes event, delivery id, and prefixed signature", () => {
    const headers = buildWebhookHeaders({
      eventType: "invoice.paid",
      deliveryId: "delivery-1",
      secret: "s3cret",
      rawBody: "{}",
    });
    expect(headers["X-Xenboox-Event"]).toBe("invoice.paid");
    expect(headers["X-Xenboox-Delivery"]).toBe("delivery-1");
    expect(headers["X-Xenboox-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

describe("computeBackoffDelayMs", () => {
  it("grows exponentially from the base", () => {
    const base = 5000;
    expect(computeBackoffDelayMs(1, base, 300000)).toBeGreaterThanOrEqual(4000);
    expect(computeBackoffDelayMs(1, base, 300000)).toBeLessThanOrEqual(6000);
    const a = computeBackoffDelayMs(2, base, 300000);
    const b = computeBackoffDelayMs(1, base, 300000);
    // attempt 2 ≈ base*2, attempt 1 ≈ base — attempt 2 should be ~2x
    expect(a).toBeGreaterThan(b * 1.4);
  });

  it("caps at maxMs", () => {
    const v = computeBackoffDelayMs(20, 5000, 300000);
    expect(v).toBeLessThanOrEqual(300000);
  });

  it("never returns negative", () => {
    for (let i = 1; i <= 15; i++) {
      expect(computeBackoffDelayMs(i, 5000, 300000)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("isRetryableStatus", () => {
  it("retries 5xx, 429, 408, and network errors", () => {
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(408)).toBe(true);
    expect(isRetryableStatus(null)).toBe(true);
  });

  it("does not retry 2xx/4xx client errors", () => {
    expect(isRetryableStatus(200)).toBe(false);
    expect(isRetryableStatus(201)).toBe(false);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(422)).toBe(false);
  });
});

describe("isDeliveryDue", () => {
  const now = new Date("2026-08-07T12:00:00Z");

  it("first attempts are always due", () => {
    expect(isDeliveryDue(now, 1, 5000, now)).toBe(true);
  });

  it("retry is due once the backoff window has elapsed", () => {
    const last = new Date(now.getTime() - 60_000); // 60s ago
    expect(isDeliveryDue(last, 2, 5000, now)).toBe(true);
  });

  it("retry is not due inside the backoff window", () => {
    const last = new Date(now.getTime() - 1_000); // 1s ago
    expect(isDeliveryDue(last, 2, 5000, now)).toBe(false);
  });
});

describe("deliverWebhook", () => {
  it("returns success on 2xx and captures the body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => "ok",
    });
    const result = await deliverWebhook({
      url: "https://example.com/hook",
      eventType: "invoice.paid",
      payload: { id: "1", data: {} },
      secret: "s3cret",
      deliveryId: "d-1",
      fetchImpl,
    });
    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // Verify signature header was attached
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://example.com/hook");
    expect(init.headers["X-Xenboox-Signature"]).toMatch(/^sha256=/);
  });

  it("returns failure on 5xx", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 500,
      text: async () => "boom",
    });
    const result = await deliverWebhook({
      url: "https://example.com/hook",
      eventType: "invoice.paid",
      payload: {},
      secret: "s3cret",
      deliveryId: "d-1",
      fetchImpl,
    });
    expect(result.success).toBe(false);
    expect(result.status).toBe(500);
  });

  it("never throws on network errors", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await deliverWebhook({
      url: "https://example.com/hook",
      eventType: "invoice.paid",
      payload: {},
      secret: "s3cret",
      deliveryId: "d-1",
      fetchImpl,
    });
    expect(result.success).toBe(false);
    expect(result.status).toBeNull();
    expect(result.errorMessage).toContain("ECONNREFUSED");
  });

  it("aborts after the timeout", async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchImpl = vi.fn((_url: string, init: { signal?: AbortSignal }) => {
      capturedSignal = init.signal;
      return new Promise((_, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new Error("aborted")),
        );
      });
    });
    const result = await deliverWebhook({
      url: "https://example.com/hook",
      eventType: "invoice.paid",
      payload: {},
      secret: "s3cret",
      deliveryId: "d-1",
      timeoutMs: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.success).toBe(false);
    expect(capturedSignal?.aborted).toBe(true);
    expect(DEFAULT_TIMEOUT_MS).toBeGreaterThan(0);
  });
});

describe("enqueueWebhookDeliveries", () => {
  it("enqueues one delivery log per active subscription", async () => {
    vi.mocked(db.query.webhookSubscriptions.findMany).mockResolvedValue([
      {
        id: "sub-1",
        eventType: "invoice.paid",
        targetUrl: "https://a.com",
        secret: "s1",
        status: "active",
        maxRetries: 3,
        retryIntervalMs: 5000,
      },
      {
        id: "sub-2",
        eventType: "invoice.paid",
        targetUrl: "https://b.com",
        secret: "s2",
        status: "active",
        maxRetries: 3,
        retryIntervalMs: 5000,
      },
    ] as any);

    const count = await enqueueWebhookDeliveries({
      entityId: "entity-1",
      eventType: "invoice.paid",
      data: { invoiceId: "inv-1", amount: 100 },
    });

    expect(count).toBe(2);
    const valuesCall = vi
      .mocked(db.insert)
      .mock.results.find((r) => r.type === "return");
    expect(valuesCall).toBeDefined();
  });

  it("returns 0 when no subscriptions match", async () => {
    vi.mocked(db.query.webhookSubscriptions.findMany).mockResolvedValue([]);
    const count = await enqueueWebhookDeliveries({
      entityId: "entity-1",
      eventType: "invoice.paid",
      data: {},
    });
    expect(count).toBe(0);
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("processPendingWebhookDeliveries", () => {
  it("delivers due attempts and marks success", async () => {
    const logRow = {
      id: "log-1",
      subscriptionId: "sub-1",
      eventType: "invoice.paid",
      payload: { id: "evt-1", data: { amount: 100 } },
      success: false,
      attempt: 1,
      deliveredAt: new Date("2026-08-07T11:00:00Z"),
      subscription: {
        id: "sub-1",
        targetUrl: "https://hook.example.com",
        secret: "s3cret",
        status: "active",
        maxRetries: 3,
        retryIntervalMs: 5000,
      },
    };
    vi.mocked(db.query.webhookDeliveryLogs.findMany).mockResolvedValue([
      logRow,
    ] as any);

    const fetchImpl = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => "ok",
    });

    const result = await processPendingWebhookDeliveries({
      now: new Date("2026-08-07T12:00:00Z"),
      fetchImpl,
    });

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    // success path updates the log
    expect(db.update).toHaveBeenCalled();
  });

  it("skips deliveries not yet due for retry", async () => {
    const logRow = {
      id: "log-1",
      subscriptionId: "sub-1",
      eventType: "invoice.paid",
      payload: { id: "evt-1" },
      success: false,
      attempt: 3,
      deliveredAt: new Date("2026-08-07T11:59:30Z"), // 30s ago, backoff window not elapsed
      subscription: {
        id: "sub-1",
        targetUrl: "https://hook.example.com",
        secret: "s3cret",
        status: "active",
        maxRetries: 5,
        retryIntervalMs: 60000,
      },
    };
    vi.mocked(db.query.webhookDeliveryLogs.findMany).mockResolvedValue([
      logRow,
    ] as any);

    const fetchImpl = vi.fn();
    const result = await processPendingWebhookDeliveries({
      now: new Date("2026-08-07T12:00:00Z"),
      fetchImpl,
    });

    expect(result.processed).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("tracks exhausted deliveries with no retries left", async () => {
    const logRow = {
      id: "log-1",
      subscriptionId: "sub-1",
      eventType: "invoice.paid",
      payload: { id: "evt-1" },
      success: false,
      attempt: 3,
      deliveredAt: new Date("2026-08-07T10:00:00Z"),
      subscription: {
        id: "sub-1",
        targetUrl: "https://hook.example.com",
        secret: "s3cret",
        status: "active",
        maxRetries: 3,
        retryIntervalMs: 5000,
      },
    };
    vi.mocked(db.query.webhookDeliveryLogs.findMany).mockResolvedValue([
      logRow,
    ] as any);

    const fetchImpl = vi.fn().mockResolvedValue({
      status: 500,
      text: async () => "err",
    });

    const result = await processPendingWebhookDeliveries({
      now: new Date("2026-08-07T12:00:00Z"),
      fetchImpl,
    });

    expect(result.processed).toBe(1);
    expect(result.exhausted).toBe(1);
    expect(result.succeeded).toBe(0);
  });
});
