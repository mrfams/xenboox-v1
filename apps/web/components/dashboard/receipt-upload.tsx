"use client";

import { useState, useCallback, useRef } from "react";
import { Button, Card, CardContent, Badge, Progress } from "@/components/ui";
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  documentId?: string;
  result?: {
    category: string;
    confidence: number;
  };
  error?: string;
}

interface ReceiptUploadProps {
  onUploadComplete?: (documentId: string) => void;
}

export function ReceiptUpload({ onUploadComplete }: ReceiptUploadProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUploadUrl = trpc.document.getUploadUrl.useMutation();
  const confirmUpload = trpc.document.confirmUpload.useMutation();

  const processFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const item: UploadItem = { id, file, progress: 0, status: "uploading" };
        setUploads((prev) => [...prev, item]);

        try {
          // 1. Get presigned URL
          const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type as any,
          });

          // 2. Upload to R2
          await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });

          setUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, progress: 60 } : u)),
          );

          // 3. Confirm and trigger processing
          const { documentId } = await confirmUpload.mutateAsync({
            r2Key: storagePath,
            r2Bucket: process.env.NEXT_PUBLIC_R2_BUCKET ?? "xenboox-documents",
            name: file.name,
            type: "supporting", // Will be auto-classified by AI
            mimeType: file.type,
            fileSize: file.size,
          });

          setUploads((prev) =>
            prev.map((u) =>
              u.id === id
                ? { ...u, progress: 80, status: "processing", documentId }
                : u,
            ),
          );

          // 4. Poll for processing status
          await pollProcessingStatus(documentId, id);

          onUploadComplete?.(documentId);
        } catch (error) {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === id
                ? {
                    ...u,
                    status: "error",
                    error:
                      error instanceof Error ? error.message : "Upload failed",
                  }
                : u,
            ),
          );
        }
      }
    },
    [getUploadUrl, confirmUpload, onUploadComplete],
  );

  const pollProcessingStatus = async (documentId: string, itemId: string) => {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      try {
        // Use tRPC polling
        const status = await fetch(
          `/api/trpc/document.getStatus?input=${encodeURIComponent(JSON.stringify({ id: documentId }))}`,
        );

        if (status.ok) {
          const data = await status.json();
          const doc = data?.result?.data;

          if (
            doc?.status === "synced" ||
            doc?.status === "agent_processing" ||
            doc?.status === "done"
          ) {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === itemId
                  ? {
                      ...u,
                      progress: 100,
                      status: "done",
                      result: {
                        category:
                          doc.metadata?.classification?.category ?? "unknown",
                        confidence:
                          doc.metadata?.classification?.confidence ?? 0,
                      },
                    }
                  : u,
              ),
            );
            return;
          }

          if (doc?.status === "failed") {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === itemId
                  ? { ...u, status: "error", error: "Processing failed" }
                  : u,
              ),
            );
            return;
          }
        }
      } catch {
        // Continue polling
      }
    }

    // Timeout
    setUploads((prev) =>
      prev.map((u) =>
        u.id === itemId
          ? {
              ...u,
              progress: 100,
              status: "done",
              result: { category: "processing", confidence: 0 },
            }
          : u,
      ),
    );
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) processFiles(files);
    },
    [processFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) processFiles(files);
      e.target.value = "";
    },
    [processFiles],
  );

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">
          Drop receipts, invoices, or statements here
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, JPG, PNG, CSV — AI will classify and extract data automatically
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.csv,.xlsx,.doc,.docx"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Upload list */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={item.progress}
                        className="h-1.5 flex-1"
                      />
                      {item.status === "done" && item.result && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {item.result.category}
                        </Badge>
                      )}
                      {item.status === "error" && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {item.error ?? "Error"}
                        </Badge>
                      )}
                      {item.status === "processing" && (
                        <Badge variant="outline" className="text-xs">
                          Analyzing...
                        </Badge>
                      )}
                      {item.status === "uploading" && (
                        <Badge variant="outline" className="text-xs">
                          Uploading...
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUpload(item.id)}
                    className="shrink-0 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
