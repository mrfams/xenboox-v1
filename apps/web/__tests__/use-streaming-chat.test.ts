import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

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

  it("collects tool_call traces and flips them to success on tool_result", async () => {
    mockFetchStream([
      {
        type: "tool_call",
        toolName: "queryLedger",
        args: { account: "1000" },
      },
      {
        type: "tool_result",
        toolName: "queryLedger",
        success: true,
      },
    ]);

    const onToolCall = vi.fn();
    const { result } = renderHook(() =>
      useStreamingChat({ entityId: "entity-1", onToolCall }),
    );
    await result.current.sendMessage("Pull the ledger");

    await waitFor(() => {
      expect(onToolCall).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(result.current.toolTraces).toEqual([
        {
          toolName: "queryLedger",
          args: { account: "1000" },
          status: "success",
        },
      ]);
    });
  });

  it("marks a tool trace failed when tool_result reports failure", async () => {
    mockFetchStream([
      { type: "tool_call", toolName: "listInvoices", args: {} },
      { type: "tool_result", toolName: "listInvoices", success: false },
    ]);

    const { result } = renderHook(() =>
      useStreamingChat({ entityId: "entity-1" }),
    );
    await result.current.sendMessage("List invoices");

    await waitFor(() => {
      expect(result.current.toolTraces).toEqual([
        { toolName: "listInvoices", args: {}, status: "failed" },
      ]);
    });
  });

  it("clears toolTraces at the start of each new message", async () => {
    mockFetchStream([
      { type: "tool_call", toolName: "queryLedger", args: {} },
      { type: "tool_result", toolName: "queryLedger", success: true },
    ]);

    const { result } = renderHook(() =>
      useStreamingChat({ entityId: "entity-1" }),
    );
    await result.current.sendMessage("First");
    await waitFor(() => {
      expect(result.current.toolTraces).toHaveLength(1);
    });

    mockFetchStream([]);
    await result.current.sendMessage("Second");
    await waitFor(() => {
      expect(result.current.toolTraces).toHaveLength(0);
    });
  });
});
