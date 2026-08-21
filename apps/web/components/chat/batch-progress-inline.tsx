/**
 * Batch Progress Inline — Display batch ingestion results in chat messages.
 *
 * Features:
 * - Document processing summary
 * - Per-document status
 * - Success/failure indicators
 */

"use client";

import { Card, CardContent } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import { FileText, CheckCircle, XCircle, Upload, Database } from "lucide-react";
import { cn } from "@xenboox/ui";

// ─── Types ────────────────────────────────────────────────────────────────

export interface BatchDocument {
  documentId: string;
  fileName: string;
  status: string;
  chunksCreated?: number;
}

export interface BatchProgressInlineProps {
  batchId: string;
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  documents: BatchDocument[];
  message?: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function BatchProgressInline({
  batchId,
  totalDocuments,
  completedDocuments,
  failedDocuments,
  documents,
  message,
}: BatchProgressInlineProps) {
  const successRate =
    totalDocuments > 0
      ? Math.round((completedDocuments / totalDocuments) * 100)
      : 0;

  return (
    <div className="mt-3 border-t border-border/30 pt-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Upload className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Document Processing</span>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs",
            failedDocuments === 0
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-800",
          )}
        >
          {successRate}% success
        </Badge>
      </div>

      {/* Summary */}
      {message && (
        <p className="text-sm text-muted-foreground mb-2">{message}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          <span>{totalDocuments} documents</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
          <span>{completedDocuments} completed</span>
        </div>
        {failedDocuments > 0 && (
          <div className="flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            <span>{failedDocuments} failed</span>
          </div>
        )}
      </div>

      {/* Document List */}
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {documents.map((doc) => (
          <div
            key={doc.documentId}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg text-xs",
              doc.status === "completed"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200",
            )}
          >
            <div className="flex items-center gap-2">
              {doc.status === "completed" ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className="font-medium truncate max-w-[200px]">
                {doc.fileName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {doc.chunksCreated !== undefined && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Database className="h-3 w-3" />
                  <span>{doc.chunksCreated} chunks</span>
                </div>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  doc.status === "completed"
                    ? "border-green-300 text-green-700"
                    : "border-red-300 text-red-700",
                )}
              >
                {doc.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Batch ID for reference */}
      <div className="mt-2 text-[10px] text-muted-foreground">
        Batch ID: {batchId.slice(0, 8)}...
      </div>
    </div>
  );
}
