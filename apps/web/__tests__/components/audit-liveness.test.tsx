import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuditLiveness } from "@/components/agents/audit-liveness";

describe("AuditLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Continuous Audit Track ───────────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<AuditLiveness />);
    // 'Audit Agent' appears in the header h2 AND the sampling indicator
    // ('Audit Agent sampling AP postings...') — count assertion.
    const nameMentions = screen.getAllByText(/Audit Agent/i);
    expect(nameMentions.length).toBeGreaterThanOrEqual(1);
    const role = screen.getAllByText(/Audit — sampling to delivery/i);
    expect(role.length).toBeGreaterThanOrEqual(1);
  });

  it("renders continuous-track stages in correct order: SAMPLING → COMPARING_AGAINST_GOLDEN_DATASET → LOGGED", () => {
    render(<AuditLiveness />);
    const stages = screen.getAllByRole("listitem");
    const labels = stages.map((el) => el.textContent);
    const samplingIdx = labels.findIndex((t) => t?.includes("SAMPLING"));
    const comparingIdx = labels.findIndex((t) =>
      t?.includes("COMPARING_AGAINST_GOLDEN_DATASET"),
    );
    const loggedIdx = labels.findIndex((t) => t?.includes("LOGGED"));
    expect(samplingIdx).toBeGreaterThanOrEqual(0);
    expect(comparingIdx).toBeGreaterThan(samplingIdx);
    expect(loggedIdx).toBeGreaterThan(comparingIdx);
  });

  it("renders package-track stages in correct order: PACKAGE_REQUESTED → ASSEMBLING → DELIVERED", () => {
    render(<AuditLiveness />);
    const stages = screen.getAllByRole("listitem");
    const labels = stages.map((el) => el.textContent);
    const requestedIdx = labels.findIndex((t) =>
      t?.includes("PACKAGE_REQUESTED"),
    );
    const assemblingIdx = labels.findIndex((t) => t?.includes("ASSEMBLING"));
    const deliveredIdx = labels.findIndex((t) => t?.includes("DELIVERED"));
    expect(requestedIdx).toBeGreaterThanOrEqual(0);
    expect(assemblingIdx).toBeGreaterThan(requestedIdx);
    expect(deliveredIdx).toBeGreaterThan(assemblingIdx);
  });

  it("shows the current operation status", () => {
    render(<AuditLiveness />);
    const mentions = screen.getAllByText(/COMPARING_AGAINST_GOLDEN_DATASET/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows entity information", () => {
    render(<AuditLiveness />);
    const mentions = screen.getAllByText(/Xenboox HQ/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Sampling (Spec §2/§3 — deterministic) ───────────────────────────

  it("shows a persistent low-key sampling indicator", () => {
    render(<AuditLiveness />);
    const indicator = screen.getAllByText(/Audit Agent sampling AP postings/i);
    expect(indicator.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the sample set with count and module coverage", () => {
    render(<AuditLiveness />);
    const sampleCount = screen.getAllByText(
      /Sampled 15 AP postings from June/i,
    );
    expect(sampleCount.length).toBeGreaterThanOrEqual(1);
    const matched = screen.getAllByText(/14 matched expected patterns/i);
    expect(matched.length).toBeGreaterThanOrEqual(1);
  });

  // ── Comparison + Deviation (Spec §3/§5 — golden case cited) ─────────

  it("shows the deviation with the golden dataset case cited", () => {
    render(<AuditLiveness />);
    const deviations = screen.getAllByText(/1 deviation/i);
    expect(deviations.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/golden dataset case #GD-0231/i),
    ).toBeInTheDocument();
  });

  it("shows which agent and decision triggered the deviation", () => {
    render(<AuditLiveness />);
    expect(
      screen.getByText(/invoice #4471 categorized as 'Office Supplies'/i),
    ).toBeInTheDocument();
    const apAgent = screen.getAllByText(/AP Agent/i);
    expect(apAgent.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the deviation flagged to Compliance Agent", () => {
    render(<AuditLiveness />);
    const compliance = screen.getAllByText(/Compliance Agent/i);
    expect(compliance.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the golden dataset version cited for the comparison", () => {
    render(<AuditLiveness />);
    const version = screen.getAllByText(/golden dataset v2\.4/i);
    expect(version.length).toBeGreaterThanOrEqual(1);
  });

  // ── Critical Rule: Clean Result Is Logged + Attributable (Spec §3) ───

  it("shows that a clean result is still logged and attributable", () => {
    render(<AuditLiveness />);
    expect(
      screen.getByText(/Clean result logged — attributed to sample/i),
    ).toBeInTheDocument();
  });

  it("shows the 'nothing wrong found ≠ nothing was checked' honesty", () => {
    render(<AuditLiveness />);
    expect(
      screen.getByText(/nothing wrong found.*is not.*nothing was checked/i),
    ).toBeInTheDocument();
    const sampled = screen.getAllByText(/15 cases actually checked/i);
    expect(sampled.length).toBeGreaterThanOrEqual(1);
  });

  // ── Meter Discipline (fuzzy comparison only) ────────────────────────

  it("renders exactly 1 confidence meter — fuzzy comparison only", () => {
    const { container } = render(<AuditLiveness />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(1);
  });

  it("does NOT render a meter on the deterministic sampling step", () => {
    const { container } = render(<AuditLiveness />);
    const samplingCard = container.querySelector('[data-step="sampling"]');
    expect(samplingCard).not.toBeNull();
    expect(samplingCard?.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  it("shows the fuzzy comparison confidence labeled as probabilistic", () => {
    render(<AuditLiveness />);
    const confidence = screen.getAllByText(/82%/);
    expect(confidence.length).toBeGreaterThanOrEqual(1);
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ────────────────────────

  it("shows escalation triggers table", () => {
    render(<AuditLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    const compliance = screen.getAllByText(/Compliance Agent/i);
    expect(compliance.length).toBeGreaterThanOrEqual(1);
  });

  it("shows material-deviation escalation — non-blocking to ops, blocking for record certainty", () => {
    render(<AuditLiveness />);
    const material = screen.getAllByText(/material severity/i);
    expect(material.length).toBeGreaterThanOrEqual(1);
    const blocking = screen.getAllByText(/blocking for that specific record/i);
    expect(blocking.length).toBeGreaterThanOrEqual(1);
  });

  it("shows fraud-pattern escalation — high urgency, distinct treatment", () => {
    render(<AuditLiveness />);
    const fraud = screen.getAllByText(/suspicious pattern suggesting fraud/i);
    expect(fraud.length).toBeGreaterThanOrEqual(1);
    const urgent = screen.getAllByText(/non-blocking but urgent/i);
    expect(urgent.length).toBeGreaterThanOrEqual(1);
  });

  // ── Branch: Deviation (Spec §2/§6 — golden case cited, material) ────

  it("shows deviation branch with golden case cited and material severity", () => {
    render(<AuditLiveness showDeviation />);
    expect(screen.getByText(/Deviation Found — Material/i)).toBeInTheDocument();
    const gdCase = screen.getAllByText(/golden dataset case #GD-0231/i);
    expect(gdCase.length).toBeGreaterThanOrEqual(1);
    const blocking = screen.getAllByText(/blocking for that record/i);
    expect(blocking.length).toBeGreaterThanOrEqual(1);
  });

  it("deviation branch renders 0 confidence meters", () => {
    const { container } = render(<AuditLiveness showDeviation />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Branch: Fraud Pattern (Spec §6 — high urgency) ──────────────────

  it("shows fraud branch — high urgency, distinct visual treatment", () => {
    render(<AuditLiveness showFraud />);
    expect(
      screen.getByText(/Suspicious Pattern — High Urgency/i),
    ).toBeInTheDocument();
    const immediate = screen.getAllByText(/immediately/i);
    expect(immediate.length).toBeGreaterThanOrEqual(1);
  });

  it("fraud branch renders 0 confidence meters", () => {
    const { container } = render(<AuditLiveness showFraud />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Branch: Low Golden Dataset Coverage (Spec §7 — honest) ──────────

  it("shows low-coverage branch — honestly surfaced, not hidden", () => {
    render(<AuditLiveness showLowCoverage />);
    expect(
      screen.getByText(/Limited Golden Dataset Coverage/i),
    ).toBeInTheDocument();
    const honest = screen.getAllByText(/lower confidence in this comparison/i);
    expect(honest.length).toBeGreaterThanOrEqual(1);
  });

  it("low-coverage branch renders 0 confidence meters", () => {
    const { container } = render(<AuditLiveness showLowCoverage />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Branch: Package Delivered (Spec §2 — terminal) ──────────────────

  it("shows package-delivered branch — terminal, auditor portal updated", () => {
    render(<AuditLiveness showPackageDelivered />);
    expect(screen.getByText(/Audit Package Delivered/i)).toBeInTheDocument();
    const portal = screen.getAllByText(/auditor portal updated/i);
    expect(portal.length).toBeGreaterThanOrEqual(1);
  });

  it("package-delivered branch renders 0 confidence meters", () => {
    const { container } = render(<AuditLiveness showPackageDelivered />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Package Assembly (Spec §4 — visible checklist) ──────────────────

  it("shows package assembly as a visible checklist of sections", () => {
    render(<AuditLiveness />);
    const assembling = screen.getAllByText(
      /Assembling audit package for Q2 2026/i,
    );
    expect(assembling.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Trial Balance/i)).toBeInTheDocument();
    // 'Vouchers' and 'Prior Period Comparisons' also appear in the package
    // pipeline description ('Pulling schedules, vouchers, prior period
    // comparisons') — so they must be count assertions.
    const voucherMentions = screen.getAllByText(/Vouchers/i);
    expect(voucherMentions.length).toBeGreaterThanOrEqual(1);
    const ppcMentions = screen.getAllByText(/Prior Period Comparisons/i);
    expect(ppcMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows each package section sourced as it is pulled", () => {
    render(<AuditLiveness />);
    const sourced = screen.getAllByText(/sourced/i);
    expect(sourced.length).toBeGreaterThanOrEqual(1);
  });

  // ── How It Works (Spec §3 decomposition) ─────────────────────────────

  it("shows the 'How It Works' decomposition toggle", () => {
    render(<AuditLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals decomposed sub-steps when 'How It Works' is clicked", () => {
    render(<AuditLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    expect(screen.getByText(/Select Sample/)).toBeInTheDocument();
    expect(
      screen.getByText(/Compare Against Golden Dataset/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Classify Deviation Severity/)).toBeInTheDocument();
    expect(screen.getByText(/Log Result/)).toBeInTheDocument();
    expect(screen.getByText(/Assemble Package/)).toBeInTheDocument();
  });

  // ── Constraint Enforcement ──────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<AuditLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Clean Result Attributable")).toBeInTheDocument();
    expect(screen.getByText("Golden Case Cited")).toBeInTheDocument();
    expect(screen.getByText("Read-Only Agent")).toBeInTheDocument();
    expect(screen.getByText("Honest Coverage")).toBeInTheDocument();
  });

  // ── Audit Trail (Spec §8) ───────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<AuditLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with sample, result, and dataset version when expanded", () => {
    render(<AuditLiveness />);
    const toggle = screen.getByText(/Audit Trail — Every Sample & Comparison/i);
    fireEvent.click(toggle);
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(7);
    const headers = screen.getAllByRole("columnheader");
    const headerText = headers.map((h) => h.textContent).join(" ");
    expect(headerText).toMatch(/Sample/i);
    expect(headerText).toMatch(/Result/i);
    expect(headerText).toMatch(/Version/i);
  });

  // ── Cross-Agent Dependencies (Spec §10) ─────────────────────────────

  it("shows the cross-agent chain (read-only from workers, escalate to Compliance)", () => {
    render(<AuditLiveness />);
    const readOnly = screen.getAllByText(/read-only/i);
    expect(readOnly.length).toBeGreaterThanOrEqual(1);
    const compliance = screen.getAllByText(/Compliance Agent/i);
    expect(compliance.length).toBeGreaterThanOrEqual(1);
  });

  // ── Accessibility ───────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<AuditLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  // ── Empty State ─────────────────────────────────────────────────────

  it("shows 'No audit cycle in progress' empty state", () => {
    render(<AuditLiveness showEmptyState />);
    expect(screen.getByText(/No audit cycle in progress/i)).toBeInTheDocument();
  });

  // ── Liveness Footer ─────────────────────────────────────────────────

  it("shows Layer 1 deterministic liveness footer", () => {
    render(<AuditLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const detMentions = screen.getAllByText(/deterministic/i);
    expect(detMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Layer 2 probabilistic footer (fuzzy comparison)", () => {
    render(<AuditLiveness />);
    const layer2 = screen.getAllByText(/Layer 2/i);
    expect(layer2.length).toBeGreaterThanOrEqual(1);
    const probMentions = screen.getAllByText(/probabilistic/i);
    expect(probMentions.length).toBeGreaterThanOrEqual(1);
  });
});
