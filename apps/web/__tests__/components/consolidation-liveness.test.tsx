import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ConsolidationLiveness } from "@/components/consolidation/consolidation-liveness";

describe("ConsolidationLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Consolidation Roll-Up ─────────────────────────

  it("renders the flow name in the header", () => {
    render(<ConsolidationLiveness />);
    expect(
      screen.getByRole("heading", { name: "Multi-Entity Consolidation" }),
    ).toBeInTheDocument();
  });

  it("renders the header why-copy (errors hardest to spot after the fact)", () => {
    render(<ConsolidationLiveness />);
    const mentions = screen.getAllByText(
      /errors are hardest to spot after the fact|silently applied wrong/i,
    );
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in order: CONSOLIDATION_REQUESTED → PULLING_SUBSIDIARY_FINANCIALS → IDENTIFYING_INTERCOMPANY_TXNS → ELIMINATING → CONVERTING_CURRENCY → AGGREGATING → CONSOLIDATED_REPORT_READY", () => {
    render(<ConsolidationLiveness />);
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent);
    const expected = [
      "CONSOLIDATION_REQUESTED",
      "PULLING_SUBSIDIARY_FINANCIALS",
      "IDENTIFYING_INTERCOMPANY_TXNS",
      "ELIMINATING",
      "CONVERTING_CURRENCY",
      "AGGREGATING",
      "CONSOLIDATED_REPORT_READY",
    ];
    const indices = expected.map((s) =>
      stageLabels.findIndex((t) => t?.includes(s)),
    );
    expect(indices.every((i) => i !== -1)).toBe(true);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });

  it("shows the current operation status via role=status", () => {
    render(<ConsolidationLiveness />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("ELIMINATING");
    expect(status.textContent).toContain(
      "Eliminated: $5,000 inter-company loan, Fatima Holdings → Fatima Logistics",
    );
  });

  it("shows a pipeline region with the 7-stage machine", () => {
    render(<ConsolidationLiveness />);
    expect(
      screen.getByRole("region", { name: /Consolidation Pipeline/i }),
    ).toBeInTheDocument();
  });

  // ── Zero Confidence Scores (Layer 1 Deterministic) ──────────────────

  it("renders EXACTLY ONE confidence meter (inter-company match confidence)", () => {
    render(<ConsolidationLiveness />);
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBe(1);
    expect(meters[0]).toHaveAttribute(
      "aria-label",
      "Inter-company match confidence",
    );
    expect(meters[0]).toHaveAttribute("aria-valuenow", "88");
    expect(meters[0]).toHaveAttribute("aria-valuemin", "0");
    expect(meters[0]).toHaveAttribute("aria-valuemax", "100");
  });

  it("does NOT render any confidence meters on the pipeline stages", () => {
    render(<ConsolidationLiveness />);
    const pipeline = screen.getByRole("region", {
      name: /Consolidation Pipeline/i,
    });
    expect(within(pipeline).queryAllByRole("meter").length).toBe(0);
  });

  it("does NOT show an 'Agent Confidence' summary", () => {
    render(<ConsolidationLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  // ── Per-Subsidiary Financials Pull ──────────────────────────────────

  it("shows each subsidiary's financials being pulled", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", {
      name: /Subsidiary Financials/i,
    });
    expect(within(region).getByText("Fatima Holdings Ltd")).toBeInTheDocument();
    expect(
      within(region).getByText("Fatima Logistics Ltd"),
    ).toBeInTheDocument();
    expect(within(region).getByText("Fatima Foods Ltd")).toBeInTheDocument();
    expect(
      within(region).getAllByText(/pulled ✓/).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("shows per-subsidiary ownership basis", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", {
      name: /Subsidiary Financials/i,
    });
    expect(
      within(region).getAllByText(/100% owned/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(within(region).getByText(/60% owned/i)).toBeInTheDocument();
  });

  it("shows that pulls are direct (no confidence score)", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", {
      name: /Subsidiary Financials/i,
    });
    expect(
      within(region).getByText(/direct pull|no confidence score/i),
    ).toBeInTheDocument();
  });

  // ── Inter-Company Identification ────────────────────────────────────

  it("shows the inter-company transaction count", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", {
      name: /Inter-Company Identification/i,
    });
    expect(
      within(region).getByText(/Found 2 inter-company transactions/i),
    ).toBeInTheDocument();
  });

  it("shows the inter-company match confidence meter at 88%", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", {
      name: /Inter-Company Identification/i,
    });
    const meter = within(region).getByRole("meter", {
      name: /Inter-company match confidence/i,
    });
    expect(meter).toHaveAttribute("aria-valuenow", "88");
    expect(within(region).getByText("88%")).toBeInTheDocument();
  });

  it("shows match basis: exact reference vs fuzzy", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", {
      name: /Inter-Company Identification/i,
    });
    expect(
      within(region).getAllByText(/Exact Reference/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(within(region).getAllByText(/Fuzzy/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      within(region).getByText(/exact reference matches carry no confidence/i),
    ).toBeInTheDocument();
  });

  // ── Elimination Entries (per pair, both sources) ────────────────────

  it("shows elimination entries listed individually", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", { name: /Elimination Entries/i });
    expect(
      within(region).getByText(
        /Eliminated: \$5,000 inter-company management fee, Fatima Holdings → Fatima Logistics/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(
        /Eliminated: \$2,400 inter-company loan, Fatima Holdings → Fatima Logistics/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows both underlying source transactions per elimination", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", { name: /Elimination Entries/i });
    expect(within(region).getByText(/JE-IC-101/)).toBeInTheDocument();
    expect(within(region).getByText(/JE-IC-102/)).toBeInTheDocument();
    expect(within(region).getByText(/JE-IC-203/)).toBeInTheDocument();
    expect(within(region).getByText(/JE-IC-204/)).toBeInTheDocument();
  });

  it("shows elimination type badges", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", { name: /Elimination Entries/i });
    expect(within(region).getByText("ic_revenue_expense")).toBeInTheDocument();
    expect(
      within(region).getByText("ic_receivable_payable"),
    ).toBeInTheDocument();
  });

  it("never collapses eliminations into a bulk figure", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", { name: /Elimination Entries/i });
    expect(
      within(region).getByText(/never a single bulk 'eliminations/i),
    ).toBeInTheDocument();
  });

  // ── Currency Conversion (per subsidiary, rate + date) ───────────────

  it("shows FX conversion per subsidiary with exact rate and date", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", { name: /Currency Conversion/i });
    expect(
      within(region).getByText(/3,350,000 GMD → \$61,000 USD @ 54.85/i),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(/1,708,000 GMD → \$31,200 USD @ 54.85/i),
    ).toBeInTheDocument();
    expect(
      within(region).getAllByText(/rate date: Jun 30, 2026/i).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("shows parent-currency subsidiary needs no conversion", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", { name: /Currency Conversion/i });
    expect(
      within(region).getByText(/Fatima Holdings Ltd.*no conversion/i),
    ).toBeInTheDocument();
  });

  it("cites the auditable FX mechanism (PRD §12)", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", { name: /Currency Conversion/i });
    expect(
      within(region).getByText(/PRD §12.*exact rate and date/i),
    ).toBeInTheDocument();
  });

  // ── Aggregation / Consolidated Breakdown ────────────────────────────

  it("shows the consolidated group total", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", {
      name: /Consolidated Revenue/i,
    });
    expect(within(region).getByText("$184,200")).toBeInTheDocument();
  });

  it("shows the per-subsidiary contribution breakdown alongside the total", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", {
      name: /Consolidated Revenue/i,
    });
    expect(
      within(region).getByText(/Fatima Holdings Ltd — \$92,000/),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(/Fatima Logistics Ltd — \$61,000/i),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(/Fatima Foods Ltd — \$31,200/),
    ).toBeInTheDocument();
  });

  // ── Critical Rule: Never Collapse Per-Subsidiary Detail ─────────────

  it("shows the critical rule paragraph (per subsidiary, never collapsed)", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", { name: /Transparency Rule/i });
    expect(
      within(region).getByText(
        /must always be shown per subsidiary, never collapsed/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the verifiability claim (group total must decompose)", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", { name: /Transparency Rule/i });
    expect(
      within(region).getByText(
        /can't be decomposed back into its subsidiary components isn't verifiable/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows constraint enforcement badges", () => {
    render(<ConsolidationLiveness />);
    const region = screen.getByRole("region", { name: /Transparency Rule/i });
    expect(
      within(region).getByText("Per-Subsidiary Decomposition"),
    ).toBeInTheDocument();
    expect(
      within(region).getByText("Eliminations Per-Pair"),
    ).toBeInTheDocument();
    expect(within(region).getByText("FX Rate Cited")).toBeInTheDocument();
    expect(within(region).getByText("No Silent Netting")).toBeInTheDocument();
  });

  // ── Escalation & Human-in-the-Loop ──────────────────────────────────

  it("shows escalation conditions from the spec", () => {
    render(<ConsolidationLiveness />);
    expect(
      screen.getByText(/A subsidiary's period not yet closed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Inter-company transaction can't be matched to a counterpart/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows escalation is blocking for full consolidated close", () => {
    render(<ConsolidationLiveness />);
    const mentions = screen.getAllByText(
      /Blocking for full consolidated close/i,
    );
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Blocking for that pair/i)).toBeInTheDocument();
  });

  // ── Reasoning / "Why" Explanation ───────────────────────────────────

  it("shows the consolidated revenue 'why' explanation", () => {
    render(<ConsolidationLiveness />);
    const why = screen.getByRole("region", { name: /^Why$/i });
    expect(
      within(why).getByText(/Consolidated revenue: \$184,200/i),
    ).toBeInTheDocument();
    expect(
      within(why).getByText(/Fatima Holdings Ltd \$92,000/i),
    ).toBeInTheDocument();
    expect(
      within(why).getByText(
        /\$5,000 inter-company management fee between Holdings and Logistics/i,
      ),
    ).toBeInTheDocument();
  });

  // ── How It Works Decomposition ──────────────────────────────────────

  it("shows the 'how it works' decomposition toggle", () => {
    render(<ConsolidationLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals step details when 'How It Works' is clicked", () => {
    render(<ConsolidationLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    expect(
      screen.getByText(/Pull Each Subsidiary's Trial Balance/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Identify Inter-Company Transactions/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Eliminate Each Identified Pair/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Convert Each Subsidiary's Currency/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Aggregate")).toBeInTheDocument();
  });

  // ── Branch / Error States ───────────────────────────────────────────

  it("shows NOT_CLOSED branch: subsidiary period not closed", () => {
    render(<ConsolidationLiveness showFlag="NOT_CLOSED" />);
    expect(screen.getByText(/Consolidation Held/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Fatima Foods Ltd — period Q2 2026 not yet closed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Blocking for full consolidated close/i),
    ).toBeInTheDocument();
  });

  it("shows UNMATCHED_IC branch: no counterpart found", () => {
    render(<ConsolidationLiveness showFlag="UNMATCHED_IC" />);
    expect(
      screen.getByText(/Unmatched Inter-Company Transaction/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/#IC-7/i)).toBeInTheDocument();
    expect(
      screen.getByText(/not silently excluded, not eliminated on a guess/i),
    ).toBeInTheDocument();
  });

  it("shows MISMATCHED_AMOUNT branch: $50 delta flagged, never netted", () => {
    render(<ConsolidationLiveness showFlag="MISMATCHED_AMOUNT" />);
    expect(
      screen.getByText(/Mismatched Inter-Company Amounts/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /One entity records \$5,000, the other records \$4,950/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/never silently netted/i)).toBeInTheDocument();
  });

  it("branch states render zero confidence meters", () => {
    const { unmount } = render(
      <ConsolidationLiveness showFlag="MISMATCHED_AMOUNT" />,
    );
    expect(screen.queryAllByRole("meter").length).toBe(0);
    unmount();
    render(<ConsolidationLiveness showFlag="UNMATCHED_IC" />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Audit Trail ─────────────────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<ConsolidationLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail rows when expanded", () => {
    render(<ConsolidationLiveness />);
    const auditToggle = screen.getByText(/Audit Trail — Every Step/i);
    fireEvent.click(auditToggle);
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThanOrEqual(10);
    expect(screen.getByText(/JE-IC-101 ↔ JE-IC-102/i)).toBeInTheDocument();
    expect(
      screen.getByText(/3,350,000 GMD @ 54.85 \(Jun 30, 2026\) → \$61,000/i),
    ).toBeInTheDocument();
  });

  // ── Cross-Agent Dependencies ────────────────────────────────────────

  it("shows the cross-agent chain: Controller → Ledger (per subsidiary) → Reporting", () => {
    render(<ConsolidationLiveness />);
    const mentions = screen.getAllByText(/Controller Agent/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Ledger Agent \(per subsidiary\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Reporting Agent/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Liveness Footer ─────────────────────────────────────────────────

  it("shows the Layer 1 deterministic liveness footer", () => {
    render(<ConsolidationLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const detMentions = screen.getAllByText(/deterministic/i);
    expect(detMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the single Layer 2 probabilistic score (88%)", () => {
    render(<ConsolidationLiveness />);
    const layerMentions = screen.getAllByText(/Layer 2/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/inter-company match confidence \(88%\)/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Edge Cases: Empty State ─────────────────────────────────────────

  it("shows 'No consolidation in progress' empty state", () => {
    render(<ConsolidationLiveness showEmptyState />);
    expect(
      screen.getByText(/No consolidation in progress/i),
    ).toBeInTheDocument();
  });

  // ── Entity Scoping ──────────────────────────────────────────────────

  it("shows the group entity scope", () => {
    render(<ConsolidationLiveness />);
    const mentions = screen.getAllByText(/Xenboox Group/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Accessibility ───────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<ConsolidationLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(6);
  });

  it("has descriptive aria-labels on the status indicator", () => {
    render(<ConsolidationLiveness />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
