import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ErrorRecoveryLiveness } from "@/components/error-recovery/error-recovery-liveness";

describe("ErrorRecoveryLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Cascading classification in progress ─────────────────

  it("renders the flow name and black-box framing in the header", () => {
    render(<ErrorRecoveryLiveness />);
    expect(
      screen.getByRole("heading", { name: "Error Recovery / Reopen" }),
    ).toBeInTheDocument();
    const mentions = screen.getAllByText(
      /between 'flagged' and 'fixed'|black-box risk/i,
    );
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order with the classification fork", () => {
    render(<ErrorRecoveryLiveness />);
    expect(
      screen.getByText("Error Recovery State Machine"),
    ).toBeInTheDocument();
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent);
    const states = [
      "FLAGGED",
      "PERIOD_REOPENED",
      "ISSUE_DESCRIBED",
      "SCOPE_IDENTIFIED",
      "CLASSIFIED",
      "SIMPLE_CORRECTION",
      "MISSING_DATA",
      "CASCADING_ERROR",
      "OWNER_APPROVAL_IF_NEEDED",
      "CORRECTING",
      "RE_CLOSING",
      "OWNER_NOTIFIED_COMPLETE",
    ];
    const idxs = states.map((s) =>
      stageLabels.findIndex((t) => t?.includes(s)),
    );
    for (let i = 0; i < idxs.length - 1; i++) {
      expect(idxs[i]).toBeGreaterThanOrEqual(0);
      expect(idxs[i]).toBeLessThan(idxs[i + 1]);
    }
  });

  it("labels the three classification fork states (SIMPLE_CORRECTION | MISSING_DATA | CASCADING_ERROR)", () => {
    render(<ErrorRecoveryLiveness />);
    const pipeline = screen.getByRole("region", {
      name: /Error Recovery State Machine/i,
    });
    expect(
      within(pipeline).getAllByText(/FORK/i).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("shows the current operation status (classification stage)", () => {
    render(<ErrorRecoveryLiveness />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("CLASSIFIED");
    expect(status.textContent).toContain("cascading error");
  });

  // ── Exactly One Confidence Meter — the classification ────────────────

  it("renders exactly one confidence meter — the error classification confidence", () => {
    render(<ErrorRecoveryLiveness />);
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBe(1);
    expect(meters[0]).toHaveAttribute(
      "aria-label",
      "Error classification confidence",
    );
    expect(meters[0]).toHaveAttribute("aria-valuenow", "91");
    expect(meters[0]).toHaveAttribute("aria-valuemin", "0");
    expect(meters[0]).toHaveAttribute("aria-valuemax", "100");
  });

  it("does NOT render confidence meters on the pipeline stages themselves", () => {
    render(<ErrorRecoveryLiveness />);
    const pipeline = screen.getByRole("region", {
      name: /Error Recovery State Machine/i,
    });
    expect(within(pipeline).queryAllByRole("meter").length).toBe(0);
  });

  it("does NOT show an 'Agent Confidence' summary", () => {
    render(<ErrorRecoveryLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  // ── Recovery Timeline (Spec §4) — flagged → … → re-closed ────────────

  it("shows the visible recovery timeline with timestamps at each stage", () => {
    render(<ErrorRecoveryLiveness />);
    const timeline = screen.getByRole("region", { name: /Recovery Timeline/i });
    expect(within(timeline).getByText(/FLAGGED/i)).toBeInTheDocument();
    expect(within(timeline).getByText(/PERIOD_REOPENED/i)).toBeInTheDocument();
    expect(within(timeline).getByText(/ISSUE_DESCRIBED/i)).toBeInTheDocument();
    expect(within(timeline).getByText(/SCOPE_IDENTIFIED/i)).toBeInTheDocument();
    expect(within(timeline).getByText(/CLASSIFIED/i)).toBeInTheDocument();
    expect(within(timeline).getByText(/CORRECTED/i)).toBeInTheDocument();
    expect(within(timeline).getByText(/RE-CLOSED/i)).toBeInTheDocument();
    expect(
      within(timeline).getAllByText(/09:1[0-9]:[0-9]{2}/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Cascading Scope Checklist (Spec §4) ─────────────────────────────

  it("shows the full affected-period list as a checklist for cascading errors", () => {
    render(<ErrorRecoveryLiveness />);
    const scope = screen.getByRole("region", {
      name: /Cascading Scope Checklist/i,
    });
    expect(within(scope).getByText("April 2026")).toBeInTheDocument();
    expect(within(scope).getByText("May 2026")).toBeInTheDocument();
    expect(within(scope).getByText("June 2026")).toBeInTheDocument();
  });

  it("shows periods ticking off as each is corrected and re-closed, never batched", () => {
    render(<ErrorRecoveryLiveness />);
    const scope = screen.getByRole("region", {
      name: /Cascading Scope Checklist/i,
    });
    expect(
      within(scope).getByText(/corrected and re-closed in sequence/i),
    ).toBeInTheDocument();
    expect(
      within(scope).getByText(/never batched into one silent re-close/i),
    ).toBeInTheDocument();
  });

  // ── Classification Confidence (Spec §3 step 3) ──────────────────────

  it("shows the classification with its confidence and reasoning shown", () => {
    render(<ErrorRecoveryLiveness />);
    const cls = screen.getByRole("region", {
      name: /Error Classification/i,
    });
    expect(within(cls).getByText(/cascading_error/i)).toBeInTheDocument();
    expect(within(cls).getByText(/genuine judgment call/i)).toBeInTheDocument();
    expect(within(cls).getByText(/91%/i)).toBeInTheDocument();
  });

  it("shows the classification basis (same vendor miscategorization across periods)", () => {
    render(<ErrorRecoveryLiveness />);
    const cls = screen.getByRole("region", {
      name: /Error Classification/i,
    });
    expect(
      within(cls).getByText(/same vendor miscategorization pattern/i),
    ).toBeInTheDocument();
    expect(within(cls).getByText(/April, May, and June/i)).toBeInTheDocument();
  });

  // ── Owner Approval Gate (Spec §3 critical rule / §6) ────────────────

  it("shows the owner approval gate for cascading errors", () => {
    render(<ErrorRecoveryLiveness />);
    const gate = screen.getByRole("region", { name: /Owner Approval Gate/i });
    expect(
      within(gate).getByText(/approve before I proceed/i),
    ).toBeInTheDocument();
    expect(within(gate).getByText(/held until approved/i)).toBeInTheDocument();
    expect(within(gate).getByText(/never auto-proceeded/i)).toBeInTheDocument();
  });

  it("shows the critical rule: full scope shown and approved before any correction begins", () => {
    render(<ErrorRecoveryLiveness />);
    const gate = screen.getByRole("region", { name: /Owner Approval Gate/i });
    expect(
      within(gate).getByText(/full scope must be shown/i),
    ).toBeInTheDocument();
    expect(
      within(gate).getByText(
        /explicitly approved before any correction begins/i,
      ),
    ).toBeInTheDocument();
  });

  // ── Reasoning / "Why" (Spec §5) ─────────────────────────────────────

  it("shows the 'why' reasoning from spec §5", () => {
    render(<ErrorRecoveryLiveness />);
    const why = screen.getByRole("region", { name: /Why/i });
    expect(
      within(why).getByText(/Classified as cascading error/i),
    ).toBeInTheDocument();
    expect(
      within(why).getByText(
        /miscategorized marketing spend appears in April, May, and June/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(why).getByText(/correcting the root cause/i),
    ).toBeInTheDocument();
    expect(
      within(why).getByText(/re-closing all three periods in sequence/i),
    ).toBeInTheDocument();
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ────────────────────────

  it("shows escalation & human-in-the-loop triggers", () => {
    render(<ErrorRecoveryLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cascading error identified/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Reopen request beyond 12 months/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Missing data required/i)).toBeInTheDocument();
  });

  it("shows blocking treatment and the honest scope assessment note", () => {
    render(<ErrorRecoveryLiveness />);
    expect(screen.getAllByText(/Blocking/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Full scope shown, explicit approval required/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Honest scope assessment shown before beginning/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Specific document\/data requested/i),
    ).toBeInTheDocument();
  });

  // ── How It Works (Spec §3 decomposition) ────────────────────────────

  it("shows the 'how it works' decomposition toggle", () => {
    render(<ErrorRecoveryLiveness />);
    const mentions = screen.getAllByText(/How It Works — Step-by-Step/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals the decomposed sub-steps when clicked", () => {
    render(<ErrorRecoveryLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getByText(/Receive Flag \+ Description/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Identify Scope/i)).toBeInTheDocument();
    expect(screen.getByText(/Classify Error Type/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Propose Correction Sequence/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Request Owner Approval Before Beginning/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Execute Correction/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Re-Close Each Affected Period in Sequence/i),
    ).toBeInTheDocument();
  });

  it("documents the no-confidence-score steps and the judgment-call confidence", () => {
    render(<ErrorRecoveryLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getAllByText(/no confidence score/i).length,
    ).toBeGreaterThanOrEqual(4);
    expect(
      screen.getAllByText(/confidence score attached/i).length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/per PRD §8/i).length).toBeGreaterThanOrEqual(1);
  });

  // ── Constraint Enforcement ─────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<ErrorRecoveryLiveness />);
    const constraints = screen.getByRole("region", {
      name: /Constraint Enforcement/i,
    });
    expect(
      within(constraints).getByText("Visible Timeline (Flagged → Fixed)"),
    ).toBeInTheDocument();
    expect(
      within(constraints).getByText("Full Scope Shown Before Any Correction"),
    ).toBeInTheDocument();
    expect(
      within(constraints).getByText(
        "Explicit Approval Before Beginning (PRD §8)",
      ),
    ).toBeInTheDocument();
    expect(
      within(constraints).getByText("Never 'Ask Forgiveness'"),
    ).toBeInTheDocument();
    expect(
      within(constraints).getByText("Both Versions Preserved (PRD §8/§14)"),
    ).toBeInTheDocument();
  });

  it("shows the critical rule paragraph in full", () => {
    render(<ErrorRecoveryLiveness />);
    expect(
      screen.getAllByText(
        /full scope must be shown and explicitly approved before any correction begins/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(
        /'ask forgiveness' behavior is explicitly disallowed/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/requests owner approval before beginning/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Audit Trail (Spec §8) ──────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<ErrorRecoveryLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit entries with timestamps when expanded", () => {
    render(<ErrorRecoveryLiveness />);
    fireEvent.click(screen.getByText(/Audit Trail — Every Recovery Step/i));
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(9);
    expect(screen.getAllByText(/09:14:38/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/original close/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Cross-Agent Dependencies (Spec §10) ────────────────────────────

  it("shows the cross-agent chain and dependencies", () => {
    render(<ErrorRecoveryLiveness />);
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ledger Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/Reporting Agent/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the orchestration note and normal posting gates", () => {
    render(<ErrorRecoveryLiveness />);
    expect(
      screen.getAllByText(/orchestrated by CFO Agent/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Ledger Agent's normal posting gates/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Branch States (all 0 meters) ───────────────────────────────────

  it("shows the empty state when no recovery is in progress", () => {
    render(<ErrorRecoveryLiveness showEmptyState />);
    expect(screen.getByText(/No recovery in progress/i)).toBeInTheDocument();
  });

  it("shows the simple-correction branch with the under-10-minute expectation", () => {
    render(<ErrorRecoveryLiveness showSimpleCorrection />);
    expect(
      screen.getAllByText(/Simple Correction/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/target: under 10 minutes/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the missing-data branch requesting the specific document", () => {
    render(<ErrorRecoveryLiveness showMissingData />);
    expect(screen.getAllByText(/Missing Data/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/Need the original supplier invoice #4471 for June/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/blocked until data provided/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the cascading branch requesting explicit approval before beginning", () => {
    render(<ErrorRecoveryLiveness showCascadingApproval />);
    expect(
      screen.getAllByText(/Cascading Error — Approval Requested/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/This affects 3 periods — April, May, June/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/held until approved/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the declined-approval branch held indefinitely", () => {
    render(<ErrorRecoveryLiveness showApprovalDeclined />);
    expect(
      screen.getAllByText(/Owner Declined Approval/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/held indefinitely, not auto-proceeded/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the correction-complete terminal branch with both versions preserved", () => {
    render(<ErrorRecoveryLiveness showCorrectionComplete />);
    expect(
      screen.getAllByText(/Correction Complete/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(
        /original and corrected versions preserved side by side/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders zero confidence meters across all branch states", () => {
    render(<ErrorRecoveryLiveness showSimpleCorrection />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
    render(<ErrorRecoveryLiveness showMissingData />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
    render(<ErrorRecoveryLiveness showCascadingApproval />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
    render(<ErrorRecoveryLiveness showApprovalDeclined />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
    render(<ErrorRecoveryLiveness showCorrectionComplete />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Liveness Footer ─────────────────────────────────────────────────

  it("shows Layer 1 deterministic and Layer 2 probabilistic footer", () => {
    render(<ErrorRecoveryLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/deterministic/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/Layer 2/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/91% confidence on the error classification/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Metadata (Spec §2/§9 alignment with reopenRequests) ─────────────

  it("shows recovery metadata aligned with the reopenRequests model", () => {
    render(<ErrorRecoveryLiveness />);
    const meta = screen.getByRole("region", { name: /Recovery Metadata/i });
    expect(within(meta).getByText("June 2026")).toBeInTheDocument();
    expect(within(meta).getByText("cascading_error")).toBeInTheDocument();
    expect(within(meta).getByText("dashboard")).toBeInTheDocument();
  });
});
