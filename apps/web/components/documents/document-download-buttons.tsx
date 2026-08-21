"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  File,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  downloadDocument,
  type ReportData,
  type DocumentFormat,
} from "@/lib/documents/generate-documents";

// ─── Document Download Buttons ─────────────────────────────────────────────
//
// Renders download buttons for PDF, Excel, and Word formats.
// Used in the Command Center artifact viewer and Financial Pulse reports.

const FORMAT_CONFIG: Record<
  DocumentFormat,
  { label: string; icon: typeof FileText; color: string; hoverColor: string }
> = {
  pdf: {
    label: "PDF",
    icon: FileText,
    color: "text-red-500",
    hoverColor: "hover:bg-red-500/10",
  },
  excel: {
    label: "Excel",
    icon: FileSpreadsheet,
    color: "text-emerald-500",
    hoverColor: "hover:bg-emerald-500/10",
  },
  word: {
    label: "Word",
    icon: File,
    color: "text-blue-500",
    hoverColor: "hover:bg-blue-500/10",
  },
};

export function DocumentDownloadButtons({
  data,
  className,
  formats = ["pdf", "excel", "word"],
  size = "sm",
}: {
  data: ReportData;
  className?: string;
  formats?: DocumentFormat[];
  size?: "xs" | "sm" | "md";
}) {
  const [downloading, setDownloading] = useState<DocumentFormat | null>(null);

  const handleDownload = async (format: DocumentFormat) => {
    setDownloading(format);
    try {
      await downloadDocument(data, format);
    } catch (error) {
      console.error(`Failed to generate ${format}:`, error);
    } finally {
      setDownloading(null);
    }
  };

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[9px] gap-1",
    sm: "px-2 py-1 text-[10px] gap-1.5",
    md: "px-3 py-1.5 text-xs gap-2",
  };

  return (
    <div className={cn("flex items-center flex-wrap gap-1", className)}>
      {formats.map((format) => {
        const config = FORMAT_CONFIG[format];
        const Icon = config.icon;
        const isDownloading = downloading === format;

        return (
          <button
            key={format}
            type="button"
            onClick={() => handleDownload(format)}
            disabled={isDownloading}
            className={cn(
              "inline-flex items-center rounded-md border border-border/50 font-medium transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              config.hoverColor,
              sizeClasses[size],
            )}
            title={`Download as ${config.label}`}
          >
            {isDownloading ? (
              <Loader2
                className={cn(
                  "animate-spin",
                  size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3",
                )}
              />
            ) : (
              <Icon
                className={cn(
                  size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3",
                  config.color,
                )}
              />
            )}
            <span className="text-foreground">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Single Format Download Button ─────────────────────────────────────────

export function DownloadButton({
  data,
  format,
  className,
}: {
  data: ReportData;
  format: DocumentFormat;
  className?: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const config = FORMAT_CONFIG[format];
  const Icon = config.icon;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadDocument(data, format);
    } catch (error) {
      console.error(`Failed to generate ${format}:`, error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50",
        className,
      )}
    >
      {isDownloading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {isDownloading ? "Generating..." : `Download ${config.label}`}
    </button>
  );
}
