import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { OnboardingLiveness } from "@/components/onboarding/onboarding-liveness";

describe("OnboardingLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Historical Pull Running (the first-value moment) ─────

  it("renders the flow name and first-value framing in the header", () => {
    render(<OnboardingLiveness />);
    expect(
      screen.getByRole("heading", {
        name: "Onboarding / Historical Data Pull",
      }),
    ).toBeInTheDocument();
    const mentions = screen.getAllByText(/first meaningful value|12 minutes/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order: SIGNUP → ENTITY_SETUP → DATA_SOURCE_CONNECTING → HISTORICAL_PULL_RUNNING → CHART_OF_ACCOUNTS_PROPOSED → FIRST_LOOK_DELIVERED", () => {
    render(<OnboardingLiveness />);
    expect(screen.getByText("Onboarding State Machine")).toBeInTheDocument();
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent);
    const signupIdx = stageLabels.findIndex((t) => t?.includes("SIGNUP"));
    const entityIdx = stageLabels.findIndex((t) => t?.includes("ENTITY_SETUP"));
    const connectingIdx = stageLabels.findIndex((t) =>
      t?.includes("DATA_SOURCE_CONNECTING"),
    );
    const pullIdx = stageLabels.findIndex((t) =>
      t?.includes("HISTORICAL_PULL_RUNNING"),
    );
    const coaIdx = stageLabels.findIndex((t) =>
      t?.includes("CHART_OF_ACCOUNTS_PROPOSED"),
    );
    const firstLookIdx = stageLabels.findIndex((t) =>
      t?.includes("FIRST_LOOK_DELIVERED"),
    );

    expect(signupIdx).toBeLessThan(entityIdx);
    expect(entityIdx).toBeLessThan(connectingIdx);
    expect(connectingIdx).toBeLessThan(pullIdx);
    expect(pullIdx).toBeLessThan(coaIdx);
    expect(coaIdx).toBeLessThan(firstLookIdx);
  });

  it("shows the current operation status (historical pull running)", () => {
    render(<OnboardingLiveness />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("HISTORICAL_PULL_RUNNING");
    expect(status.textContent).toContain("Processing April 2026");
  });

  // ── Zero Confidence Scores on the flow's own stages ─────────────────

  it("does NOT render confidence meters on the pipeline stages themselves", () => {
    render(<OnboardingLiveness />);
    const pipeline = screen.getByRole("region", {
      name: /Onboarding State Machine/i,
    });
    expect(within(pipeline).queryAllByRole("meter").length).toBe(0);
  });

  it("does NOT show an 'Agent Confidence' summary", () => {
    render(<OnboardingLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  // ── Connection Cards (Spec §4) — live status per card ───────────────

  it("shows connection cards with live status", () => {
    render(<OnboardingLiveness />);
    const connections = screen.getByRole("region", {
      name: /Data Source Connections/i,
    });
    expect(within(connections).getByText("Bank account")).toBeInTheDocument();
    expect(within(connections).getByText("Mobile money")).toBeInTheDocument();
    expect(
      within(connections).getByText("Bank statement upload"),
    ).toBeInTheDocument();
  });

  it("shows the processing connection card with live transaction count", () => {
    render(<OnboardingLiveness />);
    const connections = screen.getByRole("region", {
      name: /Data Source Connections/i,
    });
    expect(
      within(connections).getByText(
        /Bank statement uploaded\. Processing 847 transactions/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows connected cards with their pulled record counts", () => {
    render(<OnboardingLiveness />);
    const connections = screen.getByRole("region", {
      name: /Data Source Connections/i,
    });
    expect(
      within(connections).getByText(/5,963 transactions pulled/i),
    ).toBeInTheDocument();
    expect(
      within(connections).getByText(/214 transactions pulled/i),
    ).toBeInTheDocument();
  });

  // ── Historical Pull: Real Per-Period Progress (Spec §2/§3) ──────────

  it("shows per-period progress driven by real per-period state", () => {
    render(<OnboardingLiveness />);
    const pull = screen.getByRole("region", { name: /Historical Pull/i });
    // Completed, active, and pending periods each rendered from data
    expect(within(pull).getByText("August 2025")).toBeInTheDocument();
    expect(within(pull).getByText("April 2026")).toBeInTheDocument();
    expect(within(pull).getByText("July 2026")).toBeInTheDocument();
  });

  it("shows the active period expanded with found/categorized/flagged detail", () => {
    render(<OnboardingLiveness />);
    const pull = screen.getByRole("region", { name: /Historical Pull/i });
    expect(
      within(pull).getByText(/Processing April 2026/i),
    ).toBeInTheDocument();
    expect(
      within(pull).getByText(/847 transactions found/i),
    ).toBeInTheDocument();
    expect(
      within(pull).getByText(/812 categorized automatically/i),
    ).toBeInTheDocument();
    expect(
      within(pull).getByText(/35 flagged for your review/i),
    ).toBeInTheDocument();
  });

  it("shows running categorized and flagged counts, not a single aggregate spinner", () => {
    render(<OnboardingLiveness />);
    const pull = screen.getByRole("region", { name: /Historical Pull/i });
    expect(
      within(pull).getByText(/5,626 categorized automatically/i),
    ).toBeInTheDocument();
    expect(
      within(pull).getByText(/337 flagged for your review/i),
    ).toBeInTheDocument();
  });

  it("shows pending periods as not yet processed", () => {
    render(<OnboardingLiveness />);
    const pull = screen.getByRole("region", { name: /Historical Pull/i });
    expect(
      within(pull).getAllByText(/Not yet processed/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the pull window and that it is within the ≤12-month ordinary path", () => {
    render(<OnboardingLiveness />);
    const pull = screen.getByRole("region", { name: /Historical Pull/i });
    expect(within(pull).getByText(/Aug 2025 → Jul 2026/i)).toBeInTheDocument();
    expect(
      within(pull).getByText(/12-month window|≤12-month path/i),
    ).toBeInTheDocument();
  });

  it("surfaces the critical rule: per-period progress is real, never a simulated animation", () => {
    render(<OnboardingLiveness />);
    expect(
      screen.getAllByText(/driven by actual per-period processing state/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/never a simulated progress animation/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Chart of Accounts Proposal (Spec §2/§3/§4) ──────────────────────

  it("shows the COA proposal with its basis (business type + country)", () => {
    render(<OnboardingLiveness />);
    const coa = screen.getByRole("region", {
      name: /Chart of Accounts Proposal/i,
    });
    expect(
      within(coa).getByText(/standard chart for Trading\/Retail in Gambia/i),
    ).toBeInTheDocument();
    expect(within(coa).getByText(/28 accounts proposed/i)).toBeInTheDocument();
  });

  it("shows the proposed account list with codes, names, and types", () => {
    render(<OnboardingLiveness />);
    const coa = screen.getByRole("region", {
      name: /Chart of Accounts Proposal/i,
    });
    expect(within(coa).getByText("1000")).toBeInTheDocument();
    expect(within(coa).getByText("2000")).toBeInTheDocument();
    expect(within(coa).getByText("Accounts Payable")).toBeInTheDocument();
    expect(within(coa).getByText("Sales Revenue")).toBeInTheDocument();
    expect(within(coa).getByText("Cost of Goods Sold")).toBeInTheDocument();
    expect(
      within(coa).getAllByText(/asset|liability|revenue|expense/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders exactly one confidence meter — the COA proposal (judgment-based on business description)", () => {
    render(<OnboardingLiveness />);
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBe(1);
    expect(meters[0]).toHaveAttribute("aria-label", "COA proposal confidence");
    expect(meters[0]).toHaveAttribute("aria-valuenow", "87");
    expect(meters[0]).toHaveAttribute("aria-valuemin", "0");
    expect(meters[0]).toHaveAttribute("aria-valuemax", "100");
  });

  it("shows the COA is proposed for review, never silently applied", () => {
    render(<OnboardingLiveness />);
    const coa = screen.getByRole("region", {
      name: /Chart of Accounts Proposal/i,
    });
    expect(
      within(coa).getByText(/never silently applied/i),
    ).toBeInTheDocument();
    expect(
      within(coa).getByText(/edit.*before confirming|before confirming/i),
    ).toBeInTheDocument();
  });

  // ── First Look Preview (Spec §2 terminal) ───────────────────────────

  it("shows the first-look preview citing processed specifics, never generic", () => {
    render(<OnboardingLiveness />);
    const preview = screen.getByRole("region", { name: /First Look Preview/i });
    expect(
      within(preview).getByText(/5,963 transactions categorized/i),
    ).toBeInTheDocument();
    expect(
      within(preview).getByText(/337 flagged for your review/i),
    ).toBeInTheDocument();
    expect(
      within(preview).getByText(/never a generic welcome/i),
    ).toBeInTheDocument();
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ────────────────────────

  it("shows all three escalation triggers", () => {
    render(<OnboardingLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Bank upload format not recognized/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/History beyond 12 months detected/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Low categorization confidence on many transactions/i),
    ).toBeInTheDocument();
  });

  it("shows blocking vs non-blocking treatment per trigger", () => {
    render(<OnboardingLiveness />);
    expect(
      screen.getByText(/Blocking until permission given/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Non-blocking.*alternative path always available/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Non-blocking.*surfaced clearly/i),
    ).toBeInTheDocument();
  });

  it("shows the 'What user sees' notes including the reconstruction route", () => {
    render(<OnboardingLiveness />);
    expect(
      screen.getByText(/Permission requested before beginning/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Historical Data Reconstruction/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Manual entry path offered immediately/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Flagged batch for review, not silently accepted/i),
    ).toBeInTheDocument();
  });

  // ── Reasoning / "Why" (Spec §5) ────────────────────────────────────

  it("shows the 'why' reasoning from spec §5", () => {
    render(<OnboardingLiveness />);
    const why = screen.getByRole("region", { name: /Why/i });
    expect(within(why).getByText(/Processing April 2026/i)).toBeInTheDocument();
    expect(
      within(why).getByText(
        /847 transactions found, 812 categorized automatically/i,
      ),
    ).toBeInTheDocument();
  });

  // ── How It Works (Spec §3 decomposition) ────────────────────────────

  it("shows the 'how it works' decomposition toggle", () => {
    render(<OnboardingLiveness />);
    const mentions = screen.getAllByText(/How It Works — Step-by-Step/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals the decomposed sub-steps when clicked", () => {
    render(<OnboardingLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getByText(/Detect Connection Type & Pull Data/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Process Each Historical Period Sequentially/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Categorize Each Transaction/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Propose Chart of Accounts/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Draft CFO Agent's First Message/i),
    ).toBeInTheDocument();
  });

  it("documents the never-single-spinner and inherited-confidence rules in sub-steps", () => {
    render(<OnboardingLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getAllByText(/never a single aggregate spinner/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Inherits Document Agent\/AP Agent\/Expense Agent/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/onboarding does not re-derive this/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the COA basis step with its confidence-score condition", () => {
    render(<OnboardingLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getAllByText(
        /confidence score if judgment-based on business description/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Constraint Enforcement ─────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<OnboardingLiveness />);
    const constraints = screen.getByRole("region", {
      name: /Constraint Enforcement/i,
    });
    expect(
      within(constraints).getByText("Per-Period Progress Is Real"),
    ).toBeInTheDocument();
    expect(
      within(constraints).getByText(
        "Categorization Inherited, Never Re-Derived",
      ),
    ).toBeInTheDocument();
    expect(
      within(constraints).getByText("COA Proposed, Never Silently Applied"),
    ).toBeInTheDocument();
    expect(
      within(constraints).getByText("No Dead Ends — Alternative Path Shown"),
    ).toBeInTheDocument();
    expect(
      within(constraints).getByText("Permission Gate for >12 Months"),
    ).toBeInTheDocument();
  });

  it("shows the critical rule paragraph in full", () => {
    render(<OnboardingLiveness />);
    expect(
      screen.getAllByText(
        /never a simulated progress animation timed to feel realistic/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Audit Trail (Spec §8) ──────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<OnboardingLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit entries with timestamps when expanded", () => {
    render(<OnboardingLiveness />);
    fireEvent.click(
      screen.getByText(/Audit Trail — Every Connection, Period & Decision/i),
    );
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(8);
    expect(
      screen.getAllByText(/standard chart for Trading\/Retail/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/5,963 categorized/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Cross-Agent Dependencies (Spec §10) ────────────────────────────

  it("shows the cross-agent chain and inherited-categorization note", () => {
    render(<OnboardingLiveness />);
    expect(screen.getAllByText(/Document Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/AP Agent|AR Agent|Expense Agent/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ledger Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
  });

  // ── Branch States ──────────────────────────────────────────────────

  it("shows the empty state when no onboarding is in progress", () => {
    render(<OnboardingLiveness showEmptyState />);
    expect(screen.getByText(/No onboarding in progress/i)).toBeInTheDocument();
  });

  it("shows the >12-months permission branch as blocking until permission given", () => {
    render(<OnboardingLiveness showPermissionRequested />);
    expect(
      screen.getAllByText(/History beyond 12 months detected/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/blocking until permission is given/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Historical Data Reconstruction/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/per PRD §13/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("permission branch renders 0 confidence meters", () => {
    render(<OnboardingLiveness showPermissionRequested />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  it("shows the format-not-recognized branch with a manual entry path offered", () => {
    render(<OnboardingLiveness showFallbackOffered />);
    expect(
      screen.getAllByText(/Bank statement format not recognized/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Manual entry offered/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/never a dead end/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("fallback branch renders 0 confidence meters", () => {
    render(<OnboardingLiveness showFallbackOffered />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  it("shows the low-confidence batch flagged for review, not silently accepted", () => {
    render(<OnboardingLiveness showLowConfidenceBatch />);
    expect(
      screen.getAllByText(/Low categorization confidence/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/flagged batch for review/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/not silently accepted/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("low-confidence batch branch renders 0 confidence meters", () => {
    render(<OnboardingLiveness showLowConfidenceBatch />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  it("shows the COA-edit branch with the proposed vs edited delta", () => {
    render(<OnboardingLiveness showCoaEdits />);
    expect(
      screen.getAllByText(/Edited Before Confirming/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/4 accounts edited/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/proposed.*edited|edited.*proposed/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("COA-edit branch renders 0 confidence meters", () => {
    render(<OnboardingLiveness showCoaEdits />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  it("shows the first-look delivered terminal state with CFO Agent's specific first message", () => {
    render(<OnboardingLiveness showFirstLookDelivered />);
    expect(
      screen.getAllByText(/First Look Delivered/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/I've reviewed your records/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/5,963 transactions categorized/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/337 flagged for your review/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("first-look delivered branch renders 0 confidence meters", () => {
    render(<OnboardingLiveness showFirstLookDelivered />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Status Grid ────────────────────────────────────────────────────

  it("shows onboarding metadata in the status grid", () => {
    render(<OnboardingLiveness />);
    const metadata = screen.getByRole("region", {
      name: /Onboarding Metadata/i,
    });
    expect(
      within(metadata).getByText(/Periods Processed/i),
    ).toBeInTheDocument();
    expect(
      within(metadata).getByText(/Transactions Found/i),
    ).toBeInTheDocument();
    expect(
      within(metadata).getByText(/Categorized Automatically/i),
    ).toBeInTheDocument();
    expect(
      within(metadata).getByText(/Flagged for Review/i),
    ).toBeInTheDocument();
    expect(within(metadata).getByText("8")).toBeInTheDocument();
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<OnboardingLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(8);
  });

  it("shows entity information", () => {
    render(<OnboardingLiveness />);
    const mentions = screen.getAllByText(/Xenboox/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Liveness Footer ────────────────────────────────────────────────

  it("shows Layer 1 and Layer 2 liveness footer with the single COA confidence score", () => {
    render(<OnboardingLiveness />);
    const layerOne = screen.getAllByText(/Layer 1/i);
    expect(layerOne.length).toBeGreaterThanOrEqual(1);
    const layerTwo = screen.getAllByText(/Layer 2/i);
    expect(layerTwo.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/87% confidence on the COA proposal/i).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
