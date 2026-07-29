import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfidenceIndicator } from "@xenboox/ui";

describe("ConfidenceIndicator", () => {
  // ── Happy Path ──────────────────────────────────────────────────────

  it("renders with given confidence value", () => {
    const { container } = render(<ConfidenceIndicator confidence={0.96} />);
    expect(container.querySelector(".confidence-bar")).toBeInTheDocument();
    expect(
      container.querySelector(".confidence-bar__track"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".confidence-bar__fill"),
    ).toBeInTheDocument();
  });

  it("displays the percentage label by default", () => {
    render(<ConfidenceIndicator confidence={0.73} />);
    expect(screen.getByText("73%")).toBeInTheDocument();
  });

  it("rounds confidence to nearest integer percentage", () => {
    render(<ConfidenceIndicator confidence={0.9651} />);
    expect(screen.getByText("97%")).toBeInTheDocument();
  });

  it("sets the fill bar width to the percentage", () => {
    const { container } = render(<ConfidenceIndicator confidence={0.73} />);
    const fill = container.querySelector(".confidence-bar__fill");
    expect(fill).toHaveStyle({ width: "73%" });
  });

  // ── Accessibility ───────────────────────────────────────────────────

  it("renders with role='meter'", () => {
    render(<ConfidenceIndicator confidence={0.85} />);
    expect(screen.getByRole("meter")).toBeInTheDocument();
  });

  it("sets correct aria-valuenow", () => {
    render(<ConfidenceIndicator confidence={0.85} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "85");
  });

  it("sets aria-valuemin to 0", () => {
    render(<ConfidenceIndicator confidence={0.85} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuemin", "0");
  });

  it("sets aria-valuemax to 100", () => {
    render(<ConfidenceIndicator confidence={0.85} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuemax", "100");
  });

  it("has descriptive aria-label", () => {
    render(<ConfidenceIndicator confidence={0.85} />);
    expect(screen.getByRole("meter")).toHaveAttribute(
      "aria-label",
      "Agent confidence: 85%",
    );
  });

  // ── Label visibility ────────────────────────────────────────────────

  it("hides the percentage label when showLabel=false", () => {
    render(<ConfidenceIndicator confidence={0.85} showLabel={false} />);
    expect(screen.queryByText("85%")).not.toBeInTheDocument();
  });

  it("shows the percentage label when showLabel=true", () => {
    render(<ConfidenceIndicator confidence={0.85} showLabel />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  // ── Variant styling ─────────────────────────────────────────────────

  it("applies high variant class when confidence >= 0.9", () => {
    const { container } = render(<ConfidenceIndicator confidence={0.9} />);
    expect(
      container.querySelector(".confidence-bar__fill--high"),
    ).toBeInTheDocument();
  });

  it("applies high variant class for confidence > 0.9", () => {
    const { container } = render(<ConfidenceIndicator confidence={0.96} />);
    expect(
      container.querySelector(".confidence-bar__fill--high"),
    ).toBeInTheDocument();
  });

  it("applies medium variant class when confidence between 0.7 and 0.89", () => {
    const { container } = render(<ConfidenceIndicator confidence={0.73} />);
    expect(
      container.querySelector(".confidence-bar__fill--medium"),
    ).toBeInTheDocument();
  });

  it("applies low variant class when confidence < 0.7", () => {
    const { container } = render(<ConfidenceIndicator confidence={0.54} />);
    expect(
      container.querySelector(".confidence-bar__fill--low"),
    ).toBeInTheDocument();
  });

  // ── Edge cases ──────────────────────────────────────────────────────

  it("clamps percentage to 100 when confidence exceeds 1", () => {
    const { container } = render(<ConfidenceIndicator confidence={1.5} />);
    const fill = container.querySelector(".confidence-bar__fill");
    expect(fill).toHaveStyle({ width: "100%" });
  });

  it("clamps percentage to 0 when confidence is negative", () => {
    const { container } = render(<ConfidenceIndicator confidence={-0.5} />);
    const fill = container.querySelector(".confidence-bar__fill");
    expect(fill).toHaveStyle({ width: "0%" });
  });

  it("handles zero confidence", () => {
    const { container } = render(<ConfidenceIndicator confidence={0} />);
    const fill = container.querySelector(".confidence-bar__fill");
    expect(fill).toHaveStyle({ width: "0%" });
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("handles perfect confidence of 1.0", () => {
    const { container } = render(<ConfidenceIndicator confidence={1} />);
    const fill = container.querySelector(".confidence-bar__fill");
    expect(fill).toHaveStyle({ width: "100%" });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  // ── Size ────────────────────────────────────────────────────────────

  it("renders with sm size by default", () => {
    const { container } = render(<ConfidenceIndicator confidence={0.85} />);
    const bar = container.querySelector(".confidence-bar");
    expect(bar).toHaveClass("gap-1.5");
  });

  it("renders with md size class when size='md'", () => {
    const { container } = render(
      <ConfidenceIndicator confidence={0.85} size="md" />,
    );
    const bar = container.querySelector(".confidence-bar");
    expect(bar).toHaveClass("gap-2");
  });

  // ── Custom className ────────────────────────────────────────────────

  it("accepts and merges custom className", () => {
    const { container } = render(
      <ConfidenceIndicator confidence={0.85} className="my-custom" />,
    );
    expect(container.querySelector(".confidence-bar")).toHaveClass("my-custom");
  });
});
