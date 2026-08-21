/**
 * Batch Progress — Devin-style visual progress for batch document ingestion.
 *
 * Features:
 * - Real-time progress with step-by-step status
 * - Animated pipeline visualization
 * - Per-document status cards
 * - Error handling with retry
 * - Duration and timing display
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import { Progress } from "@xenboox/ui";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Zap,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

type BatchStatus =
  "pending" | "processing" | "completed" | "failed" | "cancelled";

interface DocumentProgress {
  documentId: string;
  fileName: string;
  status: BatchStatus;
  currentStage: string;
  stageNumber: number;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  error?: string;
}

interface BatchProgressData {
  batchId: string;
  status: BatchStatus;
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  startedAt: Date;
  completedAt?: Date;
  totalDurationMs?: number;
  documents: DocumentProgress[];
}

// ─── Component ────────────────────────────────────────────────────────────

export function BatchProgress({
  batchId,
  onComplete,
}: {
  batchId: string;
  onComplete?: () => void;
}) {
  const { entityId } = useEntity();
  const [isPolling, setIsPolling] = useState(true);

  // Poll for progress updates
  const { data: progress, isLoading } =
    trpc.batchIngestion.getBatchProgress.useQuery(
      { batchId },
      {
        enabled: !!entityId && !!batchId,
        refetchInterval: isPolling ? 1000 : false, // Poll every second
      },
    );

  // Stop polling when batch is complete
  useEffect(() => {
    if (progress?.status === "completed" || progress?.status === "failed") {
      setIsPolling(false);
      onComplete?.();
    }
  }, [progress?.status, onComplete]);

  // Cancel batch mutation
  const cancelBatch = trpc.batchIngestion.cancelBatch.useMutation({
    onSuccess: () => {
      setIsPolling(false);
    },
  });

  // Retry failed mutation
  const retryFailed = trpc.batchIngestion.retryFailed.useMutation({
    onSuccess: () => {
      setIsPolling(true);
    },
  });

  // Handle cancel
  const handleCancel = useCallback(() => {
    cancelBatch.mutate({ batchId });
  }, [batchId, cancelBatch]);

  // Handle retry
  const handleRetry = useCallback(() => {
    retryFailed.mutate({ batchId });
  }, [batchId, retryFailed]);

  if (isLoading || !progress) {
    return <BatchProgressSkeleton />;
  }

  // Calculate progress percentage
  const progressPercent =
    progress.totalDocuments > 0
      ? ((progress.completedDocuments + progress.failedDocuments) /
          progress.totalDocuments) *
        100
      : 0;

  return (
    <div className="space-y-6">
      {/* Batch Summary Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Batch Processing
            </CardTitle>
            <div className="flex items-center gap-2">
              {progress.status === "processing" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={cancelBatch.isPending}
                >
                  {cancelBatch.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Pause className="h-4 w-4 mr-1" />
                  )}
                  Cancel
                </Button>
              )}
              {progress.status === "failed" && progress.failedDocuments > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={retryFailed.isPending}
                >
                  {retryFailed.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-1" />
                  )}
                  Retry Failed ({progress.failedDocuments})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {progress.completedDocuments} of {progress.totalDocuments}{" "}
                documents
              </span>
              <span className="font-medium">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>{progress.completedDocuments} completed</span>
              </div>
              <div className="flex items-center gap-1">
                {progress.failedDocuments > 0 && (
                  <>
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span>{progress.failedDocuments} failed</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {progress.totalDurationMs
                    ? `${(progress.totalDurationMs / 1000).toFixed(1)}s`
                    : "In progress..."}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-4">
            <StatusBadge status={progress.status} />
          </div>
        </CardContent>
      </Card>

      {/* Document Progress Cards */}
      <div className="space-y-3">
        {progress.documents.map((doc) => (
          <DocumentProgressCard key={doc.documentId} document={doc} />
        ))}
      </div>
    </div>
  );
}

// ─── Document Progress Card ───────────────────────────────────────────────

function DocumentProgressCard({ document }: { document: DocumentProgress }) {
  return (
    <Card
      className={`
        transition-all duration-200
        ${document.status === "processing" ? "border-primary/30 shadow-sm" : ""}
        ${document.status === "completed" ? "border-green-200 bg-green-50/50" : ""}
        ${document.status === "failed" ? "border-red-200 bg-red-50/50" : ""}
      `}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* File Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-muted rounded-lg">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{document.fileName}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <StatusIcon status={document.status} />
                <span className="truncate">{document.currentStage}</span>
                {document.durationMs && (
                  <span className="text-xs">
                    ({(document.durationMs / 1000).toFixed(1)}s)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stage Indicator */}
          <div className="flex-shrink-0">
            {document.status === "processing" && (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Stage</p>
                  <p className="text-sm font-medium">
                    {document.stageNumber}/14
                  </p>
                </div>
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
            )}
            {document.status === "completed" && (
              <CheckCircle className="h-6 w-6 text-green-500" />
            )}
            {document.status === "failed" && (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
          </div>
        </div>

        {/* Error Message */}
        {document.error && (
          <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{document.error}</p>
            </div>
          </div>
        )}

        {/* Mini Pipeline Visualization */}
        {document.status === "processing" && (
          <div className="mt-3">
            <MiniPipeline currentStage={document.stageNumber} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Mini Pipeline Visualization ──────────────────────────────────────────

function MiniPipeline({ currentStage }: { currentStage: number }) {
  const stages = [
    { label: "Detect", number: 1 },
    { label: "Extract", number: 3 },
    { label: "Classify", number: 7 },
    { label: "Map", number: 8 },
    { label: "Journal", number: 10 },
    { label: "Post", number: 13 },
  ];

  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, index) => {
        const isCompleted = currentStage > stage.number;
        const isCurrent = currentStage === stage.number;
        const isPending = currentStage < stage.number;

        return (
          <div key={stage.number} className="flex items-center">
            <div
              className={`
                flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                ${isCompleted ? "bg-green-100 text-green-700" : ""}
                ${isCurrent ? "bg-primary text-primary-foreground animate-pulse" : ""}
                ${isPending ? "bg-muted text-muted-foreground" : ""}
              `}
            >
              {isCompleted ? (
                <CheckCircle className="h-3 w-3" />
              ) : isCurrent ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                stage.number
              )}
            </div>
            {index < stages.length - 1 && (
              <div
                className={`
                  w-4 h-0.5 mx-0.5
                  ${isCompleted ? "bg-green-300" : "bg-muted"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BatchStatus }) {
  const variants: Record<BatchStatus, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-gray-100 text-gray-800",
    },
    processing: {
      label: "Processing",
      className: "bg-blue-100 text-blue-800",
    },
    completed: {
      label: "Completed",
      className: "bg-green-100 text-green-800",
    },
    failed: {
      label: "Failed",
      className: "bg-red-100 text-red-800",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-yellow-100 text-yellow-800",
    },
  };

  const variant = variants[status];

  return (
    <Badge variant="secondary" className={variant.className}>
      {variant.label}
    </Badge>
  );
}

// ─── Status Icon ──────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: BatchStatus }) {
  switch (status) {
    case "processing":
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "cancelled":
      return <Pause className="h-4 w-4 text-yellow-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function BatchProgressSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="h-8 w-24 bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-3 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>

      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-muted rounded-lg animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
