import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaxLiveness } from "@/components/agents/tax-liveness";

describe("TaxLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Return Assembly ───────────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<TaxLiveness />);
    expect(screen.getByText(/Tax Agent/i)).toBeInTheDocument();
    const role = screen.getAllByText(
      /Tax — transactions to compliance review/i,
    );
    expect(role.length).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order: TRANSACTIONS_SCANNED → RATE_RULE_APPLIED → RETURN_LINE_ASSEMBLED → DEADLINE_CHECKED → HANDED_TO_COMPLIANCE_REVIEW", () => {
    render(<TaxLiveness />);
    const stages = screen.getAllByRole("listitem");
    const labels = stages.map((el) => el.textContent);
    const scannedIdx = labels.findIndex((t) =>
      t?.includes("TRANSACTIONS_SCANNED"),
    );
    const ruleIdx = labels.findIndex((t) => t?.includes("RATE_RULE_APPLIED"));
    const lineIdx = labels.findIndex((t) =>
      t?.includes("RETURN_LINE_ASSEMBLED"),
    );
    const deadlineIdx = labels.findIndex((t) =>
      t?.includes("DEADLINE_CHECKED"),
    );
    const handoffIdx = labels.findIndex((t) =>
      t?.includes("HANDED_TO_COMPLIANCE_REVIEW"),
    );
    expect(scannedIdx).toBeGreaterThanOrEqual(0);
    expect(ruleIdx).toBeGreaterThan(scannedIdx);
    expect(lineIdx).toBeGreaterThan(ruleIdx);
    expect(deadlineIdx).toBeGreaterThan(lineIdx);
    expect(handoffIdx).toBeGreaterThan(deadlineIdx);
  });

  it("shows the current operation status", () => {
    render(<TaxLiveness />);
    const mentions = screen.getAllByText(/RATE_RULE_APPLIED/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows entity information", () => {
    render(<TaxLiveness />);
    const mentions = screen.getAllByText(/Xenboox HQ/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Transaction Scanning (Spec §2/§3 — deterministic) ───────────────

  it("shows the transaction scan with VAT relevance", () => {
    render(<TaxLiveness />);
    const scans = screen.getAllByText(
      /Scanning Q2 2026 transactions for VAT relevance/i,
    );
    expect(scans.length).toBeGreaterThanOrEqual(1);
    const flagged = screen.getAllByText(/flagged/i);
    expect(flagged.length).toBeGreaterThanOrEqual(1);
  });

  // ── Rule Citation Per Line (Spec §3/§5 — the critical rule) ─────────

  it("shows rule citation per line with rate, rule name, jurisdiction, effective date", () => {
    render(<TaxLiveness />);
    // The rendered basis carries decimals: "GMD 500.00 × 15% = GMD 75.00 —
    // GRA Gambia standard VAT rate, effective since Jan 1 2026"
    expect(
      screen.getByText(
        /GMD 500\.00 × 15% = GMD 75\.00 — GRA Gambia standard VAT rate, effective since Jan 1 2026/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows each return line traceable to its source transaction", () => {
    render(<TaxLiveness />);
    const sale = screen.getAllByText(/VAT on sale #1042/i);
    expect(sale.length).toBeGreaterThanOrEqual(1);
    const purchase = screen.getAllByText(/VAT on purchase #PO-2088/i);
    expect(purchase.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the rule version cited, not just a current rate", () => {
    render(<TaxLiveness />);
    const ruleVersions = screen.getAllByText(/rule v2/i);
    expect(ruleVersions.length).toBeGreaterThanOrEqual(1);
  });

  // ── No-Matching-Rule Critical Rule (Spec §2/§3/§6) ───────────────────

  it("does NOT silently apply a 'closest' rule to an unmatched transaction", () => {
    render(<TaxLiveness />);
    expect(
      screen.getByText(/No rule found for transaction type/i),
    ).toBeInTheDocument();
    const notCalculated = screen.getAllByText(
      /flagged for Compliance Agent, not calculated/i,
    );
    expect(notCalculated.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the no-rule gap excluded from the return until resolved", () => {
    render(<TaxLiveness />);
    const excluded = screen.getAllByText(/excluded from the return/i);
    expect(excluded.length).toBeGreaterThanOrEqual(1);
    const blocking = screen.getAllByText(/blocking for that line only/i);
    expect(blocking.length).toBeGreaterThanOrEqual(1);
  });

  // ── Return Assembly + Deadline (Spec §4 — persistent countdown) ─────

  it("shows the return assembling line by line", () => {
    render(<TaxLiveness />);
    expect(screen.getByText(/Return Lines/i)).toBeInTheDocument();
    const lines = screen.getAllByText(/VAT on /i);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the deadline countdown persistently", () => {
    render(<TaxLiveness />);
    // 'Deadline' appears in the section header AND the DEADLINE_CHECKED
    // pipeline description ("Filing deadline confirmed") — count assertion.
    const deadlineMentions = screen.getAllByText(/Deadline/i);
    expect(deadlineMentions.length).toBeGreaterThanOrEqual(1);
    const due = screen.getAllByText(/Due/i);
    expect(due.length).toBeGreaterThanOrEqual(1);
    const daysLeft = screen.getAllByText(/12 days remaining/i);
    expect(daysLeft.length).toBeGreaterThanOrEqual(1);
  });

  // ── Meter Discipline (entire spec is deterministic — 0 meters) ──────

  it("renders ZERO confidence meters — tax calculations are deterministic rule lookups", () => {
    const { container } = render(<TaxLiveness />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  it("does NOT render a meter on the rule application card", () => {
    const { container } = render(<TaxLiveness />);
    const ruleCard = container.querySelector('[data-step="rule"]');
    expect(ruleCard).not.toBeNull();
    expect(ruleCard?.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ────────────────────────

  it("shows escalation triggers table", () => {
    render(<TaxLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    const compliance = screen.getAllByText(/Compliance Agent/i);
    expect(compliance.length).toBeGreaterThanOrEqual(1);
  });

  it("shows no-rule escalation with blocking semantics", () => {
    render(<TaxLiveness />);
    const noRule = screen.getAllByText(/No matching tax rule/i);
    expect(noRule.length).toBeGreaterThanOrEqual(1);
    const blocking = screen.getAllByText(/blocking/i);
    expect(blocking.length).toBeGreaterThanOrEqual(1);
  });

  it("shows stale-rule-set escalation as informational", () => {
    render(<TaxLiveness />);
    const stale = screen.getAllByText(/Rate table last confirmed/i);
    expect(stale.length).toBeGreaterThanOrEqual(1);
    const informational = screen.getAllByText(/informational/i);
    expect(informational.length).toBeGreaterThanOrEqual(1);
  });

  // ── Branch: No Matching Rule (Spec §6 — blocking for that line) ─────

  it("shows the no-rule branch — transaction excluded, not calculated", () => {
    render(<TaxLiveness showNoRule />);
    expect(screen.getByText(/Tax Rule Gap Flagged/i)).toBeInTheDocument();
    const crossBorder = screen.getAllByText(
      /cross-border digital service fee/i,
    );
    expect(crossBorder.length).toBeGreaterThanOrEqual(1);
    const blocked = screen.getAllByText(/blocking for that line only/i);
    expect(blocked.length).toBeGreaterThanOrEqual(1);
  });

  it("no-rule branch renders 0 confidence meters", () => {
    const { container } = render(<TaxLiveness showNoRule />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Branch: Deadline Urgent (Spec §6 — non-blocking but urgent) ─────

  it("shows deadline-urgent branch — countdown turns to alert", () => {
    render(<TaxLiveness showDeadlineUrgent />);
    expect(screen.getByText(/Filing Deadline — Urgent/i)).toBeInTheDocument();
    const urgent = screen.getAllByText(/escalating urgency/i);
    expect(urgent.length).toBeGreaterThanOrEqual(1);
    const days = screen.getAllByText(/3 days remaining/i);
    expect(days.length).toBeGreaterThanOrEqual(1);
  });

  it("deadline-urgent branch renders 0 confidence meters", () => {
    const { container } = render(<TaxLiveness showDeadlineUrgent />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Branch: Stale Rule Set (Spec §6 — non-blocking, informational) ──

  it("shows stale-rule-set branch — verify current, informational", () => {
    render(<TaxLiveness showStaleRules />);
    expect(
      screen.getByText(/Rule Set Stale — Verify Current/i),
    ).toBeInTheDocument();
    const lastConfirmed = screen.getAllByText(
      /Rate table last confirmed Jul 1 2026/i,
    );
    expect(lastConfirmed.length).toBeGreaterThanOrEqual(1);
    const info = screen.getAllByText(/informational/i);
    expect(info.length).toBeGreaterThanOrEqual(1);
  });

  it("stale-rule-set branch renders 0 confidence meters", () => {
    const { container } = render(<TaxLiveness showStaleRules />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Branch: Missing Transaction Data (Spec §7) ──────────────────────

  it("shows missing-data branch — flagged, not estimated", () => {
    render(<TaxLiveness showMissingData />);
    expect(screen.getByText(/Missing Transaction Data/i)).toBeInTheDocument();
    const notEstimated = screen.getAllByText(/flagged, not estimated/i);
    expect(notEstimated.length).toBeGreaterThanOrEqual(1);
  });

  it("missing-data branch renders 0 confidence meters", () => {
    const { container } = render(<TaxLiveness showMissingData />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Branch: Handed to Compliance Review (terminal) ──────────────────

  it("shows handoff branch — terminal for Tax Agent scope", () => {
    render(<TaxLiveness showHandedOff />);
    expect(
      screen.getByText(/Handed to Compliance Agent for review/i),
    ).toBeInTheDocument();
    const terminal = screen.getAllByText(/terminal for Tax Agent/i);
    expect(terminal.length).toBeGreaterThanOrEqual(1);
  });

  it("handoff branch renders 0 confidence meters", () => {
    const { container } = render(<TaxLiveness showHandedOff />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── How It Works (Spec §3 decomposition) ─────────────────────────────

  it("shows the 'How It Works' decomposition toggle", () => {
    render(<TaxLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals decomposed sub-steps when 'How It Works' is clicked", () => {
    render(<TaxLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    expect(
      screen.getByText(/Scan Transactions for Tax Relevance/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Apply Rate\/Rule per Transaction/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Assemble Return Line by Line/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Check Deadline/)).toBeInTheDocument();
    expect(screen.getByText(/Hand to Compliance Agent/)).toBeInTheDocument();
  });

  // ── Constraint Enforcement ──────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<TaxLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Rule Cited Per Line")).toBeInTheDocument();
    expect(screen.getByText("Never Guess a Rule")).toBeInTheDocument();
    expect(screen.getByText("Rule Versioned")).toBeInTheDocument();
    expect(screen.getByText("Deadline Tracked")).toBeInTheDocument();
  });

  // ── Audit Trail (Spec §8) ───────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<TaxLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with rule version, gaps, deadline checks, handoff when expanded", () => {
    render(<TaxLiveness />);
    const toggle = screen.getByText(/Audit Trail — Every Rule Application/i);
    fireEvent.click(toggle);
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(7);
    const headers = screen.getAllByRole("columnheader");
    const headerText = headers.map((h) => h.textContent).join(" ");
    expect(headerText).toMatch(/Rule/i);
    expect(headerText).toMatch(/Version/i);
    expect(headerText).toMatch(/Detail/i);
  });

  // ── Cross-Agent Dependencies (Spec §10) ─────────────────────────────

  it("shows the cross-agent chain (Compliance rule sets, Ledger data, handoff to Compliance)", () => {
    render(<TaxLiveness />);
    const compliance = screen.getAllByText(/Compliance Agent/i);
    expect(compliance.length).toBeGreaterThanOrEqual(1);
    const ledger = screen.getAllByText(/Ledger Agent/i);
    expect(ledger.length).toBeGreaterThanOrEqual(1);
  });

  // ── Accessibility ───────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<TaxLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  // ── Empty State ─────────────────────────────────────────────────────

  it("shows 'No tax run being processed' empty state", () => {
    render(<TaxLiveness showEmptyState />);
    expect(screen.getByText(/No tax run being processed/i)).toBeInTheDocument();
  });

  // ── Liveness Footer ─────────────────────────────────────────────────

  it("shows the deterministic liveness footer", () => {
    render(<TaxLiveness />);
    const detMentions = screen.getAllByText(/deterministic/i);
    expect(detMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the rule-citation footer note", () => {
    render(<TaxLiveness />);
    const ruleMentions = screen.getAllByText(
      /rule cited per line|rule version/i,
    );
    expect(ruleMentions.length).toBeGreaterThanOrEqual(1);
  });
});
