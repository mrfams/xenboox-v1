import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArLiveness } from "@/components/agents/ar-liveness";

describe("ArLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Invoice-to-Cash Flow ─────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<ArLiveness />);
    const mentions = screen.getAllByText(/AR Agent/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Accounts Receivable — Invoice-to-Cash/i),
    ).toBeInTheDocument();
  });

  it("renders pipeline states in correct order: INVOICE_CREATED → SENT → AWAITING_PAYMENT → PAYMENT_MATCHING → RECEIPT_GENERATED → AGING_UPDATED", () => {
    render(<ArLiveness />);
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent ?? "");
    const order = [
      "INVOICE_CREATED",
      "SENT",
      "AWAITING_PAYMENT",
      "PAYMENT_MATCHING",
      "RECEIPT_GENERATED",
      "AGING_UPDATED",
    ];
    const indices = order.map((state) =>
      stageLabels.findIndex((t) => t.includes(state)),
    );
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });

  it("renders the match outcomes branch: FULL_MATCH / PARTIAL_MATCH / OVERPAYMENT", () => {
    render(<ArLiveness />);
    for (const outcome of ["FULL_MATCH", "PARTIAL_MATCH", "OVERPAYMENT"]) {
      expect(screen.getAllByText(outcome).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("shows the current operation status", () => {
    render(<ArLiveness />);
    const mentions = screen.getAllByText(/PAYMENT_MATCHING/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows entity scoping indicator", () => {
    render(<ArLiveness />);
    const mentions = screen.getAllByText(/Xenboox HQ/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the invoice attribution (number, customer, amount)", () => {
    render(<ArLiveness />);
    const mentions = screen.getAllByText(/INV-2205/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Kairaba Trading Ltd/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Payment Matching: The Critical Anti-Hallucination Rules ─────────

  it("shows the full match with its basis (amount + reference exactly match)", () => {
    render(<ArLiveness />);
    expect(
      screen.getByText(/Full match: GMD 500\.00 ↔ INV-2201/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/amount and reference exactly match/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the partial match with exact received amount and exact remaining balance — never rounds", () => {
    render(<ArLiveness />);
    expect(
      screen.getByText(/Partial payment: GMD 300\.00 of GMD 500\.00 received/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/GMD 200\.00 remains outstanding/i).length,
    ).toBeGreaterThanOrEqual(1);
    // The critical rule is stated, not just implied
    expect(
      screen.getAllByText(/never rounded|never rounds/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the partial match distinctly from the full match (active highlight)", () => {
    const { container } = render(<ArLiveness />);
    const fullRow = container.querySelector('[data-match-kind="full"]');
    const partialRow = container.querySelector('[data-match-kind="partial"]');
    expect(fullRow).not.toBeNull();
    expect(partialRow).not.toBeNull();
    // Partial match is the active/current outcome; full match is not
    expect(partialRow!.getAttribute("data-active")).toBe("true");
    expect(fullRow!.getAttribute("data-active")).toBeNull();
  });

  it("shows the overpayment with credit balance flagged and pending instruction", () => {
    render(<ArLiveness />);
    expect(
      screen.getByText(
        /Overpayment: GMD 550\.00 received against GMD 500\.00/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /GMD 50\.00.*credit balance|credit balance.*GMD 50\.00/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/pending instruction/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the ambiguous match — never auto-picks between same-amount open invoices", () => {
    render(<ArLiveness />);
    expect(
      screen.getByText(
        /Ambiguous: two open invoices match GMD 500\.00 exactly/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/never auto-picks/i).length,
    ).toBeGreaterThanOrEqual(1);
    // Both candidate invoices named — the user can see the ambiguity
    expect(screen.getAllByText(/INV-2207/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows unmatched payments routed to Reconciliation Agent buckets with reason", () => {
    render(<ArLiveness />);
    expect(
      screen.getByText(
        /Unmatched: GMD 750\.00 payment — no open invoice matches/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/routed to Reconciliation Agent buckets/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("full/partial/overpayment/unmatched have NO meter; ambiguous HAS a meter", () => {
    const { container } = render(<ArLiveness />);
    for (const kind of [
      "full",
      "partial",
      "overpayment",
      "unmatched",
      "donor",
    ]) {
      const row = container.querySelector(`[data-match-kind="${kind}"]`);
      expect(row, `${kind} row exists`).not.toBeNull();
      expect(
        row!.querySelectorAll('[role="meter"]').length,
        `${kind} row has no meter`,
      ).toBe(0);
    }
    const ambiguousRow = container.querySelector(
      '[data-match-kind="ambiguous"]',
    );
    expect(ambiguousRow).not.toBeNull();
    expect(ambiguousRow!.querySelectorAll('[role="meter"]').length).toBe(1);
  });

  it("renders exactly 1 confidence meter total: the ambiguous match only", () => {
    const { container } = render(<ArLiveness />);
    const meters = container.querySelectorAll('[role="meter"]');
    expect(meters.length).toBe(1);
  });

  it("shows the critical rule: a partial payment is never silently treated as closing the invoice", () => {
    render(<ArLiveness />);
    const mentions = screen.getAllByText(
      /never silently treated as closing|never silently closes/i,
    );
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Invoice Status Timeline (Spec §4) ───────────────────────────────

  it("shows the invoice status timeline: created → sent → viewed → payment → due", () => {
    render(<ArLiveness />);
    expect(
      screen.getAllByText(/Invoice Timeline/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Created — Jul 1, 2026/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Sent — Jul 2, 2026/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Viewed — Jul 5, 2026/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Payment — Jul 18, 2026/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the delivery as confirmed, never assumed sent", () => {
    render(<ArLiveness />);
    expect(
      screen.getAllByText(/delivered to accounts@kairaba\.gm/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the due-date badge (days until/past due)", () => {
    render(<ArLiveness />);
    expect(
      screen.getAllByText(/days until due|past due/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Aging Report (Spec §4: updates live) ────────────────────────────

  it("shows aging report buckets: current / 30 / 60 / 90+", () => {
    render(<ArLiveness />);
    expect(screen.getAllByText(/Current/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/30 days/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/60 days/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/90\+ days/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows aging updates live — recalculated on receipt, not batch-refreshed", () => {
    render(<ArLiveness />);
    expect(
      screen.getAllByText(/updates live|not batch-refreshed/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("reflects the partial payment in aging: GMD 500.00 → GMD 200.00 outstanding", () => {
    render(<ArLiveness />);
    expect(
      screen.getAllByText(/GMD 500\.00 → GMD 200\.00/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ────────────────────────

  it("escalates overpayment to Controller Agent — blocking on that credit only", () => {
    render(<ArLiveness />);
    expect(
      screen.getAllByText(/Controller Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/apply to next invoice or refund/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/blocking on that credit only/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("escalates unmatched payment to Reconciliation Agent — non-blocking to other invoices", () => {
    render(<ArLiveness />);
    expect(
      screen.getAllByText(/non-blocking to other invoices/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows proactive aging alerts for significantly overdue invoices", () => {
    render(<ArLiveness />);
    expect(screen.getAllByText(/aging alert/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/surfaced proactively/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows ambiguous match requires human confirmation — blocking", () => {
    render(<ArLiveness />);
    expect(
      screen.getAllByText(/flagged for confirmation|requires confirmation/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── How It Works Toggle ─────────────────────────────────────────────

  it("reveals step details when 'How It Works' is clicked", () => {
    render(<ArLiveness />);
    const toggle = screen.getByText(
      /How It Works — Step-by-Step Decomposition/i,
    );
    fireEvent.click(toggle);
    expect(screen.getByText(/Pull Customer \+ Terms/)).toBeInTheDocument();
    expect(screen.getByText(/Draft Invoice/)).toBeInTheDocument();
    expect(screen.getByText(/^Deliver$/)).toBeInTheDocument();
    expect(screen.getByText(/Match Incoming Payment/)).toBeInTheDocument();
    expect(screen.getByText(/Generate Receipt/)).toBeInTheDocument();
    expect(screen.getByText(/Update Aging/)).toBeInTheDocument();
  });

  it("decomposition states matching requires confidence + basis, especially across multiple open invoices", () => {
    render(<ArLiveness />);
    const toggle = screen.getByText(
      /How It Works — Step-by-Step Decomposition/i,
    );
    fireEvent.click(toggle);
    expect(screen.getByText(/confidence score required/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/multiple open invoices/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Constraint Enforcement Badges ───────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<ArLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Partial Never Rounded")).toBeInTheDocument();
    expect(screen.getByText("Exact Amount Always Shown")).toBeInTheDocument();
    expect(screen.getByText("Overpayment Flagged")).toBeInTheDocument();
    expect(screen.getByText("Never Auto-Picks Ambiguous")).toBeInTheDocument();
    expect(screen.getByText("Delivery Never Assumed Sent")).toBeInTheDocument();
  });

  // ── Audit Trail (Spec §8) ───────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<ArLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("logs creation, delivery, every match attempt (matched AND unmatched), receipt, and aging when expanded", () => {
    render(<ArLiveness />);
    const toggle = screen.getByText(/Audit Trail — Every Event Logged/i);
    fireEvent.click(toggle);
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(
      screen.getAllByText(/invoice created/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/delivery confirmed/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/match attempt/i).length).toBeGreaterThanOrEqual(
      2,
    );
    // Both matched and unmatched attempts are preserved
    expect(screen.getAllByText(/type partial/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/no match/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/receipt/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/aging recalculated/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("preserves human confirmations in the audit trail (never overwritten)", () => {
    render(<ArLiveness />);
    const toggle = screen.getByText(/Audit Trail — Every Event Logged/i);
    fireEvent.click(toggle);
    const mentions = screen.getAllByText(/confirmed by human/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Edge Cases ──────────────────────────────────────────────────────

  it("shows 'No invoice awaiting payment' empty state when idle", () => {
    render(<ArLiveness showEmptyState />);
    expect(
      screen.getByText(/No invoice awaiting payment/i),
    ).toBeInTheDocument();
  });

  it("shows delivery failure flagged with retry/alternate contact — never silently marked sent", () => {
    render(<ArLiveness showDeliveryFailure />);
    expect(screen.getByText(/Delivery Failed/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/retry or use alternate contact/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/never silently marked.*sent|never assumed sent/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the overpayment credit state — blocking on that credit", () => {
    render(<ArLiveness showOverpayment />);
    // Appears in the strip title AND the credit-balance box — accept multiple
    expect(
      screen.getAllByText(/GMD 50\.00 Credit/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/pending instruction/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the ambiguous-match state — never auto-picks", () => {
    render(<ArLiveness showAmbiguousMatch />);
    // Appears in the strip title AND the footer rule — accept multiple
    expect(
      screen.getAllByText(/Ambiguous Match/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/never auto-picks/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the terminal AGING_UPDATED state — invoice fully resolved", () => {
    render(<ArLiveness showAgingUpdated />);
    expect(
      screen.getByText(/Invoice fully resolved — aging updated/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/paid in full/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("terminal state hands off to Ledger Agent for posting", () => {
    render(<ArLiveness showAgingUpdated />);
    const mentions = screen.getAllByText(
      /Ledger Agent — posting follows receipt confirmation/i,
    );
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("terminal state renders no confidence meters (deterministic outcome)", () => {
    const { container } = render(<ArLiveness showAgingUpdated />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  it("incoming-payment banner carries no confidence meter (detection is deterministic)", () => {
    const { container } = render(<ArLiveness />);
    const received = container.querySelector('[data-step="received"]');
    expect(received).not.toBeNull();
    expect(received!.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Cross-Agent Dependencies (Spec §10) ─────────────────────────────

  it("shows the handoff chain: Reconciliation/Mobile Money → AR → Ledger", () => {
    render(<ArLiveness />);
    expect(
      screen.getAllByText(/Reconciliation Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Mobile Money Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/AR Agent/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ledger Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("shows donor payment tracking flows into Reporting Agent for donor-format reports", () => {
    render(<ArLiveness />);
    expect(
      screen.getAllByText(/Reporting Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/donor-format reports/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Liveness Footer ─────────────────────────────────────────────────

  it("shows Layer 1 deterministic + Layer 2 probabilistic liveness footer", () => {
    render(<ArLiveness />);
    expect(screen.getAllByText(/Layer 1/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Layer 2/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows the receipt reflects the exact amount received, never the invoice total", () => {
    render(<ArLiveness />);
    expect(
      screen.getAllByText(/exact amount received, never the invoice total/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Accessibility ───────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<ArLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(6);
  });

  it("has descriptive aria-labels on confidence meters", () => {
    render(<ArLiveness />);
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBe(1);
    meters.forEach((meter) => {
      expect(meter).toHaveAttribute("aria-valuenow");
      expect(meter).toHaveAttribute("aria-valuemin", "0");
      expect(meter).toHaveAttribute("aria-valuemax", "100");
    });
  });
});
