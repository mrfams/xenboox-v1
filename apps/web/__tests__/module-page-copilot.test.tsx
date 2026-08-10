import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ModulePageCopilot } from "@/components/module/module-page-copilot";

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
}));

// The copilot streams through the shared useStreamingChat hook — the hook is
// exercised by its own unit tests, so here we stub it and assert the copilot
// wires entityId + pageContext correctly into sendMessage.
vi.mock("@/lib/hooks/use-streaming-chat", () => ({
  useStreamingChat: vi.fn(() => ({
    sendMessage: mocks.sendMessage,
    cancelStream: vi.fn(),
    isStreaming: false,
    streamedContent: "",
    agentActivities: [],
    delegations: [],
    documents: [],
    approvals: [],
  })),
}));

vi.mock("@/lib/entity-context", () => ({
  useEntity: () => ({ entityId: "entity-1", isLoaded: true }),
}));

function renderCopilot(
  props: Partial<React.ComponentProps<typeof ModulePageCopilot>> = {},
) {
  return render(
    <ModulePageCopilot
      title="Transactions"
      pageContext={{
        page: "Transactions",
        module: "transactions",
        view: "Uncategorized",
      }}
      {...props}
    />,
  );
}

describe("ModulePageCopilot", () => {
  beforeEach(() => {
    mocks.sendMessage.mockReset();
  });

  it("renders a compact trigger button labelled with the page", () => {
    renderCopilot();
    expect(
      screen.getByRole("button", { name: /ask xenboox/i }),
    ).toBeInTheDocument();
  });

  it("opens a panel with page context badge and page-aware suggestions", () => {
    renderCopilot();
    fireEvent.click(screen.getByRole("button", { name: /ask xenboox/i }));

    // The panel shows which page the AI is seeing (header + context chip).
    expect(screen.getAllByText(/Transactions/i).length).toBeGreaterThan(0);
    // A context chip explains the current view so the user trusts the answer.
    expect(screen.getByText(/Viewing:/i)).toBeInTheDocument();
    // Page-aware quick prompts render when the thread is empty.
    expect(screen.getByText(/Uncategorized view/i)).toBeInTheDocument();
  });

  it("sends the user message with the pageContext payload", () => {
    renderCopilot();
    fireEvent.click(screen.getByRole("button", { name: /ask xenboox/i }));

    const input = screen.getByPlaceholderText(/ask about/i);
    fireEvent.change(input, {
      target: { value: "How many are uncategorized?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(mocks.sendMessage).toHaveBeenCalledWith(
      "How many are uncategorized?",
      undefined,
      undefined,
      expect.objectContaining({
        page: "Transactions",
        module: "transactions",
        view: "Uncategorized",
      }),
    );
  });

  it("fills the input when a suggestion chip is clicked", () => {
    renderCopilot();
    fireEvent.click(screen.getByRole("button", { name: /ask xenboox/i }));

    const suggestion = screen.getByRole("button", { name: /categorize/i });
    fireEvent.click(suggestion);

    const input = screen.getByPlaceholderText(
      /ask about/i,
    ) as HTMLTextAreaElement;
    expect(input.value.length).toBeGreaterThan(0);
  });

  it("closes the panel when the close button is clicked", () => {
    renderCopilot();
    fireEvent.click(screen.getByRole("button", { name: /ask xenboox/i }));
    expect(screen.getByPlaceholderText(/ask about/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByPlaceholderText(/ask about/i)).not.toBeInTheDocument();
  });
});
