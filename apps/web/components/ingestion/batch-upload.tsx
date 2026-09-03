/**
 * Batch Upload — Upload multiple documents for batch ingestion.
 *
 * Real pipeline (no simulation):
 *   1. `startBatch` presigns one R2 upload URL per file.
 *   2. Each file's bytes are PUT directly to R2 from the browser.
 *   3. `confirmBatch` verifies every upload and triggers the real
 *      process-document pipeline per file.
 * Progress is then reported by batch-progress from the documents table.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import {
  Upload,
  FileText,
  X,
  Play,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

interface UploadedFile {
  file: File;
  id: string;
  status: "pending" | "ready" | "error";
  error?: string;
}

/** Max file sizes per category — mirrors intake-service constants */
const MAX_FILE_SIZES: Record<string, number> = {
  pdf: 50 * 1024 * 1024,
  image: 25 * 1024 * 1024,
  spreadsheet: 10 * 1024 * 1024,
  document: 25 * 1024 * 1024,
  text: 5 * 1024 * 1024,
  default: 10 * 1024 * 1024,
};

const ACCEPTED_MIME = new Set([
  "text/plain",
  "text/csv",
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

function getFileCategory(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "tiff", "webp"].includes(ext)) return "image";
  if (["csv", "xlsx", "xls"].includes(ext)) return "spreadsheet";
  if (["doc", "docx"].includes(ext)) return "document";
  if (["txt", "eml", "msg"].includes(ext)) return "text";
  return "default";
}

// ─── Component ────────────────────────────────────────────────────────────

export function BatchUpload({
  onBatchStart,
}: {
  onBatchStart?: (batchId: string) => void;
}) {
  const { entityId } = useEntity();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phase 1: presign upload URLs
  const startBatch = trpc.batchIngestion.startBatch.useMutation();

  // Phase 3: verify + trigger the real pipeline
  const confirmBatch = trpc.batchIngestion.confirmBatch.useMutation({
    onSuccess: (result) => {
      setIsProcessing(false);
      if (result.failedCount > 0) {
        const first = result.failures[0];
        setFiles((prev) =>
          prev.map((f) =>
            f.id === first?.documentId
              ? { ...f, status: "error", error: first.error }
              : f,
          ),
        );
      }
    },
    onError: (error) => {
      setIsProcessing(false);
      console.error("Failed to confirm batch:", error);
    },
  });

  // Handle file selection
  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles: UploadedFile[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        if (!ACCEPTED_MIME.has(file.type)) {
          newFiles.push({
            file,
            id: crypto.randomUUID(),
            status: "error",
            error: `Unsupported file type: ${file.type || "unknown"}`,
          });
          continue;
        }

        const category = getFileCategory(file);
        const maxSize = MAX_FILE_SIZES[category] ?? MAX_FILE_SIZES.default;
        if (file.size > maxSize) {
          newFiles.push({
            file,
            id: crypto.randomUUID(),
            status: "error",
            error: `File exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit for ${category} files.`,
          });
          continue;
        }

        if (file.size === 0) {
          newFiles.push({
            file,
            id: crypto.randomUUID(),
            status: "error",
            error: "File is empty — please select a valid file.",
          });
          continue;
        }

        newFiles.push({ file, id: crypto.randomUUID(), status: "ready" });
      }

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [],
  );

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  // Remove file
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Start batch processing: presign → PUT each file → confirm + trigger
  const handleStartBatch = useCallback(async () => {
    const readyFiles = files.filter((f) => f.status === "ready");
    if (readyFiles.length === 0 || !entityId) return;

    setIsProcessing(true);

    try {
      // Phase 1: presign upload URLs for every file
      const { batchId, uploads } = await startBatch.mutateAsync({
        documents: readyFiles.map((f) => ({
          fileName: f.file.name,
          fileSize: f.file.size,
          mimeType: f.file.type || "application/octet-stream",
        })),
      });

      // Phase 2: PUT each file's bytes directly to R2
      const confirmed: Array<{
        documentId: string;
        storagePath: string;
        fileSize: number;
      }> = [];

      for (let i = 0; i < readyFiles.length; i++) {
        const f = readyFiles[i];
        const upload = uploads[i];
        const put = await fetch(upload.uploadUrl, {
          method: "PUT",
          body: f.file,
          headers: {
            "Content-Type": f.file.type || "application/octet-stream",
          },
        });
        if (!put.ok) {
          setFiles((prev) =>
            prev.map((pf) =>
              pf.id === f.id
                ? {
                    ...pf,
                    status: "error",
                    error: `Upload to storage failed (${put.status}).`,
                  }
                : pf,
            ),
          );
          continue;
        }
        confirmed.push({
          documentId: upload.documentId,
          storagePath: upload.storagePath,
          fileSize: f.file.size,
        });
      }

      if (confirmed.length === 0) {
        setIsProcessing(false);
        return;
      }

      // Phase 3: verify + trigger the real pipeline
      const result = await confirmBatch.mutateAsync({
        batchId,
        uploads: confirmed,
      });
      onBatchStart?.(batchId);

      // Keep successfully-uploaded files listed; drop them once started.
      if (result.failedCount > 0) {
        setFiles((prev) =>
          prev.filter((pf) =>
            confirmed.some(
              (c) => c.documentId === pf.id || pf.status === "error",
            ),
          ),
        );
      } else {
        setFiles([]);
      }
    } catch (error) {
      setIsProcessing(false);
      console.error("Failed to start batch:", error);
    }
  }, [files, entityId, startBatch, confirmBatch, onBatchStart]);

  // Clear all files
  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  // Get file stats
  const readyCount = files.filter((f) => f.status === "ready").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`
          border-2 border-dashed transition-colors
          ${files.length > 0 ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25"}
        `}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CardContent className="p-8">
          <div className="text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              Upload Documents for Batch Processing
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop files here, or click to select files.
              <br />
              Supports: PDF, JPG, PNG, TIFF, CSV, XLSX, DOCX, TXT
            </p>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Files
              </Button>
              {files.length > 0 && (
                <Button variant="ghost" onClick={clearFiles}>
                  Clear All
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.csv,.pdf,.jpg,.jpeg,.png,.tiff,.webp,.xlsx,.xls,.docx,.doc"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Selected Files ({files.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {errorCount} errors
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {readyCount} ready
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`
                    flex items-center justify-between p-3 border rounded-lg
                    ${file.status === "error" ? "border-red-200 bg-red-50" : ""}
                    ${file.status === "ready" ? "border-green-200 bg-green-50" : ""}
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">
                        {file.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file.size)} • {file.file.type}
                      </p>
                      {file.status === "error" && file.error && (
                        <p className="text-xs text-red-500 mt-0.5">
                          {file.error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.status === "ready" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {file.status === "error" && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Button */}
      {files.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => handleStartBatch()}
            disabled={readyCount === 0 || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start Processing ({readyCount} files)
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
