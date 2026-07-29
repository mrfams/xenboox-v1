import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgentAttribution } from "@xenboox/ui";

describe("AgentAttribution", () => {
  // ── Happy Path ──────────────────────────────────────────────────────

  it("renders agent name and timestamp in default variant", () => {
    render(<AgentAttribution agentName="Ledger Agent" timestamp="2h ago" />);
    expect(screen.getByText("Ledger Agent")).toBeInTheDocument();
    expect(screen.getByText("2h ago")).toBeInTheDocument();
  });

  it("renders with confidence indicator when confidence is provided", () => {
    render(
      <AgentAttribution
        agentName="AP Agent"
        timestamp="1h ago"
        confidence={0.96}
      />,
    );
    expect(screen.getByText("96%")).toBeInTheDocument();
  });

  it("renders without confidence indicator when confidence is omitted", () => {
    render(<AgentAttribution agentName="AP Agent" timestamp="1h ago" />);
    expect(screen.queryByText("96%")).not.toBeInTheDocument();
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
  });

  // ── Variants ────────────────────────────────────────────────────────

  it("renders compact variant without timestamp text", () => {
    render(
      <AgentAttribution
        agentName="Recon Agent"
        timestamp="30m ago"
        variant="compact"
      />,
    );
    expect(screen.getByText("Recon Agent")).toBeInTheDocument();
    // Compact variant has title attribute instead of visible timestamp
    const container = screen.getByTitle("Recon Agent · 30m ago");
    expect(container).toBeInTheDocument();
  });

  it("renders full variant with larger text class", () => {
    const { container } = render(
      <AgentAttribution
        agentName="Ledger Agent"
        timestamp="2h ago"
        variant="full"
      />,
    );
    const tag = container.querySelector(".agent-tag");
    expect(tag).toHaveClass("text-xs");
  });

  // ── Confidence dot in compact ───────────────────────────────────────

  it("shows high confidence dot in compact variant when confidence >= 0.9", () => {
    const { container } = render(
      <AgentAttribution
        agentName="Ledger Agent"
        timestamp="2h ago"
        confidence={0.96}
        variant="compact"
      />,
    );
    expect(container.querySelector(".agent-tag__dot")).toBeInTheDocument();
  });

  it("shows low confidence dot in compact variant when confidence < 0.7", () => {
    const { container } = render(
      <AgentAttribution
        agentName="OCR Agent"
        timestamp="5m ago"
        confidence={0.54}
        variant="compact"
      />,
    );
    expect(
      container.querySelector(".agent-tag__dot--critical"),
    ).toBeInTheDocument();
  });

  // ── Show/Hide Icon ──────────────────────────────────────────────────

  it("shows the agent icon by default", () => {
    const { container } = render(
      <AgentAttribution agentName="Ledger Agent" timestamp="2h ago" />,
    );
    // Brain icon should be present
    const brainIcon = container.querySelector("svg");
    expect(brainIcon).toBeInTheDocument();
  });

  it("hides the agent icon when showIcon=false", () => {
    const { container } = render(
      <AgentAttribution
        agentName="Ledger Agent"
        timestamp="2h ago"
        showIcon={false}
      />,
    );
    const brainIcon = container.querySelector("svg.lucide-brain");
    expect(brainIcon).not.toBeInTheDocument();
  });

  // ── Custom className ────────────────────────────────────────────────

  it("accepts and merges custom className", () => {
    const { container } = render(
      <AgentAttribution
        agentName="Ledger Agent"
        timestamp="2h ago"
        className="my-tag"
      />,
    );
    expect(container.querySelector(".agent-tag")).toHaveClass("my-tag");
  });
});
