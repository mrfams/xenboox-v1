"use client";

// ─── Documents ──────────────────────────────────────────────────────────────
//
// Drop in receipts, invoices, bank statements — extraction runs as a task
// and anything needing eyes lands in Tasks → Needs you. This page is the
// upload point plus the review inbox: no batch IDs, no pipeline tracker,
// no confidence scores.

import { useState } from "react";
import {
  CheckCircle2,
  FileText,
  Inbox,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { BatchUpload } from "@/components/ingestion/batch-upload";
import { BatchProgress } from "@/components/ingestion/batch-progress";
import { IngestionReviewPanel } from "@/components/ingestion/ingestion-review-panel";

function timeAgo(d: string | Date | null | undefined): string {
  if (!d) return "";
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days < 7
    ? `${days}d`
    : new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
}

export default function DocumentsPage() {
  const { entityId } = useEntity();
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchDone, setBatchDone] = useState(false);
  const [reviewDocumentId, setReviewDocumentId] = useState<string | null>(null);

  const {
    data: pending,
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = trpc.ingestion.listPendingReviews.useQuery(
    { limit: 10 },
    { enabled: !!entityId, refetchInterval: 15_000 },
  );

  const { data: batches, isLoading: batchesLoading } =
    trpc.batchIngestion.listBatches.useQuery(
      { limit: 5 },
      { enabled: !!entityId },
    );

  const pendingItems = pending?.items ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col p-4 pb-16 sm:p-6 md:pb-6">
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
          Documents
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Drop in receipts, invoices, statements — anything needing your eyes
          lands in Tasks.
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        {/* ── Upload ─────────────────────────────────────────────── */}
        <section
          aria-label="Upload documents"
          className="rounded-xl border border-border/50 bg-card p-4"
        >
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Upload
          </h2>
          <BatchUpload
            onBatchStart={(batchId) => {
              setActiveBatchId(batchId);
              setBatchDone(false);
            }}
          />

          {activeBatchId && !batchDone && (
            <div className="mt-3">
              <BatchProgress
                batchId={activeBatchId}
                onComplete={() => setBatchDone(true)}
              />
            </div>
          )}
          {activeBatchId && batchDone && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-balanced-green/20 bg-balanced-green/[0.04] px-3 py-2.5">
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-balanced-green"
                aria-hidden="true"
              />
              <p className="flex-1 text-xs text-foreground">
                Processing finished. Anything needing review is waiting in{" "}
                <a
                  href="/dashboard/tasks"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Tasks
                </a>
                .
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveBatchId(null);
                  setBatchDone(false);
                  void refetchPending();
                }}
                className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Upload more
              </button>
            </div>
          )}
        </section>

        {/* ── Needs review ───────────────────────────────────────── */}
        <section aria-label="Documents needing review">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Inbox className="h-3.5 w-3.5 text-attention-amber" aria-hidden="true" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Needs review
            </h2>
            {pendingItems.length > 0 && (
              <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-attention-amber/15 px-1 py-0.5 text-[9px] font-bold tabular-nums text-attention-amber">
                {pendingItems.length}
              </span>
            )}
          </div>

          {pendingLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center">
              <p className="text-xs font-medium text-foreground">
                Nothing waiting
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Uploads that need eyes land here — and in Tasks.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
              <ul className="divide-y divide-border/30">
                {pendingItems.map((doc) => (
                  <li key={doc.documentId}>
                    <button
                      type="button"
                      onClick={() => setReviewDocumentId(doc.documentId)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-attention-amber/10">
                        <FileText className="h-4 w-4 text-attention-amber" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-foreground">
                          {doc.name}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {doc.type} · {timeAgo(doc.updatedAt ?? doc.createdAt)}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-attention-amber/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-attention-amber">
                        Review
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Recently processed ─────────────────────────────────── */}
        <section aria-label="Recently processed">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recently processed
          </h2>
          {batchesLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-muted/30"
                />
              ))}
            </div>
          ) : !batches || batches.length === 0 ? (
            <p className="px-1 text-xs text-muted-foreground/60">
              Nothing processed yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
              <ul className="divide-y divide-border/30">
                {batches.map((batch) => {
                  const total = batch.progress?.totalDocuments ?? 0;
                  const done = batch.progress?.completedDocuments ?? 0;
                  const failed = batch.progress?.failedDocuments ?? 0;
                  const status = batch.progress?.status ?? "processing";
                  return (
                    <li
                      key={batch.batchId}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                          status === "completed"
                            ? "bg-balanced-green/10"
                            : status === "failed"
                              ? "bg-error-clay/10"
                              : "bg-primary/10",
                        )}
                      >
                        {status === "completed" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-balanced-green" />
                        ) : status === "failed" ? (
                          <XCircle className="h-3.5 w-3.5 text-error-clay" />
                        ) : (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-foreground">
                          {total} document{total !== 1 ? "s" : ""}
                          {failed > 0 && (
                            <span className="text-error-clay">
                              {" "}
                              · {failed} failed
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {timeAgo(batch.createdAt)} · {done}/{total} done
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>

      {reviewDocumentId && (
        <IngestionReviewPanel
          documentId={reviewDocumentId}
          onClose={() => {
            setReviewDocumentId(null);
            void refetchPending();
          }}
        />
      )}
    </div>
  );
}
