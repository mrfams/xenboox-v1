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

  it("collects thinking events in order and forwards them to onThinking", async () => {
    mockFetchStream([
      {
        type: "thinking",
        agent: "CFO Agent",
        step: "input_intake",
        text: "Reading your request and loading the entity context…",
      },
      {
        type: "thinking",
        agent: "CFO Agent",
        step: "intent_resolution",
        text: 'Classified as "query" at 90% confidence — routing to CFO Agent.',
        durationMs: 12,
      },
    ]);

    const onThinking = vi.fn();
    const { result } = renderHook(() =>
      useStreamingChat({ entityId: "entity-1", onThinking }),
    );
    await result.current.sendMessage("What is my cash balance?");

    await waitFor(() => {
      expect(result.current.thinkingEvents).toHaveLength(2);
    });
    expect(result.current.thinkingEvents.map((e) => e.text)).toEqual([
      "Reading your request and loading the entity context…",
      'Classified as "query" at 90% confidence — routing to CFO Agent.',
    ]);
    expect(onThinking).toHaveBeenCalledTimes(2);
    expect(onThinking).toHaveBeenLastCalledWith(
      expect.objectContaining({ step: "intent_resolution" }),
    );
  });

  it("clears thinkingEvents at the start of each new message", async () => {
    mockFetchStream([
      { type: "thinking", agent: "CFO Agent", text: "First reasoning line." },
    ]);

    const { result } = renderHook(() =>
      useStreamingChat({ entityId: "entity-1" }),
    );
    await result.current.sendMessage("First");
    await waitFor(() => {
      expect(result.current.thinkingEvents).toHaveLength(1);
    });

    mockFetchStream([]);
    await result.current.sendMessage("Second");
    await waitFor(() => {
      expect(result.current.thinkingEvents).toHaveLength(0);
    });
  });

  it("preserves an SSE event split across network chunks", async () => {
    const encoder = new TextEncoder();
    const firstChunk = encoder.encode('data: {"type":"token","content":"hello');
    const secondChunk = encoder.encode(
      ' world"}\\n\\ndata: {"type":"done","messageId":"m-split","confidence":0.9,"agentsInvolved":[]}\\n\\n',
    );
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: firstChunk })
        .mockResolvedValueOnce({ done: false, value: secondChunk })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: true,
            body: { getReader: () => reader },
          }) as unknown as Response,
      ),
    );

    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useStreamingChat({ entityId: "entity-1", onComplete }),
    );
    await result.current.sendMessage("Split this");

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        "hello world",
        expect.objectContaining({ messageId: "m-split" }),
      );
    });
    expect(result.current.streamedContent).toBe("hello world");
  });
});
