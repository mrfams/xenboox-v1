import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AskDrawer } from "@/components/chat/ask-drawer";

// ─── Mock fetch with a minimal SSE stream ──────────────────────────────────

function mockFetchStream(events: unknown[]) {
  const encoder = new TextEncoder();
  const payload =
    events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") +
    `data: ${JSON.stringify({ type: "done", messageId: "m-1" })}\n\n`;

  const reader = {
    read: vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: encoder.encode(payload) })
      .mockResolvedValueOnce({ done: true, value: undefined }),
  };

  const fetchMock = vi.fn(
    async () =>
      ({
        ok: true,
        body: { getReader: () => reader },
      }) as unknown as Response,
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const FOCUS = {
  kind: "Account",
  name: "Cash",
  id: "acc-1",
  fields: [{ label: "Code", value: "1000" }],
};

function renderDrawer(onClose = vi.fn()) {
  render(
    <AskDrawer
      entityId="entity-1"
      title="Ask about the books"
      subject="Cash"
      initialPrompt="Explain this account."
      pageContext={{ page: "Ledger", view: "coa", focus: FOCUS }}
      onClose={onClose}
    />,
  );
  return { onClose };
}

describe("AskDrawer — inline ask thread", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the initial prompt with page + focus context on open", async () => {
    const fetchMock = mockFetchStream([
      { type: "thinking", text: "Looking into it…" },
      { type: "token", content: "Cash holds " },
      { type: "token", content: "GMD 12,500." },
    ]);
    renderDrawer();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.message).toBe("Explain this account.");
    expect(body.pageContext).toMatchObject({
      page: "Ledger",
      view: "coa",
      focus: FOCUS,
    });
  });

  it("renders title, subject, Thought, and the streamed answer", async () => {
    mockFetchStream([
      { type: "thinking", text: "Looking into it…" },
      { type: "token", content: "Cash holds GMD 12,500." },
    ]);
    renderDrawer();

    expect(screen.getByText("Ask about the books")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText(/Cash holds GMD 12,500\./)).toBeInTheDocument(),
    );
    // Thought collapses once the answer lands.
    expect(screen.getByText("Thought")).toBeInTheDocument();
  });

  it("sends follow-ups into the same conversation", async () => {
    const fetchMock = mockFetchStream([
      { type: "conversation", conversationId: "conv-9" },
      { type: "token", content: "First answer." },
    ]);
    renderDrawer();

    await waitFor(() =>
      expect(screen.getByText(/First answer\./)).toBeInTheDocument(),
    );

    // Second stream for the follow-up.
    mockFetchStream([{ type: "token", content: "Second answer." }]);
    fireEvent.change(screen.getByLabelText("Ask a follow-up"), {
      target: { value: "And last month?" },
    });
    fireEvent.click(screen.getByLabelText("Send"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, init] = fetchMock.mock.calls[1]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.message).toBe("And last month?");
    expect(body.conversationId).toBe("conv-9");
  });

  it("close button calls onClose", async () => {
    mockFetchStream([]);
    const { onClose } = renderDrawer();

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("never renders agent identity or confidence", async () => {
    mockFetchStream([{ type: "token", content: "Done." }]);
    const { container } = renderDrawer();

    await waitFor(() => expect(screen.getByText(/Done\./)).toBeInTheDocument());
    expect(container.textContent).not.toMatch(/CFO Agent/);
    expect(container.textContent).not.toMatch(/confidence/i);
  });
});
