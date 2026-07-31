import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { PayrollManagerLiveness } from "@/components/agents/payroll-manager-liveness";

describe("PayrollManagerLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Exception Review ──────────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<PayrollManagerLiveness />);
    // "Payroll Manager Agent" also appears in the cross-agent chain chip, so scope to the heading.
    expect(
      screen.getByRole("heading", { name: "Payroll Manager Agent" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/exceptions/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order: RUN_INITIATED → REVIEWING_STANDARD_CALCULATIONS → REVIEWING_EXCEPTIONS → STATUTORY_CONFIRMATION → APPROVED_FOR_POSTING", () => {
    render(<PayrollManagerLiveness />);
    expect(
      screen.getByText("Payroll Manager State Machine"),
    ).toBeInTheDocument();
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent);
    const initiatedIdx = stageLabels.findIndex((t) =>
      t?.includes("RUN_INITIATED"),
    );
    const standardIdx = stageLabels.findIndex((t) =>
      t?.includes("REVIEWING_STANDARD_CALCULATIONS"),
    );
    const exceptionsIdx = stageLabels.findIndex((t) =>
      t?.includes("REVIEWING_EXCEPTIONS"),
    );
    const statutoryIdx = stageLabels.findIndex((t) =>
      t?.includes("STATUTORY_CONFIRMATION"),
    );
    const approvedIdx = stageLabels.findIndex((t) =>
      t?.includes("APPROVED_FOR_POSTING"),
    );

    expect(initiatedIdx).toBeLessThan(standardIdx);
    expect(standardIdx).toBeLessThan(exceptionsIdx);
    expect(exceptionsIdx).toBeLessThan(statutoryIdx);
    expect(statutoryIdx).toBeLessThan(approvedIdx);
  });

  it("shows the current operation status (reviewing exceptions)", () => {
    render(<PayrollManagerLiveness />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("REVIEWING_EXCEPTIONS");
    expect(status.textContent).toContain("2 exceptions");
  });

  // ── Zero Confidence Meters (fully deterministic) ────────────────────

  it("renders exactly zero confidence meters — the entire payroll-manager lifecycle is deterministic", () => {
    render(<PayrollManagerLiveness />);
    const meters = screen.queryAllByRole("meter");
    expect(meters.length).toBe(0);
  });

  it("does NOT show 'Agent Confidence' summary", () => {
    render(<PayrollManagerLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  // ── Two Parallel Tracks (Spec §4) ───────────────────────────────────

  it("shows the standard staff track as a simple progress count", () => {
    render(<PayrollManagerLiveness />);
    const standard = screen.getByRole("region", { name: /Standard Track/i });
    expect(
      within(standard).getByText(/34 of 36 standard staff reviewed/i),
    ).toBeInTheDocument();
    expect(within(standard).getByText(/ticking up live/i)).toBeInTheDocument();
  });

  it("shows the exceptions track as individual cards requiring explicit review", () => {
    render(<PayrollManagerLiveness />);
    const exceptions = screen.getByRole("region", {
      name: /Exceptions Track/i,
    });
    expect(within(exceptions).getByText(/New Starter/i)).toBeInTheDocument();
    expect(within(exceptions).getByText(/Salary Change/i)).toBeInTheDocument();
    expect(
      within(exceptions).getByText(/individual review/i),
    ).toBeInTheDocument();
  });

  it("shows the standard and exception tracks as parallel, not blended", () => {
    render(<PayrollManagerLiveness />);
    expect(
      screen.getByRole("region", { name: /Standard Track/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /Exceptions Track/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/two parallel tracks/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Exception Cards — each with its own calculation basis ───────────

  it("shows the new starter exception with the pro-rated calculation shown explicitly", () => {
    render(<PayrollManagerLiveness />);
    const exceptions = screen.getByRole("region", {
      name: /Exceptions Track/i,
    });
    expect(within(exceptions).getByText(/Awa Jallow/i)).toBeInTheDocument();
    expect(within(exceptions).getByText(/joined June 15/i)).toBeInTheDocument();
    expect(
      within(exceptions).getByText(/pro-rated for 15 of 30 days/i),
    ).toBeInTheDocument();
    expect(
      within(exceptions).getByText(
        /Standard monthly salary GMD 600.00 → GMD 300.00 this period/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the salary change exception with effective date and old/new rate", () => {
    render(<PayrollManagerLiveness />);
    const exceptions = screen.getByRole("region", {
      name: /Exceptions Track/i,
    });
    expect(within(exceptions).getByText(/Lamin Touray/i)).toBeInTheDocument();
    expect(
      within(exceptions).getByText(/GMD 500.00 → GMD 550.00 effective June 1/i),
    ).toBeInTheDocument();
    expect(within(exceptions).getByText(/per HR update/i)).toBeInTheDocument();
    expect(
      within(exceptions).getByText(/new rate applied for full period/i),
    ).toBeInTheDocument();
  });

  it("shows each exception as its own confirmed sub-decision", () => {
    render(<PayrollManagerLiveness />);
    const exceptions = screen.getByRole("region", {
      name: /Exceptions Track/i,
    });
    // Two exception cards, each with its own confirmation badge
    expect(
      within(exceptions).getAllByText(/Confirmed/i).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("shows the specific reason on each exception card", () => {
    render(<PayrollManagerLiveness />);
    const exceptions = screen.getByRole("region", {
      name: /Exceptions Track/i,
    });
    expect(
      within(exceptions).getByText(/New starter — joined mid-period/i),
    ).toBeInTheDocument();
    expect(
      within(exceptions).getByText(/Salary change — rate updated/i),
    ).toBeInTheDocument();
  });

  // ── Critical Rule: exceptions never silently absorbed (Spec §3) ─────

  it("surfaces the never-silently-absorbed critical rule in the main view", () => {
    render(<PayrollManagerLiveness />);
    expect(
      screen.getAllByText(/never silently absorbed into the standard run/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(
        /own explicit calculation with its own confirmation step/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows exceptions are distinct from every other standard staff member", () => {
    render(<PayrollManagerLiveness />);
    expect(
      screen.getAllByText(/distinct from every other standard staff member/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("reveals the handle-each-exception-individually step when 'How It Works' is clicked", () => {
    render(<PayrollManagerLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getByText(/Handle Each Exception Individually/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/each its own confirmed sub-decision, never bundled/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Statutory Confirmation (Spec §2/§3) — deterministic ─────────────

  it("shows the statutory confirmation region with the jurisdiction named", () => {
    render(<PayrollManagerLiveness />);
    const statutory = screen.getByRole("region", {
      name: /Statutory Confirmation/i,
    });
    expect(
      within(statutory).getByText(
        /Statutory deductions confirmed for Gambia \(GRA\/SSHFC\)/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows statutory confirmation is a deterministic rule-table check", () => {
    render(<PayrollManagerLiveness />);
    const statutory = screen.getByRole("region", {
      name: /Statutory Confirmation/i,
    });
    expect(
      within(statutory).getByText(/deterministic rule-table check/i),
    ).toBeInTheDocument();
    expect(within(statutory).queryAllByRole("meter").length).toBe(0);
  });

  // ── Branch States: Incomplete/Ambiguous Exception (Spec §6/§7) ──────

  it("shows incomplete exception details escalated to human with the specific detail", () => {
    render(<PayrollManagerLiveness showIncompleteException />);
    expect(
      screen.getByText(/Salary Change Missing Effective Date/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Need confirmation on effective date for Lamin Touray/i),
    ).toBeInTheDocument();
  });

  it("shows the incomplete exception blocks that individual only", () => {
    render(<PayrollManagerLiveness showIncompleteException />);
    expect(
      screen.getAllByText(
        /cannot proceed to statutory confirmation for that individual/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Blocking for that individual/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("incomplete-exception branch renders 0 confidence meters", () => {
    render(<PayrollManagerLiveness showIncompleteException />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Branch States: Jurisdiction Rule Gap (Spec §6) — blocking ───────

  it("shows jurisdiction rule gap flagged to Compliance Agent, run held", () => {
    render(<PayrollManagerLiveness showJurisdictionGap />);
    // h2 + BranchCard body ("Jurisdiction rule gap found during statutory confirmation") both match
    expect(
      screen.getAllByText(/Jurisdiction Rule Gap/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/No statutory rule table found for Guinea-Bissau/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Compliance Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/run held for that jurisdiction's staff/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("jurisdiction-rule-gap is blocking", () => {
    render(<PayrollManagerLiveness showJurisdictionGap />);
    expect(screen.getAllByText(/Blocking/i).length).toBeGreaterThanOrEqual(1);
  });

  it("jurisdiction-rule-gap branch renders 0 confidence meters", () => {
    render(<PayrollManagerLiveness showJurisdictionGap />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Branch States: Approved for Posting (terminal) ──────────────────

  it("shows the approved-for-posting terminal state", () => {
    render(<PayrollManagerLiveness showApproved />);
    // h2 + BranchCard body ("Payroll approved — handed to Controller Agent for journal review") both match
    expect(
      screen.getAllByText(/Payroll Approved — Handed to Controller Agent/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
    // body paragraph + inner confirmation div both contain the timestamp
    expect(
      screen.getAllByText(/Approval timestamp 10:02:14/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("approved branch shows the journal handoff chain", () => {
    render(<PayrollManagerLiveness showApproved />);
    expect(
      screen.getAllByText(/journal review/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ledger Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("approved branch renders 0 confidence meters", () => {
    render(<PayrollManagerLiveness showApproved />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Case: Empty State ─────────────────────────────────────────

  it("shows 'No payroll run in progress' empty state", () => {
    render(<PayrollManagerLiveness showEmptyState />);
    expect(screen.getByText(/No payroll run in progress/i)).toBeInTheDocument();
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ────────────────────────

  it("shows escalation triggers for incomplete exceptions and jurisdiction gaps", () => {
    render(<PayrollManagerLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Exception details incomplete or ambiguous/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Jurisdiction rule gap found during statutory confirmation/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the What user sees notes in the escalation table", () => {
    render(<PayrollManagerLiveness />);
    expect(
      screen.getAllByText(
        /Need confirmation on \[detail\] for \[Name\]'s \[exception type\]/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Run held for that jurisdiction's staff/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Audit Trail (Spec §8) ───────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<PayrollManagerLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with exception basis, statutory result, and approval timestamp when expanded", () => {
    render(<PayrollManagerLiveness />);
    fireEvent.click(
      screen.getByText(/Audit Trail — Every Exception & Decision/i),
    );
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(8);
    expect(screen.getAllByText(/pro-rated/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/statutory/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/10:02:14/i).length).toBeGreaterThanOrEqual(1);
  });

  // ── Cross-Agent Dependencies (Spec §10) ─────────────────────────────

  it("shows the worker agent overseen and the handoff chain", () => {
    render(<PayrollManagerLiveness />);
    expect(
      screen.getAllByText(/Payroll Worker Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Controller Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ledger Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows that Payroll Manager reports a summary to CFO Agent monthly", () => {
    render(<PayrollManagerLiveness />);
    expect(
      screen.getAllByText(/reports summary to CFO Agent monthly/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Status Grid ────────────────────────────────────────────────────

  it("shows payroll manager metadata in the status grid", () => {
    render(<PayrollManagerLiveness />);
    const metadata = screen.getByRole("region", {
      name: /Payroll Manager Metadata/i,
    });
    expect(within(metadata).getByText(/Run Period/i)).toBeInTheDocument();
    expect(within(metadata).getByText("June 2026")).toBeInTheDocument();
    expect(within(metadata).getByText(/Staff/i)).toBeInTheDocument();
    expect(within(metadata).getByText(/Reviewed/i)).toBeInTheDocument();
    expect(within(metadata).getByText(/Exceptions/i)).toBeInTheDocument();
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<PayrollManagerLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(6);
  });

  // ── Liveness Footer ────────────────────────────────────────────────

  it("shows Layer 1 deterministic liveness footer", () => {
    render(<PayrollManagerLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/deterministic/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("shows entity information", () => {
    render(<PayrollManagerLiveness />);
    const mentions = screen.getAllByText(/Xenboox/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });
});
