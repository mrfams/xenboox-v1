import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssetLiveness } from "@/components/agents/asset-liveness";

describe("AssetLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Depreciation Pipeline ─────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<AssetLiveness />);
    expect(screen.getByText(/Asset Agent/i)).toBeInTheDocument();
    const role = screen.getAllByText(/Depreciation — register to disposal/i);
    expect(role.length).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order: ASSET_REGISTERED → CLASSIFIED → DEPRECIATION_SCHEDULE_SET → DEPRECIATION_CALCULATED → POSTED → VERIFICATION_DUE_CHECK", () => {
    render(<AssetLiveness />);
    const stages = screen.getAllByRole("listitem");
    const labels = stages.map((el) => el.textContent);
    const registeredIdx = labels.findIndex((t) =>
      t?.includes("ASSET_REGISTERED"),
    );
    const classifiedIdx = labels.findIndex((t) => t?.includes("CLASSIFIED"));
    const scheduleIdx = labels.findIndex((t) =>
      t?.includes("DEPRECIATION_SCHEDULE_SET"),
    );
    const calcIdx = labels.findIndex((t) =>
      t?.includes("DEPRECIATION_CALCULATED"),
    );
    const postedIdx = labels.findIndex((t) => t?.includes("POSTED"));
    const verifyIdx = labels.findIndex((t) =>
      t?.includes("VERIFICATION_DUE_CHECK"),
    );
    expect(registeredIdx).toBeGreaterThanOrEqual(0);
    expect(classifiedIdx).toBeGreaterThan(registeredIdx);
    expect(scheduleIdx).toBeGreaterThan(classifiedIdx);
    expect(calcIdx).toBeGreaterThan(scheduleIdx);
    expect(postedIdx).toBeGreaterThan(calcIdx);
    expect(verifyIdx).toBeGreaterThan(postedIdx);
  });

  it("shows the current operation status", () => {
    render(<AssetLiveness />);
    const mentions = screen.getAllByText(/DEPRECIATION_CALCULATED/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows entity information", () => {
    render(<AssetLiveness />);
    const mentions = screen.getAllByText(/Xenboox HQ/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the DISPOSAL_FLAGGED outcome badge", () => {
    render(<AssetLiveness />);
    expect(screen.getByText("DISPOSAL_FLAGGED")).toBeInTheDocument();
  });

  // ── Asset Register (Spec §2/§4 — live table) ────────────────────────

  it("shows the asset in the register with cost", () => {
    render(<AssetLiveness />);
    expect(screen.getByText(/Delivery Van FG-14/i)).toBeInTheDocument();
    const costs = screen.getAllByText(/GMD 12,000/i);
    expect(costs.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the register as a live table with a depreciation column", () => {
    render(<AssetLiveness />);
    // 'Asset Register' appears in the section header and the status-grid
    // source cell ('Asset register') — so it must be a count assertion.
    const registerMentions = screen.getAllByText(/Asset Register/i);
    expect(registerMentions.length).toBeGreaterThanOrEqual(1);
    const depMentions = screen.getAllByText(/Depreciation/i);
    expect(depMentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Classification (Spec §3 — confidence if auto-classified) ────────

  it("shows auto-classification with confidence meter", () => {
    render(<AssetLiveness />);
    expect(
      screen.getByText(/Classified as Motor Vehicles/i),
    ).toBeInTheDocument();
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBe(1);
  });

  it("shows the classification basis (auto-classified from description)", () => {
    render(<AssetLiveness />);
    const autoMentions = screen.getAllByText(
      /auto-classified from description/i,
    );
    expect(autoMentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Depreciation Formula (Spec §2/§5 — the critical rule) ───────────

  it("shows the full formula, not just the number", () => {
    render(<AssetLiveness />);
    expect(
      screen.getByText(
        /\(GMD 12,000 cost − GMD 1,200 salvage\) ÷ 5 years = GMD 2,160\/year/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows this period's amount derived from the formula", () => {
    render(<AssetLiveness />);
    const mentions = screen.getAllByText(/→ GMD 180 this month/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("never shows a bare depreciation number without its formula", () => {
    render(<AssetLiveness />);
    // The formula card must reference the method
    expect(screen.getByText(/Straight-line method/i)).toBeInTheDocument();
    const policy = screen.getAllByText(/per Motor Vehicles policy/i);
    expect(policy.length).toBeGreaterThanOrEqual(1);
  });

  // ── Schedule (Spec §2/§3/§9 — per-period, not a single computed field) ─

  it("shows the depreciation schedule period-by-period", () => {
    render(<AssetLiveness />);
    expect(screen.getByText(/Depreciation Schedule/i)).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    // Header + at least 4 schedule periods
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });

  it("shows multiple period rows in the schedule", () => {
    render(<AssetLiveness />);
    const periodRows = screen.getAllByText(/Q[1-4] 202[5-9]|Q[1-4] 2027/i);
    expect(periodRows.length).toBeGreaterThanOrEqual(4);
  });

  it("highlights the current period's formula in the schedule", () => {
    render(<AssetLiveness />);
    const currentPeriod = screen.getAllByText(/Q2 2026/i);
    expect(currentPeriod.length).toBeGreaterThanOrEqual(1);
    const highlighted = screen.getAllByText(/GMD 180/i);
    expect(highlighted.length).toBeGreaterThanOrEqual(1);
  });

  // ── Meter Discipline ────────────────────────────────────────────────

  it("renders exactly 1 confidence meter total (auto-classification only)", () => {
    const { container } = render(<AssetLiveness />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(1);
  });

  it("does NOT render a meter on the deterministic formula", () => {
    const { container } = render(<AssetLiveness />);
    const formulaCard = container.querySelector('[data-step="formula"]');
    expect(formulaCard).not.toBeNull();
    expect(formulaCard?.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Posting + Verification (Spec §2) ────────────────────────────────

  it("shows handoff to Ledger Agent", () => {
    render(<AssetLiveness />);
    const ledgerMentions = screen.getAllByText(/Ledger Agent/i);
    expect(ledgerMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the verification due check as an upcoming task list", () => {
    render(<AssetLiveness />);
    expect(screen.getByText(/Physical verification due/i)).toBeInTheDocument();
    expect(screen.getByText(/Upcoming Verification/i)).toBeInTheDocument();
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ────────────────────────

  it("shows escalation triggers table", () => {
    render(<AssetLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    const controllerMentions = screen.getAllByText(/Controller Agent/i);
    expect(controllerMentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Branch: Disposal Flagged (Spec §3/§6 — never auto-disposed) ─────

  it("shows disposal flag — fully depreciated, review for disposal", () => {
    render(<AssetLiveness showDisposal />);
    expect(
      screen.getByText(/Fully depreciated — review for disposal/i),
    ).toBeInTheDocument();
    const neverAuto = screen.getAllByText(/never auto-disposed/i);
    expect(neverAuto.length).toBeGreaterThanOrEqual(1);
  });

  it("shows disposal flag is non-blocking and escalated to Controller", () => {
    render(<AssetLiveness showDisposal />);
    const nonBlocking = screen.getAllByText(/non-blocking/i);
    expect(nonBlocking.length).toBeGreaterThanOrEqual(1);
    const controller = screen.getAllByText(/Controller Agent/i);
    expect(controller.length).toBeGreaterThanOrEqual(1);
  });

  it("disposal branch renders 0 confidence meters", () => {
    const { container } = render(<AssetLiveness showDisposal />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Branch: Ambiguous Classification (Spec §6 — blocking) ───────────

  it("shows ambiguous classification — confirm asset class", () => {
    render(<AssetLiveness showAmbiguousClass />);
    expect(
      screen.getByText(/Which asset class — confirm/i),
    ).toBeInTheDocument();
    const blocking = screen.getAllByText(/blocking for that asset/i);
    expect(blocking.length).toBeGreaterThanOrEqual(1);
  });

  it("ambiguous classification branch renders 0 confidence meters", () => {
    const { container } = render(<AssetLiveness showAmbiguousClass />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Branch: Incomplete Record (Spec §7) ─────────────────────────────

  it("shows incomplete record — cannot proceed to schedule-set", () => {
    render(<AssetLiveness showIncomplete />);
    expect(
      screen.getByText(/Missing salvage value or useful life/i),
    ).toBeInTheDocument();
    const flagged = screen.getAllByText(/flagged as incomplete record/i);
    expect(flagged.length).toBeGreaterThanOrEqual(1);
  });

  it("incomplete record branch renders 0 confidence meters", () => {
    const { container } = render(<AssetLiveness showIncomplete />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Terminal/Posted State ───────────────────────────────────────────

  it("shows posted state with period handoff", () => {
    render(<AssetLiveness showPosted />);
    expect(screen.getByText(/Posted to Ledger Agent/i)).toBeInTheDocument();
    const period = screen.getAllByText(/Q2 2026/i);
    expect(period.length).toBeGreaterThanOrEqual(1);
  });

  it("posted state renders 0 confidence meters", () => {
    const { container } = render(<AssetLiveness showPosted />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── How It Works (Spec §3 decomposition) ────────────────────────────

  it("shows the 'How It Works' decomposition toggle", () => {
    render(<AssetLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals decomposed sub-steps when 'How It Works' is clicked", () => {
    render(<AssetLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    expect(screen.getByText(/Register Asset/)).toBeInTheDocument();
    expect(screen.getByText(/Classify Asset/)).toBeInTheDocument();
    expect(screen.getByText(/Build Depreciation Schedule/)).toBeInTheDocument();
    expect(
      screen.getByText(/Calculate This Period's Depreciation/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Check Verification Due Date/)).toBeInTheDocument();
    expect(screen.getByText(/Flag Disposal Candidates/)).toBeInTheDocument();
  });

  // ── Constraint Enforcement ──────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<AssetLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Formula Always Shown")).toBeInTheDocument();
    expect(screen.getByText("Schedule Per-Period")).toBeInTheDocument();
    expect(screen.getByText("Never Auto-Disposed")).toBeInTheDocument();
    expect(screen.getByText("Verification Tracked")).toBeInTheDocument();
  });

  // ── Audit Trail (Spec §8) ───────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<AssetLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with registration, classification, schedule, posting when expanded", () => {
    render(<AssetLiveness />);
    const toggle = screen.getByText(/Audit Trail — Every Asset Event/i);
    fireEvent.click(toggle);
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(7);
    const headers = screen.getAllByRole("columnheader");
    const headerText = headers.map((h) => h.textContent).join(" ");
    expect(headerText).toMatch(/Event/i);
    expect(headerText).toMatch(/Detail/i);
    expect(headerText).toMatch(/Confidence/i);
  });

  // ── Cross-Agent Dependencies (Spec §10) ─────────────────────────────

  it("shows the cross-agent chain (Ledger each period, Controller before close)", () => {
    render(<AssetLiveness />);
    const ledger = screen.getAllByText(/Ledger Agent/i);
    expect(ledger.length).toBeGreaterThanOrEqual(1);
    const controller = screen.getAllByText(/Controller Agent/i);
    expect(controller.length).toBeGreaterThanOrEqual(1);
  });

  // ── Accessibility ───────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<AssetLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  // ── Empty State ─────────────────────────────────────────────────────

  it("shows 'No asset being processed' empty state", () => {
    render(<AssetLiveness showEmptyState />);
    expect(screen.getByText(/No asset being processed/i)).toBeInTheDocument();
  });

  // ── Liveness Footer ─────────────────────────────────────────────────

  it("shows Layer 1 deterministic liveness footer", () => {
    render(<AssetLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const detMentions = screen.getAllByText(/deterministic/i);
    expect(detMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Layer 2 probabilistic liveness footer", () => {
    render(<AssetLiveness />);
    const layer2 = screen.getAllByText(/Layer 2/i);
    expect(layer2.length).toBeGreaterThanOrEqual(1);
    const probMentions = screen.getAllByText(/probabilistic/i);
    expect(probMentions.length).toBeGreaterThanOrEqual(1);
  });
});
