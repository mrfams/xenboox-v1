import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExpenseLiveness } from "@/components/agents/expense-liveness";

describe("ExpenseLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Claim Processing ──────────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<ExpenseLiveness />);
    expect(screen.getByText(/Expense Agent/i)).toBeInTheDocument();
    const role = screen.getAllByText(
      /Expense claims — receipt to reimbursement/i,
    );
    expect(role.length).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order: RECEIPT_SUBMITTED → EXTRACTING → POLICY_CHECKING → ROUTING → REIMBURSEMENT_SCHEDULED → PAID", () => {
    render(<ExpenseLiveness />);
    const stages = screen.getAllByRole("listitem");
    const labels = stages.map((el) => el.textContent);
    const receivedIdx = labels.findIndex((t) =>
      t?.includes("RECEIPT_SUBMITTED"),
    );
    const extractIdx = labels.findIndex((t) => t?.includes("EXTRACTING"));
    const policyIdx = labels.findIndex((t) => t?.includes("POLICY_CHECKING"));
    const routingIdx = labels.findIndex((t) => t?.includes("ROUTING"));
    const schedIdx = labels.findIndex((t) =>
      t?.includes("REIMBURSEMENT_SCHEDULED"),
    );
    const paidIdx = labels.findIndex((t) => t?.includes("PAID"));
    expect(receivedIdx).toBeGreaterThanOrEqual(0);
    expect(extractIdx).toBeGreaterThan(receivedIdx);
    expect(policyIdx).toBeGreaterThan(extractIdx);
    expect(routingIdx).toBeGreaterThan(policyIdx);
    expect(schedIdx).toBeGreaterThan(routingIdx);
    expect(paidIdx).toBeGreaterThan(schedIdx);
  });

  it("shows the current operation status", () => {
    render(<ExpenseLiveness />);
    const mentions = screen.getAllByText(/POLICY_CHECKING/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows entity information", () => {
    render(<ExpenseLiveness />);
    const mentions = screen.getAllByText(/Xenboox HQ/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Approval Outcomes Branch ────────────────────────────────────────

  it("renders all three approval outcomes: APPROVED, REJECTED, ESCALATED", () => {
    render(<ExpenseLiveness />);
    expect(screen.getByText("APPROVED")).toBeInTheDocument();
    expect(screen.getByText("REJECTED")).toBeInTheDocument();
    expect(screen.getByText("ESCALATED")).toBeInTheDocument();
  });

  // ── Receipt + Claim (Spec §2) ───────────────────────────────────────

  it("shows the receipt with claimed amount and category", () => {
    render(<ExpenseLiveness />);
    const claims = screen.getAllByText(/GMD 28\.00/i);
    expect(claims.length).toBeGreaterThanOrEqual(1);
    const meal = screen.getAllByText(/Meals/i);
    expect(meal.length).toBeGreaterThanOrEqual(1);
  });

  // ── OCR Extraction (Spec §3 — per-field confidence) ─────────────────

  it("shows OCR-extracted fields against the receipt", () => {
    render(<ExpenseLiveness />);
    expect(screen.getByText(/Kairaba Restaurant/i)).toBeInTheDocument();
    const dates = screen.getAllByText(/June 12, 2026/i);
    expect(dates.length).toBeGreaterThanOrEqual(1);
  });

  it("shows per-field OCR confidence meters (probabilistic layer)", () => {
    const { container } = render(<ExpenseLiveness />);
    const meters = container.querySelectorAll('[role="meter"]');
    expect(meters.length).toBe(3);
  });

  it("labels OCR field confidences (vendor / amount / date)", () => {
    render(<ExpenseLiveness />);
    const vendor = screen.getAllByText(/Vendor/i);
    expect(vendor.length).toBeGreaterThanOrEqual(1);
    const amount = screen.getAllByText(/Amount/i);
    expect(amount.length).toBeGreaterThanOrEqual(1);
    const date = screen.getAllByText(/Date/i);
    expect(date.length).toBeGreaterThanOrEqual(1);
  });

  // ── Policy Checks — ITEMIZED (Spec §3/§4/§5 — the critical rule) ───

  it("itemizes policy checks — each rule checked and shown individually", () => {
    render(<ExpenseLiveness />);
    expect(
      screen.getByText(/Receipt required above GMD 20/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Meal limit GMD 30/i)).toBeInTheDocument();
    // 'Duplicate submission' also appears in the escalation table row
    // "Possible duplicate submission" — so it must be a count assertion.
    const dupMentions = screen.getAllByText(/Duplicate submission/i);
    expect(dupMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows a pass/fail marker per policy rule (never a single badge)", () => {
    const { container } = render(<ExpenseLiveness />);
    const checklist = container.querySelector('[data-policy-checklist="true"]');
    expect(checklist).not.toBeNull();
    const passItems =
      checklist?.querySelectorAll('[data-policy-result="pass"]') ?? [];
    expect(passItems.length).toBeGreaterThanOrEqual(2);
  });

  it("never collapses policy checks into a single 'policy ok' flag", () => {
    render(<ExpenseLiveness />);
    expect(screen.queryByText(/Policy OK/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Policy Passed/i)).not.toBeInTheDocument();
  });

  it("shows the specific limit and claimed value for the meal rule", () => {
    render(<ExpenseLiveness />);
    expect(screen.getByText(/claimed GMD 28/i)).toBeInTheDocument();
    expect(screen.getByText(/within limit/i)).toBeInTheDocument();
  });

  // ── Duplicate Check (Spec §3 step 4) ────────────────────────────────

  it("shows the duplicate check against prior claims", () => {
    render(<ExpenseLiveness />);
    const mentions = screen.getAllByText(/prior expense claims/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/No duplicate found/i)).toBeInTheDocument();
  });

  it("does NOT render a confidence meter on the exact duplicate check", () => {
    const { container } = render(<ExpenseLiveness />);
    const dupRow = container.querySelector('[data-step="duplicate"]');
    expect(dupRow).not.toBeNull();
    expect(dupRow?.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Meter Discipline ────────────────────────────────────────────────

  it("renders exactly 3 confidence meters total (OCR fields only)", () => {
    const { container } = render(<ExpenseLiveness />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(3);
  });

  it("does NOT render meters on policy-check rows", () => {
    const { container } = render(<ExpenseLiveness />);
    const checklist = container.querySelector('[data-policy-checklist="true"]');
    expect(checklist?.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Routing (Spec §3 step 5 — deterministic) ────────────────────────

  it("shows routing to a specific approver by name", () => {
    render(<ExpenseLiveness />);
    expect(screen.getByText(/Routed to Awa Sillah/i)).toBeInTheDocument();
  });

  it("shows routing is deterministic — no confidence meter", () => {
    const { container } = render(<ExpenseLiveness />);
    const routeRow = container.querySelector('[data-step="routing"]');
    expect(routeRow).not.toBeNull();
    expect(routeRow?.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Reasoning / "Why" (Spec §5) ─────────────────────────────────────

  it("shows the 'Policy check' reasoning example", () => {
    render(<ExpenseLiveness />);
    const mentions = screen.getAllByText(/within limit ✓/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ────────────────────────

  it("shows escalation triggers table", () => {
    render(<ExpenseLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    const managerMentions = screen.getAllByText(/Department Manager/i);
    expect(managerMentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Branch: Escalated (policy limit exceeded) ───────────────────────

  it("shows the escalated branch — claimed GMD 45 exceeds meal limit by GMD 15", () => {
    render(<ExpenseLiveness showEscalated />);
    expect(
      screen.getByText(/exceeds GMD 30 category limit by GMD 15/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/exception approval, not auto-approved/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/itemized failure shown/i)).toBeInTheDocument();
  });

  it("shows the escalated branch is blocking", () => {
    render(<ExpenseLiveness showEscalated />);
    const blocking = screen.getAllByText(/blocking/i);
    expect(blocking.length).toBeGreaterThanOrEqual(1);
  });

  it("escalated branch renders 0 confidence meters", () => {
    const { container } = render(<ExpenseLiveness showEscalated />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Branch: OCR Failure (Spec §7) ───────────────────────────────────

  it("shows OCR failure — never guesses an amount", () => {
    render(<ExpenseLiveness showOcrFailure />);
    expect(
      screen.getByText(
        /Couldn't read this receipt — please resubmit or enter manually/i,
      ),
    ).toBeInTheDocument();
    const neverGuess = screen.getAllByText(/never guesses an amount/i);
    expect(neverGuess.length).toBeGreaterThanOrEqual(1);
  });

  it("shows OCR failure is blocking", () => {
    render(<ExpenseLiveness showOcrFailure />);
    const blocking = screen.getAllByText(/blocking/i);
    expect(blocking.length).toBeGreaterThanOrEqual(1);
  });

  // ── Branch: Rejected (missing receipt hard fail, Spec §7) ───────────

  it("shows rejection — missing receipt above threshold is a hard policy fail", () => {
    render(<ExpenseLiveness showRejected />);
    expect(
      screen.getByText(/Missing receipt above the GMD 20 threshold/i),
    ).toBeInTheDocument();
    const notWaived = screen.getAllByText(
      /hard policy fail, not silently waived/i,
    );
    expect(notWaived.length).toBeGreaterThanOrEqual(1);
  });

  it("rejected branch renders 0 confidence meters", () => {
    const { container } = render(<ExpenseLiveness showRejected />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Terminal State: PAID (Spec §2) ──────────────────────────────────

  it("shows terminal PAID state", () => {
    render(<ExpenseLiveness showPaid />);
    // 'Reimbursed' appears in the title and 'reimbursed via Cash Agent' in the body
    const reimbursed = screen.getAllByText(/Reimbursed/i);
    expect(reimbursed.length).toBeGreaterThanOrEqual(1);
    const claim = screen.getAllByText(/EXP-2026-0142/i);
    expect(claim.length).toBeGreaterThanOrEqual(1);
  });

  it("terminal state renders 0 confidence meters", () => {
    const { container } = render(<ExpenseLiveness showPaid />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  it("terminal state hands off to Ledger Agent for posting", () => {
    render(<ExpenseLiveness showPaid />);
    const mentions = screen.getAllByText(/Ledger Agent/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── How It Works (Spec §3 decomposition) ────────────────────────────

  it("shows the 'How It Works' decomposition toggle", () => {
    render(<ExpenseLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals decomposed sub-steps when 'How It Works' is clicked", () => {
    render(<ExpenseLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    expect(screen.getByText(/Receive Claim/)).toBeInTheDocument();
    // 'OCR Extraction' / 'Policy Check' / 'Duplicate Check' also appear in
    // always-rendered section headers, so use count assertions.
    const ocrMentions = screen.getAllByText(/OCR Extraction/);
    expect(ocrMentions.length).toBeGreaterThanOrEqual(1);
    const policyMentions = screen.getAllByText(/Policy Check/);
    expect(policyMentions.length).toBeGreaterThanOrEqual(1);
    const dupMentions = screen.getAllByText(/Duplicate Check/);
    expect(dupMentions.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Route to Approver/)).toBeInTheDocument();
    expect(screen.getByText(/Schedule Reimbursement/)).toBeInTheDocument();
  });

  // ── Constraint Enforcement ──────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<ExpenseLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Itemized Policy Checks")).toBeInTheDocument();
    expect(screen.getByText("OCR Never Guesses")).toBeInTheDocument();
    expect(screen.getByText("Receipt Threshold Enforced")).toBeInTheDocument();
    expect(screen.getByText("Duplicate Flagged")).toBeInTheDocument();
  });

  // ── Audit Trail (Spec §8) ───────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<ExpenseLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with OCR confidence + policy rules + approver action when expanded", () => {
    render(<ExpenseLiveness />);
    const toggle = screen.getByText(/Audit Trail — Every Claim/i);
    fireEvent.click(toggle);
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(6);
    const headers = screen.getAllByRole("columnheader");
    const headerText = headers.map((h) => h.textContent).join(" ");
    expect(headerText).toMatch(/Check|Rule|Field/i);
    expect(headerText).toMatch(/Result/i);
    expect(headerText).toMatch(/Confidence/i);
  });

  // ── Cross-Agent Dependencies (Spec §10) ─────────────────────────────

  it("shows the cross-agent chain (Document → Expense → Controller → Ledger, Cash for reimbursement)", () => {
    render(<ExpenseLiveness />);
    const docAgent = screen.getAllByText(/Document Agent/i);
    expect(docAgent.length).toBeGreaterThanOrEqual(1);
    const controller = screen.getAllByText(/Controller Agent/i);
    expect(controller.length).toBeGreaterThanOrEqual(1);
    const ledger = screen.getAllByText(/Ledger Agent/i);
    expect(ledger.length).toBeGreaterThanOrEqual(1);
    const cash = screen.getAllByText(/Cash Agent/i);
    expect(cash.length).toBeGreaterThanOrEqual(1);
  });

  // ── Accessibility ───────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<ExpenseLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  // ── Empty State ─────────────────────────────────────────────────────

  it("shows 'No claim being processed' empty state", () => {
    render(<ExpenseLiveness showEmptyState />);
    expect(screen.getByText(/No claim being processed/i)).toBeInTheDocument();
  });

  // ── Liveness Footer ─────────────────────────────────────────────────

  it("shows Layer 1 deterministic liveness footer", () => {
    render(<ExpenseLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const detMentions = screen.getAllByText(/deterministic/i);
    expect(detMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Layer 2 probabilistic liveness footer", () => {
    render(<ExpenseLiveness />);
    const layer2 = screen.getAllByText(/Layer 2/i);
    expect(layer2.length).toBeGreaterThanOrEqual(1);
    const probMentions = screen.getAllByText(/probabilistic/i);
    expect(probMentions.length).toBeGreaterThanOrEqual(1);
  });
});
