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
  insertValues: [] as unknown[],
  existingMessageCount: 0,
  // Artifacts returned by the mocked chat-artifact service.
  artifacts: [] as Array<Record<string, unknown>>,
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

// The stream route generates document artifacts when the user asks for one;
// those descriptors come back as document_created SSE events and are stored
// in the assistant message metadata for history.
vi.mock("@/lib/chat/artifact-service", () => ({
  generateChatArtifacts: vi.fn(async () => mocks.artifacts),
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
      values: vi.fn((values: unknown) => {
        mocks.insertValues.push(values);
        return { returning: vi.fn(async () => [{ id: "conv-1" }]) };
      }),
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

/**
 * Flatten a Drizzle SQL expression object into its text. The hardening makes
 * messageCount an atomic `+ 2` in SQL instead of a JS-computed value, so we
 * assert on the expression fragments rather than a number. Drizzle SQL
 * objects are composed of chunks (StringChunk.value: string[]); flattening
 * them yields the expression text without needing a real driver.
 */
type SqlChunk = { value?: string[] };

function sqlText(expr: unknown): string {
  const chunks = (expr as { queryChunks?: SqlChunk[] })?.queryChunks;
  if (!chunks) return String(expr);
  return chunks.map((c) => c.value?.join("") ?? "").join(" ");
}

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
    mocks.insertValues.length = 0;
    mocks.existingMessageCount = 0;
    mocks.artifacts = [];
  });

  it("creates a conversation and writes lastMessageAt + messageCount so it surfaces in the /chat panel", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    // Drain the stream up front: the assistant message is finalized inside
    // it, and draining before asserting keeps a failed assertion from
    // leaving a pending stream running that would pollute later tests. The
    // response streams word-by-word as token events, so assertions below use
    // the events rather than the contiguous sentence.
    const body = await res.text();

    // New conversation inserted, then user + assistant messages.
    expect(db.insert).toHaveBeenCalledTimes(3);

    // The new conversation is named with a readable generated title — not the
    // raw message fragment (the "hello " greeting is stripped) — and gets a
    // one-line summary for the /chat panel snippet.
    expect(mocks.insertValues[0]).toMatchObject({
      title: "Xenboox",
      summary: "Xenboox",
    });

    // Conversations row updated: timestamp set, count bumped by an atomic
    // SQL increment (+2) — not a JS-computed read-modify-write — so two
    // tabs streaming to the same thread can't lose an increment.
    const conversationSet = mocks.setSpies[0]?.mock.calls[0]?.[0];
    expect(conversationSet).toMatchObject({
      lastMessageAt: expect.any(Date),
      summary: "Xenboox",
    });
    expect(sqlText(conversationSet.messageCount)).toContain("coalesce");
    expect(sqlText(conversationSet.messageCount)).toContain("+ 2");

    // Pipeline invoked for the right conversation.
    expect(processChatInput).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: "entity-1",
        conversationId: "conv-1",
        message: "Hello Xenboox",
      }),
    );

    expect(body).toContain('"type":"conversation"');
    expect(body).toContain('"type":"done"');
    expect(body).toContain('"type":"token"');
    expect(body).toContain('"content":"12,500."');

    // The conversation event carries the generated name so the UI can show it
    // immediately.
    expect(body).toContain('"title":"Xenboox"');

    // Assistant message finalized as completed with the pipeline response.
    const assistantSet = mocks.setSpies[1]?.mock.calls[0]?.[0];
    expect(assistantSet).toMatchObject({
      status: "completed",
      content: "Your cash balance is GMD 12,500.",
    });
  });

  it("strips filler from the first message when naming a new conversation", async () => {
    const res = await POST(
      makeRequest({ message: "Can you explain my cash flow for last month?" }),
    );
    expect(res.status).toBe(200);

    expect(mocks.insertValues[0]).toMatchObject({
      title: "Explain my cash flow for last month",
    });

    const body = await res.text();
    expect(body).toContain('"title":"Explain my cash flow for last month"');
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

    // Drain up front (see the first test for why).
    await res.text();

    // No new conversation row — only user + assistant messages.
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(processChatInput).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: "conv-1" }),
    );

    const conversationSet = mocks.setSpies[0]?.mock.calls[0]?.[0];
    expect(conversationSet).toMatchObject({
      lastMessageAt: expect.any(Date),
      // The panel snippet refreshes from the latest user message on follow-ups.
      summary: "What about next month",
    });
    // The increment is the same unconditional atomic `+ 2` regardless of the
    // existing count — it no longer depends on a client-side read (previously
    // this computed `4 + 2` in JS, which is exactly the race being hardened).
    expect(sqlText(conversationSet.messageCount)).toContain("+ 2");
    expect(sqlText(conversationSet.messageCount)).not.toContain("4");
  });

  it("emits document_created events and persists artifact refs when a document is generated", async () => {
    mocks.artifacts = [
      {
        artifactId: "art-1",
        name: "Profit & Loss - 2026-07.csv",
        docType: "Export",
        mimeType: "text/csv",
        sizeBytes: 512,
      },
    ];

    const res = await POST(makeRequest({ message: "Export my P&L to CSV" }));
    expect(res.status).toBe(200);

    const body = await res.text();
    expect(body).toContain('"type":"document_created"');
    expect(body).toContain('"artifactId":"art-1"');
    expect(body).toContain('"name":"Profit & Loss - 2026-07.csv"');

    // The refs are persisted on the assistant message so history re-renders
    // the document card without another generation run.
    const assistantSet = mocks.setSpies[1]?.mock.calls[0]?.[0];
    expect(assistantSet?.metadata).toMatchObject({
      artifacts: mocks.artifacts,
    });
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
