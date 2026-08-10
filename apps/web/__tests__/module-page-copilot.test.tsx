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

  it("opens targeted at a row when a focus request arrives", () => {
    renderCopilot({
      focusRequest: {
        nonce: 1,
        focus: {
          kind: "Employee",
          name: "Dylan Cooper",
          id: "emp-123",
          fields: [{ label: "Tax rate", value: "5%" }],
        },
      },
    });

    // The panel opens itself with a chip naming the focused record.
    expect(screen.getByText(/Employee · Dylan Cooper/i)).toBeInTheDocument();
    // The composer is scoped to the record, not the whole page.
    expect(
      screen.getByPlaceholderText(/ask about this employee/i),
    ).toBeInTheDocument();
  });

  it("sends the focused record inside the pageContext payload", () => {
    renderCopilot({
      focusRequest: {
        nonce: 1,
        focus: {
          kind: "Employee",
          name: "Dylan Cooper",
          id: "emp-123",
          fields: [{ label: "Tax rate", value: "5%" }],
        },
      },
    });

    const input = screen.getByPlaceholderText(/ask about this employee/i);
    fireEvent.change(input, { target: { value: "Why is the tax 5%?" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(mocks.sendMessage).toHaveBeenCalledWith(
      "Why is the tax 5%?",
      undefined,
      undefined,
      expect.objectContaining({
        page: "Transactions",
        focus: {
          kind: "Employee",
          name: "Dylan Cooper",
          id: "emp-123",
          fields: [{ label: "Tax rate", value: "5%" }],
        },
      }),
    );
  });

  it("clears the focused record back to page-level context", () => {
    renderCopilot({
      focusRequest: {
        nonce: 1,
        focus: { kind: "Employee", name: "Dylan Cooper", id: "emp-123" },
      },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /clear focused record/i }),
    );
    expect(
      screen.queryByText(/Employee · Dylan Cooper/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/ask about this page/i),
    ).toBeInTheDocument();
  });
});
