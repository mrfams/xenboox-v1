/**
 * Batch Upload — Upload multiple documents for batch ingestion.
 *
 * Features:
 * - Drag-and-drop file upload
 * - File type validation
 * - Preview before processing
 * - Start batch processing
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
  content?: string;
  status: "pending" | "reading" | "ready" | "error";
  error?: string;
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

  // Start batch mutation
  const startBatch = trpc.batchIngestion.startBatch.useMutation({
    onSuccess: (result) => {
      setIsProcessing(false);
      onBatchStart?.(result.batchId);
    },
    onError: (error) => {
      setIsProcessing(false);
      console.error("Failed to start batch:", error);
    },
  });

  // Handle file selection
  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles: UploadedFile[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Validate file type
        const validTypes = [
          "text/plain",
          "text/csv",
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/tiff",
        ];

        if (!validTypes.includes(file.type)) {
          newFiles.push({
            file,
            id: crypto.randomUUID(),
            status: "error",
            error: `Unsupported file type: ${file.type}`,
          });
          continue;
        }

        // Read file content for text files
        const uploadedFile: UploadedFile = {
          file,
          id: crypto.randomUUID(),
          status: "reading",
        };

        newFiles.push(uploadedFile);

        if (file.type.startsWith("text/") || file.type === "text/csv") {
          try {
            const content = await readFileContent(file);
            uploadedFile.content = content;
            uploadedFile.status = "ready";
          } catch (error) {
            uploadedFile.status = "error";
            uploadedFile.error = `Failed to read file: ${error instanceof Error ? error.message : String(error)}`;
          }
        } else {
          // For non-text files, mark as ready (would need server-side processing)
          uploadedFile.status = "ready";
          uploadedFile.content = `[Binary file: ${file.name}]`;
        }
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

  // Start batch processing
  const handleStartBatch = useCallback(() => {
    const readyFiles = files.filter((f) => f.status === "ready");

    if (readyFiles.length === 0) return;

    setIsProcessing(true);
    startBatch.mutate({
      documents: readyFiles.map((f) => ({
        fileName: f.file.name,
        content: f.content || "",
        mimeType: f.file.type,
        category: undefined,
      })),
      autoProcess: true,
    });
  }, [files, startBatch]);

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
              Supports: TXT, CSV, PDF, JPG, PNG, TIFF
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
              accept=".txt,.csv,.pdf,.jpg,.jpeg,.png,.tiff"
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.status === "reading" && (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    )}
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
            onClick={handleStartBatch}
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

function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
