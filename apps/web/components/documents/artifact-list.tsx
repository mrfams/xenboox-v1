"use client";

import { useState } from "react";
import {
  Download,
  Trash2,
  MoreHorizontal,
  FileText,
  FileSpreadsheet,
  File,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Loader2,
  ExternalLink,
} from "lucide-react";

import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type Artifact = {
  id: string;
  kind: string;
  name: string;
  description: string | null;
  mimeType: string;
  sizeBytes: number | null;
  status: string;
  createdBy: string | null;
  createdByName: string | null;
  agentName: string | null;
  createdAt: string;
  expiresAt: string | null;
  pinned: boolean;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getKindIcon(kind: string) {
  switch (kind) {
    case "report":
      return FileText;
    case "export":
      return FileSpreadsheet;
    case "invoice_pdf":
    case "credit_note":
      return FileText;
    case "filing":
      return FileText;
    case "statement":
      return FileText;
    case "contract":
      return FileText;
    default:
      return File;
  }
}

function getKindColor(kind: string): string {
  switch (kind) {
    case "report":
      return "bg-indigo-100 text-indigo-600";
    case "export":
      return "bg-emerald-100 text-emerald-600";
    case "invoice_pdf":
      return "bg-blue-100 text-blue-600";
    case "credit_note":
      return "bg-amber-100 text-amber-600";
    case "filing":
      return "bg-red-100 text-red-600";
    case "statement":
      return "bg-cyan-100 text-cyan-600";
    case "contract":
      return "bg-purple-100 text-purple-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "ready":
      return { icon: CheckCircle2, color: "text-emerald-500" };
    case "generating":
      return { icon: Loader2, color: "text-blue-500 animate-spin" };
    case "expired":
      return { icon: Clock, color: "text-amber-500" };
    case "failed":
      return { icon: AlertTriangle, color: "text-red-500" };
    case "archived":
      return { icon: Archive, color: "text-slate-400" };
    default:
      return { icon: File, color: "text-slate-400" };
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

interface ArtifactListProps {
  artifacts: Artifact[];
  isLoading?: boolean;
  onDownload: (artifact: Artifact) => void;
  onDelete: (artifact: Artifact) => void;
  searchQuery?: string;
}

export function ArtifactList({
  artifacts,
  isLoading = false,
  onDownload,
  onDelete,
  searchQuery = "",
}: ArtifactListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (artifacts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">
          {searchQuery
            ? "No artifacts match your search"
            : "No artifacts yet. Generated reports and exports will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Artifact
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Kind
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Created By
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Date
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Size
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {artifacts.map((artifact) => {
            const KindIcon = getKindIcon(artifact.kind);
            const kindColor = getKindColor(artifact.kind);
            const { icon: StatusIcon, color: statusColor } = getStatusIcon(
              artifact.status,
            );

            return (
              <tr
                key={artifact.id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                {/* Name */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                        kindColor,
                      )}
                    >
                      <KindIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {artifact.name}
                      </p>
                      {artifact.description && (
                        <p className="text-xs text-slate-400 truncate">
                          {artifact.description}
                        </p>
                      )}
                      {artifact.agentName && (
                        <p className="text-xs text-indigo-500 mt-0.5">
                          Generated by {artifact.agentName}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Kind */}
                <td className="py-3 px-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      kindColor,
                    )}
                  >
                    {artifact.kind.replace("_", " ")}
                  </span>
                </td>

                {/* Status */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={cn("h-4 w-4", statusColor)} />
                    <span className="text-sm text-slate-600 capitalize">
                      {artifact.status}
                    </span>
                  </div>
                </td>

                {/* Created By */}
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-600">
                    {artifact.createdByName ?? "System"}
                  </span>
                </td>

                {/* Date */}
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-600">
                    {formatDate(artifact.createdAt)}
                  </span>
                </td>

                {/* Size */}
                <td className="py-3 px-4 text-right">
                  <span className="text-sm text-slate-600">
                    {formatBytes(artifact.sizeBytes)}
                  </span>
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {artifact.status === "ready" && (
                      <button
                        onClick={() => onDownload(artifact)}
                        className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    )}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === artifact.id ? null : artifact.id,
                          )
                        }
                        className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4 text-slate-400" />
                      </button>
                      {openMenuId === artifact.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-slate-200 bg-white shadow-lg z-10">
                          <button
                            onClick={() => {
                              onDownload(artifact);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open
                          </button>
                          <button
                            onClick={() => {
                              onDelete(artifact);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
