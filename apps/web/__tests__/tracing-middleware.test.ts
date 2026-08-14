// ─── §24.2 tRPC tracing middleware — span lifecycle ────────────────────────
//
// Every procedure call must produce one span with the procedure path, type,
// user id, and entity id; it must be marked OK on success, ERROR with a
// recorded exception on failure, and ALWAYS ended (finally).

import { describe, it, expect, vi, beforeEach } from "vitest";

const spanMock = vi.hoisted(() => ({
  setStatus: vi.fn(),
  recordException: vi.fn(),
  end: vi.fn(),
  spanContext: vi.fn(() => ({ traceId: "t", spanId: "s", traceFlags: 1 })),
}));

const tracerMock = vi.hoisted(() => ({
  startSpan: vi.fn(() => spanMock),
}));

vi.mock("@opentelemetry/api", () => ({
  trace: { getTracer: vi.fn(() => tracerMock) },
  SpanStatusCode: { UNSET: 0, OK: 1, ERROR: 2 },
}));

import { tracingMiddleware } from "@/lib/trpc/tracing-middleware";

const ctx = {
  session: { user: { id: "user-1" } },
  entityId: "entity-1",
};

const nextOk = vi.fn(async () => ({
  ok: true,
  data: { fine: true },
}));

const nextThrows = vi.fn(async () => {
  throw new Error("boom");
});

/** Full middleware opts shape; typed via `never` because AnyMiddlewareFunction
 *  describes the runtime envelope (input/getRawInput/meta/signal/batchIndex)
 *  that tRPC injects — the test only exercises the fields the middleware reads. */
const opts = (o: Record<string, unknown>) =>
  ({
    input: undefined,
    getRawInput: async () => undefined,
    meta: undefined,
    signal: undefined,
    batchIndex: 0,
    ...o,
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tracingMiddleware", () => {
  it("starts a span with procedure/type/user/entity attributes and marks it OK", async () => {
    const result = await tracingMiddleware(
      opts({ next: nextOk, path: "expenses.create", type: "mutation", ctx }),
    );

    expect(tracerMock.startSpan).toHaveBeenCalledWith("trpc.expenses.create", {
      attributes: {
        "trpc.procedure": "expenses.create",
        "trpc.type": "mutation",
        "user.id": "user-1",
        "entity.id": "entity-1",
      },
    });
    expect(spanMock.setStatus).toHaveBeenCalledWith({ code: 1 }); // OK
    expect(spanMock.end).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, data: { fine: true } });
  });

  it("marks ERROR and records the exception when next throws, then rethrows", async () => {
    await expect(
      tracingMiddleware(
        opts({
          next: nextThrows,
          path: "journal.postEntry",
          type: "mutation",
          ctx,
        }),
      ),
    ).rejects.toThrow("boom");

    expect(spanMock.setStatus).toHaveBeenCalledWith({
      code: 2, // ERROR
      message: "boom",
    });
    expect(spanMock.recordException).toHaveBeenCalledWith(expect.any(Error));
    expect(spanMock.end).toHaveBeenCalledTimes(1);
  });

  it("always ends the span even when the error path is hit", async () => {
    await expect(
      tracingMiddleware(
        opts({ next: nextThrows, path: "x.y", type: "query", ctx }),
      ),
    ).rejects.toThrow();
    expect(spanMock.end).toHaveBeenCalledTimes(1);
  });

  it("falls back to anonymous/unknown when session or entity are missing", async () => {
    await tracingMiddleware(
      opts({ next: nextOk, path: "p.q", type: "query", ctx: {} }),
    );

    expect(tracerMock.startSpan).toHaveBeenCalledWith("trpc.p.q", {
      attributes: {
        "trpc.procedure": "p.q",
        "trpc.type": "query",
        "user.id": "anonymous",
        "entity.id": "unknown",
      },
    });
  });
});
