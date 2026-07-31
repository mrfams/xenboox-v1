import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileMoneyLiveness } from "@/components/agents/mobile-money-liveness";

describe("MobileMoneyLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Matching Pipeline ─────────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<MobileMoneyLiveness />);
    expect(screen.getByText(/Mobile Money Agent/i)).toBeInTheDocument();
    const role = screen.getAllByText(/Mobile money reconciliation/i);
    expect(role.length).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order: STATEMENT_OR_API_PULLED → PARSING_BY_RAIL → MATCHING_TO_LEDGER → RECONCILED", () => {
    render(<MobileMoneyLiveness />);
    const stages = screen.getAllByRole("listitem");
    const labels = stages.map((el) => el.textContent);
    const pullIdx = labels.findIndex((t) =>
      t?.includes("STATEMENT_OR_API_PULLED"),
    );
    const parseIdx = labels.findIndex((t) => t?.includes("PARSING_BY_RAIL"));
    const matchIdx = labels.findIndex((t) => t?.includes("MATCHING_TO_LEDGER"));
    const reconciledIdx = labels.findIndex((t) => t?.includes("RECONCILED"));
    expect(pullIdx).toBeGreaterThanOrEqual(0);
    expect(parseIdx).toBeGreaterThan(pullIdx);
    expect(matchIdx).toBeGreaterThan(parseIdx);
    expect(reconciledIdx).toBeGreaterThan(matchIdx);
  });

  it("shows the current operation status", () => {
    render(<MobileMoneyLiveness />);
    const mentions = screen.getAllByText(/MATCHING_TO_LEDGER/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows entity information", () => {
    render(<MobileMoneyLiveness />);
    const mentions = screen.getAllByText(/Xenboox HQ/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Match Outcomes Branch ───────────────────────────────────────────

  it("renders all three match outcomes: MATCHED, TIMING_GAP_FLAGGED, UNMATCHED", () => {
    render(<MobileMoneyLiveness />);
    expect(screen.getByText("MATCHED")).toBeInTheDocument();
    expect(screen.getByText("TIMING_GAP_FLAGGED")).toBeInTheDocument();
    expect(screen.getByText("UNMATCHED")).toBeInTheDocument();
  });

  // ── Per-Rail Separation (Spec §4) ───────────────────────────────────

  it("shows per-rail activity in separate sections, not blended", () => {
    render(<MobileMoneyLiveness />);
    expect(screen.getByText("Wave")).toBeInTheDocument();
    expect(screen.getByText("Orange Money")).toBeInTheDocument();
    expect(screen.getByText("MTN MoMo")).toBeInTheDocument();
  });

  it("labels each rail with its own icon/identity for visual scanning", () => {
    render(<MobileMoneyLiveness />);
    const railMentions = screen.getAllByText(/WV-/);
    expect(railMentions.length).toBeGreaterThanOrEqual(1);
    const omMentions = screen.getAllByText(/OM-/);
    expect(omMentions.length).toBeGreaterThanOrEqual(1);
    const mtnMentions = screen.getAllByText(/MTN-/);
    expect(mtnMentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Exact Match (deterministic, no meter) ───────────────────────────

  it("shows exact match with identical reference basis", () => {
    render(<MobileMoneyLiveness />);
    expect(
      screen.getByText(/Wave confirmation GMD 85\.00/i),
    ).toBeInTheDocument();
    const refMentions = screen.getAllByText(/WV-9928/i);
    expect(refMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT render a confidence meter on exact matches", () => {
    const { container } = render(<MobileMoneyLiveness />);
    // Scoped: the exact-match row carries data-match-kind="exact" and has no meter
    const exactRow = container.querySelector('[data-match-kind="exact"]');
    expect(exactRow).not.toBeNull();
    expect(exactRow?.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Timing Gap (Spec §2/§3/§4 — the defining feature) ───────────────

  it("shows timing gap with explicit lag computation, not as a match failure", () => {
    render(<MobileMoneyLiveness />);
    expect(
      screen.getByText(/Orange Money shows GMD 200\.00 confirmed/i),
    ).toBeInTheDocument();
    const lagMentions = screen.getAllByText(/2-day lag/i);
    expect(lagMentions.length).toBeGreaterThanOrEqual(1);
    const typical = screen.getAllByText(/typical for this rail/i);
    expect(typical.length).toBeGreaterThanOrEqual(1);
  });

  it("renders timing-gap items with distinct Signal Indigo treatment (data-timing-gap)", () => {
    const { container } = render(<MobileMoneyLiveness />);
    const gapRows = container.querySelectorAll('[data-timing-gap="true"]');
    expect(gapRows.length).toBeGreaterThanOrEqual(1);
    gapRows.forEach((row) => {
      expect(row.className).toMatch(/signal-indigo/);
    });
  });

  it("never treats a timing gap as a match failure", () => {
    render(<MobileMoneyLiveness />);
    const gapCopy = screen.getAllByText(/not an error/i);
    expect(gapCopy.length).toBeGreaterThanOrEqual(1);
    const notFailure = screen.getAllByText(/never treated as a match failure/i);
    expect(notFailure.length).toBeGreaterThanOrEqual(1);
  });

  it("never silently reconciles a timing gap without labeling it", () => {
    render(<MobileMoneyLiveness />);
    const label = screen.getAllByText(
      /labeled a gap|explicit outcome|third outcome/i,
    );
    expect(label.length).toBeGreaterThanOrEqual(1);
    const gap = screen.getAllByText(/TIMING_GAP_FLAGGED/i);
    expect(gap.length).toBeGreaterThanOrEqual(2);
  });

  it("shows the typical-lag basis for the rail next to each gap", () => {
    render(<MobileMoneyLiveness />);
    const orangeGap = screen.getAllByText(/Orange Money/i);
    expect(orangeGap.length).toBeGreaterThanOrEqual(2);
    // Typical range basis visible
    const typicalRange = screen.getAllByText(/1-2 days|typical/i);
    expect(typicalRange.length).toBeGreaterThanOrEqual(1);
  });

  // ── Anomalous Timing Gap (Spec §6) ──────────────────────────────────

  it("flags anomalous timing lag as escalated to Treasury Agent, non-blocking", () => {
    render(<MobileMoneyLiveness showAnomalousLag />);
    expect(screen.getByText(/Anomalous Timing Gap/i)).toBeInTheDocument();
    const unusual = screen.getAllByText(/unusual for this rail/i);
    expect(unusual.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Escalated to Treasury Agent/i),
    ).toBeInTheDocument();
  });

  // ── Fuzzy Match (probabilistic, labeled meter) ──────────────────────

  it("shows fuzzy match with dashed connector + confidence meter", () => {
    render(<MobileMoneyLiveness />);
    const fuzzyMentions = screen.getAllByText(/Fuzzy match/i);
    expect(fuzzyMentions.length).toBeGreaterThanOrEqual(1);
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBe(1);
  });

  it("shows fuzzy match criteria (amount + date window)", () => {
    render(<MobileMoneyLiveness />);
    const criteria = screen.getAllByText(/amount exact/i);
    expect(criteria.length).toBeGreaterThanOrEqual(1);
    const window = screen.getAllByText(/3-day window/i);
    expect(window.length).toBeGreaterThanOrEqual(1);
  });

  // ── Meter Discipline ────────────────────────────────────────────────

  it("renders exactly 1 confidence meter total (fuzzy match only)", () => {
    const { container } = render(<MobileMoneyLiveness />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(1);
  });

  it("does NOT render meters on timing-gap rows", () => {
    const { container } = render(<MobileMoneyLiveness />);
    const gapRows = container.querySelectorAll('[data-timing-gap="true"]');
    gapRows.forEach((row) => {
      expect(row.querySelectorAll('[role="meter"]').length).toBe(0);
    });
  });

  // ── Unmatched (Spec §3/§6) ──────────────────────────────────────────

  it("shows unmatched item with no corresponding ledger entry", () => {
    render(<MobileMoneyLiveness />);
    expect(
      screen.getByText(/MTN MoMo transaction GMD 40\.00/i),
    ).toBeInTheDocument();
    const noEntry = screen.getAllByText(/no corresponding ledger entry/i);
    expect(noEntry.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps rail-specific reference visible on unmatched items", () => {
    render(<MobileMoneyLiveness />);
    const mtnRef = screen.getAllByText(/MTN-3345/i);
    expect(mtnRef.length).toBeGreaterThanOrEqual(1);
  });

  it("shows unmatched items are blocking for reconciliation close", () => {
    render(<MobileMoneyLiveness />);
    const blocking = screen.getAllByText(/blocking for close/i);
    expect(blocking.length).toBeGreaterThanOrEqual(1);
  });

  // ── API / Parse Failure (Spec §7) ───────────────────────────────────

  it("shows rail API failure state — never silently skipped", () => {
    render(<MobileMoneyLiveness showApiFailure />);
    expect(
      screen.getByText(/Wave connection needs reauthorization/i),
    ).toBeInTheDocument();
    const since = screen.getAllByText(/since .*successful pull/i);
    expect(since.length).toBeGreaterThanOrEqual(1);
  });

  it("shows API failure is blocking for that rail's data only", () => {
    render(<MobileMoneyLiveness showApiFailure />);
    const blocking = screen.getAllByText(/blocking for that rail/i);
    expect(blocking.length).toBeGreaterThanOrEqual(1);
    const nonBlocking = screen.getAllByText(/other rails continue/i);
    expect(nonBlocking.length).toBeGreaterThanOrEqual(1);
  });

  it("flags provider format changes for Document Agent review, never mis-parsed", () => {
    render(<MobileMoneyLiveness showApiFailure />);
    const docAgent = screen.getAllByText(/Document Agent/i);
    expect(docAgent.length).toBeGreaterThanOrEqual(1);
    const format = screen.getAllByText(/format change/i);
    expect(format.length).toBeGreaterThanOrEqual(1);
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ────────────────────────

  it("shows escalation triggers table", () => {
    render(<MobileMoneyLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    const treasuryMentions = screen.getAllByText(/Treasury Agent/i);
    expect(treasuryMentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Reasoning / "Why" (Spec §5) ─────────────────────────────────────

  it("shows the deterministic 'Matched because' reasoning examples", () => {
    render(<MobileMoneyLiveness />);
    expect(
      screen.getByText(/reference WV-9928 identical/i),
    ).toBeInTheDocument();
  });

  // ── How It Works (Spec §3 decomposition) ────────────────────────────

  it("shows the 'How It Works' decomposition toggle", () => {
    render(<MobileMoneyLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals decomposed sub-steps when 'How It Works' is clicked", () => {
    render(<MobileMoneyLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    expect(screen.getByText(/Pull Per-Rail Data/)).toBeInTheDocument();
    expect(screen.getByText(/Parse Per-Rail Format/)).toBeInTheDocument();
    expect(screen.getByText(/Match to Ledger/)).toBeInTheDocument();
    expect(screen.getByText(/Detect Timing Gap/)).toBeInTheDocument();
    expect(screen.getByText(/Bucket True Unmatched/)).toBeInTheDocument();
  });

  // ── Constraint Enforcement ──────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<MobileMoneyLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Per-Rail Parsing")).toBeInTheDocument();
    expect(screen.getByText("Timing Gaps Labeled")).toBeInTheDocument();
    expect(screen.getByText("Exact Then Fuzzy")).toBeInTheDocument();
    expect(screen.getByText("Rail Ref Kept")).toBeInTheDocument();
  });

  // ── Audit Trail (Spec §8) ───────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<MobileMoneyLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with rail, match type, and lag basis when expanded", () => {
    render(<MobileMoneyLiveness />);
    const toggle = screen.getByText(/Audit Trail — Every Transaction/i);
    fireEvent.click(toggle);
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(5);
    // Rail + match type + confidence + lag basis columns present
    const headers = screen.getAllByRole("columnheader");
    const headerText = headers.map((h) => h.textContent).join(" ");
    expect(headerText).toMatch(/Rail/);
    expect(headerText).toMatch(/Match/i);
    expect(headerText).toMatch(/Confidence/i);
    expect(headerText).toMatch(/Lag Basis/i);
  });

  // ── Cross-Agent Dependencies (Spec §10) ─────────────────────────────

  it("shows the cross-agent chain with Reconciliation Agent pattern", () => {
    render(<MobileMoneyLiveness />);
    const recon = screen.getAllByText(/Reconciliation Agent/i);
    expect(recon.length).toBeGreaterThanOrEqual(1);
    const treasury = screen.getAllByText(/Treasury Agent/i);
    expect(treasury.length).toBeGreaterThanOrEqual(1);
  });

  // ── Accessibility ───────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<MobileMoneyLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  // ── Empty State ─────────────────────────────────────────────────────

  it("shows 'No active mobile money reconciliation' empty state", () => {
    render(<MobileMoneyLiveness showEmptyState />);
    expect(
      screen.getByText(/No active mobile money reconciliation/i),
    ).toBeInTheDocument();
  });

  // ── Terminal State: RECONCILED ──────────────────────────────────────

  it("shows terminal RECONCILED state with period", () => {
    render(<MobileMoneyLiveness showReconciled />);
    expect(
      screen.getByText(/Mobile money reconciled for Q2 2026/i),
    ).toBeInTheDocument();
  });

  it("terminal state renders 0 confidence meters", () => {
    const { container } = render(<MobileMoneyLiveness showReconciled />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  it("terminal state attributes closure to Treasury Agent confirmation", () => {
    render(<MobileMoneyLiveness showReconciled />);
    const mentions = screen.getAllByText(/Treasury Agent confirmed/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Liveness Footer ─────────────────────────────────────────────────

  it("shows Layer 1 deterministic liveness footer", () => {
    render(<MobileMoneyLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const detMentions = screen.getAllByText(/deterministic/i);
    expect(detMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Layer 2 probabilistic liveness footer", () => {
    render(<MobileMoneyLiveness />);
    const layer2 = screen.getAllByText(/Layer 2/i);
    expect(layer2.length).toBeGreaterThanOrEqual(1);
    const probMentions = screen.getAllByText(/probabilistic/i);
    expect(probMentions.length).toBeGreaterThanOrEqual(1);
  });
});
