import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CashLiveness } from "@/components/agents/cash-liveness";

describe("CashLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Till + Imprest Lifecycles ────────────────────

  it("renders the agent name and role in the header", () => {
    render(<CashLiveness />);
    const mentions = screen.getAllByText(/Cash Agent/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Cash & Imprest Management/i)).toBeInTheDocument();
  });

  it("renders the till pipeline in order: TRANSACTION_RECORDED → TILL_BALANCE_UPDATED", () => {
    render(<CashLiveness />);
    const stages = screen.getAllByRole("listitem");
    const labels = stages.map((el) => el.textContent ?? "");
    const idxA = labels.findIndex((t) => t.includes("TRANSACTION_RECORDED"));
    const idxB = labels.findIndex((t) => t.includes("TILL_BALANCE_UPDATED"));
    expect(idxA).toBeGreaterThanOrEqual(0);
    expect(idxB).toBeGreaterThan(idxA);
  });

  it("renders the imprest pipeline in order: ISSUED → IN_USE → RETIREMENT_SUBMITTED → RECEIPT_MATCHING → RETIRED", () => {
    render(<CashLiveness />);
    const stages = screen.getAllByRole("listitem");
    const labels = stages.map((el) => el.textContent ?? "");
    const order = [
      "ISSUED",
      "IN_USE",
      "RETIREMENT_SUBMITTED",
      "RECEIPT_MATCHING",
      "RETIRED",
    ];
    const indices = order.map((state) =>
      labels.findIndex((t) => t.includes(state)),
    );
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });

  it("renders the outcome branches: MATCHES_EXPECTED / DISCREPANCY_FLAGGED / BALANCED / VARIANCE_FLAGGED", () => {
    render(<CashLiveness />);
    for (const outcome of [
      "MATCHES_EXPECTED",
      "DISCREPANCY_FLAGGED",
      "BALANCED",
      "VARIANCE_FLAGGED",
    ]) {
      expect(screen.getAllByText(outcome).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("shows the current operation status", () => {
    render(<CashLiveness />);
    const mentions = screen.getAllByText(/RECEIPT_MATCHING/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows entity scoping indicator", () => {
    render(<CashLiveness />);
    const mentions = screen.getAllByText(/Xenboox HQ/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the till attribution (name and location)", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/Front Desk till/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Cash Position Ticker (Spec §4: live, not static) ───────────────

  it("shows the cash position ticker updating live, not a static end-of-day number", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/Cash Position Ticker/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/not a static end-of-day number/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows live transaction feed lines", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/recorded at Front Desk till/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/recorded at Field Office till/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("labels till balance update as arithmetic with no confidence", () => {
    render(<CashLiveness />);
    const mentions = screen.getAllByText(/arithmetic/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/no confidence score/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Till Discrepancy (Spec §2, §5) ─────────────────────────────────

  it("shows discrepancy with exact counted vs expected amounts", () => {
    render(<CashLiveness />);
    expect(
      screen.getByText(
        /Discrepancy flagged: physical count GMD 480 vs system balance GMD 500/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/GMD 20 short/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("discrepancy has NO confidence meter (direct comparison, deterministic)", () => {
    const { container } = render(<CashLiveness />);
    const disc = container.querySelector('[data-till-state="discrepancy"]');
    expect(disc).not.toBeNull();
    expect(disc!.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  it("flags discrepancies same-day, not batched to month-end", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/same-day flag|not batched to month-end/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("discrepancy is blocking for that till's close, non-blocking to other tills", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/blocking for that till's close/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/non-blocking to other tills/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Imprest Card-Based Lifecycle Tracker (Spec §4) ─────────────────

  it("shows imprest as a card-based lifecycle tracker, not a flat table row", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/Imprest Lifecycle/i).length,
    ).toBeGreaterThanOrEqual(1);
    // Four card states
    for (const card of ["Issued", "In Use", "Retirement Pending", "Retired"]) {
      expect(screen.getAllByText(card).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("shows the issuance record with who, amount, purpose, due date", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/GMD 100\.00 to Fatou Jallow/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/field fuel/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/due Jul 24, 2026/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the in-use days-outstanding badge", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/In use — 3 of 7 days/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Receipt Matching (Spec §3 step 5, §4) ──────────────────────────

  it("shows receipt matching with receipts line by line against the float total", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/Receipt Matching/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/RCP-1/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/GMD 45\.00/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows per-receipt OCR confidence meters (probabilistic layer)", () => {
    render(<CashLiveness />);
    const meters = screen.getAllByRole("meter");
    // 3 OCR-matched receipts carry confidence; unreadable receipt and sums do not
    expect(meters.length).toBe(3);
  });

  it("matched sum has NO meter — arithmetic is not probabilistic", () => {
    const { container } = render(<CashLiveness />);
    const sum = container.querySelector('[data-step="sum"]');
    expect(sum).not.toBeNull();
    expect(sum!.querySelectorAll('[role="meter"]').length).toBe(0);
    expect(
      screen.getAllByText(/GMD 95\.00 matched/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows unaccounted balance in Attention Amber even for small amounts", () => {
    const { container } = render(<CashLiveness />);
    const unacc = container.querySelector("[data-variance-amount]");
    expect(unacc).not.toBeNull();
    expect(unacc!.textContent).toMatch(/GMD 5\.00 unaccounted/i);
    expect(unacc!.className).toMatch(/attention-amber/);
  });

  it("flags unreadable receipts for manual entry — never silently excluded", () => {
    render(<CashLiveness />);
    expect(screen.getByText(/Couldn't read RCP-4/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/flagged for manual entry/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/never silently excluded/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("unreadable receipt has NO meter (deterministic failure)", () => {
    const { container } = render(<CashLiveness />);
    const unreadable = container.querySelector(
      '[data-receipt-kind="unreadable"]',
    );
    expect(unreadable).not.toBeNull();
    expect(unreadable!.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Variance (Spec §3 step 6, §5) ──────────────────────────────────

  it("shows the unaccounted variance explicitly, never hidden in a rounded total", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/GMD 5\.00 unaccounted/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("variance is never silently absorbed into 'misc expense'", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(
        /never silently absorbed into .misc expense.|never.*absorbed.*misc expense/i,
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows variance resolution options: repay, write off with reason, or escalate", () => {
    render(<CashLiveness />);
    expect(screen.getAllByText(/repay/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/write off with a named reason/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/escalate to Treasury Agent/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("imprest variance is blocking on that imprest's closure", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/blocking on that imprest's closure/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Negative Till Balance Hard Stop (Spec §7) ──────────────────────

  it("negative till balance is a hard stop — never posts silently", () => {
    render(<CashLiveness />);
    expect(
      screen.getByText(/Negative Till Balance — Hard Stop/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/not allowed to post silently|never posts silently/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ───────────────────────

  it("escalates any cash discrepancy to Treasury Agent immediately", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/Treasury Agent/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/immediately/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("escalates imprest variance to Treasury Agent + department manager", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/department manager/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows overdue imprest auto-reminder to Treasury Agent (non-blocking)", () => {
    render(<CashLiveness />);
    expect(screen.getAllByText(/auto-reminder/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/surfaced proactively/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── How It Works Toggle ────────────────────────────────────────────

  it("reveals step details when 'How It Works' is clicked", () => {
    render(<CashLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    expect(screen.getByText(/Record Cash Movement/)).toBeInTheDocument();
    expect(screen.getByText(/Update Till Balance/)).toBeInTheDocument();
    expect(screen.getByText(/Compare Physical Count/)).toBeInTheDocument();
    expect(screen.getByText(/Record Imprest Issuance/)).toBeInTheDocument();
    expect(screen.getByText(/Match Retirement Receipts/)).toBeInTheDocument();
    expect(screen.getByText(/Flag Variance/)).toBeInTheDocument();
  });

  it("decomposition states per-receipt OCR confidence but arithmetic sum is not probabilistic", () => {
    render(<CashLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    expect(
      screen.getAllByText(/per-receipt OCR confidence/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/the arithmetic sum itself is not probabilistic/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Constraint Enforcement Badges ─────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<CashLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Variance Never Absorbed")).toBeInTheDocument();
    expect(screen.getByText("Exact Discrepancy Shown")).toBeInTheDocument();
    expect(
      screen.getByText("Receipts Never Silently Excluded"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Hard Stop on Negative Balance"),
    ).toBeInTheDocument();
    expect(screen.getByText("Arithmetic ≠ Probabilistic")).toBeInTheDocument();
  });

  // ── Audit Trail (Spec §8) ─────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<CashLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("logs every cash movement, count/discrepancy, receipt matching, and variance resolution when expanded", () => {
    render(<CashLiveness />);
    const toggle = screen.getByText(/Audit Trail — Every Event Logged/i);
    fireEvent.click(toggle);
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByText(/cash movement/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/physical count/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/receipt matched/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/variance flagged/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("logs the variance resolution method (repaid with approver) — never overwritten", () => {
    render(<CashLiveness />);
    const toggle = screen.getByText(/Audit Trail — Every Event Logged/i);
    fireEvent.click(toggle);
    expect(
      screen.getAllByText(/variance repaid/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/A\. Jammeh/i).length).toBeGreaterThanOrEqual(1);
  });

  // ── Edge Cases ────────────────────────────────────────────────────

  it("shows 'No active cash activity' empty state when idle", () => {
    render(<CashLiveness showEmptyState />);
    expect(screen.getByText(/No active cash activity/i)).toBeInTheDocument();
  });

  it("shows the till discrepancy state with same-day flag", () => {
    render(<CashLiveness showDiscrepancy />);
    // Appears in the strip title AND the body copy — accept multiple
    expect(
      screen.getAllByText(/Discrepancy Flagged/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/GMD 20 short/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("shows the imprest variance state — blocking on that imprest's closure", () => {
    render(<CashLiveness showVariance />);
    expect(screen.getByText(/Variance Flagged/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/GMD 5\.00 unaccounted/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the negative balance hard-stop state", () => {
    render(<CashLiveness showNegativeBalance />);
    expect(
      screen.getByText(/Negative Till Balance — Hard Stop/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/GMD 20\.00/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows the terminal retired state", () => {
    render(<CashLiveness showRetired />);
    expect(screen.getByText(/Imprest retired/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Imprest closed/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Cross-Agent Dependencies (Spec §10) ───────────────────────────

  it("shows the handoff: Cashier/Field Officer → Cash Agent → Ledger Agent, Treasury pulls live data", () => {
    render(<CashLiveness />);
    expect(screen.getAllByText(/Cashier/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Field Officer/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/Cash Agent/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ledger Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/pulls.*live data|daily position roll-up/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Liveness Footer ───────────────────────────────────────────────

  it("shows Layer 1 deterministic + Layer 2 probabilistic liveness footer", () => {
    render(<CashLiveness />);
    expect(screen.getAllByText(/Layer 1/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Layer 2/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows that receipt matching sums are arithmetic while OCR confidence is probabilistic", () => {
    render(<CashLiveness />);
    expect(
      screen.getAllByText(/OCR confidence/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Accessibility ─────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<CashLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(6);
  });

  it("has descriptive aria-labels on confidence meters", () => {
    render(<CashLiveness />);
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBe(3);
    meters.forEach((meter) => {
      expect(meter).toHaveAttribute("aria-valuenow");
      expect(meter).toHaveAttribute("aria-valuemin", "0");
      expect(meter).toHaveAttribute("aria-valuemax", "100");
    });
  });
});
