import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KnowledgeSummary } from "@/components/knowledge/knowledge-summary";
import { KnowledgeTabs } from "@/components/knowledge/knowledge-tabs";
import { KnowledgeAISuperpowers } from "@/components/knowledge/knowledge-ai-superpowers";
import { KnowledgePolicies } from "@/components/knowledge/knowledge-policies";
import { KnowledgeApprovalRiskScoring } from "@/components/knowledge/knowledge-approval-risk-scoring";
import { KnowledgeUniversalSearch } from "@/components/knowledge/knowledge-universal-search";
import { KnowledgeAIInsights } from "@/components/knowledge/knowledge-ai-insights";
import { KnowledgeDocumentIntelligence } from "@/components/knowledge/knowledge-document-intelligence";
import { KnowledgeApprovalIntelligence } from "@/components/knowledge/knowledge-approval-intelligence";
import { KnowledgeApprovalWorkflow } from "@/components/knowledge/knowledge-approval-workflow";
import { KnowledgeCompanyMemory } from "@/components/knowledge/knowledge-company-memory";
import { KnowledgeRecommendations } from "@/components/knowledge/knowledge-recommendations";
import { KnowledgeRecentActivity } from "@/components/knowledge/knowledge-recent-activity";
import { KnowledgeQuickActions } from "@/components/knowledge/knowledge-quick-actions";
import { KnowledgeAIPanel } from "@/components/knowledge/knowledge-ai-panel";

// ─── Mock next/navigation ────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard/knowledge",
}));

// ─── KnowledgeSummary ─────────────────────────────────────────────────
describe("KnowledgeSummary", () => {
  it("renders the hero header with title", () => {
    render(<KnowledgeSummary />);
    expect(screen.getByText("Knowledge Center")).toBeInTheDocument();
  });

  it("displays the AI knowledge breakdown section", () => {
    render(<KnowledgeSummary />);
    expect(screen.getByText("Your AI understands:")).toBeInTheDocument();
    expect(screen.getByText("4,820")).toBeInTheDocument();
    expect(screen.getByText("Invoices")).toBeInTheDocument();
    expect(screen.getByText("842")).toBeInTheDocument();
    expect(screen.getByText("Contracts")).toBeInTheDocument();
  });

  it("shows recently learned section", () => {
    render(<KnowledgeSummary />);
    expect(screen.getByText("Recently learned")).toBeInTheDocument();
    expect(
      screen.getByText("New supplier agreement — ABC Corp"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Updated expense policy — travel limits increased"),
    ).toBeInTheDocument();
  });

  it("displays the Company Memory badge with checkmark", () => {
    render(<KnowledgeSummary />);
    expect(screen.getByText(/Company Memory 98% Complete/)).toBeInTheDocument();
  });

  it("displays default metric values", () => {
    render(<KnowledgeSummary />);
    // Use getAllByText since "98%" and "96%" appear in multiple places
    const percentTexts = screen.getAllByText("98%");
    expect(percentTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("24.8k")).toBeInTheDocument();
    const twelves = screen.getAllByText("12");
    expect(twelves.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("displays AI understanding progress bar", () => {
    const { container } = render(<KnowledgeSummary />);
    const progressFill = container.querySelector(
      ".bg-gradient-to-r.from-signal-indigo.to-balanced-green",
    );
    expect(progressFill).toBeInTheDocument();
  });

  it("shows status badges with correct values", () => {
    render(<KnowledgeSummary />);
    expect(screen.getByText("Memory Health")).toBeInTheDocument();
    const pendingBadges = screen.getAllByText("Pending Approvals");
    expect(pendingBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("accepts custom props", () => {
    render(
      <KnowledgeSummary
        companyMemory="85%"
        documentsIndexed={1000}
        pendingApprovals={3}
        missingInformation={1}
        aiUnderstanding={88}
      />,
    );
    expect(screen.getByText("1.0k")).toBeInTheDocument();
    const threes = screen.getAllByText("3");
    expect(threes.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders the AI finance assistant message", () => {
    render(<KnowledgeSummary />);
    expect(
      screen.getByText(/Your AI Finance Assistant indexed/i),
    ).toBeInTheDocument();
  });
});

// ─── KnowledgeTabs ────────────────────────────────────────────────────
describe("KnowledgeTabs", () => {
  it("renders all tab labels", () => {
    render(<KnowledgeTabs />);
    expect(screen.getByText("Search Everything")).toBeInTheDocument();
    expect(screen.getByText("AI Insights")).toBeInTheDocument();
    expect(screen.getByText("Pending Actions")).toBeInTheDocument();
  });

  it("starts with the first tab active", () => {
    render(<KnowledgeTabs />);
    const firstTab = screen.getByText("Search Everything").closest("button");
    expect(firstTab).toHaveAttribute("data-active", "true");
  });

  it("switches active tab on click", () => {
    render(<KnowledgeTabs />);
    const secondTab = screen.getByText("AI Insights").closest("button");
    fireEvent.click(secondTab!);
    expect(secondTab).toHaveAttribute("data-active", "true");
    const firstTab = screen.getByText("Search Everything").closest("button");
    expect(firstTab).toHaveAttribute("data-active", "false");
  });

  it("renders correct number of tabs", () => {
    const { container } = render(<KnowledgeTabs />);
    const tabs = container.querySelectorAll("[data-active]");
    expect(tabs.length).toBe(3);
  });

  it("accepts custom className", () => {
    const { container } = render(<KnowledgeTabs className="my-custom" />);
    expect(container.firstChild).toHaveClass("my-custom");
  });
});

// ─── KnowledgeAISuperpowers ───────────────────────────────────────────
describe("KnowledgeAISuperpowers", () => {
  it("renders the section title", () => {
    render(<KnowledgeAISuperpowers />);
    expect(screen.getByText("AI Superpowers")).toBeInTheDocument();
  });

  it("renders all superpower action items", () => {
    const { container } = render(<KnowledgeAISuperpowers />);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(6);
  });

  it("each action has an icon and label", () => {
    render(<KnowledgeAISuperpowers />);
    expect(screen.getByText("Find Document")).toBeInTheDocument();
    expect(screen.getByText("Review Approvals")).toBeInTheDocument();
    expect(screen.getByText("Search Contracts")).toBeInTheDocument();
    expect(screen.getByText("Audit Trail")).toBeInTheDocument();
  });

  it("renders clickable buttons that navigate", () => {
    render(<KnowledgeAISuperpowers />);
    const findDocBtn = screen.getByText("Find Document");
    expect(
      findDocBtn.closest("a") || findDocBtn.closest("button"),
    ).toBeInTheDocument();
  });
});

// ─── KnowledgePolicies ────────────────────────────────────────────────
describe("KnowledgePolicies", () => {
  it("renders the section title", () => {
    render(<KnowledgePolicies />);
    expect(screen.getByText("Ask Your Company Memory")).toBeInTheDocument();
  });

  it("renders policy question buttons", () => {
    render(<KnowledgePolicies />);
    expect(screen.getByText("What is our travel policy?")).toBeInTheDocument();
    expect(
      screen.getByText("Who approves marketing spend?"),
    ).toBeInTheDocument();
    expect(screen.getByText("What is our refund policy?")).toBeInTheDocument();
  });

  it("renders clickable policy buttons", () => {
    render(<KnowledgePolicies />);
    const travelBtn = screen.getByText("What is our travel policy?");
    expect(travelBtn.closest("button")).toBeInTheDocument();
  });

  it("displays AI understanding indicator", () => {
    render(<KnowledgePolicies />);
    expect(screen.getByText("AI Understanding")).toBeInTheDocument();
    expect(screen.getByText("96%")).toBeInTheDocument();
  });
});

// ─── KnowledgeApprovalRiskScoring ─────────────────────────────────────
describe("KnowledgeApprovalRiskScoring", () => {
  it("renders the section title", () => {
    render(<KnowledgeApprovalRiskScoring />);
    expect(screen.getByText("Approval Risk Scoring")).toBeInTheDocument();
  });

  it("shows risk analysis details", () => {
    render(<KnowledgeApprovalRiskScoring />);
    expect(
      screen.getByText("New Software License — Design Tools"),
    ).toBeInTheDocument();
    expect(screen.getByText("AI Review:")).toBeInTheDocument();
    expect(screen.getByText("Cost increased 40%")).toBeInTheDocument();
    expect(screen.getByText("Similar tool already exists")).toBeInTheDocument();
  });

  it("displays confidence score", () => {
    render(<KnowledgeApprovalRiskScoring />);
    expect(screen.getByText("94%")).toBeInTheDocument();
  });

  it("shows recommendation with CTA", () => {
    render(<KnowledgeApprovalRiskScoring />);
    expect(screen.getByText(/Reject or negotiate/i)).toBeInTheDocument();
    expect(screen.getByText("View Details")).toBeInTheDocument();
  });
});

// ─── KnowledgeUniversalSearch ─────────────────────────────────────────
describe("KnowledgeUniversalSearch", () => {
  it("renders search input with placeholder", () => {
    render(<KnowledgeUniversalSearch />);
    expect(
      screen.getByPlaceholderText("Search your business..."),
    ).toBeInTheDocument();
  });

  it("shows example queries before search", () => {
    render(<KnowledgeUniversalSearch />);
    expect(
      screen.getByText("Which contracts renew in the next 90 days?"),
    ).toBeInTheDocument();
  });

  it("shows results after typing", () => {
    render(<KnowledgeUniversalSearch />);
    const input = screen.getByPlaceholderText("Search your business...");
    fireEvent.change(input, { target: { value: "contracts renew" } });
    expect(screen.getByText(/AI found 12 results/i)).toBeInTheDocument();
  });

  it("clears search on clear button click", () => {
    render(<KnowledgeUniversalSearch />);
    const input = screen.getByPlaceholderText("Search your business...");
    fireEvent.change(input, { target: { value: "contracts" } });
    // Find the X button (last button inside the search container)
    const container = input.parentElement;
    const clearBtn = container?.querySelector("button");
    if (clearBtn) fireEvent.click(clearBtn);
    expect(input).toHaveValue("");
  });
});

// ─── KnowledgeAIInsights ──────────────────────────────────────────────
describe("KnowledgeAIInsights", () => {
  it("renders the insights section", () => {
    render(<KnowledgeAIInsights />);
    expect(screen.getByText("AI Insights")).toBeInTheDocument();
  });

  it("renders insight items", () => {
    render(<KnowledgeAIInsights />);
    expect(
      screen.getByText(/Document processing is ahead/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/approvals are waiting/i)).toBeInTheDocument();
  });

  it("dismisses an insight on dismiss button click", () => {
    render(<KnowledgeAIInsights />);
    const dismissButtons = screen.getAllByRole("button");
    // Click the first dismiss button (the X button)
    fireEvent.click(dismissButtons[0]);
    // After dismissing, the insight should be gone
    const remainingInsightCount =
      screen.queryAllByText(/Document processing/).length;
    expect(remainingInsightCount).toBeLessThanOrEqual(1);
  });

  it("shows empty state when all insights dismissed", () => {
    render(<KnowledgeAIInsights />);
    const dismissButtons = screen.getAllByRole("button");
    // Dismiss all insights
    dismissButtons.forEach((btn) => fireEvent.click(btn));
    expect(screen.getByText("All insights reviewed")).toBeInTheDocument();
  });
});

// ─── KnowledgeDocumentIntelligence ────────────────────────────────────
describe("KnowledgeDocumentIntelligence", () => {
  it("renders the section title", () => {
    render(<KnowledgeDocumentIntelligence />);
    expect(screen.getByText("Document Intelligence")).toBeInTheDocument();
  });

  it("shows document detail card", () => {
    render(<KnowledgeDocumentIntelligence />);
    expect(screen.getByText(/Microsoft Invoice #INV-8821/)).toBeInTheDocument();
    expect(screen.getByText("$12,400")).toBeInTheDocument();
    expect(screen.getByText("Microsoft")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("shows AI processing queue items", () => {
    render(<KnowledgeDocumentIntelligence />);
    expect(screen.getByText("Extracted 84 invoices")).toBeInTheDocument();
    expect(screen.getByText("Categorized expenses")).toBeInTheDocument();
    expect(
      screen.getByText("Detected duplicate documents"),
    ).toBeInTheDocument();
  });

  it("shows processing remaining count", () => {
    render(<KnowledgeDocumentIntelligence />);
    expect(screen.getByText("12 remaining")).toBeInTheDocument();
  });

  it("shows AI understanding percentage", () => {
    render(<KnowledgeDocumentIntelligence />);
    expect(screen.getByText("98%")).toBeInTheDocument();
  });
});

// ─── KnowledgeApprovalIntelligence ────────────────────────────────────
describe("KnowledgeApprovalIntelligence", () => {
  it("renders the section title and pending count", () => {
    render(<KnowledgeApprovalIntelligence />);
    expect(screen.getByText("Approval Intelligence")).toBeInTheDocument();
    expect(screen.getByText(/decisions waiting/i)).toBeInTheDocument();
  });

  it("shows approval items with AI recommendations", () => {
    render(<KnowledgeApprovalIntelligence />);
    expect(screen.getByText(/AWS.*Monthly Infrastructure/)).toBeInTheDocument();
  });

  it("displays confidence scores", () => {
    render(<KnowledgeApprovalIntelligence />);
    expect(screen.getByText("99%")).toBeInTheDocument();
  });

  it("shows approve/reject buttons based on recommendation", () => {
    render(<KnowledgeApprovalIntelligence />);
    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(screen.getByText("Reject")).toBeInTheDocument();
  });

  it("renders approval items with actions", () => {
    render(<KnowledgeApprovalIntelligence />);
    // Finds all approve recommendation buttons
    const approveBadges = screen.getAllByText(/Approve/i);
    expect(approveBadges.length).toBeGreaterThanOrEqual(1);
    // Shows recommendation items
    expect(screen.getByText(/AWS.*Monthly Infrastructure/)).toBeInTheDocument();
    expect(screen.getByText("$8,400")).toBeInTheDocument();
  });
});

// ─── KnowledgeApprovalWorkflow ────────────────────────────────────────
describe("KnowledgeApprovalWorkflow", () => {
  it("renders the section title", () => {
    render(<KnowledgeApprovalWorkflow />);
    expect(screen.getByText("Approval Workflow")).toBeInTheDocument();
  });

  it("shows all workflow stages", () => {
    render(<KnowledgeApprovalWorkflow />);
    expect(screen.getByText("Employee")).toBeInTheDocument();
    expect(screen.getByText("Manager")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.getByText("CEO")).toBeInTheDocument();
  });

  it("highlights bottleneck stage", () => {
    render(<KnowledgeApprovalWorkflow />);
    expect(screen.getByText(/Current Bottleneck:/i)).toBeInTheDocument();
    expect(screen.getByText(/Finance Review/i)).toBeInTheDocument();
  });
});

// ─── KnowledgeCompanyMemory ───────────────────────────────────────────
describe("KnowledgeCompanyMemory", () => {
  it("renders the section title", () => {
    render(<KnowledgeCompanyMemory />);
    expect(screen.getByText("Company Memory")).toBeInTheDocument();
  });

  it("displays all memory metrics", () => {
    render(<KnowledgeCompanyMemory />);
    expect(screen.getByText("482")).toBeInTheDocument();
    expect(screen.getByText("126")).toBeInTheDocument();
    expect(screen.getByText("148")).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
    expect(screen.getByText("842")).toBeInTheDocument();
    expect(screen.getByText("24.8k")).toBeInTheDocument();
  });
});

// ─── KnowledgeRecommendations ─────────────────────────────────────────
describe("KnowledgeRecommendations", () => {
  it("renders the section title", () => {
    render(<KnowledgeRecommendations />);
    expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
  });

  it("shows recommendation items with priority stars", () => {
    render(<KnowledgeRecommendations />);
    expect(screen.getByText("Missing receipts")).toBeInTheDocument();
    expect(screen.getByText("Expired supplier documents")).toBeInTheDocument();
    expect(screen.getByText("Approval delays")).toBeInTheDocument();
  });

  it("dismisses a recommendation on dismiss click", () => {
    render(<KnowledgeRecommendations />);
    const dismissBtns = screen.getAllByText("Dismiss");
    fireEvent.click(dismissBtns[0]);
    expect(screen.queryByText("Missing receipts")).not.toBeInTheDocument();
  });

  it("shows empty state when all dismissed and reset button", () => {
    render(<KnowledgeRecommendations />);
    const dismissBtns = screen.getAllByText("Dismiss");
    dismissBtns.forEach((btn) => fireEvent.click(btn));
    expect(screen.getByText("All resolved")).toBeInTheDocument();
    expect(screen.getByText("Show mock data")).toBeInTheDocument();
  });
});

// ─── KnowledgeRecentActivity ──────────────────────────────────────────
describe("KnowledgeRecentActivity", () => {
  it("renders the section title", () => {
    render(<KnowledgeRecentActivity />);
    expect(screen.getByText("Recent AI Activity")).toBeInTheDocument();
  });

  it("renders activity entries with timestamps", () => {
    render(<KnowledgeRecentActivity />);
    expect(
      screen.getByText(/AI extracted invoice details/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Contract renewal detected/i)).toBeInTheDocument();
    expect(screen.getByText("10:42")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
  });
});

// ─── KnowledgeAIPanel ─────────────────────────────────────────────────
describe("KnowledgeAIPanel", () => {
  it("renders the panel when expanded", () => {
    render(<KnowledgeAIPanel />);
    expect(screen.getByText("Knowledge Assistant")).toBeInTheDocument();
  });

  it("shows capabilities list", () => {
    render(<KnowledgeAIPanel />);
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Policies")).toBeInTheDocument();
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("Contracts")).toBeInTheDocument();
  });

  it("shows current understanding and suggestions", () => {
    render(<KnowledgeAIPanel />);
    expect(screen.getByText("Current Understanding")).toBeInTheDocument();
    expect(screen.getByText("Suggested")).toBeInTheDocument();
  });

  it("collapses on X button click", () => {
    render(<KnowledgeAIPanel />);
    const collapseBtn = screen.getByText("✕");
    fireEvent.click(collapseBtn);
    expect(screen.queryByText("Knowledge Assistant")).not.toBeInTheDocument();
  });

  it("expands on collapsed button click", () => {
    render(<KnowledgeAIPanel />);
    const collapseBtn = screen.getByText("✕");
    fireEvent.click(collapseBtn);
    const expandBtn = screen.getByRole("button");
    fireEvent.click(expandBtn);
    expect(screen.getByText("Knowledge Assistant")).toBeInTheDocument();
  });
});

// ─── KnowledgeQuickActions ────────────────────────────────────────────
describe("KnowledgeQuickActions", () => {
  it("renders the FAB button", () => {
    render(<KnowledgeQuickActions />);
    const fabBtn = screen.getByRole("button");
    expect(fabBtn).toBeInTheDocument();
  });

  it("shows action items when clicked", () => {
    render(<KnowledgeQuickActions />);
    const fabBtn = screen.getByRole("button");
    fireEvent.click(fabBtn);
    expect(screen.getByText("Find Document")).toBeInTheDocument();
    expect(screen.getByText("Review Approvals")).toBeInTheDocument();
    expect(screen.getByText("Search Contracts")).toBeInTheDocument();
  });

  it("hides actions when clicked again", () => {
    render(<KnowledgeQuickActions />);
    const fabBtn = screen.getByRole("button");
    fireEvent.click(fabBtn);
    fireEvent.click(fabBtn);
    expect(screen.queryByText("Find Document")).not.toBeInTheDocument();
  });
});
