"use client";

import { FileText, Download, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentCardProps {
  name: string;
  docType: string;
  documentId?: string;
  url?: string;
  status?: "processing" | "completed" | "failed";
}

export function DocumentCard({
  name,
  docType,
  documentId,
  url,
  status = "completed",
}: DocumentCardProps) {
  const typeColors: Record<string, string> = {
    pdf: "bg-red-100 text-red-600",
    image: "bg-blue-100 text-blue-600",
    spreadsheet: "bg-emerald-100 text-emerald-600",
    document: "bg-purple-100 text-purple-600",
    journal_entry: "bg-indigo-100 text-indigo-600",
    invoice: "bg-amber-100 text-amber-600",
    report: "bg-cyan-100 text-cyan-600",
  };

  const typeLabels: Record<string, string> = {
    pdf: "PDF",
    image: "Image",
    spreadsheet: "Spreadsheet",
    document: "Document",
    journal_entry: "Journal Entry",
    invoice: "Invoice",
    report: "Report",
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
            typeColors[docType] || "bg-muted",
          )}
        >
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground truncate">
              {name}
            </p>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                typeColors[docType] || "bg-muted",
              )}
            >
              {typeLabels[docType] || docType}
            </span>
          </div>
          {status === "processing" && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Processing...
            </p>
          )}
          {status === "completed" && (
            <p className="text-[10px] text-emerald-600 mt-0.5">
              ✓ Created successfully
            </p>
          )}
          {status === "failed" && (
            <p className="text-[10px] text-red-600 mt-0.5">
              ✗ Processing failed
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
          {documentId && (
            <a
              href={`/dashboard/documents?id=${documentId}`}
              className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
