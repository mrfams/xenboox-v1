import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BalanceCheck } from "@xenboox/ui";

describe("BalanceCheck", () => {
  // ── Happy Path ──────────────────────────────────────────────────────

  it("renders with default props", () => {
    const { container } = render(<BalanceCheck />);
    expect(container.querySelector(".balance-check")).toBeInTheDocument();
    expect(container.querySelector(".balance-check__line")).toBeInTheDocument();
    expect(container.querySelector(".balance-check__icon")).toBeInTheDocument();
  });

  it("renders with label text", () => {
    render(<BalanceCheck label="Entry posted" />);
    expect(screen.getByText("Entry posted")).toBeInTheDocument();
  });

  it("renders with correct aria-label when label is provided", () => {
    render(<BalanceCheck label="Reconciled" />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Reconciled",
    );
  });

  it("renders with default aria-label when no label is provided", () => {
    render(<BalanceCheck />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Balanced — debits equal credits",
    );
  });

  // ── Sizes ───────────────────────────────────────────────────────────

  it("renders small variant with correct CSS class", () => {
    const { container } = render(<BalanceCheck size="small" />);
    expect(
      container.querySelector(".balance-check--small"),
    ).toBeInTheDocument();
  });

  it("renders large variant with correct CSS class", () => {
    const { container } = render(<BalanceCheck size="large" />);
    expect(
      container.querySelector(".balance-check--large"),
    ).toBeInTheDocument();
  });

  it("renders default size without size modifier class", () => {
    const { container } = render(<BalanceCheck size="default" />);
    expect(
      container.querySelector(".balance-check--small"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector(".balance-check--large"),
    ).not.toBeInTheDocument();
  });

  // ── Animation ───────────────────────────────────────────────────────

  it("renders with animate class when animate=true (default)", () => {
    const { container } = render(<BalanceCheck animate />);
    expect(
      container.querySelector(".balance-check--animate"),
    ).toBeInTheDocument();
  });

  it("renders without animate class when animate=false", () => {
    const { container } = render(<BalanceCheck animate={false} />);
    expect(
      container.querySelector(".balance-check--animate"),
    ).not.toBeInTheDocument();
  });

  // ─── Check icon sizes ────────────────────────────────────────────────

  it("renders small check icon for small size", () => {
    const { container } = render(<BalanceCheck size="small" />);
    const icon = container.querySelector(".balance-check__icon svg");
    expect(icon).toHaveClass("h-3", "w-3");
  });

  it("renders default check icon for default size", () => {
    const { container } = render(<BalanceCheck size="default" />);
    const icon = container.querySelector(".balance-check__icon svg");
    expect(icon).toHaveClass("h-4", "w-4");
  });

  it("renders large check icon for large size", () => {
    const { container } = render(<BalanceCheck size="large" />);
    const icon = container.querySelector(".balance-check__icon svg");
    expect(icon).toHaveClass("h-6", "w-6");
  });

  // ── Custom className ────────────────────────────────────────────────

  it("accepts and merges custom className", () => {
    const { container } = render(<BalanceCheck className="custom-class" />);
    expect(container.querySelector(".balance-check")).toHaveClass(
      "custom-class",
    );
  });
});
