import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import {
  NotificationBadge,
  CountPill,
  AttentionDot,
} from "@/components/layout/notification-badge";

describe("NotificationBadge", () => {
  it("renders nothing when there are no unread notifications", () => {
    const { container } = render(<NotificationBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("never renders a badge for a negative count", () => {
    const { container } = render(<NotificationBadge count={-1} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the exact count", () => {
    const { getByText } = render(<NotificationBadge count={3} />);
    expect(getByText("3")).toBeInTheDocument();
  });

  it("renders a single unread notification", () => {
    const { getByText } = render(<NotificationBadge count={1} />);
    expect(getByText("1")).toBeInTheDocument();
  });

  it("caps the label at 99+ instead of overflowing the pill", () => {
    const { getByText, queryByText } = render(
      <NotificationBadge count={150} />,
    );
    expect(getByText("99+")).toBeInTheDocument();
    expect(queryByText("150")).toBeNull();
  });
});

describe("CountPill (nav-item count badge)", () => {
  it("renders nothing when the count is zero", () => {
    const { container } = render(<CountPill count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for a negative count", () => {
    const { container } = render(<CountPill count={-3} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the exact count", () => {
    const { getByText } = render(<CountPill count={4} />);
    expect(getByText("4")).toBeInTheDocument();
  });

  it("caps at 99+", () => {
    const { getByText } = render(<CountPill count={200} />);
    expect(getByText("99+")).toBeInTheDocument();
  });

  it("merges a className for responsive display control", () => {
    const { container } = render(
      <CountPill count={2} className="lg:hidden lg:group-hover:inline-flex" />,
    );
    expect(container.firstChild).toHaveClass("lg:hidden");
    expect(container.firstChild).toHaveClass("inline-flex");
  });
});

describe("CountPill tone variants", () => {
  it("defaults to the destructive action treatment", () => {
    const { container } = render(<CountPill count={2} />);
    expect(container.firstChild).toHaveClass("bg-destructive");
  });

  it("uses primary for the new tone", () => {
    const { container } = render(<CountPill count={2} tone="new" />);
    expect(container.firstChild).toHaveClass("bg-primary");
    expect(container.firstChild).toHaveClass("text-primary-foreground");
  });
});

describe("AttentionDot (sidebar collapsed-rail indicator)", () => {
  it("renders an action dot in destructive with the pulse", () => {
    const { container } = render(<AttentionDot tone="action" />);
    const dot = container.firstChild;
    expect(dot).toHaveClass("bg-destructive");
    expect(dot).toHaveClass("animate-pulse");
    expect(dot).toHaveClass("notification-badge-pop");
  });

  it("renders a new dot in primary without the pulse", () => {
    const { container } = render(<AttentionDot tone="new" />);
    const dot = container.firstChild;
    expect(dot).toHaveClass("bg-primary");
    expect(dot).not.toHaveClass("animate-pulse");
  });

  it("merges positioning classes from the parent", () => {
    const { container } = render(
      <AttentionDot tone="action" className="absolute -right-1 -top-0.5" />,
    );
    expect(container.firstChild).toHaveClass("absolute");
    expect(container.firstChild).toHaveClass("-right-1");
  });
});
