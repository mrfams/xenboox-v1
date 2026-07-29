"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  FileText,
  FileSpreadsheet,
  FileDown,
  Presentation,
  Download,
  Clock,
  Eye,
  Trash2,
} from "lucide-react";

type DeliverableFile = {
  id: string;
  name: string;
  type: "pdf" | "xlsx" | "pptx" | "docx";
  createdAt: Date;
  size?: string;
};

type CFOdeliverablesPanelProps = {
  files?: DeliverableFile[];
  className?: string;
};

const FILE_ICONS = {
  pdf: FileText,
  xlsx: FileSpreadsheet,
  pptx: Presentation,
  docx: FileDown,
} as const;

const FILE_COLORS = {
  pdf: "text-error-clay bg-error-clay-bg",
  xlsx: "text-balanced-green bg-balanced-green-bg",
  pptx: "text-attention-amber bg-attention-amber-bg",
  docx: "text-signal-indigo bg-signal-indigo-bg",
} as const;

const FILE_LABELS = {
  pdf: "PDF",
  xlsx: "Excel",
  pptx: "PowerPoint",
  docx: "Word",
} as const;

const DEFAULT_FILES: DeliverableFile[] = [
  {
    id: "dl-1",
    name: "July Management Accounts.pdf",
    type: "pdf",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    size: "1.2 MB",
  },
  {
    id: "dl-2",
    name: "Cash Forecast.xlsx",
    type: "xlsx",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    size: "856 KB",
  },
  {
    id: "dl-3",
    name: "Board Report.pptx",
    type: "pptx",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    size: "3.4 MB",
  },
  {
    id: "dl-4",
    name: "Budget Comparison.pdf",
    type: "pdf",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    size: "2.1 MB",
  },
  {
    id: "dl-5",
    name: "Payroll Summary.xlsx",
    type: "xlsx",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    size: "624 KB",
  },
  {
    id: "dl-6",
    name: "VAT Return Draft.pdf",
    type: "pdf",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    size: "1.8 MB",
  },
];

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CFOdeliverablesPanel({
  files = DEFAULT_FILES,
  className,
}: CFOdeliverablesPanelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (files.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2 px-1">
          <FileDown className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Deliverables
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground/60">
            No deliverables yet
          </p>
          <p className="text-[10px] text-muted-foreground/40 mt-1">
            Files will appear here when AI generates them
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <FileDown className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Deliverables
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground/50">
          {files.length} files
        </span>
      </div>

      <div className="space-y-1">
        {files.map((file) => {
          const Icon = FILE_ICONS[file.type];
          const colorClass = FILE_COLORS[file.type];
          const label = FILE_LABELS[file.type];
          const isHovered = hoveredId === file.id;

          return (
            <div
              key={file.id}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-200",
                "hover:bg-muted/40 cursor-pointer",
              )}
              onMouseEnter={() => setHoveredId(file.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  colorClass,
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground/80 truncate">
                  {file.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-medium text-muted-foreground/50 uppercase">
                    {label}
                  </span>
                  {file.size && (
                    <span className="text-[9px] text-muted-foreground/40">
                      {file.size}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/40">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDate(file.createdAt)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div
                className={cn(
                  "flex items-center gap-0.5 transition-opacity duration-200",
                  isHovered ? "opacity-100" : "opacity-0",
                )}
              >
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
                  title="Download"
                >
                  <Download className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
                  title="Preview"
                >
                  <Eye className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 hover:text-error-clay hover:bg-error-clay/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
