import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ApLiveness } from "@/components/agents/ap-liveness";

describe("ApLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Invoice Processing ──────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(/AP Agent/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Invoice Processing/)).toBeInTheDocument();
  });

  it("renders pipeline states in correct order: DOC_RECEIVED → EXTRACTING → VENDOR_MATCHING → PO_MATCHING → DUPLICATE_CHECK → PAYMENT_SCHEDULED → HANDED_TO_CASH_OR_MOBILE_MONEY", () => {
    render(<ApLiveness />);
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent ?? "");
    const order = [
      "DOC_RECEIVED",
      "EXTRACTING",
      "VENDOR_MATCHING",
      "PO_MATCHING",
      "DUPLICATE_CHECK",
      "PAYMENT_SCHEDULED",
      "HANDED_TO_CASH_OR_MOBILE_MONEY",
    ];
    const indices = order.map((state) =>
      stageLabels.findIndex((t) => t.includes(state)),
    );
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });

  it("renders the FLAGGED_NEEDS_INPUT exception branch", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(/FLAGGED_NEEDS_INPUT/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the current operation status", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(/VENDOR_MATCHING/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows entity scoping indicator", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(/Xenboox HQ/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the invoice attribution (number, vendor, amount)", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(/AP-2026-0317/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Split View: Source Doc + Extracted Fields ─────────────────────

  it("shows the split view: source document alongside extracted fields", () => {
    render(<ApLiveness />);
    // Appears in the split-view section heading AND the source doc card label
    expect(
      screen.getAllByText(/Source Document/).length,
    ).toBeGreaterThanOrEqual(1);
    // Appears in the split-view section heading AND the extracted fields card label
    expect(
      screen.getAllByText(/Extracted Fields/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows extracted field values next to the source doc", () => {
    render(<ApLiveness />);
    const vendorMentions = screen.getAllByText("AWS");
    expect(vendorMentions.length).toBeGreaterThanOrEqual(1);
    const invoiceMentions = screen.getAllByText("AWS-88123");
    expect(invoiceMentions.length).toBeGreaterThanOrEqual(1);
    const amountMentions = screen.getAllByText(/GMD 48,900\.00/);
    expect(amountMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("labels extraction confidence as inherited from Document Agent, not regenerated", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(/from Document Agent/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT render confidence meters on extraction fields (inherited, not AP's own)", () => {
    const { container } = render(<ApLiveness />);
    const extractSection = container.querySelector('[data-step="extract"]');
    expect(extractSection).toBeTruthy();
    expect(extractSection!.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Vendor Matching ───────────────────────────────────────────────

  it("shows the exact vendor match with its basis (tax ID identical)", () => {
    render(<ApLiveness />);
    expect(
      screen.getByText(/Matched to existing vendor: AWS/i),
    ).toBeInTheDocument();
    const basis = screen.getAllByText(/tax ID identical/i);
    expect(basis.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the new vendor detection with a confirm prompt (blocking)", () => {
    render(<ApLiveness />);
    const newVendor = screen.getAllByText(
      /New vendor detected: Cloudline Ltd/i,
    );
    expect(newVendor.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Confirm to add/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the fuzzy vendor match with a confidence badge and confirm requirement", () => {
    render(<ApLiveness />);
    expect(screen.getByText(/Fuzzy match: Westlink/i)).toBeInTheDocument();
    const confirm = screen.getAllByText(
      /Is this Westlink Group or a new vendor\?/i,
    );
    expect(confirm.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the critical rule: fuzzy vendor match NEVER auto-merges on name similarity alone", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(/never auto-merge/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("exact vendor match has NO meter; fuzzy vendor match HAS a meter; new vendor has NO meter", () => {
    const { container } = render(<ApLiveness />);
    expect(
      container.querySelectorAll('[data-vendor-kind="exact"] [role="meter"]')
        .length,
    ).toBe(0);
    expect(
      container.querySelectorAll('[data-vendor-kind="fuzzy"] [role="meter"]')
        .length,
    ).toBe(1);
    expect(
      container.querySelectorAll('[data-vendor-kind="new"] [role="meter"]')
        .length,
    ).toBe(0);
  });

  it("shows vendor match basis always (exact name vs tax ID vs fuzzy name)", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(
      /matched on tax ID|similar name|no match found/i,
    );
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── PO Matching ───────────────────────────────────────────────────

  it("shows PO match result when a purchase order exists", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(/Matched to PO #1042/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'No PO found' as a fact, not a failure (non-PO invoice proceeds)", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(
      /No PO found — proceeding as non-PO invoice/i,
    );
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("flags PO amount mismatch explicitly with the delta, never auto-accepts", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(/PO #1047 amount differs/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/delta GMD 400\.00/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/not auto-accepted, not auto-rejected/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("does NOT render confidence meters on PO matching (deterministic lookup)", () => {
    const { container } = render(<ApLiveness />);
    const poSection = container.querySelector('[data-step="po"]');
    expect(poSection).toBeTruthy();
    expect(poSection!.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Duplicate Check ──────────────────────────────────────────────

  it("always shows the duplicate-check result, even when clean", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(
      /Checked against 340 existing AP records — no duplicate/i,
    );
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("flags a fuzzy near-duplicate with confidence meter and the prior record shown", () => {
    render(<ApLiveness />);
    // Appears in the duplicate section subtitle AND the fuzzy row result
    expect(
      screen.getAllByText(/near-duplicate/i).length,
    ).toBeGreaterThanOrEqual(1);
    const prior = screen.getAllByText(/#4470/i);
    expect(prior.length).toBeGreaterThanOrEqual(1);
  });

  it("clean duplicate has NO meter; fuzzy duplicate HAS a meter", () => {
    const { container } = render(<ApLiveness />);
    expect(
      container.querySelectorAll('[data-duplicate-kind="clean"] [role="meter"]')
        .length,
    ).toBe(0);
    expect(
      container.querySelectorAll('[data-duplicate-kind="fuzzy"] [role="meter"]')
        .length,
    ).toBe(1);
  });

  // ── Payment Queue ─────────────────────────────────────────────────

  it("shows the payment queue as a live list, not just an aging report", () => {
    render(<ApLiveness />);
    expect(screen.getByText(/Payment Queue/)).toBeInTheDocument();
    const scheduled = screen.getAllByText(/scheduled/i);
    expect(scheduled.length).toBeGreaterThanOrEqual(1);
  });

  it("shows blocked queue items awaiting new-vendor confirmation", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(
      /blocked — new vendor confirmation required/i,
    );
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Confidence Discipline (Mixed Layers) ─────────────────────────

  it("renders exactly 2 confidence meters total: fuzzy vendor + fuzzy duplicate only", () => {
    const { container } = render(<ApLiveness />);
    const meters = container.querySelectorAll('[role="meter"]');
    expect(meters.length).toBe(2);
  });

  // ── Escalation & Human-in-the-Loop ───────────────────────────────

  it("shows escalation triggers table", () => {
    render(<ApLiveness />);
    expect(
      screen.getByRole("region", {
        name: /Escalation.*Human-in-the-Loop Triggers/i,
      }),
    ).toBeInTheDocument();
  });

  it("escalates new vendor to Controller Agent with blocking semantics", () => {
    render(<ApLiveness />);
    const newVendorMentions = screen.getAllByText(/New vendor detected/i);
    expect(newVendorMentions.length).toBeGreaterThanOrEqual(1);
    const blocking = screen.getAllByText(/Blocking/i);
    expect(blocking.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Controller Agent/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("escalates fuzzy vendor ambiguity to Controller/human with the disambiguation question", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(/Is this .* or a new vendor\?/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("escalates likely duplicate to Controller Agent shown side-by-side", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(
      /side-by-side with the suspected original/i,
    );
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("escalates critical unreadable field to Document Agent retry / human", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(/Couldn't read .* — please confirm/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── How It Works Toggle ──────────────────────────────────────────

  it("reveals step details when 'How It Works' is clicked", () => {
    render(<ApLiveness />);
    const toggle = screen.getByText(
      /How It Works — Step-by-Step Decomposition/i,
    );
    fireEvent.click(toggle);
    expect(
      screen.getByText(/Receive Structured Extraction/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Match Vendor/)).toBeInTheDocument();
    expect(screen.getByText(/Match PO/)).toBeInTheDocument();
    // Exact-match the step title to avoid colliding with the section heading
    expect(screen.getByText(/^Duplicate Check$/)).toBeInTheDocument();
    expect(screen.getByText(/^Schedule Payment$/)).toBeInTheDocument();
    expect(screen.getByText(/^Hand Off$/)).toBeInTheDocument();
  });

  // ── Constraint Enforcement Badges ────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<ApLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Never Auto-Merge")).toBeInTheDocument();
    expect(screen.getByText("Basis Always Shown")).toBeInTheDocument();
    expect(screen.getByText("Duplicate Always Checked")).toBeInTheDocument();
    expect(screen.getByText("Non-PO Is A Fact")).toBeInTheDocument();
  });

  // ── Audit Trail ──────────────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("logs vendor match basis + confidence + timestamps when expanded", () => {
    render(<ApLiveness />);
    const toggle = screen.getByText(/Audit Trail — Every Invoice Logged/i);
    fireEvent.click(toggle);
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(
      screen.getAllByText(/tax ID identical/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("preserves human confirmations in the audit trail (never overwritten)", () => {
    render(<ApLiveness />);
    const toggle = screen.getByText(/Audit Trail — Every Invoice Logged/i);
    fireEvent.click(toggle);
    const mentions = screen.getAllByText(/confirmed by human/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Edge Cases ───────────────────────────────────────────────────

  it("shows 'No invoice being processed' empty state when no active invoice", () => {
    render(<ApLiveness showEmptyState />);
    expect(screen.getByText(/No invoice being processed/i)).toBeInTheDocument();
  });

  it("shows FLAGGED_NEEDS_INPUT with the specific unreadable field named", () => {
    render(<ApLiveness showNeedsInput />);
    expect(screen.getByText(/Couldn't Read Amount/i)).toBeInTheDocument();
    const flagged = screen.getAllByText(/FLAGGED_NEEDS_INPUT/);
    expect(flagged.length).toBeGreaterThanOrEqual(1);
  });

  it("routes illegible invoices back to Document Agent for re-scan, never guessed", () => {
    render(<ApLiveness showNeedsInput />);
    const mentions = screen.getAllByText(/Returned to Document Agent/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/never guessed/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("FLAGGED_NEEDS_INPUT state renders no confidence meters (deterministic failure)", () => {
    const { container } = render(<ApLiveness showNeedsInput />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  it("shows the terminal handed-off state", () => {
    render(<ApLiveness showHandedOff />);
    const mentions = screen.getAllByText(/Handed to Cash Agent for payment/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("marks handoff as terminal for AP Agent's scope", () => {
    render(<ApLiveness showHandedOff />);
    const mentions = screen.getAllByText(/terminal for AP Agent/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Liveness Footer ──────────────────────────────────────────────

  it("shows Layer 1 deterministic + Layer 2 probabilistic liveness footer", () => {
    render(<ApLiveness />);
    expect(screen.getAllByText(/Layer 1/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Layer 2/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows that extraction confidence is inherited, never regenerated", () => {
    render(<ApLiveness />);
    const mentions = screen.getAllByText(/inherited|never regenerated/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Cross-Agent Handoff ──────────────────────────────────────────

  it("shows the cross-agent handoff chain: Document → AP → Cash/Mobile Money → Ledger", () => {
    render(<ApLiveness />);
    expect(screen.getAllByText(/Document Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/Cash Agent/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Mobile Money Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ledger Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  // ── Accessibility ────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<ApLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(6);
  });

  it("has descriptive aria-labels on confidence meters", () => {
    render(<ApLiveness />);
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBe(2);
    meters.forEach((meter) => {
      expect(meter).toHaveAttribute("aria-valuenow");
      expect(meter).toHaveAttribute("aria-valuemin", "0");
      expect(meter).toHaveAttribute("aria-valuemax", "100");
    });
  });
});
