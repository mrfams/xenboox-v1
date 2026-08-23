"use client";

import { useState, useEffect } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  FileText,
  Image,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type DocumentType = "pdf" | "image" | "unknown";

type DocumentFile = {
  id: string;
  name: string;
  url: string;
  type: DocumentType;
  mimeType?: string;
  size?: number;
  uploadedAt?: Date;
  uploadedBy?: string;
};

type DocumentViewerProps = {
  file: DocumentFile | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (file: DocumentFile) => void;
  files?: DocumentFile[]; // For multi-file navigation
  currentIndex?: number;
  onNavigate?: (index: number) => void;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function getDocumentType(mimeType?: string, name?: string): DocumentType {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (name?.endsWith(".pdf")) return "pdf";
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name ?? "")) return "image";
  return "unknown";
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── PDF Viewer ────────────────────────────────────────────────────────────

function PDFViewer({ url, scale }: { url: string; scale: number }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="relative flex items-center justify-center h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-8 w-8" />
          <p className="text-sm">Failed to load PDF</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Open in new tab
          </a>
        </div>
      ) : (
        <iframe
          src={`${url}#toolbar=0&navpanes=0`}
          className="w-full h-full border-0"
          style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
          title="PDF Viewer"
        />
      )}
    </div>
  );
}

// ─── Image Viewer ──────────────────────────────────────────────────────────

function ImageViewer({
  url,
  scale,
  rotation,
}: {
  url: string;
  scale: number;
  rotation: number;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="relative flex items-center justify-center h-full overflow-auto">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-8 w-8" />
          <p className="text-sm">Failed to load image</p>
        </div>
      ) : (
        <img
          src={url}
          alt="Document"
          className="max-w-none object-contain"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
          }}
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

// ─── Document Viewer ───────────────────────────────────────────────────────

export function DocumentViewer({
  file,
  isOpen,
  onClose,
  onDownload,
  files = [],
  currentIndex = 0,
  onNavigate,
}: DocumentViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reset state when file changes
  useEffect(() => {
    setScale(1);
    setRotation(0);
  }, [file?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=")
        setScale((s) => Math.min(s + 0.25, 3));
      if (e.key === "-") setScale((s) => Math.max(s - 0.25, 0.25));
      if (e.key === "0") setScale(1);
      if (e.key === "r") setRotation((r) => (r + 90) % 360);
      if (e.key === "ArrowLeft" && onNavigate) {
        onNavigate(Math.max(0, currentIndex - 1));
      }
      if (e.key === "ArrowRight" && onNavigate) {
        onNavigate(Math.min(files.length - 1, currentIndex + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onNavigate, currentIndex, files.length]);

  if (!isOpen || !file) return null;

  const docType = getDocumentType(file.mimeType, file.name);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-slate-950",
        isFullscreen && "inset-0",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {file.name}
            </p>
            <p className="text-[10px] text-gray-400">
              {formatFileSize(file.size)}
              {file.uploadedBy && ` · Uploaded by ${file.uploadedBy}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Navigation */}
          {files.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => onNavigate?.(currentIndex - 1)}
                disabled={!hasPrev}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-gray-400 px-1">
                {currentIndex + 1} / {files.length}
              </span>
              <button
                type="button"
                onClick={() => onNavigate?.(currentIndex + 1)}
                disabled={!hasNext}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="w-px h-4 bg-white/10 mx-1" />
            </>
          )}

          {/* Zoom */}
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(s - 0.25, 0.25))}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-gray-400 w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(s + 0.25, 3))}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          {/* Rotate */}
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Fullscreen */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>

          {/* Download */}
          <button
            type="button"
            onClick={() => onDownload?.(file)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {docType === "pdf" && <PDFViewer url={file.url} scale={scale} />}
        {docType === "image" && (
          <ImageViewer url={file.url} scale={scale} rotation={rotation} />
        )}
        {docType === "unknown" && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
            <FileText className="h-16 w-16" />
            <p className="text-sm">Preview not available for this file type</p>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
              Download to view
            </a>
          </div>
        )}
      </div>

      {/* Thumbnail strip for multi-file */}
      {files.length > 1 && (
        <div className="border-t border-white/10 bg-slate-900 px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {files.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onNavigate?.(i)}
                className={cn(
                  "flex-shrink-0 rounded-lg border-2 p-1 transition-colors",
                  i === currentIndex
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:border-white/20",
                )}
              >
                <div className="flex h-12 w-16 items-center justify-center rounded bg-white/5">
                  {getDocumentType(f.mimeType, f.name) === "image" ? (
                    <img
                      src={f.url}
                      alt={f.name}
                      className="h-full w-full object-cover rounded"
                    />
                  ) : (
                    <FileText className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Document Attachment List ──────────────────────────────────────────────

export function DocumentAttachmentList({
  documents,
  onView,
  onDownload,
}: {
  documents: DocumentFile[];
  onView: (doc: DocumentFile) => void;
  onDownload?: (doc: DocumentFile) => void;
}) {
  if (!documents || documents.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
        Attachments ({documents.length})
      </h4>
      <div className="space-y-1">
        {documents.map((doc) => {
          const docType = getDocumentType(doc.mimeType, doc.name);
          return (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-3 py-2 group"
            >
              <button
                type="button"
                onClick={() => onView(doc)}
                className="flex items-center gap-2 min-w-0 flex-1 text-left"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                  {docType === "image" ? (
                    <Image className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {doc.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(doc.size)}
                    {doc.uploadedAt &&
                      ` · ${new Date(doc.uploadedAt).toLocaleDateString()}`}
                  </p>
                </div>
              </button>
              {onDownload && (
                <button
                  type="button"
                  onClick={() => onDownload(doc)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
