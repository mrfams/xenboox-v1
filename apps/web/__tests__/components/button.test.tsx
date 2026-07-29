import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@xenboox/ui";

describe("Button", () => {
  // ── Happy Path ──────────────────────────────────────────────────────

  it("renders button with children text", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: /click me/i }),
    ).toBeInTheDocument();
  });

  it("renders as a button element by default", () => {
    const { container } = render(<Button>Submit</Button>);
    const el = container.querySelector("button");
    expect(el).toBeInTheDocument();
    expect(el?.tagName).toBe("BUTTON");
  });

  // ── Variants ────────────────────────────────────────────────────────

  it("renders default variant with signal-indigo styles", () => {
    const { container } = render(<Button variant="default">Primary</Button>);
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("bg-signal-indigo");
    expect(btn).toHaveClass("text-white");
  });

  it("renders destructive variant with error-clay styles", () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("bg-error-clay");
  });

  it("renders outline variant with border styles", () => {
    const { container } = render(<Button variant="outline">Cancel</Button>);
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("border");
    expect(btn).toHaveClass("border-secondary-outline");
  });

  it("renders secondary variant with ledger-ink styles", () => {
    const { container } = render(
      <Button variant="secondary">Secondary</Button>,
    );
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("bg-secondary");
    expect(btn).toHaveClass("text-secondary-foreground");
  });

  it("renders ghost variant", () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("hover:bg-accent");
  });

  it("renders link variant with underline", () => {
    const { container } = render(<Button variant="link">Link</Button>);
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("text-signal-indigo");
    expect(btn).toHaveClass("hover:underline");
  });

  // ── Sizes ───────────────────────────────────────────────────────────

  it("renders default size by default", () => {
    const { container } = render(<Button>Default</Button>);
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("h-10", "px-4", "py-2");
  });

  it("renders sm size", () => {
    const { container } = render(<Button size="sm">Small</Button>);
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("h-9", "px-3", "text-xs");
  });

  it("renders lg size", () => {
    const { container } = render(<Button size="lg">Large</Button>);
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("h-11", "px-8");
  });

  it("renders icon size with square dimensions", () => {
    const { container } = render(
      <Button size="icon">
        <svg data-testid="icon" />
      </Button>,
    );
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("h-10", "w-10");
  });

  // ── Disabled state ──────────────────────────────────────────────────

  it("renders disabled button", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies disabled styling classes", () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("disabled:pointer-events-none");
    expect(btn).toHaveClass("disabled:opacity-50");
  });

  // ── AsChild ─────────────────────────────────────────────────────────

  it("renders as a different element when asChild=true", () => {
    const { container } = render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );
    const el = container.querySelector("a");
    expect(el).toBeInTheDocument();
    expect(el?.tagName).toBe("A");
    expect(el).toHaveAttribute("href", "/test");
  });

  // ── Custom className ────────────────────────────────────────────────

  it("accepts and merges custom className", () => {
    const { container } = render(
      <Button className="my-custom-btn">Custom</Button>,
    );
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("my-custom-btn");
  });

  // ── Type attribute ──────────────────────────────────────────────────

  it("renders with type='submit' when specified", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});
