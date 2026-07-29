import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@xenboox/ui";

describe("Badge", () => {
  // ── Happy Path ──────────────────────────────────────────────────────

  it("renders with children text", () => {
    render(<Badge>Reconciled</Badge>);
    expect(screen.getByText("Reconciled")).toBeInTheDocument();
  });

  it("renders with default variant class", () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass("bg-primary");
    expect(badge).toHaveClass("text-primary-foreground");
  });

  // ── All Variants ────────────────────────────────────────────────────

  it("renders success variant with balanced-green background", () => {
    const { container } = render(<Badge variant="success">Reconciled</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass("bg-balanced-green");
    expect(badge).toHaveClass("text-success-foreground");
  });

  it("renders warning variant with attention-amber background", () => {
    const { container } = render(<Badge variant="warning">Needs Review</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass("bg-attention-amber");
    expect(badge).toHaveClass("text-warning-foreground");
  });

  it("renders destructive variant with error-clay background", () => {
    const { container } = render(
      <Badge variant="destructive">Unbalanced</Badge>,
    );
    const badge = container.firstChild;
    expect(badge).toHaveClass("bg-destructive");
    expect(badge).toHaveClass("text-destructive-foreground");
  });

  it("renders secondary variant", () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass("bg-secondary");
    expect(badge).toHaveClass("text-secondary-foreground");
  });

  it("renders outline variant", () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass("text-foreground");
  });

  // ── Base styling ────────────────────────────────────────────────────

  it("has pill-shaped rounded-full class", () => {
    const { container } = render(<Badge>Pill</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass("rounded-full");
  });

  it("has inline-flex display", () => {
    const { container } = render(<Badge>Inline</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass("inline-flex");
  });

  it("has proper font size", () => {
    const { container } = render(<Badge>Font</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass("text-xs");
  });

  // ── Custom className ────────────────────────────────────────────────

  it("accepts and merges custom className", () => {
    const { container } = render(<Badge className="my-badge">Custom</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass("my-badge");
  });

  // ── Default variant fallback ────────────────────────────────────────

  it("defaults to 'default' variant when no variant is specified", () => {
    const { container } = render(<Badge>No Variant</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass("bg-primary");
  });
});
