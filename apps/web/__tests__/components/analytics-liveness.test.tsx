import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AnalyticsLiveness } from "@/components/agents/analytics-liveness";

describe("AnalyticsLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Proactive Insight ────────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<AnalyticsLiveness />);
    // "Analytics Agent" also appears in the cross-agent chain chip, so scope to the heading.
    expect(
      screen.getByRole("heading", { name: "Analytics Agent" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/proactive/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order: SCANNING → PATTERN_DETECTED → CLASSIFYING_SIGNIFICANCE → SURFACED (with LOGGED_ONLY as fork branch)", () => {
    render(<AnalyticsLiveness />);
    expect(screen.getByText("Analytics State Machine")).toBeInTheDocument();
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent);
    const scanningIdx = stageLabels.findIndex((t) => t?.includes("SCANNING"));
    const patternIdx = stageLabels.findIndex((t) =>
      t?.includes("PATTERN_DETECTED"),
    );
    const classifyingIdx = stageLabels.findIndex((t) =>
      t?.includes("CLASSIFYING_SIGNIFICANCE"),
    );
    const surfacedIdx = stageLabels.findIndex((t) => t?.includes("SURFACED"));
    const loggedOnlyIdx = stageLabels.findIndex((t) =>
      t?.includes("LOGGED_ONLY"),
    );

    expect(scanningIdx).toBeLessThan(patternIdx);
    expect(patternIdx).toBeLessThan(classifyingIdx);
    expect(classifyingIdx).toBeLessThan(surfacedIdx);
    // Fork: both SURFACED and LOGGED_ONLY follow classification.
    expect(classifyingIdx).toBeLessThan(loggedOnlyIdx);
  });

  it("shows the current operation status (surfaced insight)", () => {
    render(<AnalyticsLiveness />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("SURFACED");
    expect(status.textContent).toContain("I noticed");
  });

  // ── Exactly 1 Confidence Meter (deviation detection only) ──────────

  it("renders exactly one confidence meter — the deviation detection confidence", () => {
    render(<AnalyticsLiveness />);
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBe(1);
    // jest-dom compares getAttribute() literally here, so assert via getAttribute + toMatch.
    expect(meters[0].getAttribute("aria-label")).toMatch(
      /deviation detection/i,
    );
    expect(meters[0]).toHaveAttribute("aria-valuenow", "87");
  });

  it("does NOT show 'Agent Confidence' summary", () => {
    render(<AnalyticsLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  it("the runway insight is deterministic — no confidence meter on it", () => {
    render(<AnalyticsLiveness />);
    const runway = screen.getByRole("region", { name: /Runway Insight/i });
    expect(within(runway).queryAllByRole("meter").length).toBe(0);
  });

  // ── Surfaced Insight — specific citation (Spec §3/§5) ──────────────

  it("surfaces the insight proactively with the specific pattern named", () => {
    render(<AnalyticsLiveness />);
    const insights = screen.getByRole("region", { name: /Surfaced Insights/i });
    expect(within(insights).getByText(/I noticed:/i)).toBeInTheDocument();
    expect(
      within(insights).getByText(/up 40% vs your 6-month average/i),
    ).toBeInTheDocument();
  });

  it("cites the exact metric and comparison baseline", () => {
    render(<AnalyticsLiveness />);
    const insights = screen.getByRole("region", { name: /Surfaced Insights/i });
    expect(
      within(insights).getByText(/GMD 1,200 → GMD 1,680/i),
    ).toBeInTheDocument();
    expect(
      within(insights).getByText(/crosses your 25% materiality threshold/i),
    ).toBeInTheDocument();
  });

  it("shows the insight is surfaced proactively and timestamped, not batched", () => {
    render(<AnalyticsLiveness />);
    const insights = screen.getByRole("region", { name: /Surfaced Insights/i });
    expect(within(insights).getByText(/09:31 today/i)).toBeInTheDocument();
    expect(
      within(insights).getByText(/proactive, not batched/i),
    ).toBeInTheDocument();
  });

  it("reveals the underlying trend data when expanded", () => {
    render(<AnalyticsLiveness />);
    fireEvent.click(screen.getByText(/Show underlying trend data/i));
    expect(screen.getByText(/GMD 1,150/i)).toBeInTheDocument();
    expect(screen.getAllByText(/BL-2026-07/i).length).toBeGreaterThanOrEqual(1);
  });

  // ── Critical Rule: never vague, baseline cited (Spec §3/§4/§5) ─────

  it("surfaces the never-vague critical rule in the main view", () => {
    render(<AnalyticsLiveness />);
    expect(screen.getAllByText(/never a vague/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/always the specific number/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows that every insight must cite its metric and baseline", () => {
    render(<AnalyticsLiveness />);
    const mentions = screen.getAllByText(/cite its metric and baseline/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Runway insight — trajectory data shown (Spec §3/§5) ────────────

  it("shows the runway forecast with the actual trajectory data, not just the conclusion", () => {
    render(<AnalyticsLiveness />);
    expect(screen.getByText(/3 months of runway/i)).toBeInTheDocument();
    expect(screen.getByText(/GMD 8,200\/month/i)).toBeInTheDocument();
    // "GMD 24,600" appears in the runway summary AND the cash-on-hand row.
    expect(screen.getAllByText(/GMD 24,600/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/GMD 7,900/i).length).toBeGreaterThanOrEqual(1);
  });

  it("labels the runway calculation as arithmetic, not inference", () => {
    render(<AnalyticsLiveness />);
    expect(
      screen.getByText(/cash on hand ÷ avg burn — arithmetic, not inferred/i),
    ).toBeInTheDocument();
  });

  // ── Logged-only insight (visible when browsing history) ─────────────

  it("shows a logged-only insight recorded but not pushed", () => {
    render(<AnalyticsLiveness />);
    const logged = screen.getByRole("region", { name: /Logged-Only Insight/i });
    expect(within(logged).getByText(/Travel spend up 9%/i)).toBeInTheDocument();
    expect(
      within(logged).getByText(/below the 25% materiality threshold/i),
    ).toBeInTheDocument();
    expect(
      within(logged).getByText(/recorded for trend history, not pushed/i),
    ).toBeInTheDocument();
  });

  // ── Status Grid ────────────────────────────────────────────────────

  it("shows analytics metadata in the status grid", () => {
    render(<AnalyticsLiveness />);
    const metadata = screen.getByRole("region", {
      name: /Analytics Metadata/i,
    });
    expect(within(metadata).getByText(/Period/i)).toBeInTheDocument();
    expect(within(metadata).getByText("Q2 2026")).toBeInTheDocument();
    expect(
      within(metadata).getByText(/Materiality Threshold/i),
    ).toBeInTheDocument();
    expect(within(metadata).getByText("25%")).toBeInTheDocument();
  });

  // ── How It Works ───────────────────────────────────────────────────

  it("shows the 'how it works' decomposition toggle", () => {
    render(<AnalyticsLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals step details when 'How It Works' is clicked", () => {
    render(<AnalyticsLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(screen.getByText(/Scan Continuously/i)).toBeInTheDocument();
    expect(screen.getByText(/Detect Deviation/i)).toBeInTheDocument();
    expect(screen.getByText(/Classify Significance/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Surface with Specific Citation/i),
    ).toBeInTheDocument();
  });

  it("shows 'No confidence score' notes on deterministic steps in How It Works", () => {
    render(<AnalyticsLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getAllByText(/No confidence score/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows that deviation detection is a statistical judgment with confidence", () => {
    render(<AnalyticsLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    // "statistical judgment" appears in the meter note AND How It Works step 2.
    expect(
      screen.getAllByText(/statistical judgment/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Constraint Enforcement ─────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<AnalyticsLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Insights Cite Baselines")).toBeInTheDocument();
    expect(screen.getByText("Never Vague")).toBeInTheDocument();
    expect(screen.getByText("Fraud Routed Immediately")).toBeInTheDocument();
    expect(
      screen.getByText("Deterministic Classification"),
    ).toBeInTheDocument();
    expect(screen.getByText("Read-Only Agent")).toBeInTheDocument();
  });

  // ── Audit Trail ────────────────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<AnalyticsLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with baseline and confidence when expanded", () => {
    render(<AnalyticsLiveness />);
    fireEvent.click(screen.getByText(/Audit Trail — Every Pattern Detected/i));
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(7);
    expect(screen.getAllByText(/deviation 87%/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/logged for trend history/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Cross-Agent Dependencies ───────────────────────────────────────

  it("shows the agents Analytics feeds", () => {
    render(<AnalyticsLiveness />);
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Compliance Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Reporting Agent/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the agent is read-only with no write path to ledger", () => {
    render(<AnalyticsLiveness />);
    expect(
      screen.getByText(/read-only — no write path to ledger/i),
    ).toBeInTheDocument();
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<AnalyticsLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  // ── Edge Cases: Empty State ────────────────────────────────────────

  it("shows 'No insights in history' empty state", () => {
    render(<AnalyticsLiveness showEmptyState />);
    expect(screen.getByText(/No insights in history/i)).toBeInTheDocument();
  });

  // ── Edge Cases: Insufficient History (Spec §7) ─────────────────────

  it("states explicitly when there isn't enough history for a reliable baseline", () => {
    render(<AnalyticsLiveness showInsufficientData />);
    // "Not Enough History Yet" appears in the branch header AND (case-insensitively)
    // in the BranchCard body "not enough history yet to detect trends reliably".
    expect(
      screen.getAllByText(/Not Enough History Yet/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/not enough history yet to detect trends reliably/i),
    ).toBeInTheDocument();
  });

  it("never presents a low-confidence insight as certain when history is thin", () => {
    render(<AnalyticsLiveness showInsufficientData />);
    expect(
      screen.getAllByText(/never presented as certain/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("insufficient-data branch renders 0 confidence meters", () => {
    render(<AnalyticsLiveness showInsufficientData />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Cases: Fraud Pattern Flag (Spec §6) ───────────────────────

  it("shows the fraud pattern flag with high-urgency distinct treatment", () => {
    render(<AnalyticsLiveness showFraudFlag />);
    expect(screen.getByText(/Fraud Pattern Flagged/i)).toBeInTheDocument();
    // "High Urgency" appears in the subtitle AND the HIGH URGENCY badge.
    expect(screen.getAllByText(/High Urgency/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("routes fraud flags simultaneously to Compliance Agent and human", () => {
    render(<AnalyticsLiveness showFraudFlag />);
    expect(
      screen.getByText(/routed simultaneously to Compliance Agent/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Compliance Agent/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("fraud flag is non-blocking but urgent, distinct from routine insight", () => {
    render(<AnalyticsLiveness showFraudFlag />);
    expect(
      screen.getAllByText(/Non-blocking but urgent/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/distinct from routine insight/i),
    ).toBeInTheDocument();
  });

  it("fraud flag branch renders 0 confidence meters", () => {
    render(<AnalyticsLiveness showFraudFlag />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Cases: Runway Alert (Spec §6) ─────────────────────────────

  it("alerts CFO Agent proactively when runway falls below the threshold", () => {
    render(<AnalyticsLiveness showRunwayAlert />);
    expect(screen.getByText(/Cash Runway Alert/i)).toBeInTheDocument();
    expect(
      screen.getByText(/below the configured threshold/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
  });

  it("runway alert is proactive, not buried in a report", () => {
    render(<AnalyticsLiveness showRunwayAlert />);
    expect(
      screen.getByText(/proactive alert — not buried in a report/i),
    ).toBeInTheDocument();
  });

  it("runway alert branch renders 0 confidence meters", () => {
    render(<AnalyticsLiveness showRunwayAlert />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Cases: Browsing History (logged-only view) ────────────────

  it("shows logged-only insights when the user explicitly browses analytics history", () => {
    render(<AnalyticsLiveness showLoggedOnly />);
    // "Analytics History" appears in the header AND the BranchCard body.
    expect(
      screen.getAllByText(/Analytics History/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Travel spend up 9%/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/visible only when you explicitly browse/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("history branch renders 0 confidence meters", () => {
    render(<AnalyticsLiveness showLoggedOnly />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Escalation & Human-in-the-Loop ─────────────────────────────────

  it("shows escalation triggers for fraud threshold and runway threshold", () => {
    render(<AnalyticsLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Anomaly crosses fraud-pattern threshold/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cash runway falls below configured threshold/i),
    ).toBeInTheDocument();
  });

  // ── Liveness Footer ────────────────────────────────────────────────

  it("shows Layer 1 deterministic vs Layer 2 probabilistic liveness footer", () => {
    render(<AnalyticsLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const probMentions = screen.getAllByText(/probabilistic/i);
    expect(probMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows entity information", () => {
    render(<AnalyticsLiveness />);
    const mentions = screen.getAllByText(/Xenboox/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });
});
