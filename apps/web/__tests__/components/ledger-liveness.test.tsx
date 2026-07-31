import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LedgerLiveness } from "@/components/agents/ledger-liveness";

describe("LedgerLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Posting Pipeline ──────────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<LedgerLiveness />);
    expect(
      screen.getByRole("heading", { name: /Ledger Agent/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("General Ledger — Posting Authority"),
    ).toBeInTheDocument();
  });

  it("renders pipeline stages in correct order: RECEIVED → VALIDATING_ACCOUNTS → VALIDATING_BALANCE → CHECKING_PERIOD → POSTING", () => {
    render(<LedgerLiveness />);
    expect(screen.getByText("Validation Pipeline")).toBeInTheDocument();
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent);
    const receivedIdx = stageLabels.findIndex((t) => t?.includes("RECEIVED"));
    const accountsIdx = stageLabels.findIndex((t) =>
      t?.includes("VALIDATING_ACCOUNTS"),
    );
    const balanceIdx = stageLabels.findIndex((t) =>
      t?.includes("VALIDATING_BALANCE"),
    );
    const periodIdx = stageLabels.findIndex((t) =>
      t?.includes("CHECKING_PERIOD"),
    );
    const postingIdx = stageLabels.findIndex((t) => t?.includes("POSTING"));

    expect(receivedIdx).toBeLessThan(accountsIdx);
    expect(accountsIdx).toBeLessThan(balanceIdx);
    expect(balanceIdx).toBeLessThan(periodIdx);
    expect(periodIdx).toBeLessThan(postingIdx);
  });

  it("shows the current operation status", () => {
    render(<LedgerLiveness />);
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("shows the journal entry being processed", () => {
    render(<LedgerLiveness />);
    expect(
      screen.getByRole("region", { name: /Journal Entry Details/i }),
    ).toBeInTheDocument();
  });

  it("displays double-entry validation result (debits = credits)", () => {
    render(<LedgerLiveness />);
    const debitMentions = screen.getAllByText(/Debits/);
    expect(debitMentions.length).toBeGreaterThanOrEqual(1);
    const creditMentions = screen.getAllByText(/Credits/);
    expect(creditMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows entity information", () => {
    render(<LedgerLiveness />);
    const mentions = screen.getAllByText(/Xenboox/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Zero Confidence Scores (Layer 1 Deterministic) ─────────────────

  it("does NOT render any confidence meters on the Ledger Agent's own stages", () => {
    render(<LedgerLiveness />);
    const meters = screen.queryAllByRole("meter");
    expect(meters.length).toBe(0);
  });

  it("does NOT show 'Agent Confidence' summary", () => {
    render(<LedgerLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  it("shows deterministic pass/fail indicators, not confidence percentages", () => {
    const { container } = render(<LedgerLiveness />);
    // No confidence meters (role="meter") on Ledger Agent's own stages
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
    // CheckCircle2 icons present as success indicators — lucide-react renders SVGs.
    // Match both old (lucide-check-circle-2) and new (lucide-circle-check) class naming.
    const checkIcons = container.querySelectorAll(
      'svg[class*="circle-check"], svg[class*="check-circle"]',
    );
    // Account for all the CheckCircle2 icons in the UI: header badge, table balanced badge,
    // Posted because area, pipeline completed stages, constraint badges (6)
    expect(checkIcons.length).toBeGreaterThanOrEqual(1);
  });

  // ── Source Agent Attribution ────────────────────────────────────────

  it("attributes the entry to a source agent", () => {
    render(<LedgerLiveness />);
    const mentions = screen.getAllByText(/AP Agent/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("labels source agent confidence separately from Ledger Agent", () => {
    render(<LedgerLiveness />);
    const mentions = screen.getAllByText(/confidence: 96%/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── "Why" Explanation ──────────────────────────────────────────────

  it("shows the deterministic 'Posted because' explanation", () => {
    render(<LedgerLiveness />);
    expect(screen.getByText(/Posted because/i)).toBeInTheDocument();
    const debitMentions = screen.getAllByText(/debits/i);
    expect(debitMentions.length).toBeGreaterThanOrEqual(1);
    const creditMentions = screen.getAllByText(/credits/i);
    expect(creditMentions.length).toBeGreaterThanOrEqual(1);
    // Appears in both the "Posted because" card and the state-transitions feed
    expect(
      screen.getAllByText(/period Q2 2026 is open/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── State Transition Feed ───────────────────────────────────────────

  it("shows a live state transition feed", () => {
    render(<LedgerLiveness />);
    expect(screen.getByText(/State Transitions/i)).toBeInTheDocument();
  });

  it("shows recent state transitions in the feed", () => {
    render(<LedgerLiveness />);
    const received = screen.getAllByText("RECEIVED");
    expect(received.length).toBeGreaterThanOrEqual(1);
    const accounts = screen.getAllByText("VALIDATING_ACCOUNTS");
    expect(accounts.length).toBeGreaterThanOrEqual(1);
  });

  // ── Liveness Transparency ───────────────────────────────────────────

  it("shows the 'how it works' decomposition toggle", () => {
    render(<LedgerLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals step details when 'How It Works' is clicked", () => {
    render(<LedgerLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    expect(screen.getByText(/Receive Entry/)).toBeInTheDocument();
    expect(screen.getByText(/Validate Each Account/)).toBeInTheDocument();
    expect(screen.getByText(/Sum and Compare/)).toBeInTheDocument();
    expect(screen.getByText(/Check Period Status/)).toBeInTheDocument();
    expect(screen.getByText(/Write Posting/)).toBeInTheDocument();
  });

  // ── Constraint Enforcement ──────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<LedgerLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Accounts Exist")).toBeInTheDocument();
    expect(screen.getByText("Debits = Credits (Balanced)")).toBeInTheDocument();
    expect(screen.getByText("Period Open")).toBeInTheDocument();
    expect(screen.getByText("Entity Scoped")).toBeInTheDocument();
  });

  // ── Audit Trail ─────────────────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<LedgerLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with timestamps and state info when expanded", () => {
    render(<LedgerLiveness />);
    // The audit trail is in a toggleable section — click to expand
    const auditToggle = screen.getByText(
      /Audit Trail — Every State Transition/,
    );
    fireEvent.click(auditToggle);
    // After expanding, the audit table should show rows
    const auditRows = screen.getAllByRole("row");
    // Audit rows + journal entry table rows
    expect(auditRows.length).toBeGreaterThanOrEqual(5);
  });

  // ── Accessibility ───────────────────────────────────────────────────

  it("has proper heading hierarchy", () => {
    render(<LedgerLiveness />);
    expect(
      screen.getByRole("heading", { level: 2, name: /Ledger Agent/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Validation Pipeline/i }),
    ).toBeInTheDocument();
  });

  it("renders with accessible region roles", () => {
    render(<LedgerLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  it("shows the current fiscal period", () => {
    render(<LedgerLiveness />);
    const mentions = screen.getAllByText(/Fiscal Period|Q2 2026/);
    expect(mentions.length).toBeGreaterThanOrEqual(2);
  });

  // ── Entry Lines Display ─────────────────────────────────────────────

  it("shows individual journal entry lines", () => {
    render(<LedgerLiveness />);
    const entryLines = screen.getAllByRole("row");
    expect(entryLines.length).toBeGreaterThanOrEqual(2);
  });

  // ── Edge Cases: Empty State ─────────────────────────────────────────

  it("shows 'No entry being processed' empty state when no active entry", () => {
    render(<LedgerLiveness showEmptyState />);
    expect(screen.getByText(/No entry being processed/i)).toBeInTheDocument();
  });

  // ── Edge Cases: Rejection States ────────────────────────────────────

  it("shows 'Needs Attention' strip when entry validation fails", () => {
    render(<LedgerLiveness showRejection="REJECTED_UNBALANCED" />);
    expect(screen.getByText(/Needs Attention/i)).toBeInTheDocument();
  });

  it("shows rejection reason in Needs Attention strip", () => {
    render(<LedgerLiveness showRejection="REJECTED_UNBALANCED" />);
    expect(screen.getByText(/Short \$12.40/i)).toBeInTheDocument();
  });

  it("shows REJECTED_INVALID_ACCOUNT with specific unknown account code", () => {
    render(<LedgerLiveness showRejection="REJECTED_INVALID_ACCOUNT" />);
    expect(screen.getByText(/Needs Attention/i)).toBeInTheDocument();
    expect(screen.getByText(/account code 9999/i)).toBeInTheDocument();
  });

  it("shows REJECTED_PERIOD_CLOSED with specific period info", () => {
    render(<LedgerLiveness showRejection="REJECTED_PERIOD_CLOSED" />);
    const attention = screen.getAllByText(/Needs Attention/i);
    expect(attention.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Period Q1 2026/i)).toBeInTheDocument();
  });

  it("routes rejection to originating agent in the explanation", () => {
    render(<LedgerLiveness showRejection="REJECTED_UNBALANCED" />);
    const mentions = screen.getAllByText(/Returned to AP Agent/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Liveness Footer ─────────────────────────────────────────────────

  it("shows Layer 1 deterministic liveness footer", () => {
    render(<LedgerLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const detMentions = screen.getAllByText(/deterministic/i);
    expect(detMentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Highlight Animation ─────────────────────────────────────────────

  it("shows highlight animation class on recently posted rows", () => {
    const { container } = render(<LedgerLiveness />);
    const rows = container.querySelectorAll("tr");
    const hasAnimateClass = Array.from(rows).some(
      (row) => row.className && row.className.includes("animate"),
    );
    expect(hasAnimateClass).toBe(true);
  });

  // ── Cross-Agent Info ────────────────────────────────────────────────

  it("shows that Ledger Agent never initiates work", () => {
    render(<LedgerLiveness />);
    const mentions = screen.getAllByText(/never initiates/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });
});
