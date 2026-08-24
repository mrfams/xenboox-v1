import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreationConfirmCard } from "@/components/workspace/creation-confirm-card";

describe("CreationConfirmCard", () => {
  it("renders invoice creation card with correct content", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <CreationConfirmCard
        type="create_invoice"
        title="Invoice"
        description="Invoice for Acme Corp, $500"
        confidence={0.92}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Create Invoice")).toBeInTheDocument();
    expect(screen.getByText("92% confidence")).toBeInTheDocument();
    expect(screen.getByText("Invoice for Acme Corp, $500")).toBeInTheDocument();
    expect(screen.getByText("Confirm & Create")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <CreationConfirmCard
        type="create_vendor"
        title="Vendor"
        description="New vendor: Supply Co"
        confidence={0.85}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText("Confirm & Create"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <CreationConfirmCard
        type="create_customer"
        title="Customer"
        description="New customer: John Doe"
        confidence={0.88}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows loading state when executing", () => {
    render(
      <CreationConfirmCard
        type="create_expense"
        title="Expense"
        description="Office supplies, $500"
        confidence={0.9}
        onConfirm={() => {}}
        onCancel={() => {}}
        isExecuting={true}
      />,
    );

    expect(screen.getByText("Creating...")).toBeInTheDocument();
    expect(screen.getByText("Confirm & Create")).toBeDisabled();
    expect(screen.getByText("Cancel")).toBeDisabled();
  });

  it("renders journal entry creation card", () => {
    render(
      <CreationConfirmCard
        type="create_journal_entry"
        title="Journal Entry"
        description="Debit: Rent 5000, Credit: Cash 5000"
        confidence={0.95}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByText("Create Journal Entry")).toBeInTheDocument();
    expect(screen.getByText("95% confidence")).toBeInTheDocument();
  });
});
