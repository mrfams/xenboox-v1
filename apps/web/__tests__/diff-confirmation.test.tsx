import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { DiffConfirmationDialog } from "@/components/shared/diff-confirmation";

describe("DiffConfirmationDialog", () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: "Review Change",
    description: "Confirm before committing.",
    confirmLabel: "Confirm",
    onConfirm: vi.fn(),
    items: [
      {
        id: "item-1",
        title: "Journal Entry JE-0001",
        fields: [
          { label: "Status", before: "Pending", after: "Posted" },
          { label: "Amount", before: "$100", after: "$100" },
        ],
        reason: "Confidence-weighted review of this item.",
        confidence: 95,
      },
    ],
  };

  it("renders title, description and diff fields", () => {
    render(<DiffConfirmationDialog {...baseProps} />);
    expect(screen.getByText("Review Change")).toBeInTheDocument();
    expect(screen.getByText("Confirm before committing.")).toBeInTheDocument();
    expect(screen.getByText("Journal Entry JE-0001")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Posted")).toBeInTheDocument();
  });

  it("renders before → after arrows for each field", () => {
    render(<DiffConfirmationDialog {...baseProps} />);
    const arrows = document.querySelectorAll("svg.lucide-arrow-right");
    expect(arrows.length).toBe(2);
  });

  it("shows confidence when provided", () => {
    render(<DiffConfirmationDialog {...baseProps} />);
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  it("calls onConfirm with item ids when confirmed", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DiffConfirmationDialog {...baseProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Confirm"));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(["item-1"]));
  });

  it("shows spinner while confirming", async () => {
    let resolveConfirm: () => void = () => {};
    const onConfirm = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    render(<DiffConfirmationDialog {...baseProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Confirm"));
    expect(document.querySelector(".animate-spin")).not.toBeNull();
    resolveConfirm();
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it("renders only the close action when no items", () => {
    render(<DiffConfirmationDialog {...baseProps} items={[]} />);
    expect(screen.queryByText("Journal Entry JE-0001")).not.toBeInTheDocument();
    expect(screen.getAllByText("Close").length).toBeGreaterThan(0);
  });

  it("closes when Close is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <DiffConfirmationDialog {...baseProps} onOpenChange={onOpenChange} />,
    );
    fireEvent.click(screen.getAllByText("Close")[0]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
