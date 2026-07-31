import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CfoLiveness } from "@/components/agents/cfo-liveness";
import type { CfoLivenessPayload } from "@/lib/cfo-liveness";

// ─── Live payload used to prove data-driven rendering ──────────────────

const LIVE_PAYLOAD: CfoLivenessPayload = {
  livenessState: "RESPONDING",
  routedDepartments: ["controller", "treasury"],
  departmentResponses: [
    {
      department: "controller",
      displayName: "Controller",
      status: "received",
      headline: "Trial balance confirmed",
      confidence: 0.95,
      escalations: [],
    },
    {
      department: "treasury",
      displayName: "Treasury",
      status: "received",
      headline: "Cash at bank GMD 52,000",
      confidence: 0.88,
      escalations: [],
    },
  ],
  sourceRefs: [
    {
      claim: "Profit last month was GMD 4,200",
      sourceDepartment: "controller",
      sourceSummaryExcerpt: "Trial balance confirmed",
      confidence: 0.95,
    },
    {
      claim: "Cash position GMD 52,000",
      sourceDepartment: "treasury",
      sourceSummaryExcerpt: "Cash at bank GMD 52,000",
      confidence: 0.88,
    },
  ],
  response:
    "Your profit last month was GMD 4,200 — from Controller's confirmed trial balance.",
  decision: "proceed",
  escalations: [],
  conflicts: [],
  audit: {
    agentId: "cfo-agent",
    action: "routing_auto",
    timestamp: "2026-07-31T09:00:00.000Z",
    confidence: 0.9,
  },
  steps: [
    {
      step: "intent_resolution",
      label: "Intent & Context Resolution",
      status: "completed",
      durationMs: 12,
    },
    {
      step: "response_synthesis",
      label: "Response Synthesis",
      status: "completed",
      durationMs: 4,
    },
  ],
  overallConfidence: 0.915,
  durationMs: 240,
};

describe("CfoLiveness v1.0 — Liveness Spec §1-§8", () => {
  // ── Header / Identity ─────────────────────────────────────────────

  it("renders the CFO Agent identity in the header", () => {
    render(<CfoLiveness />);
    expect(
      screen.getByRole("heading", { name: /CFO Agent/i }),
    ).toBeInTheDocument();
  });

  it("identifies the CFO Agent as the strategic tier-1 orchestrator", () => {
    render(<CfoLiveness />);
    const mentions = screen.getAllByText(/Strategic|Orchestrator/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── State Machine (§2) ────────────────────────────────────────────

  it("renders the full liveness state machine with all 8 states in order", () => {
    render(<CfoLiveness />);
    const states = screen.getAllByRole("listitem");
    const labels = states.map((el) => el.textContent);

    const expectedOrder = [
      "INSTRUCTION_RECEIVED",
      "ROUTING_TO_DEPARTMENT_HEAD",
      "AWAITING_DEPARTMENT_SUMMARIES",
      "SYNTHESIZING",
      "RESPONDING",
      "ESCALATION_RECEIVED_FROM_DEPT_HEAD",
      "FRAMING_FOR_HUMAN",
      "PRESENTED_TO_HUMAN",
    ];

    const indexes = expectedOrder.map((s) =>
      labels.findIndex((t) => t?.includes(s)),
    );
    expect(indexes.every((i) => i >= 0)).toBe(true);
    for (let i = 0; i < indexes.length - 1; i++) {
      expect(indexes[i]).toBeLessThan(indexes[i + 1]);
    }
  });

  // ── Routing Moment (§4) ───────────────────────────────────────────

  it("shows the 'checking with' routing moment for multi-department questions", () => {
    render(<CfoLiveness scenario="routing" />);
    const mentions = screen.getAllByText(/checking with/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("names the departments being contacted when more than one", () => {
    render(<CfoLiveness scenario="routing" />);
    expect(screen.getByText(/Controller/i)).toBeInTheDocument();
    expect(screen.getByText(/Treasury/i)).toBeInTheDocument();
  });

  // ── Waiting on Departments (§7 — never silently dropped) ──────────

  it("shows a 'still waiting on' status instead of silently dropping departments", () => {
    render(<CfoLiveness scenario="awaiting" />);
    const mentions = screen.getAllByText(/still waiting on/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("names which departments are still being waited on", () => {
    render(<CfoLiveness scenario="awaiting" />);
    expect(screen.getByText(/Compliance/i)).toBeInTheDocument();
  });

  // ── Source Refs (§3, §4 — traceable claims) ──────────────────────

  it("renders every claim with a traceable source department", () => {
    render(<CfoLiveness scenario="responding" />);
    const controller = screen.getAllByText(/Controller/i);
    const treasury = screen.getAllByText(/Treasury/i);
    expect(controller.length).toBeGreaterThanOrEqual(1);
    expect(treasury.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the source department summary excerpt next to each claim", () => {
    render(<CfoLiveness scenario="responding" />);
    expect(screen.getByText(/Trial balance confirmed/i)).toBeInTheDocument();
  });

  // ── 'Why' Explanation (§5) ────────────────────────────────────────

  it("shows a 'why' explanation citing the source agents", () => {
    render(<CfoLiveness scenario="responding" />);
    expect(screen.getByText(/Why/i)).toBeInTheDocument();
    const agentMentions = screen.getAllByText(
      /Controller Agent|Treasury Agent/,
    );
    expect(agentMentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Escalation Framing (§6) ───────────────────────────────────────

  it("shows the triggering department input inside an escalation", () => {
    render(<CfoLiveness scenario="escalation" />);
    const mentions = screen.getAllByText(/here's why I'm asking you/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("names the department that triggered the escalation", () => {
    render(<CfoLiveness scenario="escalation" />);
    const mentions = screen.getAllByText(/Treasury flagged/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the specific triggering data alongside the ask", () => {
    render(<CfoLiveness scenario="escalation" />);
    expect(
      screen.getByText(/cash position is GMD 2,000 lower/i),
    ).toBeInTheDocument();
  });

  // ── Conflicts (§6 — side by side, never silently resolved) ───────

  it("shows conflicting department inputs side by side", () => {
    render(<CfoLiveness scenario="conflict" />);
    const mentions = screen.getAllByText(/GMD 52,000|GMD 49,000/);
    expect(mentions.length).toBeGreaterThanOrEqual(2);
  });

  it("labels conflicting information as a conflict needing human judgment", () => {
    render(<CfoLiveness scenario="conflict" />);
    const mentions = screen.getAllByText(/conflict/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Confidence (probabilistic tier-1 agent) ───────────────────────

  it("shows confidence scores on department responses (probabilistic layer)", () => {
    render(<CfoLiveness scenario="responding" />);
    const mentions = screen.getAllByText(/95%|88%/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Decomposition & Audit Trail (§3, §8) ─────────────────────────

  it("reveals the decomposed sub-steps when 'How It Works' is toggled", () => {
    render(<CfoLiveness />);
    fireEvent.click(screen.getByText(/How It Works/i));
    expect(screen.getByText(/Parse instruction/i)).toBeInTheDocument();
    expect(screen.getByText(/Route to department/i)).toBeInTheDocument();
    expect(screen.getByText(/Synthesize/i)).toBeInTheDocument();
  });

  it("reveals the audit trail when expanded", () => {
    render(<CfoLiveness />);
    fireEvent.click(screen.getByText(/Audit Trail/i));
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  // ── Data-Driven Live Payload ──────────────────────────────────────

  it("renders a live payload's department responses and source refs", () => {
    render(<CfoLiveness livePayload={LIVE_PAYLOAD} />);
    expect(screen.getByText(/Trial balance confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/Cash at bank GMD 52,000/i)).toBeInTheDocument();
  });

  it("renders the live payload's synthesized response verbatim", () => {
    render(<CfoLiveness livePayload={LIVE_PAYLOAD} />);
    expect(
      screen.getByText(/profit last month was GMD 4,200/i),
    ).toBeInTheDocument();
  });

  // ── Empty / Idle State ────────────────────────────────────────────

  it("shows an idle state when no instruction is in flight", () => {
    render(<CfoLiveness scenario="idle" />);
    const mentions = screen.getAllByText(
      /no instruction|idle|waiting for your/i,
    );
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Accessibility ─────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<CfoLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(3);
  });
});
