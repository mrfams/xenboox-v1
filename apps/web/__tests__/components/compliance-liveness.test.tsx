import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ComplianceLiveness } from "@/components/agents/compliance-liveness";

describe("ComplianceLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Tax Agent Review ──────────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<ComplianceLiveness />);
    // "Compliance Agent" also appears in the cross-agent chain chip, so scope to the heading.
    expect(
      screen.getByRole("heading", { name: "Compliance Agent" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/deadline|filing/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order: MONITORING → DEADLINE_APPROACHING → TAX_AGENT_REVIEW → REGULATORY_STATUS_REPORTED", () => {
    render(<ComplianceLiveness />);
    expect(
      screen.getByText("Compliance Agent State Machine"),
    ).toBeInTheDocument();
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent);
    const monitoringIdx = stageLabels.findIndex((t) =>
      t?.includes("MONITORING"),
    );
    const deadlineIdx = stageLabels.findIndex((t) =>
      t?.includes("DEADLINE_APPROACHING"),
    );
    const reviewIdx = stageLabels.findIndex((t) =>
      t?.includes("TAX_AGENT_REVIEW"),
    );
    const reportedIdx = stageLabels.findIndex((t) =>
      t?.includes("REGULATORY_STATUS_REPORTED"),
    );

    expect(monitoringIdx).toBeLessThan(deadlineIdx);
    expect(deadlineIdx).toBeLessThan(reviewIdx);
    expect(reviewIdx).toBeLessThan(reportedIdx);
  });

  it("shows the current operation status (reviewing Tax Agent draft)", () => {
    render(<ComplianceLiveness />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("TAX_AGENT_REVIEW");
    expect(status.textContent).toContain("Gambia VAT");
  });

  // ── Exactly One Confidence Meter (Spec §3 step 5) ───────────────────

  it("renders exactly one confidence meter — the rule-change detection, inferred from an ambiguous source", () => {
    render(<ComplianceLiveness />);
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBe(1);
    expect(meters[0]).toHaveAttribute("aria-valuenow", "82");
    expect(meters[0]).toHaveAttribute("aria-valuemin", "0");
    expect(meters[0]).toHaveAttribute("aria-valuemax", "100");
  });

  it("does NOT show an 'Agent Confidence' summary", () => {
    render(<ComplianceLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  // ── Live Compliance Calendar (Spec §4) — color-graduated countdown ──

  it("shows the compliance calendar as a live, color-graduated countdown", () => {
    render(<ComplianceLiveness />);
    const calendar = screen.getByRole("region", {
      name: /Compliance Calendar/i,
    });
    expect(within(calendar).getByText(/7 days remaining/i)).toBeInTheDocument();
    expect(
      within(calendar).getByText(/14 days remaining/i),
    ).toBeInTheDocument();
    expect(
      within(calendar).getByText(/30 days remaining/i),
    ).toBeInTheDocument();
  });

  it("shows per-jurisdiction deadlines with return type and due date", () => {
    render(<ComplianceLiveness />);
    const calendar = screen.getByRole("region", {
      name: /Compliance Calendar/i,
    });
    expect(
      within(calendar).getByText(/Gambia VAT Q2 2026 return/i),
    ).toBeInTheDocument();
    expect(
      within(calendar).getByText(/SSHFC monthly contributions/i),
    ).toBeInTheDocument();
    expect(
      within(calendar).getByText(/Corporate Income Tax/i),
    ).toBeInTheDocument();
    expect(within(calendar).getByText(/Due Jul 24, 2026/i)).toBeInTheDocument();
  });

  it("shows the critical window with elevated urgency treatment", () => {
    render(<ComplianceLiveness />);
    const calendar = screen.getByRole("region", {
      name: /Compliance Calendar/i,
    });
    expect(within(calendar).getByText(/critical window/i)).toBeInTheDocument();
    expect(within(calendar).getByText(/color-graduated/i)).toBeInTheDocument();
  });

  it("shows filed deadlines distinctly from pending ones", () => {
    render(<ComplianceLiveness />);
    const calendar = screen.getByRole("region", {
      name: /Compliance Calendar/i,
    });
    expect(
      within(calendar).getByText(/Filed Jul 5, 2026/i),
    ).toBeInTheDocument();
  });

  // ── Tax Agent Review (Spec §2/§4) — deterministic ───────────────────

  it("shows the Tax Agent review with the return and jurisdiction named", () => {
    render(<ComplianceLiveness />);
    const review = screen.getByRole("region", { name: /Tax Agent Review/i });
    expect(
      within(review).getByText(/Reviewing VAT return for Gambia Q2 2026/i),
    ).toBeInTheDocument();
  });

  it("shows each return line citing its rule and rate", () => {
    render(<ComplianceLiveness />);
    const review = screen.getByRole("region", { name: /Tax Agent Review/i });
    expect(
      within(review).getByText(/VAT 15%, GRA Gambia standard rate/i),
    ).toBeInTheDocument();
    expect(within(review).getByText(/WHT 5%/i)).toBeInTheDocument();
    // rule v2.1 is cited on every line — expect at least one
    expect(
      within(review).getAllByText(/rule v2.1/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("Tax Agent review is deterministic — zero confidence meters", () => {
    render(<ComplianceLiveness />);
    const review = screen.getByRole("region", { name: /Tax Agent Review/i });
    expect(
      within(review).getByText(/no confidence score/i),
    ).toBeInTheDocument();
    expect(within(review).queryAllByRole("meter").length).toBe(0);
  });

  // ── Regulatory Status Reported (Spec §2) ────────────────────────────

  it("shows the regulatory status reported to CFO Agent", () => {
    render(<ComplianceLiveness />);
    const statusRegion = screen.getByRole("region", {
      name: /Regulatory Status/i,
    });
    expect(
      within(statusRegion).getByText(/Compliance status: clean/i),
    ).toBeInTheDocument();
    expect(
      within(statusRegion).getByText(/reported to CFO Agent/i),
    ).toBeInTheDocument();
  });

  // ── Rule Update Track (Spec §2/§3/§4) — never auto-applied ──────────

  it("shows the rule update track with old vs new rule comparison", () => {
    render(<ComplianceLiveness />);
    const track = screen.getByRole("region", { name: /Rule Update Track/i });
    expect(within(track).getByText(/15% → 16%/i)).toBeInTheDocument();
    expect(
      within(track).getByText(/effective August 1, 2026/i),
    ).toBeInTheDocument();
  });

  it("shows the rule-change source citation", () => {
    render(<ComplianceLiveness />);
    const track = screen.getByRole("region", { name: /Rule Update Track/i });
    expect(
      within(track).getByText(/source: GRA public notice #2026-041/i),
    ).toBeInTheDocument();
  });

  it("shows human review is requested and blocking until confirmed", () => {
    render(<ComplianceLiveness />);
    const track = screen.getByRole("region", { name: /Rule Update Track/i });
    expect(
      within(track).getByText(/human review requested/i),
    ).toBeInTheDocument();
    expect(
      within(track).getByText(/blocking until confirmed/i),
    ).toBeInTheDocument();
    expect(
      within(track).getByText(
        /Old rule 15% \(rule v2.1\) vs proposed 16% \(rule v2.2\)/i,
      ),
    ).toBeInTheDocument();
  });

  it("surfaces the never-auto-applied critical rule in the main view", () => {
    render(<ComplianceLiveness />);
    expect(
      screen.getAllByText(/rule set changes are never auto-applied/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/explicit human confirmation with the source cited/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/detects and proposes/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the rule-change detection confidence from an ambiguous source", () => {
    render(<ComplianceLiveness />);
    const track = screen.getByRole("region", { name: /Rule Update Track/i });
    const meter = within(track).getByRole("meter", {
      name: /Rule-change detection confidence/i,
    });
    expect(meter).toHaveAttribute("aria-valuenow", "82");
    expect(
      within(track).getByText(/inferred from ambiguous source/i),
    ).toBeInTheDocument();
  });

  it("reveals the never-auto-applies step when 'How It Works' is clicked", () => {
    render(<ComplianceLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(screen.getByText(/Monitor Deadlines/i)).toBeInTheDocument();
    expect(screen.getByText(/Review Tax Agent Output/i)).toBeInTheDocument();
    expect(screen.getByText(/Detect Rule Change/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /confidence score if inferred from an ambiguous source/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/per PRD §6.4/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  // ── Branch States: Rule Set Updated (terminal, Spec §2/§6) ──────────

  it("shows the rule-set-updated terminal state with human confirmation", () => {
    render(<ComplianceLiveness showRuleApplied />);
    // h2 + BranchCard body ("Rule set updated — ...") both match
    expect(
      screen.getAllByText(/Rule Set Updated/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/15% → 16%/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/confirmed by human/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/never auto-applied/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("rule-set-updated branch shows the confirming human and rule version", () => {
    render(<ComplianceLiveness showRuleApplied />);
    expect(
      screen.getAllByText(/Confirmed by human \(CFO\) at 14:04:12/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/rule v2.2/i).length).toBeGreaterThanOrEqual(1);
  });

  it("rule-set-updated branch renders 0 confidence meters", () => {
    render(<ComplianceLiveness showRuleApplied />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Branch States: Deadline Critical (Spec §6) — urgent ─────────────

  it("shows the deadline-critical branch with package not ready", () => {
    render(<ComplianceLiveness showDeadlineCritical />);
    expect(
      screen.getAllByText(/Deadline Critical/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/due in 2 days/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/package not ready/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("deadline-critical is non-blocking but urgent, escalated to CFO and human", () => {
    render(<ComplianceLiveness showDeadlineCritical />);
    expect(screen.getAllByText(/High-urgency/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/Non-blocking but urgent/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
  });

  it("deadline-critical branch renders 0 confidence meters", () => {
    render(<ComplianceLiveness showDeadlineCritical />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Branch States: Regulatory Risk (Spec §6) — blocking ─────────────

  it("shows the regulatory-risk branch with the specific missed filing", () => {
    render(<ComplianceLiveness showRiskIdentified />);
    expect(
      screen.getAllByText(/Regulatory Risk Identified/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Missed filing detected: SSHFC May 2026 contributions/i),
    ).toBeInTheDocument();
  });

  it("regulatory risk is escalated immediately, never batched", () => {
    render(<ComplianceLiveness showRiskIdentified />);
    expect(
      screen.getAllByText(/Immediate escalation/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/not batched/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/Blocking/i).length).toBeGreaterThanOrEqual(1);
  });

  it("regulatory-risk branch renders 0 confidence meters", () => {
    render(<ComplianceLiveness showRiskIdentified />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Branch States: Kicked Back to Tax Agent (Spec §2 fail) ──────────

  it("shows the kicked-back branch with the specific reason", () => {
    render(<ComplianceLiveness showKickedBack />);
    expect(
      screen.getAllByText(/Kicked Back to Tax Agent/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        /VAT Q2 draft line 3 cites rule version 2.0 — current is 2.1/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/specific reason/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("kicked-back branch renders 0 confidence meters", () => {
    render(<ComplianceLiveness showKickedBack />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Branch States: Low-Confidence Rule Change (Spec §7) ─────────────

  it("shows the low-confidence rule change flagged for human review", () => {
    render(<ComplianceLiveness showLowConfidenceRule />);
    expect(
      screen.getAllByText(/Low-Confidence Rule Change/i).length,
    ).toBeGreaterThanOrEqual(1);
    // appears in both the sub-title and the BranchCard body
    expect(screen.getAllByText(/unverifiable/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/never silently applied/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/human review required/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("low-confidence branch shows the 48% flag as a badge, not a meter", () => {
    render(<ComplianceLiveness showLowConfidenceRule />);
    expect(screen.getByText(/48%/i)).toBeInTheDocument();
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Case: Empty State ─────────────────────────────────────────

  it("shows the empty state when nothing is being monitored", () => {
    render(<ComplianceLiveness showEmptyState />);
    expect(
      screen.getByText(/No filing deadlines being tracked/i),
    ).toBeInTheDocument();
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ────────────────────────

  it("shows escalation triggers for deadlines, rule changes, and regulatory risk", () => {
    render(<ComplianceLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Deadline within critical window and package not ready/i,
      ),
    ).toBeInTheDocument();
    // "Rule change detected" appears in both the rule track card and this escalation row
    expect(
      screen.getAllByText(/Rule change detected/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Regulatory risk identified \(e.g., missed filing\)/i),
    ).toBeInTheDocument();
  });

  it("shows the What user sees notes in the escalation table", () => {
    render(<ComplianceLiveness />);
    expect(
      screen.getAllByText(
        /Confirmation required before any downstream agent uses the new rule/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Immediate escalation, not batched/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Audit Trail (Spec §8) ───────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<ComplianceLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit entries with rule-change source and effective date when expanded", () => {
    render(<ComplianceLiveness />);
    fireEvent.click(
      screen.getByText(/Audit Trail — Every Deadline & Rule Change/i),
    );
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(9);
    expect(
      screen.getAllByText(/GRA public notice #2026-041/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/14:04:12/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/rule v2.2/i).length).toBeGreaterThanOrEqual(1);
  });

  // ── Cross-Agent Dependencies (Spec §10) ─────────────────────────────

  it("shows the agents overseen and the CFO reporting line", () => {
    render(<ComplianceLiveness />);
    expect(screen.getAllByText(/Tax Agent/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Audit Agent/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows that Compliance provides the rule tables downstream agents depend on", () => {
    render(<ComplianceLiveness />);
    expect(
      screen.getAllByText(/provides the rule tables/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Payroll Worker Agent/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Status Grid ────────────────────────────────────────────────────

  it("shows compliance metadata in the status grid", () => {
    render(<ComplianceLiveness />);
    const metadata = screen.getByRole("region", {
      name: /Compliance Metadata/i,
    });
    expect(within(metadata).getByText(/Deadline/i)).toBeInTheDocument();
    expect(within(metadata).getByText(/Jurisdictions/i)).toBeInTheDocument();
    expect(within(metadata).getByText(/Returns Tracked/i)).toBeInTheDocument();
    expect(
      within(metadata).getByText(/Rule Changes Pending/i),
    ).toBeInTheDocument();
    expect(within(metadata).getByText("7 days")).toBeInTheDocument();
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<ComplianceLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(7);
  });

  // ── Liveness Footer ────────────────────────────────────────────────

  it("shows Layer 1 and Layer 2 liveness footer", () => {
    render(<ComplianceLiveness />);
    const layerOne = screen.getAllByText(/Layer 1/i);
    expect(layerOne.length).toBeGreaterThanOrEqual(1);
    const layerTwo = screen.getAllByText(/Layer 2/i);
    expect(layerTwo.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(
        /82% confidence when inferred from an ambiguous source/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows entity information", () => {
    render(<ComplianceLiveness />);
    const mentions = screen.getAllByText(/Xenboox/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });
});
