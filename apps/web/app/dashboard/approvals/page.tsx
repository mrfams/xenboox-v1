"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Button,
  Badge,
  Card,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Eye,
  ChevronRight,
  FileText,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  BrainCircuit,
  Zap,
  Keyboard,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ApprovalSource = "ingestion" | "agent";

type FilterTab = "all" | "ingestion" | "agent" | "resolved";

// Inline types for tRPC responses to avoid type inference issues
interface ReviewDetailData {
  id: string;
  name: string;
  type: string;
  status: string;
  mimeType: string | null;
  sizeBytes: number | null;
  ocrText: string | null;
  ocrConfidence: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  metadata: Record<string, unknown>;
  review: {
    confidence: number;
    workflow: string;
    action: string;
    dominantSignal: string;
    reason: string;
    reviewItems: Array<Record<string, unknown>>;
    proposedEntry: Record<string, unknown> | null;
  };
  classification: {
    category: string;
    confidence: number;
    reasoning: string;
  };
  extraction: {
    data: Record<string, unknown>;
    fieldConfidence: Record<string, number>;
    confidence: number;
  };
}

interface ApprovalItem {
  id: string;
  source: ApprovalSource;
  title: string;
  description: string;
  confidence: number;
  priority: "critical" | "high" | "medium" | "low";
  type: string;
  workflow: string;
  documentName: string;
  createdAt: string | Date;
  metadata: Record<string, unknown>;
}

// ─── Agent Approval data is fetched from real tRPC endpoint ───────────────

// ─── Approvals Page ─────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const [tab, setTab] = useState<FilterTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<ApprovalSource | null>(
    null,
  );
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  // Queries
  const { data: stats, isLoading: statsLoading } =
    trpc.ingestion.getStats.useQuery();
  const { data: reviewsData, isLoading: reviewsLoading } =
    trpc.ingestion.listPendingReviews.useQuery({ limit: 50 });
  // Agent approvals from real tRPC endpoint
  const { data: agentApprovalsData, isLoading: agentApprovalsLoading } =
    trpc.ingestion.listAgentApprovals.useQuery({ limit: 50 });

  const { data: _reviewDetailRaw, isLoading: detailLoading } =
    trpc.ingestion.getReviewDetails.useQuery(
      { documentId: selectedId ?? "" },
      { enabled: !!selectedId && selectedSource === "ingestion" },
    );

  const reviewDetail = _reviewDetailRaw as ReviewDetailData | undefined;

  const agentApprovals = (agentApprovalsData?.items ?? []) as ApprovalItem[];

  // Mutations
  const utils = trpc.useUtils();
  const approveMutation = trpc.ingestion.approveReview.useMutation({
    onSuccess: () => {
      utils.ingestion.listPendingReviews.invalidate();
      utils.ingestion.getStats.invalidate();
      if (selectedId) setResolvedIds((prev) => new Set(prev).add(selectedId));
      setSelectedId(null);
    },
  });
  const rejectMutation = trpc.ingestion.rejectReview.useMutation({
    onSuccess: () => {
      utils.ingestion.listPendingReviews.invalidate();
      utils.ingestion.getStats.invalidate();
      if (selectedId) setResolvedIds((prev) => new Set(prev).add(selectedId));
      setSelectedId(null);
    },
  });
  const rerunMutation = trpc.ingestion.rerunIngestion.useMutation({
    onSuccess: () => {
      utils.ingestion.listPendingReviews.invalidate();
      utils.ingestion.getStats.invalidate();
    },
  });

  // ── Build Unified Approval List ────────────────────────────────────────

  const allItems = useMemo<ApprovalItem[]>(() => {
    const items: ApprovalItem[] = [];

    // Ingestion review items (real data)
    for (const review of reviewsData?.items ?? []) {
      const isEscalated = review.action === "escalated";
      items.push({
        id: review.documentId,
        source: "ingestion",
        title: review.name,
        description: `${(review.workflow ?? "unknown").replace(/_/g, " ")} — ${isEscalated ? "Escalated" : "Needs review"}`,
        confidence: review.confidence ?? 0,
        priority: isEscalated
          ? "critical"
          : (review.confidence ?? 0) < 0.7
            ? "high"
            : "medium",
        type: review.type ?? "unknown",
        workflow: review.workflow ?? "unknown",
        documentName: review.name,
        createdAt: review.createdAt,
        metadata: {},
      });
    }

    // Agent-generated approval items (from real tRPC endpoint)
    for (const agentItem of agentApprovals) {
      items.push(agentItem);
    }

    // Sort by priority (critical first) then by created date (oldest first)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return items.sort((a, b) => {
      const pDiff =
        (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
      if (pDiff !== 0) return pDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [reviewsData]);

  // ── Determine Selected Item for Detail Panel ─────────────────────────

  const selectedItem = selectedId
    ? allItems.find((i) => i.id === selectedId)
    : null;

  // ── Filter & Resolve ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (tab === "resolved") {
      return allItems.filter((i) => resolvedIds.has(i.id));
    }
    const unResolved = allItems.filter((i) => !resolvedIds.has(i.id));
    if (tab === "all") return unResolved;
    if (tab === "ingestion")
      return unResolved.filter((i) => i.source === "ingestion");
    if (tab === "agent") return unResolved.filter((i) => i.source === "agent");
    return unResolved;
  }, [allItems, tab, resolvedIds]);

  // ── Keyboard Shortcuts ──────────────────────────────────────────────

  const isInputFocused = useCallback(() => {
    const el = document.activeElement;
    return (
      el?.tagName === "INPUT" ||
      el?.tagName === "TEXTAREA" ||
      (el as HTMLElement)?.isContentEditable
    );
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in input fields
      if (isInputFocused()) return;
      // Don't intercept modified shortcuts (Ctrl+R, Cmd+A, etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case "Escape":
          if (selectedId) {
            e.preventDefault();
            setSelectedId(null);
            setSelectedSource(null);
          }
          break;

        case "j": {
          e.preventDefault();
          if (filtered.length === 0) break;
          const curIdx = selectedId
            ? filtered.findIndex((i) => i.id === selectedId)
            : -1;
          const nextIdx = curIdx < filtered.length - 1 ? curIdx + 1 : 0;
          setSelectedId(filtered[nextIdx].id);
          setSelectedSource(filtered[nextIdx].source);
          const el = document.getElementById(
            `approval-item-${filtered[nextIdx].id}`,
          );
          el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          break;
        }

        case "k": {
          e.preventDefault();
          if (filtered.length === 0) break;
          const curIdx = selectedId
            ? filtered.findIndex((i) => i.id === selectedId)
            : -1;
          const prevIdx = curIdx > 0 ? curIdx - 1 : filtered.length - 1;
          setSelectedId(filtered[prevIdx].id);
          setSelectedSource(filtered[prevIdx].source);
          const el = document.getElementById(
            `approval-item-${filtered[prevIdx].id}`,
          );
          el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          break;
        }

        case "a":
          if (!selectedId || !selectedItem) break;
          e.preventDefault();
          if (selectedItem.source === "ingestion") {
            approveMutation.mutate({ documentId: selectedId });
          } else {
            setResolvedIds((prev) => new Set(prev).add(selectedId));
          }
          break;

        case "r":
          if (!selectedId || !selectedItem) break;
          e.preventDefault();
          if (selectedItem.source === "ingestion") {
            rejectMutation.mutate({
              documentId: selectedId,
              reason: "Rejected via keyboard shortcut",
            });
          } else {
            setResolvedIds((prev) => new Set(prev).add(selectedId));
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedId,
    selectedItem,
    filtered,
    approveMutation,
    rejectMutation,
    isInputFocused,
  ]);

  // ── Stats ──────────────────────────────────────────────────────────────

  const ingestionPending = allItems.filter(
    (i) => i.source === "ingestion" && !resolvedIds.has(i.id),
  ).length;
  const agentPending = allItems.filter(
    (i) => i.source === "agent" && !resolvedIds.has(i.id),
  ).length;
  const totalPending = allItems.length - resolvedIds.size;
  const criticalCount = allItems.filter(
    (i) => i.priority === "critical" && !resolvedIds.has(i.id),
  ).length;

  const statsCards = [
    {
      label: "Pending Total",
      value: totalPending,
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Ingestion Reviews",
      value: ingestionPending,
      icon: Zap,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950",
    },
    {
      label: "Agent Approvals",
      value: agentPending,
      icon: BrainCircuit,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: "Critical",
      value: criticalCount,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Queue"
        description="Single unified queue across all AI agents and the ingestion engine — sorted by priority"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card) => (
          <Card key={card.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2.5 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold tracking-tight">
                  {statsLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    card.value
                  )}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as FilterTab);
          setSelectedId(null);
        }}
      >
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            All
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
              {totalPending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="ingestion" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Ingestion
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
              {ingestionPending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="agent" className="gap-1.5">
            <BrainCircuit className="h-3.5 w-3.5" />
            Agent
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
              {agentPending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Resolved
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
              {resolvedIds.size}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Critical Alert Banner */}
      {criticalCount > 0 && tab !== "resolved" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">
            {criticalCount} critical item{criticalCount > 1 ? "s" : ""}
          </span>
          <span className="text-red-500/70">require immediate attention</span>
        </div>
      )}

      {/* Keyboard Shortcuts Info Bar */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/30 text-xs text-muted-foreground">
        <Keyboard className="h-3.5 w-3.5" />
        <span>
          <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono font-medium">
            J
          </kbd>{" "}
          <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono font-medium">
            K
          </kbd>{" "}
          navigate ·
        </span>
        <span>
          <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono font-medium">
            A
          </kbd>{" "}
          approve ·
        </span>
        <span>
          <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono font-medium">
            R
          </kbd>{" "}
          reject ·
        </span>
        <span>
          <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono font-medium">
            Esc
          </kbd>{" "}
          close
        </span>
        <span className="ml-auto hidden sm:inline text-[10px] text-muted-foreground/60">
          shortcuts active when not typing
        </span>
      </div>

      {/* Main Content: List + Detail */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Approval List */}
        <div className="lg:col-span-1 xl:col-span-1 space-y-3">
          {reviewsLoading || (tab === "agent" && agentApprovalsLoading) ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-4 w-full" />
              </Card>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {tab === "resolved" ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
                  <h3 className="text-lg font-semibold">All resolved</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    No resolved items yet. Approve or reject items to see them
                    here.
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
                  <h3 className="text-lg font-semibold">All caught up!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    No pending items in this category.
                  </p>
                </>
              )}
            </div>
          ) : (
            filtered.map((item) => (
              <ApprovalItemCard
                key={item.id}
                id={`approval-item-${item.id}`}
                item={item}
                isSelected={selectedId === item.id}
                onSelect={() => {
                  const newId = selectedId === item.id ? null : item.id;
                  setSelectedId(newId);
                  setSelectedSource(newId ? item.source : null);
                }}
                isResolved={resolvedIds.has(item.id)}
              />
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1 xl:col-span-2">
          {selectedItem?.source === "ingestion" &&
          selectedId &&
          reviewDetail ? (
            <IngestionDetailPanel
              detail={reviewDetail}
              onApprove={(notes) =>
                approveMutation.mutate({
                  documentId: selectedId,
                  notes,
                })
              }
              onReject={(reason) =>
                rejectMutation.mutate({
                  documentId: selectedId,
                  reason,
                })
              }
              onRerun={() => rerunMutation.mutate({ documentId: selectedId })}
              isApproving={approveMutation.isPending}
              isRejecting={rejectMutation.isPending}
              isRerunning={rerunMutation.isPending}
              isResolved={resolvedIds.has(selectedId)}
            />
          ) : selectedItem?.source === "agent" && selectedItem ? (
            <AgentDetailPanel
              item={selectedItem}
              onApprove={() =>
                setResolvedIds((prev) => new Set(prev).add(selectedItem.id))
              }
              onReject={() =>
                setResolvedIds((prev) => new Set(prev).add(selectedItem.id))
              }
            />
          ) : detailLoading ? (
            <Card className="p-6">
              <Skeleton className="h-6 w-1/2 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <Skeleton className="h-20 w-full mb-3" />
              <Skeleton className="h-20 w-full" />
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
              <Eye className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                Select an item
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Click on an item from the list to review details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Approval Item Card ─────────────────────────────────────────────────────

function ApprovalItemCard({
  id,
  item,
  isSelected,
  onSelect,
  isResolved,
}: {
  id?: string;
  item: ApprovalItem;
  isSelected: boolean;
  onSelect: () => void;
  isResolved: boolean;
}) {
  const confidencePct = Math.round(item.confidence * 100);
  const isCritical = item.priority === "critical";

  return (
    <Card
      id={id}
      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary shadow-md" : ""
      } ${
        isCritical
          ? "border-l-4 border-l-red-500"
          : "border-l-4 border-l-amber-500"
      } ${isResolved ? "opacity-50" : ""}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {item.source === "ingestion" ? (
              <Zap className="h-4 w-4 text-violet-500 shrink-0" />
            ) : (
              <BrainCircuit className="h-4 w-4 text-emerald-500 shrink-0" />
            )}
            <p className="text-sm font-medium truncate">{item.title}</p>
          </div>
          <p className="text-xs text-muted-foreground capitalize truncate">
            {item.workflow?.replace(/_/g, " ")} ·{" "}
            {item.type?.replace(/_/g, " ")}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-3 mt-3">
        {/* Source Badge */}
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 ${
            item.source === "ingestion"
              ? "text-violet-600 border-violet-200 dark:border-violet-800"
              : "text-emerald-600 border-emerald-200 dark:border-emerald-800"
          }`}
        >
          {item.source === "ingestion" ? "Ingestion" : "Agent"}
        </Badge>

        {/* Confidence Indicator */}
        <div className="flex items-center gap-1.5">
          {confidencePct >= 80 ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : confidencePct >= 50 ? (
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          )}
          <span
            className={`text-xs font-medium ${
              confidencePct >= 80
                ? "text-emerald-600"
                : confidencePct >= 50
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {confidencePct}%
          </span>
        </div>

        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(item.createdAt), {
            addSuffix: true,
          })}
        </span>

        {isCritical && (
          <Badge variant="destructive" className="text-[10px] px-1.5 ml-auto">
            Critical
          </Badge>
        )}
      </div>
    </Card>
  );
}

// ─── Ingestion Detail Panel ─────────────────────────────────────────────────

function IngestionDetailPanel({
  detail,
  onApprove,
  onReject,
  onRerun,
  isApproving,
  isRejecting,
  isRerunning,
  isResolved,
}: {
  detail: ReviewDetailData;
  onApprove: (notes?: string) => void;
  onReject: (reason: string) => void;
  onRerun: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isRerunning: boolean;
  isResolved: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const confidencePct = Math.round((detail.review.confidence ?? 0) * 100);

  const proposedEntry = detail.review.proposedEntry as Record<
    string,
    unknown
  > | null;
  const lines =
    (proposedEntry?.lines as Array<{
      accountCode: string;
      accountName: string;
      debit: number;
      credit: number;
      description: string;
      lineConfidence: number;
    }>) ?? [];

  const reviewItems = (detail.review.reviewItems ?? []) as Array<{
    field: string;
    label: string;
    extractedValue: unknown;
    suggestedValue: unknown;
    confidence: number;
    editable: boolean;
  }>;

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-500" />
            <h3 className="text-lg font-semibold">{detail.name}</h3>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className="text-[10px] text-violet-600 border-violet-200"
            >
              Ingestion Review
            </Badge>
            <Badge variant="outline" className="capitalize text-xs">
              {detail.type?.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className="capitalize text-xs">
              {detail.review.workflow?.replace(/_/g, " ")}
            </Badge>
            <Badge
              variant={
                confidencePct >= 85
                  ? "default"
                  : confidencePct >= 60
                    ? "secondary"
                    : "destructive"
              }
              className="text-xs"
            >
              {confidencePct}% confidence
            </Badge>
          </div>
        </div>
      </div>

      {/* Classification Info */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-lg bg-muted/30">
        <div>
          <p className="text-xs text-muted-foreground">Classification</p>
          <p className="text-sm font-medium capitalize">
            {detail.classification.category}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Confidence:{" "}
            {Math.round((detail.classification.confidence ?? 0) * 100)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">OCR Confidence</p>
          <p className="text-sm font-medium">
            {detail.ocrConfidence
              ? `${Math.round(parseFloat(detail.ocrConfidence) * 100)}%`
              : "N/A"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {detail.mimeType ?? "Unknown format"}
          </p>
        </div>
      </div>

      {/* Review Items */}
      {reviewItems.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Items Requiring Review
          </h4>
          <div className="space-y-2">
            {reviewItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 text-sm"
              >
                <div>
                  <p className="text-xs font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Extracted: {String(item.extractedValue ?? "N/A")}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    (item.confidence ?? 0) < 0.5
                      ? "text-red-500 border-red-200"
                      : "text-amber-500 border-amber-200"
                  }`}
                >
                  {Math.round((item.confidence ?? 0) * 100)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proposed Journal Entry */}
      {proposedEntry && lines.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2">Proposed Journal Entry</h4>
          <div className="rounded-md border overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>{proposedEntry.description as string}</span>
              <span>{proposedEntry.date as string}</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-3 py-1.5 text-left font-medium">Account</th>
                  <th className="px-3 py-1.5 text-right font-medium">Debit</th>
                  <th className="px-3 py-1.5 text-right font-medium">Credit</th>
                  <th className="px-3 py-1.5 text-left font-medium">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="px-3 py-1.5">
                      <span className="font-medium">{line.accountCode}</span>{" "}
                      {line.accountName}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {line.debit > 0
                        ? line.debit.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })
                        : ""}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {line.credit > 0
                        ? line.credit.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })
                        : ""}
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          line.lineConfidence >= 0.9
                            ? "text-emerald-600 border-emerald-200"
                            : line.lineConfidence >= 0.7
                              ? "text-amber-600 border-amber-200"
                              : "text-red-600 border-red-200"
                        }`}
                      >
                        {Math.round((line.lineConfidence ?? 0) * 100)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t font-medium bg-muted/20">
                <tr>
                  <td className="px-3 py-1.5">Totals</td>
                  <td className="px-3 py-1.5 text-right">
                    {lines
                      .reduce((s, l) => s + (l.debit ?? 0), 0)
                      .toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {lines
                      .reduce((s, l) => s + (l.credit ?? 0), 0)
                      .toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      {!isResolved ? (
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => onApprove(notes || undefined)}
            disabled={isApproving || isRejecting}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isApproving ? "Posting..." : "Approve & Post"}
          </Button>

          {!showReject ? (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowReject(true)}
              disabled={isApproving || isRejecting}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Rejection reason..."
                className="h-8 rounded-md border px-2 text-xs w-48"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (rejectReason) {
                    onReject(rejectReason);
                    setShowReject(false);
                    setRejectReason("");
                  }
                }}
                disabled={!rejectReason || isRejecting}
              >
                {isRejecting ? "Rejecting..." : "Confirm"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReject(false)}
              >
                Cancel
              </Button>
            </div>
          )}

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onRerun}
            disabled={isRerunning}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRerunning ? "animate-spin" : ""}`}
            />
            {isRerunning ? "Re-running..." : "Re-run"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-4 border-t text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          This item has been resolved.
        </div>
      )}

      {/* Notes */}
      {!isResolved && (
        <div className="mt-3">
          <input
            type="text"
            placeholder="Add notes (optional)..."
            className="h-8 w-full rounded-md border px-2 text-xs"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      )}
    </Card>
  );
}

// ─── Agent Detail Panel ─────────────────────────────────────────────────────

function AgentDetailPanel({
  item,
  onApprove,
  onReject,
}: {
  item: ApprovalItem;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [actioned, setActioned] = useState(false);
  const metadata = item.metadata as { recommendation?: string; agent?: string };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-emerald-500" />
            <h3 className="text-lg font-semibold">{item.title}</h3>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className="text-[10px] text-emerald-600 border-emerald-200"
            >
              Agent Approval
            </Badge>
            <Badge variant="outline" className="capitalize text-xs">
              {item.type?.replace(/_/g, " ")}
            </Badge>
            {metadata.agent && (
              <Badge variant="secondary" className="text-[10px]">
                {metadata.agent}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Why it needs human */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-1">Reason</h4>
        <p className="text-sm text-muted-foreground">{item.description}</p>
      </div>

      {/* Agent Recommendation */}
      {metadata.recommendation && (
        <div className="rounded-lg bg-muted/50 p-3 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            Agent Recommendation
          </p>
          <p className="text-sm text-foreground">{metadata.recommendation}</p>
        </div>
      )}

      {/* Source */}
      <div className="flex items-center gap-1.5 text-xs text-primary mb-4">
        <FileText className="h-3.5 w-3.5" />
        {item.documentName}
        <ExternalLink className="h-3 w-3" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setActioned(true);
            onApprove();
          }}
          disabled={actioned}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            setActioned(true);
            onReject();
          }}
          disabled={actioned}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          Reject
        </Button>
        <Button size="sm" variant="ghost" className="gap-1.5 ml-auto">
          <MessageSquare className="h-3.5 w-3.5" />
          Ask why
        </Button>
      </div>

      {actioned && (
        <p className="mt-3 text-xs text-emerald-600 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Action recorded
        </p>
      )}
    </Card>
  );
}
