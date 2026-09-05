import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ThinkingReveal } from "@/components/workspace/thinking-reveal";
import type { ThinkingEvent } from "@/lib/hooks/use-streaming-chat";

const EVENTS: ThinkingEvent[] = [
  { type: "thinking", text: "Picking up where we left off…" },
  { type: "thinking", text: "Working through it now…" },
];

describe("ThinkingReveal — Thought block for workspace chat", () => {
  it("shows a thinking shimmer while streaming with no reasoning lines yet", () => {
    render(<ThinkingReveal events={[]} isStreaming hasContent={false} />);

    expect(screen.getAllByText("Thinking…").length).toBeGreaterThan(0);
    expect(screen.getByText("working…")).toBeInTheDocument();
  });

  it("shows reasoning lines while streaming", () => {
    render(<ThinkingReveal events={EVENTS} isStreaming hasContent={false} />);

    expect(screen.getByText("Thinking…")).toBeInTheDocument();
    expect(screen.getByText(EVENTS[0].text)).toBeInTheDocument();
    expect(screen.getByText(EVENTS[1].text)).toBeInTheDocument();
  });

  it("collapses by default once the answer starts streaming", () => {
    render(<ThinkingReveal events={EVENTS} isStreaming hasContent />);

    // Header flips to the settled state and lines start hidden.
    expect(screen.getByText("Thought")).toBeInTheDocument();
    expect(screen.queryByText(EVENTS[0].text)).not.toBeInTheDocument();

    // Expanding reveals the human-readable lines.
    fireEvent.click(screen.getByText("Thought"));
    expect(screen.getByText(EVENTS[0].text)).toBeInTheDocument();
    expect(screen.getByText(EVENTS[1].text)).toBeInTheDocument();
  });

  it("never renders agent names, step labels, or timings", () => {
    const noisy: ThinkingEvent[] = [
      {
        type: "thinking",
        agent: "CFO Agent",
        step: "intent_resolution",
        label: "Intent & Context Resolution",
        text: "Got it — looking into your question…",
        durationMs: 166,
      },
    ];
    const { container } = render(
      <ThinkingReveal events={noisy} isStreaming={false} hasContent />,
    );
    fireEvent.click(screen.getByText("Thought"));

    expect(screen.getByText("Got it — looking into your question…")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/CFO Agent/);
    expect(container.textContent).not.toMatch(/Intent & Context/);
    expect(container.textContent).not.toMatch(/166/);
    expect(container.textContent).not.toMatch(/Agents/);
  });

  it("renders nothing when idle with no events", () => {
    const { container } = render(
      <ThinkingReveal events={[]} isStreaming={false} hasContent={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
