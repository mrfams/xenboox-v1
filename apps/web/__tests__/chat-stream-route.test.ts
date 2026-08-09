import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { processChatInput } from "@xenboox/agents";

import { db } from "@/lib/db";
import { POST } from "@/app/api/chat/stream/route";

// ─── Mocks ────────────────────────────────────────────────────────────────
//
// The stream route persists conversations for later use in /dashboard/chat.
// These tests lock in that behavior: conversation metadata (lastMessageAt,
// messageCount) must be written even though the route streams its response.

const mocks = vi.hoisted(() => ({
  setSpies: [] as Array<ReturnType<typeof vi.fn>>,
  existingMessageCount: 0,
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "user-1", name: "Test User" } })),
}));

vi.mock("@/lib/security/rate-limiter", () => ({
  getRateLimiter: () => ({
    checkChatStreamRateLimit: vi.fn(async () => ({ success: true })),
  }),
}));

vi.mock("@xenboox/agents", () => ({
  processChatInput: vi.fn(async () => ({
    response: "Your cash balance is GMD 12,500.",
    confidence: 0.95,
    durationMs: 120,
    agentId: "cfo",
    decision: "answered",
    escalationItems: [],
    errors: [],
  })),
}));

vi.mock("@/lib/db", () => {
  const dbMock = {
    query: {
      entities: {
        findFirst: vi.fn(async () => ({
          id: "entity-1",
          name: "Demo Co",
          currency: "GMD",
          organizationId: "org-1",
        })),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [{ id: "conv-1" }]),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            { messageCount: mocks.existingMessageCount },
          ]),
        })),
      })),
    })),
    update: vi.fn(() => {
      const set = vi.fn(() => ({ where: vi.fn(async () => []) }));
      mocks.setSpies.push(set);
      return { set };
    }),
  };
  return { db: dbMock };
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeRequest(
  overrides: {
    message?: string;
    conversationId?: string;
    signal?: AbortSignal;
  } = {},
) {
  return new NextRequest("http://localhost/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: overrides.message ?? "Hello Xenboox",
      entityId: "entity-1",
      ...(overrides.conversationId
        ? { conversationId: overrides.conversationId }
        : {}),
    }),
    signal: overrides.signal,
  });
}

describe("POST /api/chat/stream — conversation persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setSpies.length = 0;
    mocks.existingMessageCount = 0;
  });

  it("creates a conversation and writes lastMessageAt + messageCount so it surfaces in the /chat panel", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    // New conversation inserted, then user + assistant messages.
    expect(db.insert).toHaveBeenCalledTimes(3);

    // Conversations row updated: timestamp set, count = 0 + 2.
    const conversationSet = mocks.setSpies[0]?.mock.calls[0]?.[0];
    expect(conversationSet).toMatchObject({
      lastMessageAt: expect.any(Date),
      messageCount: 2,
    });

    // Pipeline invoked for the right conversation.
    expect(processChatInput).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: "entity-1",
        conversationId: "conv-1",
        message: "Hello Xenboox",
      }),
    );

    // Drain the stream — the assistant message is finalized inside it. The
    // response streams word-by-word as token events, so assert on the events
    // rather than the contiguous sentence.
    const body = await res.text();
    expect(body).toContain('"type":"conversation"');
    expect(body).toContain('"type":"done"');
    expect(body).toContain('"type":"token"');
    expect(body).toContain('"content":"12,500."');

    // Assistant message finalized as completed with the pipeline response.
    const assistantSet = mocks.setSpies[1]?.mock.calls[0]?.[0];
    expect(assistantSet).toMatchObject({
      status: "completed",
      content: "Your cash balance is GMD 12,500.",
    });
  });

  it("follow-ups reuse the existing conversation and increment its message count", async () => {
    // Simulate a conversation that already has 4 messages.
    mocks.existingMessageCount = 4;

    const res = await POST(
      makeRequest({
        conversationId: "conv-1",
        message: "What about next month?",
      }),
    );
    expect(res.status).toBe(200);

    // No new conversation row — only user + assistant messages.
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(processChatInput).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: "conv-1" }),
    );

    const conversationSet = mocks.setSpies[0]?.mock.calls[0]?.[0];
    expect(conversationSet).toMatchObject({
      messageCount: 6, // 4 existing + 2 new
      lastMessageAt: expect.any(Date),
    });

    await res.text(); // drain the stream
  });

  it("saves a completed response even when the client disconnects before the stream starts", async () => {
    const controller = new AbortController();
    const req = makeRequest({ signal: controller.signal });
    controller.abort();

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Drain the stream — the pipeline still runs and the response is saved,
    // so the conversation is fully usable later in /dashboard/chat.
    await res.text();

    const assistantSet = mocks.setSpies[1]?.mock.calls[0]?.[0];
    expect(assistantSet).toMatchObject({
      status: "completed",
      content: "Your cash balance is GMD 12,500.",
    });
  });
});
