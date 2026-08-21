"use client";

import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileBarChart,
  Download,
  ExternalLink,
  Eye,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/chat/artifact-types";

export interface ArtifactCardItem {
  artifactId: string;
  name: string;
  docType: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
}

interface DocumentCardProps {
  name: string;
  docType: string;
  documentId?: string;
  url?: string;
  status?: "processing" | "completed" | "failed";
  /** Artifact registry id — when set, the card opens the inline viewer. */
  artifactId?: string;
  mimeType?: string;
  sizeBytes?: number;
  /** Called when the user clicks the card to open the document viewer. */
  onOpen?: (item: ArtifactCardItem) => void;
}

const KIND_STYLES: Record<
  string,
  { tile: string; badge: string; Icon: typeof FileText }
> = {
  report: {
    tile: "bg-cyan-50 text-cyan-600",
    badge: "bg-cyan-100 text-cyan-700",
    Icon: FileBarChart,
  },
  export: {
    tile: "bg-emerald-50 text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    Icon: FileSpreadsheet,
  },
  pdf: {
    tile: "bg-red-50 text-red-600",
    badge: "bg-red-100 text-red-700",
    Icon: FileText,
  },
  image: {
    tile: "bg-blue-50 text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    Icon: FileImage,
  },
  spreadsheet: {
    tile: "bg-emerald-50 text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    Icon: FileSpreadsheet,
  },
  document: {
    tile: "bg-purple-50 text-purple-600",
    badge: "bg-purple-100 text-purple-700",
    Icon: FileText,
  },
  journal_entry: {
    tile: "bg-indigo-50 text-indigo-600",
    badge: "bg-indigo-100 text-indigo-700",
    Icon: FileText,
  },
  invoice: {
    tile: "bg-amber-50 text-amber-600",
    badge: "bg-amber-100 text-amber-700",
    Icon: FileText,
  },
};

const KIND_LABELS: Record<string, string> = {
  report: "Report",
  export: "Export",
  pdf: "PDF",
  image: "Image",
  spreadsheet: "Spreadsheet",
  document: "Document",
  journal_entry: "Journal Entry",
  invoice: "Invoice",
};

export function DocumentCard({
  name,
  docType,
  documentId,
  url,
  status = "completed",
  artifactId,
  mimeType,
  sizeBytes,
  onOpen,
}: DocumentCardProps) {
  // Styles are keyed lowercase; the chat artifact service emits display labels
  // like "Report"/"Export", so normalize before lookup.
  const styleKey = docType.toLowerCase();
  const style = KIND_STYLES[styleKey] ?? {
    tile: "bg-muted text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
    Icon: FileText,
  };
  const Icon = style.Icon;
  const label = KIND_LABELS[styleKey] ?? docType;
  const clickable = !!artifactId && !!onOpen;
  const sizeLabel = formatFileSize(sizeBytes);

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={
        clickable
          ? () =>
              onOpen!({ artifactId, name, docType, mimeType, sizeBytes, url })
          : undefined
      }
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen!({
                  artifactId,
                  name,
                  docType,
                  mimeType,
                  sizeBytes,
                  url,
                });
              }
            }
          : undefined
      }
      className={cn(
        "group rounded-xl border border-border/50 bg-card p-3 transition-all duration-200",
        clickable
          ? "cursor-pointer hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
          : "hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200",
            style.tile,
            clickable && "group-hover:scale-105",
          )}
        >
          {status === "processing" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {name}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                style.badge,
              )}
            >
              {label}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            {status === "processing" && <span>Processing...</span>}
            {status === "completed" && (
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                Ready
              </span>
            )}
            {status === "failed" && (
              <span className="text-red-600">Generation failed</span>
            )}
            {sizeLabel && <span>{sizeLabel}</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {clickable && (
            <span className="mr-1 hidden items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary sm:flex">
              <Eye className="h-3 w-3" />
              View
            </span>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
          {documentId && (
            <a
              href="/dashboard"
              onClick={(e) => e.stopPropagation()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Open in Documents"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
