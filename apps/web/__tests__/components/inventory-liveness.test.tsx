import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InventoryLiveness } from "@/components/agents/inventory-liveness";

describe("InventoryLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active COGS Pipeline ─────────────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<InventoryLiveness />);
    // 'Inventory Agent' appears in the header h2 AND the escalation row
    // 'Low stock threshold breached → Inventory Agent auto-alert'
    const nameMentions = screen.getAllByText(/Inventory Agent/i);
    expect(nameMentions.length).toBeGreaterThanOrEqual(1);
    const role = screen.getAllByText(/Inventory — receipt to valuation/i);
    expect(role.length).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order: GOODS_RECEIVED → PO_MATCHED → STOCK_UPDATED → COGS_CALCULATED → VALUATION_UPDATED → LOW_STOCK_CHECK", () => {
    render(<InventoryLiveness />);
    const stages = screen.getAllByRole("listitem");
    const labels = stages.map((el) => el.textContent);
    const receivedIdx = labels.findIndex((t) => t?.includes("GOODS_RECEIVED"));
    const poIdx = labels.findIndex((t) => t?.includes("PO_MATCHED"));
    const stockIdx = labels.findIndex((t) => t?.includes("STOCK_UPDATED"));
    const cogsIdx = labels.findIndex((t) => t?.includes("COGS_CALCULATED"));
    const valuationIdx = labels.findIndex((t) =>
      t?.includes("VALUATION_UPDATED"),
    );
    const lowStockIdx = labels.findIndex((t) => t?.includes("LOW_STOCK_CHECK"));
    expect(receivedIdx).toBeGreaterThanOrEqual(0);
    expect(poIdx).toBeGreaterThan(receivedIdx);
    expect(stockIdx).toBeGreaterThan(poIdx);
    expect(cogsIdx).toBeGreaterThan(stockIdx);
    expect(valuationIdx).toBeGreaterThan(cogsIdx);
    expect(lowStockIdx).toBeGreaterThan(valuationIdx);
  });

  it("shows the current operation status", () => {
    render(<InventoryLiveness />);
    const mentions = screen.getAllByText(/COGS_CALCULATED/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows entity information", () => {
    render(<InventoryLiveness />);
    const mentions = screen.getAllByText(/Xenboox HQ/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Goods Receipt + PO Matching (Spec §2/§3 — deterministic) ───────

  it("shows the goods receipt with quantity and unit cost", () => {
    render(<InventoryLiveness />);
    const receipts = screen.getAllByText(/Received: 50 units @ GMD 12/i);
    expect(receipts.length).toBeGreaterThanOrEqual(1);
  });

  it("shows PO matching result with matched PO number", () => {
    render(<InventoryLiveness />);
    const poMatches = screen.getAllByText(/Matched to PO #205/i);
    expect(poMatches.length).toBeGreaterThanOrEqual(1);
  });

  // ── COGS Layer-by-Layer Basis (Spec §3/§5 — the critical rule) ──────

  it("shows the full COGS layer breakdown, never a blended number", () => {
    render(<InventoryLiveness />);
    expect(
      screen.getByText(
        /30 units from batch received June 1 @ GMD 12\.00 \(GMD 360\.00\) \+ 20 units from batch received June 15 @ GMD 13\.00 \(GMD 260\.00\)/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the FIFO method and total COGS explicitly", () => {
    render(<InventoryLiveness />);
    const fifo = screen.getAllByText(/FIFO/i);
    expect(fifo.length).toBeGreaterThanOrEqual(1);
    const totals = screen.getAllByText(/= GMD 620\.00 total COGS/i);
    expect(totals.length).toBeGreaterThanOrEqual(1);
  });

  it("shows which batch each unit came from with its own cost", () => {
    render(<InventoryLiveness />);
    const june1 = screen.getAllByText(/batch received June 1 @ GMD 12\.00/i);
    expect(june1.length).toBeGreaterThanOrEqual(1);
    const june15 = screen.getAllByText(/batch received June 15 @ GMD 13\.00/i);
    expect(june15.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT show a bare blended COGS figure with no layer trace", () => {
    const { container } = render(<InventoryLiveness />);
    const cogsCard = container.querySelector('[data-step="cogs"]');
    expect(cogsCard).not.toBeNull();
    const text = cogsCard?.textContent ?? "";
    // Every number in the COGS card must be traceable to a layer/batch
    expect(text).toMatch(/batch received/i);
    expect(text).toMatch(/@ GMD 12\.00/i);
    expect(text).toMatch(/@ GMD 13\.00/i);
  });

  // ── Stock Table + Valuation (Spec §4 — live updates) ────────────────

  it("shows the stock table with live quantities", () => {
    render(<InventoryLiveness />);
    expect(screen.getByText(/Stock Table/i)).toBeInTheDocument();
    // 'Cement Bags 50kg' appears in the status-grid Item cell AND the stock
    // table row — so it must be a count assertion.
    const itemMentions = screen.getAllByText(/Cement Bags 50kg/i);
    expect(itemMentions.length).toBeGreaterThanOrEqual(1);
    const qty = screen.getAllByText(/1,200/i);
    expect(qty.length).toBeGreaterThanOrEqual(1);
  });

  it("shows valuation updated after COGS with new inventory value", () => {
    render(<InventoryLiveness />);
    const valuation = screen.getAllByText(/Valuation/i);
    expect(valuation.length).toBeGreaterThanOrEqual(1);
    const values = screen.getAllByText(/GMD 15,240\.00/i);
    expect(values.length).toBeGreaterThanOrEqual(1);
  });

  // ── Low Stock Check (Spec §2/§6 — proactive, non-blocking) ──────────

  it("shows the low-stock check with threshold comparison", () => {
    render(<InventoryLiveness />);
    expect(screen.getByText(/Low Stock Check/i)).toBeInTheDocument();
    const alerts = screen.getAllByText(/Alert/i);
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  it("shows low-stock alert surfaced proactively, non-blocking", () => {
    render(<InventoryLiveness />);
    const proactive = screen.getAllByText(/proactive/i);
    expect(proactive.length).toBeGreaterThanOrEqual(1);
    const nonBlocking = screen.getAllByText(/non-blocking/i);
    expect(nonBlocking.length).toBeGreaterThanOrEqual(1);
  });

  // ── Meter Discipline (entire spec is deterministic — 0 meters) ──────

  it("renders ZERO confidence meters — the entire inventory lifecycle is deterministic", () => {
    const { container } = render(<InventoryLiveness />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  it("does NOT render a meter on the COGS layer calculation", () => {
    const { container } = render(<InventoryLiveness />);
    const cogsCard = container.querySelector('[data-step="cogs"]');
    expect(cogsCard).not.toBeNull();
    expect(cogsCard?.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Escalation & Human-in-the-Loop (Spec §6) ────────────────────────

  it("shows escalation triggers table", () => {
    render(<InventoryLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    const controller = screen.getAllByText(/Controller Agent/i);
    expect(controller.length).toBeGreaterThanOrEqual(1);
  });

  it("shows PO mismatch escalation with blocking semantics", () => {
    render(<InventoryLiveness />);
    const poMismatch = screen.getAllByText(/PO.*mismatch|mismatch.*PO/i);
    expect(poMismatch.length).toBeGreaterThanOrEqual(1);
    const blocking = screen.getAllByText(/blocking/i);
    expect(blocking.length).toBeGreaterThanOrEqual(1);
  });

  it("shows stock breach escalation — never oversells silently", () => {
    render(<InventoryLiveness />);
    const breach = screen.getAllByText(/oversell/i);
    expect(breach.length).toBeGreaterThanOrEqual(1);
  });

  // ── Branch: PO Quantity/Price Mismatch (Spec §6 — blocking) ─────────

  it("shows PO mismatch branch with explicit delta", () => {
    render(<InventoryLiveness showPoMismatch />);
    expect(screen.getByText(/PO Mismatch Flagged/i)).toBeInTheDocument();
    const delta = screen.getAllByText(/GMD 240\.00/i);
    expect(delta.length).toBeGreaterThanOrEqual(1);
    const blocking = screen.getAllByText(/blocking for that GRN/i);
    expect(blocking.length).toBeGreaterThanOrEqual(1);
  });

  it("PO mismatch branch renders 0 confidence meters", () => {
    const { container } = render(<InventoryLiveness showPoMismatch />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Branch: Stock Breach (Spec §6/§7 — hard stop) ───────────────────

  it("shows stock breach branch — hard stop, never oversells silently", () => {
    render(<InventoryLiveness showStockBreach />);
    expect(screen.getByText(/Stock Breach — Hard Stop/i)).toBeInTheDocument();
    const neverOversell = screen.getAllByText(/never oversells silently/i);
    expect(neverOversell.length).toBeGreaterThanOrEqual(1);
  });

  it("stock breach branch renders 0 confidence meters", () => {
    const { container } = render(<InventoryLiveness showStockBreach />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Branch: Negative Stock (Spec §7 — hard stop) ────────────────────

  it("shows negative stock branch — never posts silently", () => {
    render(<InventoryLiveness showNegativeStock />);
    expect(
      screen.getByText(/Negative Stock — Investigation Required/i),
    ).toBeInTheDocument();
    const neverPost = screen.getAllByText(/never allowed to post silently/i);
    expect(neverPost.length).toBeGreaterThanOrEqual(1);
  });

  it("negative stock branch renders 0 confidence meters", () => {
    const { container } = render(<InventoryLiveness showNegativeStock />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── Branch: Low Stock Alert (Spec §6 — proactive, non-blocking) ─────

  it("shows low stock alert branch with threshold breached", () => {
    render(<InventoryLiveness showLowStock />);
    expect(screen.getByText(/Low Stock Alert/i)).toBeInTheDocument();
    const threshold = screen.getAllByText(/below reorder point/i);
    expect(threshold.length).toBeGreaterThanOrEqual(1);
  });

  it("low stock alert branch renders 0 confidence meters", () => {
    const { container } = render(<InventoryLiveness showLowStock />);
    expect(container.querySelectorAll('[role="meter"]').length).toBe(0);
  });

  // ── How It Works (Spec §3 decomposition) ─────────────────────────────

  it("shows the 'How It Works' decomposition toggle", () => {
    render(<InventoryLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals decomposed sub-steps when 'How It Works' is clicked", () => {
    render(<InventoryLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    expect(screen.getByText(/Record Goods Received/)).toBeInTheDocument();
    expect(screen.getByText(/Match to PO/)).toBeInTheDocument();
    expect(screen.getByText(/Update Stock Levels/)).toBeInTheDocument();
    expect(screen.getByText(/Calculate COGS on Sale/)).toBeInTheDocument();
    expect(screen.getByText(/Update Valuation/)).toBeInTheDocument();
    expect(screen.getByText(/Check Low-Stock Threshold/)).toBeInTheDocument();
  });

  // ── Constraint Enforcement ──────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<InventoryLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("COGS Layer Basis")).toBeInTheDocument();
    expect(screen.getByText("Deterministic Valuation")).toBeInTheDocument();
    expect(screen.getByText("Never Oversells")).toBeInTheDocument();
    expect(screen.getByText("Proactive Alerts")).toBeInTheDocument();
  });

  // ── Audit Trail (Spec §8) ───────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<InventoryLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with stock movements, PO match, COGS layers, valuation when expanded", () => {
    render(<InventoryLiveness />);
    const toggle = screen.getByText(/Audit Trail — Every Stock Movement/i);
    fireEvent.click(toggle);
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(7);
    const headers = screen.getAllByRole("columnheader");
    const headerText = headers.map((h) => h.textContent).join(" ");
    expect(headerText).toMatch(/Event/i);
    expect(headerText).toMatch(/Detail/i);
    expect(headerText).toMatch(/Confidence/i);
  });

  // ── Cross-Agent Dependencies (Spec §10) ─────────────────────────────

  it("shows the cross-agent chain (Ledger via Controller for COGS postings)", () => {
    render(<InventoryLiveness />);
    const ledger = screen.getAllByText(/Ledger Agent/i);
    expect(ledger.length).toBeGreaterThanOrEqual(1);
    const controller = screen.getAllByText(/Controller Agent/i);
    expect(controller.length).toBeGreaterThanOrEqual(1);
  });

  // ── Accessibility ───────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<InventoryLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  // ── Empty State ─────────────────────────────────────────────────────

  it("shows 'No inventory movement being processed' empty state", () => {
    render(<InventoryLiveness showEmptyState />);
    expect(
      screen.getByText(/No inventory movement being processed/i),
    ).toBeInTheDocument();
  });

  // ── Liveness Footer ─────────────────────────────────────────────────

  it("shows the deterministic liveness footer", () => {
    render(<InventoryLiveness />);
    const detMentions = screen.getAllByText(/deterministic/i);
    expect(detMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the layer-by-layer basis footer note", () => {
    render(<InventoryLiveness />);
    const layerMentions = screen.getAllByText(/layer-by-layer|layer basis/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
  });
});
