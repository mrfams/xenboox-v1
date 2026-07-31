import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LedgerLiveness } from "@/components/agents/ledger-liveness";

describe("LedgerLiveness", () => {
  // ── Happy Path: Active Posting Pipeline ──────────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<LedgerLiveness />);
    expect(
      screen.getByRole("heading", { name: /Ledger Agent/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("General Ledger — Posting Authority"),
    ).toBeInTheDocument();
  });

  it("renders all pipeline stages", () => {
    render(<LedgerLiveness />);
    expect(screen.getByText("Validation Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Double-Entry Check")).toBeInTheDocument();
    expect(screen.getByText("Period Validation")).toBeInTheDocument();
    expect(screen.getByText("Account Validation")).toBeInTheDocument();
    expect(screen.getByText("Posting Execution")).toBeInTheDocument();
  });

  it("renders confidence scores for each pipeline stage", () => {
    render(<LedgerLiveness />);
    const confidenceIndicators = screen.getAllByRole("meter");
    expect(confidenceIndicators.length).toBeGreaterThanOrEqual(4);
  });

  it("shows the current operation status", () => {
    render(<LedgerLiveness />);
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("shows the journal entry being processed", () => {
    render(<LedgerLiveness />);
    expect(
      screen.getByRole("region", { name: /Journal Entry Details/i }),
    ).toBeInTheDocument();
  });

  // ── Pipeline Stage Details ──────────────────────────────────────────

  it("displays double-entry validation result (debits = credits)", () => {
    render(<LedgerLiveness />);
    expect(screen.getByText(/Debits/)).toBeInTheDocument();
    expect(screen.getByText(/Credits/)).toBeInTheDocument();
  });

  it("shows entity scoping indicator", () => {
    render(<LedgerLiveness />);
    const mentions = screen.getAllByText(/Xenboox/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the agent confidence summary", () => {
    render(<LedgerLiveness />);
    expect(screen.getByText(/Agent Confidence/i)).toBeInTheDocument();
  });

  // ── Liveness Transparency Indicators ────────────────────────────────

  it("shows the 'how it works' decomposition toggle", () => {
    render(<LedgerLiveness />);
    expect(screen.getByText(/How It Works/i)).toBeInTheDocument();
  });

  it("reveals step details when 'How It Works' is clicked", () => {
    render(<LedgerLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    // After clicking, should show detailed step breakdown
    expect(screen.getByText(/Receive Entry/)).toBeInTheDocument();
    expect(screen.getByText(/Validate Constraints/)).toBeInTheDocument();
    expect(screen.getByText(/Score Confidence/)).toBeInTheDocument();
    expect(screen.getByText(/Record in Ledger/)).toBeInTheDocument();
    expect(screen.getByText(/Confirm & Audit/)).toBeInTheDocument();
  });

  // ── Constraint Enforcement Display ──────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<LedgerLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Double-Entry")).toBeInTheDocument();
    expect(screen.getByText("Period Lock")).toBeInTheDocument();
    expect(screen.getByText("Account Valid")).toBeInTheDocument();
  });

  // ── Accessibility ───────────────────────────────────────────────────

  it("has proper heading hierarchy", () => {
    render(<LedgerLiveness />);
    expect(
      screen.getByRole("heading", { level: 2, name: /Ledger Agent/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /Validation Pipeline/i }),
    ).toBeInTheDocument();
  });

  it("renders with accessible region roles", () => {
    render(<LedgerLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(4);
  });

  it("has descriptive aria-labels on status indicators", () => {
    render(<LedgerLiveness />);
    const meters = screen.getAllByRole("meter");
    meters.forEach((meter) => {
      expect(meter).toHaveAttribute("aria-valuenow");
      expect(meter).toHaveAttribute("aria-valuemin", "0");
      expect(meter).toHaveAttribute("aria-valuemax", "100");
    });
  });

  // ── Period Information ──────────────────────────────────────────────

  it("shows the current fiscal period", () => {
    render(<LedgerLiveness />);
    const mentions = screen.getAllByText(/Fiscal Period|Q2 2026/);
    expect(mentions.length).toBeGreaterThanOrEqual(2);
  });

  // ── Entry Lines Display ─────────────────────────────────────────────

  it("shows individual journal entry lines", () => {
    render(<LedgerLiveness />);
    const entryLines = screen.getAllByRole("row");
    expect(entryLines.length).toBeGreaterThanOrEqual(2);
  });

  // ── Edge Cases ──────────────────────────────────────────────────────

  it("shows 'No entry being processed' empty state when no active entry", () => {
    render(<LedgerLiveness showEmptyState />);
    expect(screen.getByText(/No entry being processed/i)).toBeInTheDocument();
  });

  it("shows rejection reason when entry validation fails", () => {
    render(<LedgerLiveness showRejection />);
    expect(screen.getByText(/Rejection Reason/i)).toBeInTheDocument();
  });
});
