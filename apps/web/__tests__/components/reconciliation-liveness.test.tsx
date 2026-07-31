import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReconciliationLiveness } from "@/components/agents/reconciliation-liveness";

describe("ReconciliationLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Reconciliation Run ─────────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<ReconciliationLiveness />);
    expect(
      screen.getAllByText("Reconciliation Agent").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Bank Reconciliation — Matching Engine/i),
    ).toBeInTheDocument();
  });

  it("renders the reconciliation metadata", () => {
    render(<ReconciliationLiveness />);
    // Account + period + statement line count surface in the header/grid
    expect(
      screen.getAllByText(/Main Operating Account/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/June 2026/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/214/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows the statement was read with line count, not a spinner", () => {
    render(<ReconciliationLiveness />);
    expect(screen.getByText(/214 lines found/i)).toBeInTheDocument();
    expect(screen.getByText(/Reading statement/i)).toBeInTheDocument();
  });

  // ── State Machine ─────────────────────────────────────────────────────

  it("renders all 6 state machine states as pipeline badges", () => {
    render(<ReconciliationLiveness />);
    // Assert each state individually so a missing pipeline badge can't hide behind footer text
    for (const state of [
      "STATEMENT_INGESTED",
      "MATCHING_PASS_1",
      "MATCHING_PASS_2",
      "BUCKETING_UNMATCHED",
      "AWAITING_TREASURY_REVIEW",
      "CLOSED",
    ]) {
      expect(screen.getAllByText(state).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("shows the current operation status", () => {
    render(<ReconciliationLiveness />);
    // Status grid + pipeline StateBadge both surface the active state
    expect(
      screen.getAllByText("BUCKETING_UNMATCHED").length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Critical Rule: Exact vs Fuzzy Visual Weight (Spec §3, §4) ─────────

  it("renders exact matches with a solid connector and NO confidence badge", () => {
    const { container } = render(<ReconciliationLiveness />);
    // Exact matches use a solid connector class, never dashed
    expect(
      container.querySelectorAll(".recon-connector--exact").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      container.querySelectorAll(".recon-connector--fuzzy").length,
    ).toBeGreaterThanOrEqual(1);
    // Exact match row: no confidence badge inside it
    const exactRow = container.querySelector('[data-match-kind="exact"]');
    expect(exactRow).not.toBeNull();
    expect(exactRow!.querySelectorAll('[role="meter"]').length).toBe(0);
    expect(exactRow!.textContent).not.toMatch(/82%/);
  });

  it("renders fuzzy matches with a dashed connector AND a confidence percentage badge", () => {
    const { container } = render(<ReconciliationLiveness />);
    const fuzzyRow = container.querySelector('[data-match-kind="fuzzy"]');
    expect(fuzzyRow).not.toBeNull();
    // Dashed connector
    expect(
      fuzzyRow!.querySelectorAll(".recon-connector--fuzzy").length,
    ).toBeGreaterThanOrEqual(1);
    // Confidence badge visible
    expect(
      fuzzyRow!.querySelectorAll('[role="meter"]').length,
    ).toBeGreaterThanOrEqual(1);
    expect(fuzzyRow!.textContent).toMatch(/82%/);
  });

  it("shows fuzzy matches with a lower-confidence badge and the criteria used", () => {
    render(<ReconciliationLiveness />);
    expect(
      screen.getByText(/Fuzzy matched \(82% confidence\)/i),
    ).toBeInTheDocument();
    // Criteria appears both as a chip and in the "Why" — accept multiple
    expect(
      screen.getAllByText(/date within 3-day window/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/no reference on bank side/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("exact matches show match criteria explicitly, not just 'matched'", () => {
    render(<ReconciliationLiveness />);
    expect(
      screen.getByText(/reference #WV-88213 identical on both/i),
    ).toBeInTheDocument();
  });

  it("shows only probabilistic layers with confidence meters — exact/parse carry none", () => {
    const { container } = render(<ReconciliationLiveness />);
    const meters = container.querySelectorAll('[role="meter"]');
    // Fuzzy match + unmatched buckets carry confidence; deterministic layers do not
    expect(meters.length).toBeGreaterThanOrEqual(1);
    // No meter inside the deterministic parse step row (assert row exists first —
    // never conditionally assert so the check can't pass vacuously)
    const parseRow = container.querySelector('[data-step="parse"]');
    expect(parseRow).not.toBeNull();
    expect(parseRow!.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── "Why" Explanations (Spec §5) ─────────────────────────────────────

  it("shows the exact match 'Why' with reference on both sides", () => {
    render(<ReconciliationLiveness />);
    expect(
      screen.getByText(
        /bank line GMD 1,240\.00 \(June 14\) ↔ ledger entry GMD 1,240\.00 \(June 14\)/i,
      ),
    ).toBeInTheDocument();
    // Reference appears in the bank-line chip and in the "Why"
    expect(screen.getAllByText(/#WV-88213/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows the fuzzy match 'Why' with confidence and date-window criteria", () => {
    render(<ReconciliationLiveness />);
    expect(
      screen.getByText(
        /bank line GMD 450\.00 \(June 18\) ↔ ledger entry GMD 450\.00 \(June 15\)/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the unmatched 'Why' with its bucket reason", () => {
    render(<ReconciliationLiveness />);
    expect(screen.getByText(/may post next period/i)).toBeInTheDocument();
  });

  it("never shows a bare 'matched' checkmark with no match criteria detail", () => {
    render(<ReconciliationLiveness />);
    expect(screen.queryByText(/Matched: \$/)).not.toBeInTheDocument();
  });

  // ── Unmatched Buckets (Spec §4: grouped, not flat) ───────────────────

  it("groups unmatched items by reason bucket with grouped headers", () => {
    render(<ReconciliationLiveness />);
    // Header + per-line "Why" both mention the bucket label
    expect(
      screen.getAllByText(/Likely timing difference/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/No matching ledger entry/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Duplicate suspected/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows item counts per bucket header", () => {
    render(<ReconciliationLiveness />);
    expect(
      screen.getByText(/Likely timing difference — \d+ item/i),
    ).toBeInTheDocument();
  });

  it("does not dump unmatched items in one flat list", () => {
    render(<ReconciliationLiveness />);
    // Grouped headers exist rather than a single "Unmatched items" flat table
    expect(screen.queryByText(/^Unmatched Items$/i)).not.toBeInTheDocument();
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ─────────────────────────

  it("shows that any unmatched item blocks CLOSED — escalates to Treasury Agent", () => {
    render(<ReconciliationLiveness />);
    expect(screen.getAllByText(/Treasury Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getByText(
        /3 items need review before this reconciliation can close/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows fuzzy matches below threshold as 'needs confirmation'", () => {
    render(<ReconciliationLiveness />);
    expect(screen.getByText(/needs confirmation/i)).toBeInTheDocument();
  });

  it("flags duplicate bank lines explicitly instead of resolving silently", () => {
    render(<ReconciliationLiveness />);
    // Appears in the bucket header AND the per-line "Why" — accept multiple
    expect(
      screen.getAllByText(/Duplicate suspected/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Treasury Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("shows the never-auto-close structural rule", () => {
    render(<ReconciliationLiveness />);
    const mentions = screen.getAllByText(
      /never auto-closes|never auto-close|cannot close itself|not permitted to transition to CLOSED/i,
    );
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Error / Failure States (Spec §7) ─────────────────────────────────

  it("shows parse failure routed back to Document Agent with friendly copy", () => {
    render(<ReconciliationLiveness showParseError />);
    expect(
      screen.getByText(/couldn't read this statement/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Document Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("shows per-account processing — never one merged pass", () => {
    render(<ReconciliationLiveness />);
    expect(
      screen.getAllByText(/Main Operating Account/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/all accounts merged/i)).not.toBeInTheDocument();
  });

  // ── Audit Trail (Spec §8) ────────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<ReconciliationLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("logs match type, criteria, confidence, pass, and timestamp when expanded", () => {
    render(<ReconciliationLiveness />);
    const auditToggle = screen.getByText(/Audit Trail — Every Match Logged/i);
    fireEvent.click(auditToggle);
    // "pass: N" appears both as its own column cell and inside detail text
    expect(
      screen.getAllByText(/match_type: exact/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/pass: 1/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/match_type: fuzzy/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/pass: 2/i).length).toBeGreaterThanOrEqual(1);
  });

  it("preserves both the original agent match and the human override", () => {
    render(<ReconciliationLiveness />);
    const auditToggle = screen.getByText(/Audit Trail — Every Match Logged/i);
    fireEvent.click(auditToggle);
    expect(screen.getByText(/original: fuzzy 82%/i)).toBeInTheDocument();
    expect(screen.getByText(/override: manual/i)).toBeInTheDocument();
  });

  // ── Cross-Agent Dependencies (Spec §10) ──────────────────────────────

  it("shows the handoff chain: Document → Reconciliation → Treasury → Ledger", () => {
    render(<ReconciliationLiveness />);
    // Agent name appears in header AND handoff chain
    expect(screen.getAllByText(/Document Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/Reconciliation Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Treasury Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/Ledger Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("states that only Treasury Agent can force CLOSED", () => {
    render(<ReconciliationLiveness />);
    // Appears in the handoff chain and the liveness footer
    expect(
      screen.getAllByText(
        /only Treasury Agent can|Treasury Agent.*can.*force.*CLOSED/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Liveness Transparency ────────────────────────────────────────────

  it("shows the 'How It Works' decomposition toggle", () => {
    render(<ReconciliationLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals step details when 'How It Works' is clicked — Pass 1 and Pass 2 are separate", () => {
    render(<ReconciliationLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    expect(screen.getByText(/Parse Statement/)).toBeInTheDocument();
    expect(screen.getByText(/Exact Match Pass/)).toBeInTheDocument();
    expect(screen.getByText(/Fuzzy Match Pass/)).toBeInTheDocument();
    expect(screen.getByText(/Bucket Remaining Unmatched/)).toBeInTheDocument();
    // Critical rule surfaced in decomposition
    expect(
      screen.getByText(/never combined into a single match call/i),
    ).toBeInTheDocument();
  });

  // ── Constraint Enforcement ───────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<ReconciliationLiveness />);
    expect(screen.getByText(/Exact ≠ Fuzzy Weight/)).toBeInTheDocument();
    expect(screen.getByText(/Pass 1 \/ Pass 2 Separate/)).toBeInTheDocument();
    expect(screen.getByText(/Never Auto-Closes/)).toBeInTheDocument();
    expect(screen.getByText(/Criteria Always Shown/)).toBeInTheDocument();
  });

  // ── Accessibility ────────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<ReconciliationLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  // ── Period Information ───────────────────────────────────────────────

  it("shows the reconciliation period", () => {
    render(<ReconciliationLiveness />);
    const mentions = screen.getAllByText(/Period|June 2026/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows entity scoping — Entity: Xenboox HQ in the status grid", () => {
    render(<ReconciliationLiveness />);
    // Entity name surfaces in the status grid Entity cell
    expect(screen.getAllByText("Xenboox HQ").length).toBeGreaterThanOrEqual(1);
    // Entity ID appears in the audit-trail footer once expanded
    const auditToggle = screen.getByText(/Audit Trail — Every Match Logged/i);
    fireEvent.click(auditToggle);
    expect(screen.getAllByText(/ent_2f8a1c/).length).toBeGreaterThanOrEqual(1);
  });

  // ── Edge Cases: Empty State ──────────────────────────────────────────

  it("shows 'No reconciliation in progress' empty state when idle", () => {
    render(<ReconciliationLiveness showEmptyState />);
    expect(
      screen.getByText(/No reconciliation in progress/i),
    ).toBeInTheDocument();
  });

  // ── Edge Cases: CLOSED State ─────────────────────────────────────────

  it("shows the CLOSED state with account and period", () => {
    render(<ReconciliationLiveness showClosed />);
    expect(screen.getByText(/Reconciliation closed/i)).toBeInTheDocument();
    expect(screen.getByText(/Main Operating Account/i)).toBeInTheDocument();
    expect(screen.getByText(/June 2026/i)).toBeInTheDocument();
  });

  it("shows who approved the closure", () => {
    render(<ReconciliationLiveness showClosed />);
    expect(screen.getAllByText(/Treasury Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  // ── Edge Cases: Treasury Review Needed ───────────────────────────────

  it("shows 'Needs Attention' strip when items await Treasury review", () => {
    render(<ReconciliationLiveness showTreasuryReview />);
    expect(screen.getByText(/Needs Attention/i)).toBeInTheDocument();
    expect(screen.getByText(/Treasury Agent review/i)).toBeInTheDocument();
  });

  // ── Liveness Footer ──────────────────────────────────────────────────

  it("shows the mixed-layer liveness footer: deterministic exact + labeled fuzzy", () => {
    render(<ReconciliationLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1|Layer 2/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const deterministicMentions = screen.getAllByText(/deterministic/i);
    expect(deterministicMentions.length).toBeGreaterThanOrEqual(1);
    const probabilisticMentions = screen.getAllByText(/probabilistic/i);
    expect(probabilisticMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows exact matches are 100% by definition and need no confidence badge", () => {
    render(<ReconciliationLiveness />);
    // Footer + decomposition step both carry the rule
    expect(
      screen.getAllByText(/exact.*no confidence|100% by definition/i).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
