"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button, Badge, Card } from "@/components/ui";
import { Skeleton } from "@/components/ui";
import { trpc } from "@/lib/trpc/client";
import type {
  PendingReviewsResponse,
  ReviewDetailResponse,
  IngestionStatsResponse,
  PendingReviewItem,
} from "@/server/routers/ingestion";
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
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type FilterTab = "all" | "pending_review" | "escalated";

// ─── Review Queue Page ──────────────────────────────────────────────────────

export default function ReviewQueuePage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  // Queries
  const { data: stats, isLoading: statsLoading } =
    trpc.ingestion.getStats.useQuery<IngestionStatsResponse>();
  const { data: reviewsData, isLoading: reviewsLoading } =
    trpc.ingestion.listPendingReviews.useQuery<PendingReviewsResponse>({
      limit: 50,
    });
  const { data: reviewDetail, isLoading: detailLoading } =
    trpc.ingestion.getReviewDetails.useQuery<ReviewDetailResponse>(
      { documentId: selectedDoc! },
      { enabled: !!selectedDoc },
    );

  // Mutations
  const utils = trpc.useUtils();
  const approveMutation = trpc.ingestion.approveReview.useMutation({
    onSuccess: () => {
      utils.ingestion.listPendingReviews.invalidate();
      utils.ingestion.getStats.invalidate();
      setSelectedDoc(null);
    },
  });
  const rejectMutation = trpc.ingestion.rejectReview.useMutation({
    onSuccess: () => {
      utils.ingestion.listPendingReviews.invalidate();
      utils.ingestion.getStats.invalidate();
      setSelectedDoc(null);
    },
  });
  const rerunMutation = trpc.ingestion.rerunIngestion.useMutation({
    onSuccess: () => {
      utils.ingestion.listPendingReviews.invalidate();
      utils.ingestion.getStats.invalidate();
    },
  });

  const pendingItems = reviewsData?.items ?? [];
  const filtered =
    filter === "all"
      ? pendingItems
      : pendingItems.filter((item) => item.action === filter);

  // ── Stats Cards ───────────────────────────────────────────────────────
  const statsCards = [
    {
      label: "Total Documents",
      value: stats?.total ?? 0,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Auto-Posted",
      value: stats?.autoPosted ?? 0,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: "Pending Review",
      value: stats?.pendingReview ?? 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      label: "Auto-Post Rate",
      value: `${stats?.autoPostRate ?? 0}%`,
      icon: BarChart3,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingestion Review Queue"
        description="Review and approve transactions that require human verification before posting"
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
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    card.value
                  )}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pb-2 border-b">
        {[
          { key: "all" as const, label: "All", count: pendingItems.length },
          {
            key: "pending_review" as const,
            label: "Pending Review",
            count: pendingItems.filter((i) => i.action === "pending_review")
              .length,
          },
          {
            key: "escalated" as const,
            label: "Escalated",
            count: pendingItems.filter((i) => i.action === "escalated").length,
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

      {/* Main Content: Review List + Detail Panel */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Review List */}
        <div className="lg:col-span-1 xl:col-span-1 space-y-3">
          {reviewsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-4 w-full" />
              </Card>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <h3 className="text-lg font-semibold">All caught up!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No transactions pending review in this category.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <ReviewCard
                key={item.id}
                item={item}
                isSelected={selectedDoc === item.documentId}
                onSelect={() =>
                  setSelectedDoc(
                    selectedDoc === item.documentId ? null : item.documentId,
                  )
                }
              />
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1 xl:col-span-2">
          {selectedDoc && reviewDetail ? (
            <ReviewDetailPanel
              detail={reviewDetail}
              onApprove={(notes) =>
                approveMutation.mutate({ documentId: selectedDoc, notes })
              }
              onReject={(reason) =>
                rejectMutation.mutate({ documentId: selectedDoc, reason })
              }
              onRerun={() => rerunMutation.mutate({ documentId: selectedDoc })}
              isApproving={approveMutation.isPending}
              isRejecting={rejectMutation.isPending}
              isRerunning={rerunMutation.isPending}
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
                Select a review item
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Click on an item from the list to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Review Card Component ──────────────────────────────────────────────────

function ReviewCard({
  item,
  isSelected,
  onSelect,
}: {
  item: PendingReviewItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const confidencePct = Math.round((item.confidence ?? 0) * 100);
  const isEscalated = item.action === "escalated";

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary shadow-md" : ""
      } ${isEscalated ? "border-l-4 border-l-red-500" : "border-l-4 border-l-amber-500"}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm font-medium truncate">{item.name}</p>
          </div>
          <p className="text-xs text-muted-foreground capitalize">
            {item.type?.replace(/_/g, " ")} ·{" "}
            {item.workflow?.replace(/_/g, " ")}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-3 mt-3">
        {/* Confidence Indicator */}
        <div className="flex items-center gap-1.5">
          {confidencePct >= 85 ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : confidencePct >= 60 ? (
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          )}
          <span
            className={`text-xs font-medium ${
              confidencePct >= 85
                ? "text-emerald-600"
                : confidencePct >= 60
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {confidencePct}%
          </span>
        </div>

        <span className="text-[10px] text-muted-foreground">
          {item.createdAt
            ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
            : ""}
        </span>

        {isEscalated && (
          <Badge variant="destructive" className="text-[10px] px-1.5 ml-auto">
            Escalated
          </Badge>
        )}
      </div>
    </Card>
  );
}

// ─── Review Detail Panel ────────────────────────────────────────────────────

function ReviewDetailPanel({
  detail,
  onApprove,
  onReject,
  onRerun,
  isApproving,
  isRejecting,
  isRerunning,
}: {
  detail: ReviewDetailResponse;
  onApprove: (notes?: string) => void;
  onReject: (reason: string) => void;
  onRerun: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isRerunning: boolean;
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
          <h3 className="text-lg font-semibold">{detail.name}</h3>
          <div className="flex items-center gap-2 mt-1">
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

      {/* Review Items (low confidence fields) */}
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

      {/* Notes */}
      <div className="mt-3">
        <input
          type="text"
          placeholder="Add notes (optional)..."
          className="h-8 w-full rounded-md border px-2 text-xs"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Card>
  );
}
