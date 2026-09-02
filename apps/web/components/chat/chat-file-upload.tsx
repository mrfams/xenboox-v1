"use client";

import { useState, useCallback, useRef } from "react";
import {
  Paperclip,
  X,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Loader2,
  Upload,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

export type UploadedFile = {
  documentId: string;
  name: string;
  type: string;
  size: number;
};

type UploadState = {
  file: File;
  status: "uploading" | "success" | "error";
  progress?: number;
  documentId?: string;
  error?: string;
  previewUrl?: string;
};

interface ChatFileUploadProps {
  entityId: string;
  onFilesUploaded: (files: UploadedFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getFileIcon(type: string) {
  if (type.includes("pdf")) return FileText;
  if (type.includes("image")) return Image;
  if (type.includes("spreadsheet") || type.includes("excel"))
    return FileSpreadsheet;
  if (type.includes("word") || type.includes("document")) return File;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(type: string): boolean {
  return type.startsWith("image/");
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ChatFileUpload({
  entityId,
  onFilesUploaded,
  disabled = false,
  maxFiles = 10,
}: ChatFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload a single file to R2 via our API route
  const uploadFile = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityId", entityId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      return await response.json();
    },
    [entityId],
  );

  // Handle files selected
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      // Enforce max files limit
      const remaining = maxFiles - uploads.length;
      const filesToUpload = fileArray.slice(0, remaining);
      if (filesToUpload.length < fileArray.length) {
        // Some files were rejected
      }

      // Create preview URLs for images
      const newUploads: UploadState[] = filesToUpload.map((file) => {
        const previewUrl = isImageFile(file.type)
          ? URL.createObjectURL(file)
          : undefined;
        return {
          file,
          status: "uploading" as const,
          progress: 0,
          previewUrl,
        };
      });

      setUploads((prev) => [...prev, ...newUploads]);

      // Upload all files
      const results: UploadedFile[] = [];
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const uploadIndex = uploads.length + i;

        try {
          const result = await uploadFile(file);
          if (result) {
            results.push(result);
            setUploads((prev) =>
              prev.map((u, idx) =>
                idx === uploadIndex
                  ? { ...u, status: "success", documentId: result.documentId }
                  : u,
              ),
            );
          }
        } catch (error) {
          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === uploadIndex
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

      // Notify parent of successful uploads
      if (results.length > 0) {
        onFilesUploaded(results);
      }
    },
    [uploads, uploadFile, onFilesUploaded, maxFiles],
  );

  // Drag and drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!disabled && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles],
  );

  // File picker
  const handlePickerClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handlePickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = ""; // Reset for re-selection
      }
    },
    [handleFiles],
  );

  // Remove upload from list
  const removeUpload = useCallback((index: number) => {
    setUploads((prev) => {
      const removed = prev[index];
      // Clean up preview URL
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Remove a successful upload (before sending)
  const removeSuccessful = useCallback((documentId: string) => {
    setUploads((prev) => prev.filter((u) => u.documentId !== documentId));
  }, []);

  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.txt,.xlsx,.xls,.docx,.doc"
        onChange={handlePickerChange}
        className="hidden"
        aria-label="Upload files"
      />

      {/* Upload button */}
      <button
        type="button"
        onClick={handlePickerClick}
        disabled={disabled || uploads.length >= maxFiles}
        className={cn(
          "inline-flex items-center justify-center h-10 w-10 rounded-xl transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          "disabled:opacity-40 disabled:pointer-events-none",
          isDragOver && "text-primary bg-primary/10",
        )}
        aria-label={`Attach files (${uploads.length}/${maxFiles})`}
        title={`Attach files (PDF, images, Excel, Word) — ${maxFiles - uploads.length} slots left`}
      >
        <Paperclip className="h-4 w-4" />
      </button>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-card/90 p-8 shadow-lg">
            <Upload className="h-10 w-10 text-primary animate-bounce" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drop files here
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, images, Excel, Word — up to 20MB each, {maxFiles} files max
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload progress list — shows above the command bar */}
      {uploads.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-80 space-y-1.5 rounded-xl border border-border/50 bg-card/95 p-2 shadow-lg backdrop-blur-sm">
          {uploads.map((upload, i) => {
            const Icon = getFileIcon(upload.file.type);
            const hasPreview = upload.previewUrl && upload.status === "success";
            return (
              <div
                key={`${upload.file.name}-${i}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs",
                  upload.status === "error" && "bg-destructive/5",
                )}
              >
                {/* Thumbnail or icon */}
                {hasPreview ? (
                  <img
                    src={upload.previewUrl}
                    alt={upload.file.name}
                    className="h-8 w-8 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {upload.file.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {formatFileSize(upload.file.size)}
                  </p>
                </div>

                {/* Status indicators */}
                {upload.status === "uploading" && (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 text-primary animate-spin" />
                )}
                {upload.status === "success" && (
                  <div className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-emerald-500" />
                    <button
                      type="button"
                      onClick={() => removeSuccessful(upload.documentId!)}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Remove ${upload.file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {upload.status === "error" && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-destructive" />
                    <button
                      type="button"
                      onClick={() => removeUpload(i)}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Remove ${upload.file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
