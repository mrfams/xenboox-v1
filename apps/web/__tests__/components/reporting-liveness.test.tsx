import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ReportingLiveness } from "@/components/agents/reporting-liveness";

describe("ReportingLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Report Assembly ──────────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<ReportingLiveness />);
    // "Reporting Agent" also appears in the cross-agent chain chip, so scope to the heading.
    expect(
      screen.getByRole("heading", { name: "Reporting Agent" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Aggregator/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order: REQUESTED → GATHERING_INPUTS → WAITING_ON_DEPENDENCIES → ASSEMBLING → NARRATIVE_GENERATED → DELIVERED", () => {
    render(<ReportingLiveness />);
    expect(screen.getByText("Report State Machine")).toBeInTheDocument();
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent);
    const requestedIdx = stageLabels.findIndex((t) => t?.includes("REQUESTED"));
    const gatheringIdx = stageLabels.findIndex((t) =>
      t?.includes("GATHERING_INPUTS"),
    );
    const waitingIdx = stageLabels.findIndex((t) =>
      t?.includes("WAITING_ON_DEPENDENCIES"),
    );
    const assemblingIdx = stageLabels.findIndex((t) =>
      t?.includes("ASSEMBLING"),
    );
    const narrativeIdx = stageLabels.findIndex((t) =>
      t?.includes("NARRATIVE_GENERATED"),
    );
    const deliveredIdx = stageLabels.findIndex((t) => t?.includes("DELIVERED"));

    expect(requestedIdx).toBeLessThan(gatheringIdx);
    expect(gatheringIdx).toBeLessThan(waitingIdx);
    expect(waitingIdx).toBeLessThan(assemblingIdx);
    expect(assemblingIdx).toBeLessThan(narrativeIdx);
    expect(narrativeIdx).toBeLessThan(deliveredIdx);
  });

  it("shows the current operation status (assembling)", () => {
    render(<ReportingLiveness />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("ASSEMBLING");
    expect(status.textContent).toContain("Q2 2026");
  });

  // ── Report Scope (deterministic) ───────────────────────────────────

  it("shows the report request scope", () => {
    render(<ReportingLiveness />);
    expect(screen.getByText(/Preparing P&L for Q2 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Profit & Loss/i)).toBeInTheDocument();
  });

  it("shows entity information", () => {
    render(<ReportingLiveness />);
    const mentions = screen.getAllByText(/Xenboox/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Input Gathering — aggregator, never re-derives ─────────────────

  it("shows inputs pulled from their owning agents with snapshot references", () => {
    render(<ReportingLiveness />);
    expect(
      screen.getByText(/Pulling trial balance from Ledger Agent/i),
    ).toBeInTheDocument();
    // These also appear in the cross-agent chain / report body source refs.
    expect(screen.getAllByText(/TB-2026-Q2-v3/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/Budget Agent/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/Analytics Agent/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows that no dependencies are pending when all inputs are received", () => {
    render(<ReportingLiveness />);
    expect(screen.getByText(/All inputs received/i)).toBeInTheDocument();
    expect(screen.getByText(/no dependencies pending/i)).toBeInTheDocument();
  });

  it("does NOT render a confidence meter on the deterministic gathering card", () => {
    render(<ReportingLiveness />);
    const gather = screen.getByRole("region", { name: /Input Gathering/i });
    expect(within(gather).queryAllByRole("meter").length).toBe(0);
  });

  // ── Zero Confidence Meters (fully deterministic lifecycle) ─────────

  it("does NOT render any confidence meters in the main view", () => {
    render(<ReportingLiveness />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  it("does NOT show 'Agent Confidence' summary", () => {
    render(<ReportingLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  // ── Progressive Assembly (Spec §4) ─────────────────────────────────

  it("shows the report assembling section by section, not all at once", () => {
    render(<ReportingLiveness />);
    expect(
      screen.getByText(/assembles section by section/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/headers populate in sequence/i),
    ).toBeInTheDocument();
  });

  it("shows individual assembly sections with progress states", () => {
    render(<ReportingLiveness />);
    expect(screen.getByText(/Revenue — assembled/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Operating Expenses — assembling/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Net Income — pending/i)).toBeInTheDocument();
  });

  // ── Sourced Figures (Spec §4) ──────────────────────────────────────

  it("shows report figures linked back to their source agent", () => {
    render(<ReportingLiveness />);
    const mentions = screen.getAllByText(/Ledger Agent/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/TB-2026-Q2-v3/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("shows the report body with sourced revenue and net income figures", () => {
    render(<ReportingLiveness />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    // GMD 12,400.00 also appears in the narrative "Revenue was GMD 12,400.00".
    expect(
      screen.getAllByText(/GMD 12,400\.00/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Narrative (Spec §2/§3/§5) — cites the numbers above ────────────

  it("shows the narrative adjacent to the numbers it describes", () => {
    render(<ReportingLiveness />);
    const mentions = screen.getAllByText(/Narrative/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/sourced from the numbers above/i),
    ).toBeInTheDocument();
  });

  it("shows narrative claims citing the specific numbers they explain", () => {
    render(<ReportingLiveness />);
    expect(screen.getByText(/Revenue was GMD 12,400\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/up 8% from May/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Service Income \(GMD 8,200\.00\)/i),
    ).toBeInTheDocument();
  });

  it("shows that the narrative never introduces unsourced claims", () => {
    render(<ReportingLiveness />);
    expect(screen.getByText(/no unsourced/i)).toBeInTheDocument();
  });

  // ── Status Grid ────────────────────────────────────────────────────

  it("shows report metadata in the status grid", () => {
    render(<ReportingLiveness />);
    const metadata = screen.getByRole("region", { name: /Report Metadata/i });
    // Scope within the metadata region — "/Period/" also appears in the
    // escalation note "trial balance for [period] not yet closed" (spec §6 language).
    expect(within(metadata).getByText(/Report Type/i)).toBeInTheDocument();
    expect(within(metadata).getByText("P&L")).toBeInTheDocument();
    expect(within(metadata).getByText(/Period/i)).toBeInTheDocument();
    expect(within(metadata).getByText("Q2 2026")).toBeInTheDocument();
    expect(within(metadata).getByText(/Channel/i)).toBeInTheDocument();
  });

  // ── Critical Rule: Aggregator, Never a Source of Truth ─────────────

  it("surfaces the never-re-derives critical rule in the main view", () => {
    render(<ReportingLiveness />);
    expect(
      screen.getAllByText(/never independently calculate/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/never a source of truth/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows that gaps are shown explicitly rather than estimated", () => {
    render(<ReportingLiveness />);
    const mentions = screen.getAllByText(/never estimated/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── How It Works ───────────────────────────────────────────────────

  it("shows the 'how it works' decomposition toggle", () => {
    render(<ReportingLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals step details when 'How It Works' is clicked", () => {
    render(<ReportingLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    expect(screen.getByText(/Identify Report Scope/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Pull Inputs from Owning Agents/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Wait on Dependencies/i)).toBeInTheDocument();
    expect(screen.getByText(/Assemble Report Body/i)).toBeInTheDocument();
    expect(screen.getByText(/Generate Narrative/i)).toBeInTheDocument();
  });

  it("shows 'No confidence score' notes on deterministic steps in How It Works", () => {
    render(<ReportingLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getAllByText(/No confidence score/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Constraint Enforcement ─────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<ReportingLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Never Re-Derives")).toBeInTheDocument();
    expect(screen.getByText("Sources Cited")).toBeInTheDocument();
    expect(screen.getByText("Gaps Shown, Never Estimated")).toBeInTheDocument();
    expect(screen.getByText("Sections Populate in Order")).toBeInTheDocument();
    expect(screen.getByText("Narrative Cites Numbers")).toBeInTheDocument();
  });

  // ── Audit Trail ────────────────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<ReportingLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with timestamps and source pulls when expanded", () => {
    render(<ReportingLiveness />);
    const auditToggle = screen.getByText(/Audit Trail — Every Source Pull/i);
    fireEvent.click(auditToggle);
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(8);
    expect(screen.getAllByText(/TB-2026-Q2-v3/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  // ── Cross-Agent Dependencies ───────────────────────────────────────

  it("shows the owning agents Reporting Agent pulls from", () => {
    render(<ReportingLiveness />);
    expect(screen.getAllByText(/Ledger Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/Budget Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/Analytics Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Tax Agent/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows that Reporting Agent is never a source of truth in the chain", () => {
    render(<ReportingLiveness />);
    expect(
      screen.getByText(/Pulls from owning agents — never a source of truth/i),
    ).toBeInTheDocument();
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<ReportingLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  // ── Edge Cases: Empty State ────────────────────────────────────────

  it("shows 'No reports in queue' empty state", () => {
    render(<ReportingLiveness showEmptyState />);
    expect(screen.getByText(/No reports in queue/i)).toBeInTheDocument();
  });

  // ── Edge Cases: Missing Input (Blocking) ───────────────────────────

  it("shows missing input blocking full delivery but allowing partial report", () => {
    render(<ReportingLiveness showMissingInput />);
    expect(screen.getByText(/Report Incomplete/i)).toBeInTheDocument();
    expect(
      screen.getByText(/trial balance for Q2 2026 not yet closed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/partial report may still be shown/i),
    ).toBeInTheDocument();
  });

  it("missing input is escalated to CFO Agent and human, never estimated", () => {
    render(<ReportingLiveness showMissingInput />);
    expect(screen.getAllByText(/CFO Agent/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/never silently filled with a placeholder/i),
    ).toBeInTheDocument();
  });

  it("missing input branch renders 0 confidence meters", () => {
    render(<ReportingLiveness showMissingInput />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Cases: Dependency Wait (Non-Blocking but Visible) ─────────

  it("shows dependency wait with elapsed time, not a generic spinner", () => {
    render(<ReportingLiveness showDependencyWait />);
    expect(
      screen.getByText(/Still waiting on Analytics Agent/i),
    ).toBeInTheDocument();
    // "elapsed" appears in the badge ("Elapsed: 42s") and the BranchCard body.
    expect(screen.getAllByText(/elapsed/i).length).toBeGreaterThanOrEqual(1);
  });

  it("dependency wait is non-blocking but visible", () => {
    render(<ReportingLiveness showDependencyWait />);
    // "Non-blocking" appears in the subtitle and the BranchCard body.
    expect(screen.getAllByText(/Non-blocking/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getByText(/never hidden behind a generic spinner/i),
    ).toBeInTheDocument();
  });

  it("dependency wait branch renders 0 confidence meters", () => {
    render(<ReportingLiveness showDependencyWait />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Cases: DELIVERED Terminal State ───────────────────────────

  it("shows the DELIVERED terminal state with delivery channel", () => {
    render(<ReportingLiveness showDelivered />);
    expect(screen.getByText(/Report Delivered/i)).toBeInTheDocument();
    // "delivered per channel" appears in the subtitle and the BranchCard body.
    expect(
      screen.getAllByText(/delivered per channel/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/dashboard/i).length).toBeGreaterThanOrEqual(1);
  });

  it("delivered branch renders 0 confidence meters", () => {
    render(<ReportingLiveness showDelivered />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Escalation & Human-in-the-Loop ─────────────────────────────────

  it("shows escalation triggers for missing inputs and dependency waits", () => {
    render(<ReportingLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/not yet closed/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Still waiting on/i)).toBeInTheDocument();
  });

  // ── Liveness Footer ────────────────────────────────────────────────

  it("shows Layer 1 deterministic liveness footer", () => {
    render(<ReportingLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const detMentions = screen.getAllByText(/deterministic/i);
    expect(detMentions.length).toBeGreaterThanOrEqual(1);
  });
});
