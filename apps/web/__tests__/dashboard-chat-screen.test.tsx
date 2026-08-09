import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { DashboardChatScreen } from "@/components/dashboard/dashboard-chat-screen";
import type { DashboardChatMessage } from "@/lib/hooks/use-dashboard-chat";

function makeMessage(
  overrides: Partial<DashboardChatMessage> = {},
): DashboardChatMessage {
  return {
    id: "m1",
    role: "user",
    content: "Hello",
    status: "completed",
    activities: [],
    delegations: [],
    documents: [],
    approvals: [],
    createdAt: Date.now(),
    ...overrides,
  };
}

function renderScreen(
  props: Partial<React.ComponentProps<typeof DashboardChatScreen>> = {},
) {
  return render(
    <DashboardChatScreen
      messages={[]}
      streamedContent=""
      isStreaming={false}
      agentActivities={[]}
      delegations={[]}
      documents={[]}
      approvals={[]}
      conversationId={null}
      onExit={() => {}}
      onNewChat={() => {}}
      {...props}
    />,
  );
}

describe("DashboardChatScreen", () => {
  it("renders user and assistant messages", () => {
    renderScreen({
      conversationId: "c1",
      messages: [
        makeMessage({ id: "u1", role: "user", content: "What is my cash?" }),
        makeMessage({
          id: "a1",
          role: "assistant",
          content: "Your cash balance is GMD 12,500.",
        }),
      ],
    });

    expect(screen.getByText("What is my cash?")).toBeInTheDocument();
    expect(
      screen.getByText(/Your cash balance is GMD 12,500/),
    ).toBeInTheDocument();
  });

  it("shows the conversation title from the first user message", () => {
    renderScreen({
      messages: [
        makeMessage({
          id: "u1",
          role: "user",
          content: "Reconcile my bank account for June",
        }),
      ],
    });

    expect(
      screen.getByText(/“Reconcile my bank account for June”/),
    ).toBeInTheDocument();
  });

  it("calls onExit when the exit button is clicked", () => {
    const onExit = vi.fn();
    renderScreen({ onExit });

    fireEvent.click(screen.getByRole("button", { name: /Back to dashboard/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("calls onNewChat from the New chat button", () => {
    const onNewChat = vi.fn();
    renderScreen({ onNewChat });

    fireEvent.click(screen.getByRole("button", { name: /New chat/i }));
    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  it("shows the typing indicator while streaming with no content yet", () => {
    renderScreen({ isStreaming: true });

    expect(screen.getByText(/typing/i)).toBeInTheDocument();
  });

  it("shows an empty state after starting a new conversation", () => {
    renderScreen();

    expect(screen.getByText("New conversation")).toBeInTheDocument();
    expect(
      screen.getByText(/Ask anything about your books/),
    ).toBeInTheDocument();
  });

  it("renders an error bubble for failed assistant messages", () => {
    renderScreen({
      messages: [
        makeMessage({
          id: "e1",
          role: "assistant",
          status: "error",
          content: "Sorry, I ran into a problem: boom.",
        }),
      ],
    });

    expect(
      screen.getByText(/Sorry, I ran into a problem: boom/),
    ).toBeInTheDocument();
  });
});
