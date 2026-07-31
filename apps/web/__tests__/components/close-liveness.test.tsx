import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CloseLiveness } from "@/components/close/close-liveness";

describe("CloseLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: All Confirmed — closing ──────────────────────────────

  it("renders the flow name and passive-approval framing in the header", () => {
    render(<CloseLiveness />);
    expect(
      screen.getByRole("heading", { name: "Month-End Close" }),
    ).toBeInTheDocument();
    const mentions = screen.getAllByText(
      /passive.*human|owner reviews.*does nothing/i,
    );
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order with the passive-approval fork last", () => {
    render(<CloseLiveness />);
    expect(
      screen.getByText("Month-End Close State Machine"),
    ).toBeInTheDocument();
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent);
    const states = [
      "CLOSE_TRIGGERED",
      "CONTROLLER_CONFIRMING",
      "TREASURY_CONFIRMING",
      "COMPLIANCE_CONFIRMING",
      "ALL_CONFIRMED",
      "CLOSING",
      "PACKAGE_GENERATED",
      "OWNER_NOTIFIED",
      "PASSIVE_APPROVAL",
      "FLAGGED_FOR_REOPEN",
    ];
    const idxs = states.map((s) =>
      stageLabels.findIndex((t) => t?.includes(s)),
    );
    for (let i = 0; i < idxs.length - 1; i++) {
      expect(idxs[i]).toBeGreaterThanOrEqual(0);
      expect(idxs[i]).toBeLessThan(idxs[i + 1]);
    }
  });

  it("labels the final fork states (PASSIVE_APPROVAL | FLAGGED_FOR_REOPEN)", () => {
    render(<CloseLiveness />);
    const pipeline = screen.getByRole("region", {
      name: /Month-End Close State Machine/i,
    });
    expect(
      within(pipeline).getAllByText(/FORK/i).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("shows the current operation status (all departments confirmed)", () => {
    render(<CloseLiveness />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("ALL_CONFIRMED");
    expect(status.textContent).toContain("All departments confirmed");
  });

  // ── Exactly One Confidence Meter — the readiness gate ────────────────

  it("renders exactly one confidence meter — the overall close confidence at the gate", () => {
    render(<CloseLiveness />);
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBe(1);
    expect(meters[0]).toHaveAttribute("aria-label", "Overall close confidence");
    expect(meters[0]).toHaveAttribute("aria-valuenow", "94");
    expect(meters[0]).toHaveAttribute("aria-valuemin", "0");
    expect(meters[0]).toHaveAttribute("aria-valuemax", "100");
  });

  it("does NOT render confidence meters on the pipeline stages themselves", () => {
    render(<CloseLiveness />);
    const pipeline = screen.getByRole("region", {
      name: /Month-End Close State Machine/i,
    });
    expect(within(pipeline).queryAllByRole("meter").length).toBe(0);
  });

  it("does NOT show an 'Agent Confidence' summary", () => {
    render(<CloseLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  // ── Live Close Checklist (Spec §4) — ticking department by department ─

  it("shows the live close checklist with all three department heads", () => {
    render(<CloseLiveness />);
    const checklist = screen.getByRole("region", {
      name: /Live Close Checklist/i,
    });
    expect(within(checklist).getByText("Controller Agent")).toBeInTheDocument();
    expect(within(checklist).getByText("Treasury Agent")).toBeInTheDocument();
    expect(within(checklist).getByText("Compliance Agent")).toBeInTheDocument();
  });

  it("shows each department's specific confirmation basis", () => {
    render(<CloseLiveness />);
    const checklist = screen.getByRole("region", {
      name: /Live Close Checklist/i,
    });
    expect(
      within(checklist).getByText(/Trial balance balanced \(\$0 variance\)/i),
    ).toBeInTheDocument();
    expect(
      within(checklist).getByText(/All reconciliations clean/i),
    ).toBeInTheDocument();
    expect(
      within(checklist).getByText(/Tax obligations current/i),
    ).toBeInTheDocument();
  });

  it("shows the checklist ticking in real time, not revealed only at completion", () => {
    render(<CloseLiveness />);
    const checklist = screen.getByRole("region", {
      name: /Live Close Checklist/i,
    });
    expect(
      within(checklist).getByText(/ticking department by department/i),
    ).toBeInTheDocument();
    expect(
      within(checklist).getAllByText(/CONFIRMED/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Close Readiness Gate (Spec §3 step 3 / §7) — confidence_thresholds ─

  it("shows the close readiness gate checking the confidence_thresholds table", () => {
    render(<CloseLiveness />);
    const gate = screen.getByRole("region", { name: /Close Readiness Gate/i });
    expect(
      within(gate).getByText(/confidence_thresholds/i),
    ).toBeInTheDocument();
    expect(
      within(gate).getByText(/Close blocked by: none/i),
    ).toBeInTheDocument();
    expect(within(gate).getByText(/90% threshold/i)).toBeInTheDocument();
  });

  it("shows the overall close confidence meter scoped to the gate", () => {
    render(<CloseLiveness />);
    const gate = screen.getByRole("region", { name: /Close Readiness Gate/i });
    const meter = within(gate).getByRole("meter", {
      name: /Overall close confidence/i,
    });
    expect(meter).toHaveAttribute("aria-valuenow", "94");
    expect(
      within(gate).getByText(/Controller 96% · Treasury 92% · Compliance 94%/i),
    ).toBeInTheDocument();
  });

  it("shows the gate as an aggregate of department-head judgment inputs", () => {
    render(<CloseLiveness />);
    const gate = screen.getByRole("region", { name: /Close Readiness Gate/i });
    expect(
      within(gate).getByText(/aggregate of department-head judgment inputs/i),
    ).toBeInTheDocument();
    expect(
      within(gate).getByText(/Layer 2 probabilistic/i),
    ).toBeInTheDocument();
  });

  // ── Close Package (Spec §2 PACKAGE_GENERATED) ────────────────────────

  it("shows the close package preview assembling per the Reporting Agent liveness spec", () => {
    render(<CloseLiveness />);
    const pkg = screen.getByRole("region", { name: /Close Package/i });
    expect(within(pkg).getByText(/Profit & Loss/i)).toBeInTheDocument();
    expect(within(pkg).getByText(/Balance Sheet/i)).toBeInTheDocument();
    expect(within(pkg).getByText(/Cash Flow/i)).toBeInTheDocument();
    expect(
      within(pkg).getByText(/Plain-English Narrative/i),
    ).toBeInTheDocument();
    expect(
      within(pkg).getByText(/Reporting Agent liveness spec/i),
    ).toBeInTheDocument();
  });

  // ── Owner Notification (Spec §2/§4/§3 step 6) — legal acknowledgment ─

  it("shows the owner notification as a distinct deliberate legal-acknowledgment moment", () => {
    render(<CloseLiveness />);
    const notif = screen.getByRole("region", { name: /Owner Notification/i });
    expect(
      within(notif).getByText(/distinct, deliberate/i),
    ).toBeInTheDocument();
    expect(
      within(notif).getByText(/not folded into a generic notification badge/i),
    ).toBeInTheDocument();
    expect(
      within(notif).getByText(/legal acknowledgment.*PRD §14|PRD §14.*legal/i),
    ).toBeInTheDocument();
    expect(
      within(notif).getByText(/delivery.*logged|logged.*timestamp/i),
    ).toBeInTheDocument();
  });

  // ── Reasoning / "Why" (Spec §5) ─────────────────────────────────────

  it("shows the 'why' reasoning from spec §5", () => {
    render(<CloseLiveness />);
    const why = screen.getByRole("region", { name: /Why/i });
    expect(within(why).getByText(/Close for June 2026/i)).toBeInTheDocument();
    expect(
      within(why).getByText(
        /Controller Agent confirmed trial balance balanced/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(why).getByText(
        /Treasury Agent confirmed all reconciliations clean/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(why).getByText(/Compliance Agent confirmed VAT calculated/i),
    ).toBeInTheDocument();
    expect(within(why).getByText(/Closing now/i)).toBeInTheDocument();
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ────────────────────────

  it("shows escalation & human-in-the-loop triggers", () => {
    render(<CloseLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Any department head cannot confirm/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Owner flags the close after notification/i),
    ).toBeInTheDocument();
  });

  it("shows blocking treatment and the What-user-sees notes", () => {
    render(<CloseLiveness />);
    expect(screen.getAllByText(/Blocking/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Close held at that stage, cause shown/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Routes to Error Recovery \/ Reopen flow/i),
    ).toBeInTheDocument();
  });

  // ── How It Works (Spec §3 decomposition) ────────────────────────────

  it("shows the 'how it works' decomposition toggle", () => {
    render(<CloseLiveness />);
    const mentions = screen.getAllByText(/How It Works — Step-by-Step/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals the decomposed sub-steps when clicked", () => {
    render(<CloseLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(screen.getByText(/Trigger Close/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Each Department Head Confirms Independently/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Check Confidence Thresholds Platform-Wide/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Lock Period/i)).toBeInTheDocument();
    expect(screen.getByText(/Generate Package/i)).toBeInTheDocument();
    expect(screen.getByText(/Notify Owner/i)).toBeInTheDocument();
  });

  it("documents the never-silent rule, confidence_thresholds, and PRD §14 in sub-steps", () => {
    render(<CloseLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getAllByText(/never silently proceed/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/confidence_thresholds table/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/per PRD §14/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  // ── Constraint Enforcement ─────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<CloseLiveness />);
    const constraints = screen.getByRole("region", {
      name: /Constraint Enforcement/i,
    });
    expect(
      within(constraints).getByText("Never Silently Proceeds Past Unconfirmed"),
    ).toBeInTheDocument();
    expect(
      within(constraints).getByText("Blocked Cause Shown Explicitly"),
    ).toBeInTheDocument();
    expect(
      within(constraints).getByText("Checklist Ticks Live"),
    ).toBeInTheDocument();
    expect(
      within(constraints).getByText("Confidence Gate (confidence_thresholds)"),
    ).toBeInTheDocument();
    expect(
      within(constraints).getByText(
        "Notification = Legal Acknowledgment (PRD §14)",
      ),
    ).toBeInTheDocument();
  });

  it("shows the critical rule paragraph in full", () => {
    render(<CloseLiveness />);
    expect(
      screen.getAllByText(
        /never silently proceed past a department head's unconfirmed item/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/not hidden behind a spinner labeled 'closing'/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Audit Trail (Spec §8) ──────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<CloseLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit entries with timestamps including owner notification when expanded", () => {
    render(<CloseLiveness />);
    fireEvent.click(
      screen.getByText(/Audit Trail — Every Confirmation & Notification/i),
    );
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(8);
    expect(screen.getAllByText(/18:02:42/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/owner notified/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Cross-Agent Dependencies (Spec §10) ────────────────────────────

  it("shows the cross-agent chain and dependencies", () => {
    render(<CloseLiveness />);
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Controller Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Treasury Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/Compliance Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Reporting Agent/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the orchestration note", () => {
    render(<CloseLiveness />);
    expect(
      screen.getAllByText(/orchestrated by CFO Agent/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(
        /gated by.*confirmations|delivered by Reporting Agent/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Branch States (all 0 meters) ───────────────────────────────────

  it("shows the empty state when no close is in progress", () => {
    render(<CloseLiveness showEmptyState />);
    expect(screen.getByText(/No close in progress/i)).toBeInTheDocument();
  });

  it("shows the controller-blocked branch halting the close at that stage", () => {
    render(<CloseLiveness showControllerBlocked />);
    expect(
      screen.getAllByText(/Controller Agent Cannot Confirm/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/trial balance.*not balanced|not balanced.*variance/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/does not advance/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/never hidden behind a spinner labeled 'closing'/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  it("shows the treasury-blocked branch with the specific unreconciled line", () => {
    render(<CloseLiveness showTreasuryBlocked />);
    expect(
      screen.getAllByText(/Treasury Agent Cannot Confirm/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/BT-88213/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/unreconciled/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  it("shows the confidence-held branch per Layer 3, never proceeding silently", () => {
    render(<CloseLiveness showConfidenceHeld />);
    expect(
      screen.getAllByText(/Below Confidence Threshold/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/68% .*90%|68% is below/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/held.*human notified|human notified/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Layer 3/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  it("shows the package-generated branch with the assembled sections", () => {
    render(<CloseLiveness showPackageGenerated />);
    expect(
      screen.getAllByText(/Close Package Generated/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Profit & Loss/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/per Reporting Agent liveness spec/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  it("shows the owner-notified branch as the distinct legal acknowledgment moment", () => {
    render(<CloseLiveness showOwnerNotified />);
    expect(
      screen.getAllByText(/Owner Notified/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/18:02:42/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/legal acknowledgment record/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/not folded into a generic badge/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  it("shows the passive-approval branch with explicit silence = approval acknowledgment", () => {
    render(<CloseLiveness showPassiveApproval />);
    expect(
      screen.getAllByText(/Passive Approval/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Silence is consent/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/explicit UI acknowledgment/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/not ambiguous/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  it("shows the flagged-for-reopen branch routing to the Error Recovery flow", () => {
    render(<CloseLiveness showFlaggedForReopen />);
    expect(
      screen.getAllByText(/Flagged for Reopen/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Error Recovery \/ Reopen flow/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/cascading_error|classification/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Status Grid ────────────────────────────────────────────────────

  it("shows close metadata in the status grid", () => {
    render(<CloseLiveness />);
    const metadata = screen.getByRole("region", { name: /Close Metadata/i });
    expect(within(metadata).getByText(/Close Period/i)).toBeInTheDocument();
    expect(
      within(metadata).getByText(/Departments Confirmed/i),
    ).toBeInTheDocument();
    expect(within(metadata).getByText(/Confidence Gate/i)).toBeInTheDocument();
    expect(within(metadata).getByText(/Threshold/i)).toBeInTheDocument();
    expect(within(metadata).getByText("June 2026")).toBeInTheDocument();
    expect(within(metadata).getByText("3")).toBeInTheDocument();
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<CloseLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(8);
  });

  it("shows entity information", () => {
    render(<CloseLiveness />);
    const mentions = screen.getAllByText(/Xenboox/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Liveness Footer ────────────────────────────────────────────────

  it("shows Layer 1 and Layer 2 liveness footer with the single gate confidence", () => {
    render(<CloseLiveness />);
    const layerOne = screen.getAllByText(/Layer 1/i);
    expect(layerOne.length).toBeGreaterThanOrEqual(1);
    const layerTwo = screen.getAllByText(/Layer 2/i);
    expect(layerTwo.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/94% confidence on the close gate/i).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
