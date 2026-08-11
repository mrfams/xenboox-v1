import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { ThinkingReveal } from "@/components/workspace/thinking-reveal";
import type { ThinkingEvent } from "@/lib/hooks/use-streaming-chat";

const EVENTS: ThinkingEvent[] = [
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
];

describe("ThinkingReveal — simulation-style thinking reveal for live chat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a thinking shimmer while streaming with no reasoning lines yet", () => {
    render(<ThinkingReveal events={[]} isStreaming hasContent={false} />);

    // The header and the shimmer row both say "Thinking…" while waiting.
    expect(screen.getAllByText("Thinking…").length).toBeGreaterThan(0);
    expect(screen.getByText("working…")).toBeInTheDocument();
  });

  it("types out the active reasoning line and settles it", () => {
    render(<ThinkingReveal events={EVENTS} isStreaming hasContent={false} />);

    // Header stays in the thinking state while the answer hasn't started.
    expect(screen.getByText("Thinking…")).toBeInTheDocument();

    // Type out the first line completely (fake timers).
    act(() => {
      vi.advanceTimersByTime(EVENTS[0].text.length * 14);
    });

    expect(screen.getByText(EVENTS[0].text)).toBeInTheDocument();
  });

  it("types lines sequentially as new reasoning events arrive", () => {
    const { rerender } = render(
      <ThinkingReveal events={[EVENTS[0]]} isStreaming hasContent={false} />,
    );

    // A second line arrives while the first is still typing.
    rerender(<ThinkingReveal events={EVENTS} isStreaming hasContent={false} />);

    // Type out both lines fully.
    act(() => {
      vi.advanceTimersByTime(
        EVENTS[0].text.length * 14 + EVENTS[1].text.length * 14,
      );
    });

    expect(screen.getByText(EVENTS[0].text)).toBeInTheDocument();
    expect(screen.getByText(EVENTS[1].text)).toBeInTheDocument();
  });

  it("settles every reasoning line the moment the answer starts streaming", () => {
    const { rerender } = render(
      <ThinkingReveal events={EVENTS} isStreaming hasContent={false} />,
    );

    rerender(<ThinkingReveal events={EVENTS} isStreaming hasContent />);

    // Header flips to the settled state and both lines are fully visible.
    expect(screen.getByText("Thought process")).toBeInTheDocument();
    expect(screen.getByText(EVENTS[0].text)).toBeInTheDocument();
    expect(screen.getByText(EVENTS[1].text)).toBeInTheDocument();

    // Step count chip reflects the number of revealed reasoning lines.
    expect(screen.getByText("2 steps")).toBeInTheDocument();
  });

  it("collapses and expands the reasoning feed", () => {
    render(<ThinkingReveal events={EVENTS} isStreaming={false} hasContent />);

    expect(screen.getByText(EVENTS[0].text)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Thought process"));
    expect(screen.queryByText(EVENTS[0].text)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Thought process"));
    expect(screen.getByText(EVENTS[0].text)).toBeInTheDocument();
  });

  it("renders nothing but the header when idle with no events", () => {
    render(
      <ThinkingReveal events={[]} isStreaming={false} hasContent={false} />,
    );

    expect(screen.queryByText("Thinking…")).not.toBeInTheDocument();
    expect(screen.queryByText("Thought process")).not.toBeInTheDocument();
  });
});
