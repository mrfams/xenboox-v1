import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useStreamingChat } from "@/lib/hooks/use-streaming-chat";

// ─── Mock fetch with a minimal SSE stream ──────────────────────────────────
//
// The hook reads the response body via a reader loop. We fake a reader that
// returns the encoded SSE payload once, then signals done — enough to drive
// the full send path without a real network stack.

function mockFetchStream(events: unknown[]) {
  const encoder = new TextEncoder();
  const payload =
    events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") +
    `data: ${JSON.stringify({ type: "done", messageId: "m-1", confidence: 0.9, agentsInvolved: ["cfo"] })}\n\n`;

  const reader = {
    read: vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: encoder.encode(payload) })
      .mockResolvedValueOnce({ done: true, value: undefined }),
  };

  const fetchMock = vi.fn<
    (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  >(
    async () =>
      ({
        ok: true,
        body: { getReader: () => reader },
      }) as unknown as Response,
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("useStreamingChat", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards an optional pageContext payload in the POST body", async () => {
    const fetchMock = mockFetchStream([
      { type: "conversation", conversationId: "c-1" },
    ]);

    const { result } = renderHook(() =>
      useStreamingChat({ entityId: "entity-1" }),
    );
    await result.current.sendMessage(
      "How many transactions are uncategorized?",
      undefined,
      undefined,
      { page: "Transactions", module: "transactions", view: "Uncategorized" },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.pageContext).toEqual({
      page: "Transactions",
      module: "transactions",
      view: "Uncategorized",
    });
  });

  it("omits pageContext when none is supplied", async () => {
    const fetchMock = mockFetchStream([]);

    const { result } = renderHook(() =>
      useStreamingChat({ entityId: "entity-1" }),
    );
    await result.current.sendMessage("Hello");

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.pageContext).toBeUndefined();
  });

  it("keeps message + conversationId intact when pageContext is passed", async () => {
    const fetchMock = mockFetchStream([]);

    const { result } = renderHook(() =>
      useStreamingChat({ entityId: "entity-1" }),
    );
    await result.current.sendMessage("Flag duplicates", "conv-1", undefined, {
      page: "Transactions",
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.message).toBe("Flag duplicates");
    expect(body.conversationId).toBe("conv-1");
    expect(body.entityId).toBe("entity-1");
  });
});
