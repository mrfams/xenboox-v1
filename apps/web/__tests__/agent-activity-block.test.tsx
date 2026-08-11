import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { AgentActivityBlock } from "@/components/workspace/agent-activity-block";

describe("AgentActivityBlock", () => {
  it("renders nothing when idle with no activity", () => {
    const { container } = render(<AgentActivityBlock activities={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the thinking phase for a started activity while streaming", () => {
    render(
      <AgentActivityBlock
        isStreaming
        activities={[
          {
            agent: "CFO Agent",
            status: "started",
            action: "Creating June month-end close report",
          },
        ]}
      />,
    );

    expect(screen.getByText("Thinking…")).toBeTruthy();
    expect(screen.getByText("Thinking")).toBeTruthy();
    expect(
      screen.getByText("Creating June month-end close report"),
    ).toBeTruthy();
  });

  it("shows settled phase with confidence when activities complete", () => {
    render(
      <AgentActivityBlock
        activities={[
          {
            agent: "Ledger Agent",
            status: "completed",
            action: "Posted 12 journal entries",
            confidence: 94,
            durationMs: 1200,
          },
        ]}
      />,
    );

    expect(screen.getByText("Agent Activity")).toBeTruthy();
    expect(screen.getByText("Done")).toBeTruthy();
    expect(screen.getByText("94% confidence")).toBeTruthy();
    expect(screen.getByText("1.2s")).toBeTruthy();
  });

  it("flags failed activities in the settled phase", () => {
    render(
      <AgentActivityBlock
        activities={[
          {
            agent: "Reconciliation Agent",
            status: "failed",
            action: "Matching bank statement",
          },
        ]}
      />,
    );

    expect(screen.getByText("Failed")).toBeTruthy();
  });

  it("renders tool traces with running and settled states", () => {
    render(
      <AgentActivityBlock
        activities={[]}
        isStreaming
        toolCalls={[
          {
            toolName: "queryLedger",
            args: { account: "1000" },
            status: "running",
          },
          {
            toolName: "listInvoices",
            args: {},
            status: "success",
          },
        ]}
      />,
    );

    expect(screen.getByText("queryLedger")).toBeTruthy();
    expect(screen.getByText(/account: 1000/)).toBeTruthy();
    expect(screen.getByText("listInvoices")).toBeTruthy();
    expect(screen.getByText("running")).toBeTruthy();
    expect(screen.getByText("ok")).toBeTruthy();
  });

  it("renders delegation rows with from → to flow", () => {
    render(
      <AgentActivityBlock
        activities={[]}
        delegations={[
          { from: "CFO Agent", to: "Ledger Agent", reason: "post entry" },
        ]}
      />,
    );

    // "CFO Agent" shows in both the roster chip and the delegation row.
    expect(screen.getAllByText("CFO Agent").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ledger Agent").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("post entry")).toBeTruthy();
  });

  it("shows roster chips for participating agents", () => {
    render(
      <AgentActivityBlock
        activities={[
          {
            agent: "CFO Agent",
            status: "completed",
            action: "Reviewed cash position",
          },
        ]}
      />,
    );

    expect(screen.getByText("Agents")).toBeTruthy();
    // CFO Agent appears in both the roster chip and the activity row.
    expect(screen.getAllByText("CFO Agent").length).toBeGreaterThanOrEqual(1);
  });

  it("collapses and expands the step list", () => {
    render(
      <AgentActivityBlock
        activities={[
          {
            agent: "CFO Agent",
            status: "completed",
            action: "Reviewed cash position",
          },
        ]}
      />,
    );

    // Collapse
    fireEvent.click(screen.getByText("Agent Activity"));
    expect(screen.queryByText("Reviewed cash position")).toBeNull();

    // Expand
    fireEvent.click(screen.getByText("Agent Activity"));
    expect(screen.getByText("Reviewed cash position")).toBeTruthy();
  });

  it("counts total steps across activities, tools, and delegations", () => {
    render(
      <AgentActivityBlock
        isStreaming
        activities={[
          {
            agent: "CFO Agent",
            status: "started",
            action: "Planning close",
          },
        ]}
        toolCalls={[{ toolName: "getTrialBalance", status: "running" }]}
        delegations={[
          { from: "CFO Agent", to: "Ledger Agent", reason: "post" },
        ]}
      />,
    );

    expect(screen.getByText("3 steps")).toBeTruthy();
  });
});
