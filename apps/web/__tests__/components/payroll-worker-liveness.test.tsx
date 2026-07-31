import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PayrollWorkerLiveness } from "@/components/agents/payroll-worker-liveness";

describe("PayrollWorkerLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Payroll Run ──────────────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<PayrollWorkerLiveness />);
    // Agent name appears in the header AND the cross-agent handoff chain
    expect(
      screen.getAllByText("Payroll Worker Agent").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Payroll — Staff Processing/i)).toBeInTheDocument();
  });

  it("renders the payroll run metadata", () => {
    render(<PayrollWorkerLiveness />);
    // Run ID appears in the header attribution, status grid, and staff list header
    expect(screen.getAllByText(/PR-2026-07/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/July 2026/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Xenboox HQ/).length).toBeGreaterThanOrEqual(1);
  });

  // ── Per-Staff Progress List (not a single spinner) ───────────────────

  it("renders per-staff progress as a list, processing top to bottom", () => {
    render(<PayrollWorkerLiveness />);
    expect(
      screen.getByText(/Staff Processing — top to bottom/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Awa Jallow")).toBeInTheDocument();
    expect(screen.getByText("Bakary Camara")).toBeInTheDocument();
    expect(screen.getByText("Fatou Sowe")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
  });

  it("shows the state for each staff member", () => {
    render(<PayrollWorkerLiveness />);
    const states = screen.getAllByText(
      /STAFF_SELECTED|GROSS_CALCULATED|DEDUCTIONS_CALCULATED|NET_CALCULATED|PAYSLIP_DRAFTED|PAYSLIP_APPROVED|JOURNAL_HANDED_OFF|EXCEPTION_FLAGGED/,
    );
    expect(states.length).toBeGreaterThanOrEqual(3);
  });

  // ── Zero Confidence Scores (Layer 1 Deterministic) ─────────────────

  it("does NOT render any confidence meters on the Payroll Worker Agent's own steps", () => {
    render(<PayrollWorkerLiveness />);
    const meters = screen.queryAllByRole("meter");
    expect(meters.length).toBe(0);
  });

  it("does NOT show an 'Agent Confidence' summary", () => {
    render(<PayrollWorkerLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  // ── Deduction Decomposition (Anti-Hallucination) ─────────────────────

  it("never collapses deductions into a single lump number — PAYE has its own line with band applied", () => {
    render(<PayrollWorkerLiveness />);
    // Awa Jallow (DEDUCTIONS_CALCULATED) is expanded by default per Spec §4
    expect(screen.getAllByText(/PAYE/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Gambia band 2 \(15%\)/)).toBeInTheDocument();
    expect(screen.getByText(/GMD 84\.20/)).toBeInTheDocument();
  });

  it("shows social security on its own line with the rate applied", () => {
    render(<PayrollWorkerLiveness />);
    fireEvent.click(screen.getByText("Bakary Camara"));
    expect(screen.getAllByText(/SSHFC/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/GMD 22\.50/)).toBeInTheDocument();
  });

  it("shows loan deduction on its own line with installment and remaining balance", () => {
    render(<PayrollWorkerLiveness />);
    // Loan line visible without a click — Awa is expanded by default
    expect(screen.getAllByText(/Staff Loan/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/remaining balance GMD 150\.00/i),
    ).toBeInTheDocument();
  });

  it("shows the deduction breakdown by default for the active staff (never collapsed to one number)", () => {
    render(<PayrollWorkerLiveness />);
    // Section header + Awa's expanded breakdown + her collapsed summary all surface
    expect(
      screen.getAllByText(/Deduction Breakdown/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Net pay: GMD 517\.80/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the active staff member's deduction lines WITHOUT a click (Spec §4: never collapsed by default)", () => {
    render(<PayrollWorkerLiveness />);
    // Awa Jallow is the staff currently at DEDUCTIONS_CALCULATED — her PAYE,
    // SSHFC, and loan lines must be visible without expanding. No fireEvent.
    expect(
      screen.getByText(/PAYE calculated as GMD 84\.20/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/SSHFC calculated as GMD 33\.00/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/remaining balance GMD 150\.00/i),
    ).toBeInTheDocument();
  });

  it("does not hide every deduction behind a click — at least one staff breakdown is expanded by default", () => {
    render(<PayrollWorkerLiveness />);
    // The "Why:" label is only rendered inside an expanded deduction breakdown
    expect(screen.getAllByText(/Why:/i).length).toBeGreaterThanOrEqual(1);
  });

  // ── "Why" Explanations ──────────────────────────────────────────────

  it("shows the 'Why' explanation for PAYE with the specific band and taxable income", () => {
    render(<PayrollWorkerLiveness />);
    // Awa's breakdown is visible by default — no click required
    expect(screen.getAllByText(/Why:/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/PAYE calculated as GMD 84\.20/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /band 2 \(15%\) applied to taxable income of GMD 561\.33/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the 'Why' explanation for SSHFC with the rate applied", () => {
    render(<PayrollWorkerLiveness />);
    fireEvent.click(screen.getByText("Bakary Camara"));
    expect(
      screen.getByText(/SSHFC calculated as GMD 22\.50/i),
    ).toBeInTheDocument();
  });

  it("never shows a bare 'Deductions: $340' style number with no detail", () => {
    render(<PayrollWorkerLiveness />);
    expect(screen.queryByText(/Deductions: \$/)).not.toBeInTheDocument();
  });

  // ── Exception-Flagged Staff (Attention Amber) ───────────────────────

  it("visually separates exception-flagged staff from standard-flow staff", () => {
    render(<PayrollWorkerLiveness />);
    // Fatou Sowe is the exception-flagged staff member
    expect(screen.getByText("Fatou Sowe")).toBeInTheDocument();
    expect(
      screen.getAllByText(/EXCEPTION_FLAGGED/).length,
    ).toBeGreaterThanOrEqual(1);
    // Exception card requires Payroll Manager Agent sign-off
    expect(
      screen.getByText(/Payroll Manager Agent confirmation/i),
    ).toBeInTheDocument();
  });

  // ── Escalation & Human-in-the-Loop Triggers ─────────────────────────

  it("shows escalation triggers: new starter / leaver / salary change / bonus → Payroll Manager Agent", () => {
    render(<PayrollWorkerLiveness />);
    const mentions = screen.getAllByText(/Payroll Manager Agent/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows jurisdiction rate lookup failure escalates to Compliance Agent", () => {
    render(<PayrollWorkerLiveness />);
    expect(screen.getByText(/No rate table found for/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Compliance Agent/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows net pay negative as a hard stop, never silently clamped", () => {
    render(<PayrollWorkerLiveness />);
    expect(
      screen.getByText(/Hard stop — net pay negative/i),
    ).toBeInTheDocument();
  });

  // ── Error / Failure States ──────────────────────────────────────────

  it("flags missing bank details distinctly from a calculation error", () => {
    render(<PayrollWorkerLiveness />);
    expect(
      screen.getByText(
        /missing bank details — payslip drafted but payment blocked/i,
      ),
    ).toBeInTheDocument();
  });

  it("parks staff with incomplete records in EXCEPTION_FLAGGED naming the missing field", () => {
    render(<PayrollWorkerLiveness />);
    expect(
      screen.getByText(/Incomplete staff record — missing: contract/i),
    ).toBeInTheDocument();
  });

  // ── Audit Trail ─────────────────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<PayrollWorkerLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with rate table version and approver when expanded", () => {
    render(<PayrollWorkerLiveness />);
    const auditToggle = screen.getByText(/Audit Trail — Every Deduction Line/i);
    fireEvent.click(auditToggle);
    expect(screen.getByText(/rule: GRA-PAYE-2026\.07/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Payroll Manager Agent/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the compliance rate table last-updated date (staleness visibility)", () => {
    render(<PayrollWorkerLiveness />);
    expect(
      screen.getByText(/Rate table last updated Jul 28, 2026/i),
    ).toBeInTheDocument();
  });

  // ── Cross-Agent Dependencies ────────────────────────────────────────

  it("shows the handoff chain: Payroll Worker → Manager → Ledger", () => {
    render(<PayrollWorkerLiveness />);
    expect(
      screen.getByText(/Handed to Ledger Agent for posting/i),
    ).toBeInTheDocument();
  });

  // ── Liveness Transparency ───────────────────────────────────────────

  it("shows the 'How It Works' decomposition toggle", () => {
    render(<PayrollWorkerLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals step details when 'How It Works' is clicked — deductions are never one combined call", () => {
    render(<PayrollWorkerLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    expect(screen.getByText(/Pull Staff Record/)).toBeInTheDocument();
    expect(screen.getByText(/Calculate PAYE/)).toBeInTheDocument();
    expect(screen.getByText(/Calculate Social Security/)).toBeInTheDocument();
    expect(screen.getByText(/Calculate Loan Deduction/)).toBeInTheDocument();
    expect(screen.getByText(/Sum Net/)).toBeInTheDocument();
    // Critical rule: steps 3, 4, 5 must never be combined into one "deductions" call
    expect(
      screen.getByText(/NEVER combined into a single 'deductions' call/i),
    ).toBeInTheDocument();
  });

  // ── Constraint Enforcement ──────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<PayrollWorkerLiveness />);
    expect(screen.getByText(/Statutory Formula/)).toBeInTheDocument();
    expect(screen.getByText(/Rate Table Versioned/)).toBeInTheDocument();
    expect(screen.getByText(/Jurisdiction Scoped/)).toBeInTheDocument();
    expect(screen.getByText(/Exception Never Silent/)).toBeInTheDocument();
  });

  // ── Accessibility ───────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<PayrollWorkerLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  // ── Period Information ──────────────────────────────────────────────

  it("shows the current payroll period", () => {
    render(<PayrollWorkerLiveness />);
    const mentions = screen.getAllByText(/Payroll Period|July 2026/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Edge Cases: Empty State ─────────────────────────────────────────

  it("shows 'No payroll run in progress' empty state when no run is active", () => {
    render(<PayrollWorkerLiveness showEmptyState />);
    expect(screen.getByText(/No payroll run in progress/i)).toBeInTheDocument();
  });

  // ── Edge Cases: Exception States ────────────────────────────────────

  it("shows 'Needs Attention' strip when a staff member is exception-flagged", () => {
    render(<PayrollWorkerLiveness showException="NEW_STARTER" />);
    expect(screen.getByText(/Needs Attention/i)).toBeInTheDocument();
  });

  it("shows NEW_STARTER exception routed to Payroll Manager Agent", () => {
    render(<PayrollWorkerLiveness showException="NEW_STARTER" />);
    expect(screen.getByText(/New starter detected/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Escalated to Payroll Manager Agent/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows LEAVER exception with final settlement flag", () => {
    render(<PayrollWorkerLiveness showException="LEAVER" />);
    expect(screen.getByText(/Leaver detected/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Final settlement calculation/i),
    ).toBeInTheDocument();
  });

  it("shows SALARY_CHANGE exception requiring confirmation before calc proceeds", () => {
    render(<PayrollWorkerLiveness showException="SALARY_CHANGE" />);
    expect(screen.getByText(/Salary change detected/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Payroll Manager Agent confirmation before calculation proceeds/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows BONUS exception as its own explicit sub-flow", () => {
    render(<PayrollWorkerLiveness showException="BONUS" />);
    expect(screen.getByText(/Bonus flagged this period/i)).toBeInTheDocument();
  });

  it("shows RATE_TABLE_MISSING exception with specific jurisdiction", () => {
    render(<PayrollWorkerLiveness showException="RATE_TABLE_MISSING" />);
    expect(
      screen.getByText(/No rate table found for jurisdiction GM/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Compliance Agent/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows NEGATIVE_NET hard stop — never silently clamped to zero", () => {
    render(<PayrollWorkerLiveness showException="NEGATIVE_NET" />);
    expect(screen.getByText(/Hard stop/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Never silently clamped to zero/i),
    ).toBeInTheDocument();
  });

  it("shows MISSING_BANK_DETAILS as payment-blocked, distinct from calc error", () => {
    render(<PayrollWorkerLiveness showException="MISSING_BANK_DETAILS" />);
    expect(screen.getByText(/Missing bank details/i)).toBeInTheDocument();
    expect(screen.getByText(/payment step blocked/i)).toBeInTheDocument();
  });

  it("shows INCOMPLETE_STAFF_RECORD parked in EXCEPTION_FLAGGED with the missing field named", () => {
    render(<PayrollWorkerLiveness showException="INCOMPLETE_STAFF_RECORD" />);
    expect(screen.getByText(/Incomplete staff record/i)).toBeInTheDocument();
    expect(screen.getByText(/missing field: contract/i)).toBeInTheDocument();
  });

  // ── Liveness Footer ─────────────────────────────────────────────────

  it("shows Layer 1 deterministic liveness footer", () => {
    render(<PayrollWorkerLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const detMentions = screen.getAllByText(/deterministic/i);
    expect(detMentions.length).toBeGreaterThanOrEqual(1);
  });
});
