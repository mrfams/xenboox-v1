import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { AICommandBar } from "@/components/shared/ai-command-bar";
import { ViewSwitcher } from "@/components/shared/view-switcher";
import {
  InsightCard,
  RecommendationCard,
  ApprovalCard,
} from "@/components/shared/insight-card";
import { SelectionActions } from "@/components/shared/selection-actions";
import { ChangeReview } from "@/components/shared/change-review";

// ─── Mock next/navigation ────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
}));

// ─── AICommandBar ────────────────────────────────────────────────────
describe("AICommandBar", () => {
  it("renders with default props", () => {
    render(<AICommandBar />);
    expect(
      screen.getByPlaceholderText("Ask Xenboox AI..."),
    ).toBeInTheDocument();
  });

  it("renders in compact mode", () => {
    render(<AICommandBar compact />);
    expect(
      screen.getByPlaceholderText("Ask Xenboox AI..."),
    ).toBeInTheDocument();
  });

  it("shows suggestions on focus", () => {
    render(<AICommandBar />);
    const input = screen.getByPlaceholderText("Ask Xenboox AI...");
    fireEvent.focus(input);
    expect(screen.getByText("Suggested")).toBeInTheDocument();
    expect(screen.getByText("Explain my cash position")).toBeInTheDocument();
    expect(screen.getByText("Find risky customers")).toBeInTheDocument();
    expect(screen.getByText("Prepare month-end close")).toBeInTheDocument();
  });

  it("renders voice and attachment buttons", () => {
    render(<AICommandBar />);
    const voiceBtns = screen.getAllByRole("button");
    expect(voiceBtns.length).toBeGreaterThan(0);
  });

  it("renders keyboard shortcut hint in compact mode", () => {
    const { container } = render(<AICommandBar compact />);
    const shortcut = container.querySelector("kbd");
    expect(shortcut).toBeInTheDocument();
  });

  it("accepts custom placeholder", () => {
    render(<AICommandBar placeholder="Custom prompt..." />);
    expect(screen.getByPlaceholderText("Custom prompt...")).toBeInTheDocument();
  });

  it("accepts custom suggestions", () => {
    render(
      <AICommandBar
        suggestions={["Custom suggestion 1", "Custom suggestion 2"]}
      />,
    );
    const input = screen.getByPlaceholderText("Ask Xenboox AI...");
    fireEvent.focus(input);
    expect(screen.getByText("Custom suggestion 1")).toBeInTheDocument();
    expect(screen.getByText("Custom suggestion 2")).toBeInTheDocument();
  });

  it("renders clickable suggestion buttons", () => {
    render(<AICommandBar />);
    const input = screen.getByPlaceholderText("Ask Xenboox AI...");
    fireEvent.focus(input);
    const suggestion = screen.getByText("Explain my cash position");
    expect(suggestion.closest("button")).toBeInTheDocument();
  });
});

// ─── ViewSwitcher ────────────────────────────────────────────────────
describe("ViewSwitcher", () => {
  it("renders all three view buttons", () => {
    const onChange = vi.fn();
    render(<ViewSwitcher value="ai" onChange={onChange} />);
    expect(screen.getByText("AI View")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Data View")).toBeInTheDocument();
  });

  it("highlights the active view", () => {
    const onChange = vi.fn();
    render(<ViewSwitcher value="ai" onChange={onChange} />);
    const aiBtn = screen.getByText("AI View").closest("button");
    expect(aiBtn).toHaveClass("bg-primary");
  });

  it("calls onChange when a view is clicked", () => {
    const onChange = vi.fn();
    render(<ViewSwitcher value="ai" onChange={onChange} />);
    const workspaceBtn = screen.getByText("Workspace");
    fireEvent.click(workspaceBtn);
    expect(onChange).toHaveBeenCalledWith("workspace");
  });

  it("accepts custom className", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ViewSwitcher value="data" onChange={onChange} className="my-custom" />,
    );
    expect(container.firstChild).toHaveClass("my-custom");
  });

  it("works with all three view modes", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ViewSwitcher value="ai" onChange={onChange} />,
    );
    expect(screen.getByText("AI View").closest("button")).toHaveClass(
      "bg-primary",
    );

    rerender(<ViewSwitcher value="workspace" onChange={onChange} />);
    expect(screen.getByText("Workspace").closest("button")).toHaveClass(
      "bg-primary",
    );

    rerender(<ViewSwitcher value="data" onChange={onChange} />);
    expect(screen.getByText("Data View").closest("button")).toHaveClass(
      "bg-primary",
    );
  });
});

// ─── InsightCard ─────────────────────────────────────────────────────
describe("InsightCard", () => {
  it("renders with title and description", () => {
    render(
      <InsightCard title="Cash low alert" description="Balance below $10k" />,
    );
    expect(screen.getByText("Cash low alert")).toBeInTheDocument();
    expect(screen.getByText("Balance below $10k")).toBeInTheDocument();
  });

  it("renders confidence bar when provided", () => {
    render(<InsightCard title="Test" description="Test" confidence={85} />);
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("renders action button when onAction provided", () => {
    const onAction = vi.fn();
    render(<InsightCard title="Test" action="Review" onAction={onAction} />);
    const actionBtn = screen.getByText("Review");
    fireEvent.click(actionBtn);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("renders with high priority styling", () => {
    const { container } = render(
      <InsightCard title="Critical" priority="high" />,
    );
    const card = container.querySelector(".border-l-error-clay");
    expect(card).toBeInTheDocument();
  });

  it("renders dismiss button when onDismiss provided", () => {
    render(<InsightCard title="Test" onDismiss={vi.fn()} />);
    const dismissBtn = screen.getByText("✕");
    expect(dismissBtn).toBeInTheDocument();
  });
});

// ─── RecommendationCard ──────────────────────────────────────────────
describe("RecommendationCard", () => {
  it("renders with title and detail", () => {
    render(
      <RecommendationCard
        title="Optimize spend"
        detail="Save $5k by switching vendor"
      />,
    );
    expect(screen.getByText("Optimize spend")).toBeInTheDocument();
    expect(
      screen.getByText("Save $5k by switching vendor"),
    ).toBeInTheDocument();
  });

  it("renders priority stars", () => {
    const { container } = render(
      <RecommendationCard title="Test" detail="Test" priority={4} />,
    );
    const stars = container.querySelectorAll(".text-attention-amber");
    expect(stars.length).toBe(4);
  });

  it("renders impact badge when provided", () => {
    render(
      <RecommendationCard title="Test" detail="Test" impact="High impact" />,
    );
    expect(screen.getByText("High impact")).toBeInTheDocument();
  });

  it("calls onAction when action button clicked", () => {
    const onAction = vi.fn();
    render(
      <RecommendationCard title="Test" detail="Test" onAction={onAction} />,
    );
    const actBtn = screen.getByText("Act");
    fireEvent.click(actBtn);
    expect(onAction).toHaveBeenCalledOnce();
  });
});

// ─── ApprovalCard ────────────────────────────────────────────────────
describe("ApprovalCard", () => {
  it("renders with title, amount, and recommendation", () => {
    render(
      <ApprovalCard
        title="AWS Invoice"
        amount="$8,400"
        recommendation="approve"
        reason="Recurring expense"
        confidence={96}
      />,
    );
    expect(screen.getByText("AWS Invoice")).toBeInTheDocument();
    expect(screen.getByText("$8,400")).toBeInTheDocument();
    expect(screen.getByText("approve")).toBeInTheDocument();
    expect(screen.getByText("Recurring expense")).toBeInTheDocument();
  });

  it("shows confidence score with bar", () => {
    render(
      <ApprovalCard
        title="Test"
        amount="$100"
        recommendation="approve"
        reason="Test"
        confidence={96}
      />,
    );
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("96%")).toBeInTheDocument();
  });

  it("renders approve button for approve recommendation", () => {
    const onApprove = vi.fn();
    render(
      <ApprovalCard
        title="Test"
        amount="$100"
        recommendation="approve"
        reason="Test"
        confidence={90}
        onApprove={onApprove}
      />,
    );
    const approveBtn = screen.getByText("Approve");
    fireEvent.click(approveBtn);
    expect(onApprove).toHaveBeenCalledOnce();
  });

  it("renders reject button for reject recommendation", () => {
    const onReject = vi.fn();
    render(
      <ApprovalCard
        title="Test"
        amount="$100"
        recommendation="reject"
        reason="Test"
        confidence={90}
        onReject={onReject}
      />,
    );
    const rejectBtn = screen.getByText("Reject");
    fireEvent.click(rejectBtn);
    expect(onReject).toHaveBeenCalledOnce();
  });
});

// ─── SelectionActions ────────────────────────────────────────────────
describe("SelectionActions", () => {
  it("renders nothing when selectedCount is 0", () => {
    const { container } = render(<SelectionActions selectedCount={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders when items are selected", () => {
    render(<SelectionActions selectedCount={5} selectedLabel="invoices" />);
    expect(screen.getByText("5 invoices")).toBeInTheDocument();
    expect(screen.getByText("Explain")).toBeInTheDocument();
    expect(screen.getByText("Categorize")).toBeInTheDocument();
    expect(screen.getByText("Analyze")).toBeInTheDocument();
  });

  it("calls onAction when action button clicked", () => {
    const onAction = vi.fn();
    render(<SelectionActions selectedCount={3} onAction={onAction} />);
    const explainBtn = screen.getByText("Explain");
    fireEvent.click(explainBtn);
    expect(onAction).toHaveBeenCalled();
  });

  it("calls onClear when clear button clicked", () => {
    const onClear = vi.fn();
    const { container } = render(
      <SelectionActions selectedCount={3} onClear={onClear} />,
    );
    // Find the clear button (last button in the action bar)
    const buttons = container.querySelectorAll("button");
    const clearBtn = buttons[buttons.length - 1];
    if (clearBtn) fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("renders custom actions", () => {
    const customActions = [
      { label: "Custom Action", icon: <span>C</span>, prompt: "Custom prompt" },
    ];
    render(<SelectionActions selectedCount={2} actions={customActions} />);
    expect(screen.getByText("Custom Action")).toBeInTheDocument();
  });

  it("shows count with custom label", () => {
    render(
      <SelectionActions selectedCount={12} selectedLabel="transactions" />,
    );
    expect(screen.getByText("12 transactions")).toBeInTheDocument();
  });
});

// ─── ChangeReview ────────────────────────────────────────────────────
describe("ChangeReview", () => {
  it("renders with default items", () => {
    render(<ChangeReview />);
    expect(screen.getByText("AI Proposed Changes")).toBeInTheDocument();
    expect(screen.getByText(/Uber — \$240/)).toBeInTheDocument();
    expect(screen.getByText(/AWS — \$8,400/)).toBeInTheDocument();
  });

  it("shows before/after comparison fields", () => {
    render(<ChangeReview />);
    expect(screen.getByText("Travel Expense")).toBeInTheDocument();
    expect(screen.getByText("Client Transportation")).toBeInTheDocument();
  });

  it("shows progress bar and pending count", () => {
    render(<ChangeReview />);
    expect(screen.getByText(/2 pending/)).toBeInTheDocument();
  });

  it("shows confidence scores", () => {
    render(<ChangeReview />);
    const confidenceTexts = screen.getAllByText("96%");
    expect(confidenceTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("handles approve action", () => {
    const onApprove = vi.fn();
    render(<ChangeReview onApprove={onApprove} />);
    const approveBtn = screen.getAllByText("Approve")[0];
    fireEvent.click(approveBtn);
    expect(onApprove).toHaveBeenCalledWith("c1");
  });

  it("handles reject action", () => {
    const onReject = vi.fn();
    render(<ChangeReview onReject={onReject} />);
    const rejectBtn = screen.getAllByText("Reject")[0];
    fireEvent.click(rejectBtn);
    expect(onReject).toHaveBeenCalledWith("c1");
  });

  it("shows empty state when no items", () => {
    render(<ChangeReview items={[]} />);
    expect(screen.getByText("All changes reviewed")).toBeInTheDocument();
    expect(screen.getByText("No pending AI changes.")).toBeInTheDocument();
  });

  it("shows all reviewed state after approving all", () => {
    const items = [
      {
        id: "c1",
        title: "Test Change",
        fields: [{ label: "Account", before: "Old", after: "New" }],
        reason: "Test reason",
        confidence: 95,
      },
    ];
    render(<ChangeReview items={items} />);
    const approveBtn = screen.getByText("Approve");
    fireEvent.click(approveBtn);
    expect(screen.getByText("All changes reviewed")).toBeInTheDocument();
  });
});
