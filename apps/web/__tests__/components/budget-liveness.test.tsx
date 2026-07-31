import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { BudgetLiveness } from "@/components/agents/budget-liveness";

describe("BudgetLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Variance Explanation ─────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<BudgetLiveness />);
    // "Budget Agent" also appears in the cross-agent chain chip, so scope to the heading.
    expect(
      screen.getByRole("heading", { name: "Budget Agent" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/cite transactions/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order: BUDGET_LINE_TRACKED → ACTUAL_UPDATED → VARIANCE_CALCULATED → EXPLAINABLE → ALERT_CHECK (with UNEXPLAINED as the fork branch)", () => {
    render(<BudgetLiveness />);
    expect(screen.getByText("Budget State Machine")).toBeInTheDocument();
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent);
    const trackedIdx = stageLabels.findIndex((t) =>
      t?.includes("BUDGET_LINE_TRACKED"),
    );
    const actualIdx = stageLabels.findIndex((t) =>
      t?.includes("ACTUAL_UPDATED"),
    );
    const varianceIdx = stageLabels.findIndex((t) =>
      t?.includes("VARIANCE_CALCULATED"),
    );
    const explainableIdx = stageLabels.findIndex((t) =>
      t?.includes("EXPLAINABLE"),
    );
    const unexplainedIdx = stageLabels.findIndex((t) =>
      t?.includes("UNEXPLAINED"),
    );
    const alertIdx = stageLabels.findIndex((t) => t?.includes("ALERT_CHECK"));

    expect(trackedIdx).toBeLessThan(actualIdx);
    expect(actualIdx).toBeLessThan(varianceIdx);
    expect(varianceIdx).toBeLessThan(explainableIdx);
    // The fork: both EXPLAINABLE and UNEXPLAINED precede ALERT_CHECK.
    expect(explainableIdx).toBeLessThan(alertIdx);
    expect(unexplainedIdx).toBeLessThan(alertIdx);
  });

  it("shows the current operation status (explaining variance)", () => {
    render(<BudgetLiveness />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("EXPLAINABLE");
    expect(status.textContent).toContain("over budget");
  });

  // ── Live Budget vs Actual Bars (Spec §4) ───────────────────────────

  it("shows budget vs actual bars updating live per category", () => {
    render(<BudgetLiveness />);
    const bars = screen.getByRole("region", { name: /Live Budget vs Actual/i });
    expect(
      within(bars).getAllByText(/Marketing/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(within(bars).getAllByText(/Travel/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      within(bars).getAllByText(/Salaries/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      within(bars).getByText(
        /updating live per category as transactions post/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows variance as both dollar amount and percentage", () => {
    render(<BudgetLiveness />);
    const bars = screen.getByRole("region", { name: /Live Budget vs Actual/i });
    expect(within(bars).getByText(/GMD 450 over \(12%\)/i)).toBeInTheDocument();
    expect(within(bars).getByText(/GMD 200 over \(10%\)/i)).toBeInTheDocument();
  });

  it("shows within-budget categories distinctly", () => {
    render(<BudgetLiveness />);
    const bars = screen.getByRole("region", { name: /Live Budget vs Actual/i });
    expect(within(bars).getByText(/On budget/i)).toBeInTheDocument();
    expect(within(bars).getByText(/GMD 100 under \(7%\)/i)).toBeInTheDocument();
  });

  // ── Zero Confidence Meters (deterministic arithmetic, not inference) ─

  it("does NOT render any confidence meters in the main view", () => {
    render(<BudgetLiveness />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  it("does NOT show 'Agent Confidence' summary", () => {
    render(<BudgetLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  // ── Explained Variance — cited transactions (Spec §3/§5) ───────────

  it("shows the explained variance with the specific driver cited", () => {
    render(<BudgetLiveness />);
    const expl = screen.getByRole("region", { name: /Variance Explanations/i });
    expect(
      within(expl).getByText(/Marketing is GMD 450 over budget \(12%\)/i),
    ).toBeInTheDocument();
    expect(
      within(expl).getByText(
        /GMD 300 traces to one invoice \(Cloudline Ltd, June 14\)/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(expl).getByText(/not in original budget assumptions/i),
    ).toBeInTheDocument();
  });

  it("shows the remaining overage spread across normal recurring spend", () => {
    render(<BudgetLiveness />);
    const expl = screen.getByRole("region", { name: /Variance Explanations/i });
    expect(
      within(expl).getByText(
        /Remaining GMD 150 spread across normal recurring spend/i,
      ),
    ).toBeInTheDocument();
  });

  it("reveals the cited transactions list when expanded", () => {
    render(<BudgetLiveness />);
    const toggle = screen.getByText(/Show cited transactions/i);
    fireEvent.click(toggle);
    expect(screen.getByText(/INV #4471/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Cloudline Ltd/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  // ── Honest 'Not Yet Explainable' Label (Spec §3 critical rule) ─────

  it("labels the unexplained variance honestly instead of guessing", () => {
    render(<BudgetLiveness />);
    const expl = screen.getByRole("region", { name: /Variance Explanations/i });
    expect(
      within(expl).getByText(/no single driver identified/i),
    ).toBeInTheDocument();
    expect(within(expl).getByText(/not yet explainable/i)).toBeInTheDocument();
  });

  it("shows the never-guess critical rule in the main view", () => {
    render(<BudgetLiveness />);
    expect(
      screen.getAllByText(/plausible-sounding but unverified narrative/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/grounded in actually-identified transactions/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Status Grid ────────────────────────────────────────────────────

  it("shows budget metadata in the status grid", () => {
    render(<BudgetLiveness />);
    const metadata = screen.getByRole("region", { name: /Budget Metadata/i });
    expect(within(metadata).getByText(/Period/i)).toBeInTheDocument();
    expect(within(metadata).getByText("Q2 2026")).toBeInTheDocument();
    expect(within(metadata).getByText(/Alert Threshold/i)).toBeInTheDocument();
    expect(within(metadata).getByText("10%")).toBeInTheDocument();
    expect(within(metadata).getByText(/Tracked Lines/i)).toBeInTheDocument();
  });

  // ── How It Works ───────────────────────────────────────────────────

  it("shows the 'how it works' decomposition toggle", () => {
    render(<BudgetLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals step details when 'How It Works' is clicked", () => {
    render(<BudgetLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(screen.getByText(/Pull Actual/i)).toBeInTheDocument();
    expect(screen.getByText(/Calculate Variance/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Attempt to Explain Variance/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Check Alert Threshold/i)).toBeInTheDocument();
    expect(screen.getByText(/Surface Alerts/i)).toBeInTheDocument();
  });

  it("shows 'No confidence score' notes on deterministic steps in How It Works", () => {
    render(<BudgetLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getAllByText(/No confidence score/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows that pattern-based explanations are never presented as fact without cited transactions", () => {
    render(<BudgetLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getByText(
        /never presented as fact without the underlying transactions cited/i,
      ),
    ).toBeInTheDocument();
  });

  // ── Constraint Enforcement ─────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<BudgetLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Explanations Cite Transactions"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Unexplained Labeled, Never Guessed"),
    ).toBeInTheDocument();
    expect(screen.getByText("Unbudgeted Spend Flagged")).toBeInTheDocument();
    expect(screen.getByText("Variance Shown Live")).toBeInTheDocument();
    expect(screen.getByText("Arithmetic, Not Inference")).toBeInTheDocument();
  });

  // ── Audit Trail ────────────────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<BudgetLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with timestamps and explanation basis when expanded", () => {
    render(<BudgetLiveness />);
    fireEvent.click(
      screen.getByText(/Audit Trail — Every Variance Calculation/i),
    );
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(6);
    expect(screen.getAllByText(/driver cited/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/no single driver identified/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Cross-Agent Dependencies ───────────────────────────────────────

  it("shows the agents Budget pulls from and feeds", () => {
    render(<BudgetLiveness />);
    expect(screen.getAllByText(/Ledger Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/Reporting Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows that actuals are pulled from Ledger Agent, never guessed", () => {
    render(<BudgetLiveness />);
    expect(
      screen.getByText(/Pulls actuals from Ledger Agent/i),
    ).toBeInTheDocument();
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<BudgetLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  // ── Edge Cases: Empty State ────────────────────────────────────────

  it("shows 'No budget tracked' empty state", () => {
    render(<BudgetLiveness showEmptyState />);
    expect(screen.getByText(/No budget tracked/i)).toBeInTheDocument();
  });

  // ── Edge Cases: Unexplained Variance (honest label, never guessed) ─

  it("shows the honest 'not yet explainable' branch for a single unexplained variance", () => {
    render(<BudgetLiveness showUnexplained />);
    expect(
      screen.getByText(/Variance Not Yet Explainable/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no single driver identified/i),
    ).toBeInTheDocument();
  });

  it("unexplained branch explicitly says it will not guess", () => {
    render(<BudgetLiveness showUnexplained />);
    expect(
      screen.getAllByText(
        /rather than produce a plausible-sounding but unverified narrative/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/never guessed/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("unexplained branch renders 0 confidence meters", () => {
    render(<BudgetLiveness showUnexplained />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Cases: Unbudgeted Spend (Spec §7) ─────────────────────────

  it("flags unbudgeted spend instead of ignoring or forcing a category", () => {
    render(<BudgetLiveness showUnbudgeted />);
    expect(screen.getByText(/Unbudgeted Spend Flagged/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /never silently ignored and never forced into the nearest category/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the specific unbudgeted category and amount", () => {
    render(<BudgetLiveness showUnbudgeted />);
    expect(screen.getByText(/Software Subscriptions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/GMD 350/i).length).toBeGreaterThanOrEqual(1);
  });

  it("unbudgeted branch renders 0 confidence meters", () => {
    render(<BudgetLiveness showUnbudgeted />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Cases: Alert Breach (Spec §6) ─────────────────────────────

  it("surfaces the alert proactively when variance exceeds the threshold", () => {
    render(<BudgetLiveness showAlert />);
    expect(screen.getByText(/Alert Surfaced/i)).toBeInTheDocument();
    expect(
      screen.getByText(/exceeds the 10% alert threshold/i),
    ).toBeInTheDocument();
  });

  it("shows the alert is surfaced proactively, not only when the budget screen is opened", () => {
    render(<BudgetLiveness showAlert />);
    expect(
      screen.getAllByText(/not just when the budget screen is opened/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("alert breach escalates to Department Manager and CFO Agent, non-blocking", () => {
    render(<BudgetLiveness showAlert />);
    expect(
      screen.getAllByText(/Department Manager/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/CFO Agent/i).length).toBeGreaterThanOrEqual(1);
    // "Non-blocking" appears in the badge and the BranchCard body.
    expect(screen.getAllByText(/Non-blocking/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("alert branch renders 0 confidence meters", () => {
    render(<BudgetLiveness showAlert />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Escalation & Human-in-the-Loop ─────────────────────────────────

  it("shows escalation triggers for threshold breach and full-year exhaustion", () => {
    render(<BudgetLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Variance exceeds alert threshold/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Budget line approaching full-year exhaustion early/i),
    ).toBeInTheDocument();
  });

  // ── Liveness Footer ────────────────────────────────────────────────

  it("shows Layer 1 deterministic liveness footer", () => {
    render(<BudgetLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const detMentions = screen.getAllByText(/deterministic/i);
    expect(detMentions.length).toBeGreaterThanOrEqual(1);
  });
});
