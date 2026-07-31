import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { TreasuryLiveness } from "@/components/agents/treasury-liveness";

describe("TreasuryLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Multi-Source Rollup ───────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<TreasuryLiveness />);
    // "Treasury Agent" also appears in the cross-agent chain chip, so scope to the heading.
    expect(
      screen.getByRole("heading", { name: "Treasury Agent" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/position awareness/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order: DATA_ARRIVING → ROLLUP_UPDATING → RECONCILIATION_REVIEW → DAILY_POSITION_CONFIRMED", () => {
    render(<TreasuryLiveness />);
    expect(screen.getByText("Treasury State Machine")).toBeInTheDocument();
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent);
    const arrivingIdx = stageLabels.findIndex((t) =>
      t?.includes("DATA_ARRIVING"),
    );
    const rollupIdx = stageLabels.findIndex((t) =>
      t?.includes("ROLLUP_UPDATING"),
    );
    const reviewIdx = stageLabels.findIndex((t) =>
      t?.includes("RECONCILIATION_REVIEW"),
    );
    const confirmedIdx = stageLabels.findIndex((t) =>
      t?.includes("DAILY_POSITION_CONFIRMED"),
    );

    expect(arrivingIdx).toBeLessThan(rollupIdx);
    expect(rollupIdx).toBeLessThan(reviewIdx);
    expect(reviewIdx).toBeLessThan(confirmedIdx);
  });

  it("shows the current operation status (reviewing unresolved items)", () => {
    render(<TreasuryLiveness />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("RECONCILIATION_REVIEW");
    expect(status.textContent).toContain("3 unresolved items");
  });

  // ── Zero Confidence Meters (fully deterministic) ────────────────────

  it("renders exactly zero confidence meters — the entire treasury lifecycle is deterministic", () => {
    render(<TreasuryLiveness />);
    const meters = screen.queryAllByRole("meter");
    expect(meters.length).toBe(0);
  });

  it("does NOT show 'Agent Confidence' summary", () => {
    render(<TreasuryLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  // ── Live Multi-Source Position Dashboard (Spec §4) ──────────────────

  it("shows a live multi-source position dashboard region", () => {
    render(<TreasuryLiveness />);
    expect(
      screen.getByRole("region", { name: /Position Dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/last updated/i).length).toBeGreaterThanOrEqual(
      3,
    );
  });

  it("shows the bank balance with its independent last-updated timestamp", () => {
    render(<TreasuryLiveness />);
    const dashboard = screen.getByRole("region", {
      name: /Position Dashboard/i,
    });
    expect(within(dashboard).getByText(/Bank/i)).toBeInTheDocument();
    expect(within(dashboard).getByText(/GMD 8,200.00/i)).toBeInTheDocument();
    expect(
      within(dashboard).getByText(/last updated 09:42/i),
    ).toBeInTheDocument();
  });

  it("shows the cash till balance with its independent last-updated timestamp", () => {
    render(<TreasuryLiveness />);
    const dashboard = screen.getByRole("region", {
      name: /Position Dashboard/i,
    });
    expect(within(dashboard).getByText(/Cash Tills/i)).toBeInTheDocument();
    // Cash tills and mobile money are both GMD 2,100.00 in the demo — two matches
    expect(
      within(dashboard).getAllByText(/GMD 2,100.00/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      within(dashboard).getByText(/last updated 09:40/i),
    ).toBeInTheDocument();
  });

  it("shows the mobile money balance with its independent last-updated timestamp", () => {
    render(<TreasuryLiveness />);
    const dashboard = screen.getByRole("region", {
      name: /Position Dashboard/i,
    });
    expect(within(dashboard).getByText(/Mobile Money/i)).toBeInTheDocument();
    expect(
      within(dashboard).getByText(/last updated 09:38/i),
    ).toBeInTheDocument();
  });

  it("shows each source ticking independently with its own timestamp", () => {
    render(<TreasuryLiveness />);
    const dashboard = screen.getByRole("region", {
      name: /Position Dashboard/i,
    });
    // Three distinct source timestamps, independent per source
    expect(
      within(dashboard).getByText(/last updated 09:42/i),
    ).toBeInTheDocument();
    expect(
      within(dashboard).getByText(/last updated 09:40/i),
    ).toBeInTheDocument();
    expect(
      within(dashboard).getByText(/last updated 09:38/i),
    ).toBeInTheDocument();
  });

  it("shows the total position broken down by source", () => {
    render(<TreasuryLiveness />);
    const dashboard = screen.getByRole("region", {
      name: /Position Dashboard/i,
    });
    expect(within(dashboard).getByText(/Total position/i)).toBeInTheDocument();
    expect(within(dashboard).getByText(/GMD 12,400.00/i)).toBeInTheDocument();
    expect(
      within(dashboard).getByText(/broken down by source/i),
    ).toBeInTheDocument();
  });

  it("shows the mobile money timing gap labeled expected", () => {
    render(<TreasuryLiveness />);
    const dashboard = screen.getByRole("region", {
      name: /Position Dashboard/i,
    });
    expect(
      within(dashboard).getByText(/1 timing gap, expected/i),
    ).toBeInTheDocument();
  });

  // ── Reconciliation Review — hard gate (Spec §2/§3/§4) ───────────────

  it("shows the reconciliation review region with unresolved items", () => {
    render(<TreasuryLiveness />);
    expect(
      screen.getByRole("region", { name: /Reconciliation Review/i }),
    ).toBeInTheDocument();
    const review = screen.getByRole("region", {
      name: /Reconciliation Review/i,
    });
    expect(within(review).getByText(/3 unresolved items/i)).toBeInTheDocument();
    expect(within(review).getByText(/cannot close/i)).toBeInTheDocument();
  });

  it("flags each unresolved item with the source agent that surfaced it", () => {
    render(<TreasuryLiveness />);
    const review = screen.getByRole("region", {
      name: /Reconciliation Review/i,
    });
    expect(within(review).getByText(/Mobile Money Agent/i)).toBeInTheDocument();
    expect(
      within(review).getByText(/Reconciliation Agent/i),
    ).toBeInTheDocument();
    expect(within(review).getByText(/Cash Agent/i)).toBeInTheDocument();
  });

  it("shows why each unresolved item was flagged", () => {
    render(<TreasuryLiveness />);
    const review = screen.getByRole("region", {
      name: /Reconciliation Review/i,
    });
    expect(
      within(review).getByText(/no matching ledger entry/i),
    ).toBeInTheDocument();
    expect(
      within(review).getByText(/likely timing difference/i),
    ).toBeInTheDocument();
    expect(within(review).getByText(/short, unresolved/i)).toBeInTheDocument();
  });

  it("shows the review is blocking — reconciliation cannot close", () => {
    render(<TreasuryLiveness />);
    const review = screen.getByRole("region", {
      name: /Reconciliation Review/i,
    });
    expect(within(review).getByText(/Blocking for close/i)).toBeInTheDocument();
  });

  // ── Critical Rule: never close with unresolved items (Spec §3/§4) ───

  it("surfaces the never-close-with-unresolved critical rule in the main view", () => {
    render(<TreasuryLiveness />);
    expect(
      screen.getAllByText(/never marks a reconciliation complete/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/still reports unresolved items/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the hard gate is not a judgment call, citing PRD §6.4", () => {
    render(<TreasuryLiveness />);
    expect(
      screen.getAllByText(/hard gate, not a judgment call/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/PRD §6.4/i).length).toBeGreaterThanOrEqual(1);
  });

  it("reveals the hard-gate step when 'How It Works' is clicked", () => {
    render(<TreasuryLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(screen.getByText(/Review Unresolved Items/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/never close a reconciliation with unresolved items/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Daily Position Report (Spec §4/§5) ──────────────────────────────

  it("shows the daily position report building from its component sources", () => {
    render(<TreasuryLiveness />);
    const report = screen.getByRole("region", {
      name: /Daily Position Report/i,
    });
    expect(within(report).getByText(/Daily position:/i)).toBeInTheDocument();
    expect(
      within(report).getByText(/builds from its component sources/i),
    ).toBeInTheDocument();
  });

  it("shows the reasoning line with per-source status", () => {
    render(<TreasuryLiveness />);
    const report = screen.getByRole("region", {
      name: /Daily Position Report/i,
    });
    expect(
      within(report).getByText(/GMD 12,400.00 total/i),
    ).toBeInTheDocument();
    expect(
      within(report).getByText(/GMD 8,200.00 bank \(reconciled\)/i),
    ).toBeInTheDocument();
    expect(
      within(report).getByText(
        /GMD 2,100.00 mobile money \(1 timing gap, expected\)/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the report is pending while unresolved items block closure", () => {
    render(<TreasuryLiveness />);
    const report = screen.getByRole("region", {
      name: /Daily Position Report/i,
    });
    expect(
      within(report).getByText(/Pending confirmation/i),
    ).toBeInTheDocument();
    expect(
      within(report).getByText(/3 unresolved items block closure/i),
    ).toBeInTheDocument();
  });

  // ── Branch States: Stale Source (Spec §7) — never silently excluded ─

  it("shows a stale/missing source explicitly, never silently excluded from the total", () => {
    render(<TreasuryLiveness showStaleSource />);
    expect(screen.getByText(/Source Not Reporting/i)).toBeInTheDocument();
    expect(screen.getByText(/Wave API down/i)).toBeInTheDocument();
    expect(
      screen.getByText(/never silently excluded from the total/i),
    ).toBeInTheDocument();
  });

  it("shows the stale-source branch marks the total incomplete", () => {
    render(<TreasuryLiveness showStaleSource />);
    // BranchCard title + body paragraph both contain "balance marked stale"
    expect(
      screen.getAllByText(/balance marked stale/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Total incomplete/i)).toBeInTheDocument();
  });

  it("stale-source branch renders 0 confidence meters", () => {
    render(<TreasuryLiveness showStaleSource />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Branch States: Unresolved Past Window (Spec §6) — blocking ──────

  it("shows unresolved-past-window escalated to CFO Agent with escalating urgency", () => {
    render(<TreasuryLiveness showUnresolved />);
    expect(
      screen.getByText(/Reconciliation Cannot Close/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/escalating urgency/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
  });

  it("unresolved-past-window is blocking for close", () => {
    render(<TreasuryLiveness showUnresolved />);
    expect(
      screen.getAllByText(/Blocking for close/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("unresolved-past-window branch renders 0 confidence meters", () => {
    render(<TreasuryLiveness showUnresolved />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Branch States: Position Needs Attention (Spec §6) — non-blocking ─

  it("shows position-needs-attention proactive alert to CFO Agent and human", () => {
    render(<TreasuryLiveness showPositionAlert />);
    expect(screen.getByText(/Position Needs Attention/i)).toBeInTheDocument();
    expect(
      screen.getByText(/large scheduled payment vs position/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
  });

  it("position-needs-attention is non-blocking but urgent", () => {
    render(<TreasuryLiveness showPositionAlert />);
    expect(
      screen.getAllByText(/Non-blocking but urgent/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/proactive alert/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("position-needs-attention branch renders 0 confidence meters", () => {
    render(<TreasuryLiveness showPositionAlert />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Branch States: Daily Position Confirmed (terminal) ──────────────

  it("shows the daily position confirmed terminal state", () => {
    render(<TreasuryLiveness showConfirmed />);
    // h2 title + BranchCard title both match case-insensitively
    expect(
      screen.getAllByText(/Daily Position Confirmed/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/GMD 12,400.00 across 3 accounts\/rails/i),
    ).toBeInTheDocument();
  });

  it("confirmed branch shows the report produced from component sources", () => {
    render(<TreasuryLiveness showConfirmed />);
    expect(
      screen.getAllByText(/produced from its component sources/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("confirmed branch renders 0 confidence meters", () => {
    render(<TreasuryLiveness showConfirmed />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Case: Empty State ─────────────────────────────────────────

  it("shows 'No source data awaiting rollup' empty state", () => {
    render(<TreasuryLiveness showEmptyState />);
    expect(
      screen.getByText(/No source data awaiting rollup/i),
    ).toBeInTheDocument();
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ────────────────────────

  it("shows escalation triggers for position attention and unresolved window", () => {
    render(<TreasuryLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cash position needs strategic attention/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Reconciliation unresolved past a reasonable window/i),
    ).toBeInTheDocument();
  });

  it("shows the blocking semantics in the escalation table", () => {
    render(<TreasuryLiveness />);
    expect(
      screen.getAllByText(/Non-blocking but urgent/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Blocking for close/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Audit Trail (Spec §8) ───────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<TreasuryLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with rollup calculations and source timestamps when expanded", () => {
    render(<TreasuryLiveness />);
    fireEvent.click(screen.getByText(/Audit Trail — Every Rollup & Decision/i));
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(8);
    expect(screen.getAllByText(/rollup/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/source timestamp/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/hard gate/i).length).toBeGreaterThanOrEqual(1);
  });

  // ── Cross-Agent Dependencies (Spec §10) ─────────────────────────────

  it("shows the worker agents aggregated by Treasury", () => {
    render(<TreasuryLiveness />);
    expect(screen.getAllByText(/Cash Agent/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Mobile Money Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Reconciliation Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Expense Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("shows that Treasury reports to CFO Agent", () => {
    render(<TreasuryLiveness />);
    expect(
      screen.getAllByText(/reports to CFO Agent/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Status Grid ────────────────────────────────────────────────────

  it("shows treasury metadata in the status grid", () => {
    render(<TreasuryLiveness />);
    const metadata = screen.getByRole("region", { name: /Treasury Metadata/i });
    expect(within(metadata).getByText(/Position/i)).toBeInTheDocument();
    expect(within(metadata).getByText("GMD 12,400.00")).toBeInTheDocument();
    expect(within(metadata).getByText(/Sources/i)).toBeInTheDocument();
    expect(within(metadata).getByText(/Unresolved Items/i)).toBeInTheDocument();
    expect(within(metadata).getByText(/Last Confirmed/i)).toBeInTheDocument();
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<TreasuryLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(6);
  });

  // ── Liveness Footer ────────────────────────────────────────────────

  it("shows Layer 1 deterministic liveness footer", () => {
    render(<TreasuryLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/deterministic/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("shows entity information", () => {
    render(<TreasuryLiveness />);
    const mentions = screen.getAllByText(/Xenboox/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });
});
