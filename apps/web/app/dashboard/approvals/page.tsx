"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ApprovalCard } from "@/components/dashboard/approval-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Button, Badge } from "@/components/ui";
import { CheckCircle2, AlertCircle, SlidersHorizontal } from "lucide-react";

const mockApprovals = [
  {
    id: "1",
    title: "Purchase Order PO-2026-0891 needs approval",
    reason:
      "PO exceeds GHS 50,000 threshold. Requires Finance Director approval per policy.",
    recommendation:
      "Approve — supplier is approved vendor with 98% on-time delivery record.",
    confidence: "medium" as const,
    source: "PO-2026-0891 · Basiq Trading Ltd · GHS 127,430.00",
  },
  {
    id: "2",
    title: "Expense claim — Travel advance (E. Mensah)",
    reason: "Amount GHS 8,500 exceeds department travel budget by GHS 2,100.",
    recommendation:
      "Approve with partial adjustment — charge GHS 6,400 to travel, GHS 2,100 to contingency.",
    confidence: "medium" as const,
    source: "EXP-2026-0432 · Employee: Esi Mensah",
  },
  {
    id: "3",
    title: "Bill BILL-2026-2103 — No matching PO found",
    reason:
      "AP Agent could not match this bill to any open purchase order. Possible duplicate or unauthorized purchase.",
    recommendation: "Review and match manually, or reject if unauthorized.",
    confidence: "low" as const,
    source: "BILL-2026-2103 · TechSupplies Ghana · GHS 4,250.00",
  },
  {
    id: "4",
    title: "Reopen request — June 2026 close",
    reason:
      "New invoice received after close date. Controller Agent flagged for manual review.",
    recommendation:
      "Approve reopen — GHS 3,200 adjustment needed before finalizing July books.",
    confidence: "high" as const,
    source: "INV-2026-3891 · BrightTech Solutions",
  },
  {
    id: "5",
    title: "Tax filing preparation — Q2 PAYE",
    reason:
      "Compliance Agent identified discrepancy of GHS 1,240 in PAYE deductions vs payroll records.",
    recommendation:
      "Defer approval — pending payroll correction scheduled for tomorrow.",
    confidence: "low" as const,
    source: "Quarterly PAYE Filing · Q2 2026",
  },
  {
    id: "6",
    title: "Anomaly alert — Duplicate payment detected",
    reason:
      "Cash Agent flagged invoice INV-2025-1023 as potentially paid twice. Same amount, same supplier, 2 days apart.",
    recommendation:
      "Investigate before approving — contact supplier to confirm single payment.",
    confidence: "low" as const,
    source: "INV-2025-1023 · LogiFreight Ghana",
  },
];

export default function ApprovalsPage() {
  const [filter, setFilter] = useState("all");
  const [approvals, setApprovals] = useState(mockApprovals);

  function handleAction(id: string) {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  }

  const filtered =
    filter === "all"
      ? approvals
      : approvals.filter((a) => a.confidence === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Queue"
        description="Single unified list across all agents — sorted by urgency"
      >
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </Button>
      </PageHeader>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 pb-2 border-b">
        {[
          { key: "all", label: "All", count: approvals.length },
          {
            key: "high",
            label: "Auto-ready",
            count: approvals.filter((a) => a.confidence === "high").length,
          },
          {
            key: "medium",
            label: "Needs review",
            count: approvals.filter((a) => a.confidence === "medium").length,
          },
          {
            key: "low",
            label: "Needs decision",
            count: approvals.filter((a) => a.confidence === "low").length,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
              filter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <Badge
              variant={filter === tab.key ? "default" : "secondary"}
              className="text-[10px] px-1.5"
            >
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Bulk action hint */}
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          {filtered.filter((a) => a.confidence === "high").length} items can be
          auto-approved
        </p>
      )}

      {/* Approval list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-12 w-12 text-emerald-500" />}
          title="All caught up"
          description="No pending approvals in this category."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <ApprovalCard
              key={item.id}
              title={item.title}
              reason={item.reason}
              recommendation={item.recommendation}
              confidence={item.confidence}
              sourceDocument={item.source}
              onApprove={() => handleAction(item.id)}
              onReject={() => handleAction(item.id)}
              onAskWhy={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
