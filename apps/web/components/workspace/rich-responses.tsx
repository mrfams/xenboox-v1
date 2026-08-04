"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  Bot,
  type LucideIcon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────

export type RichResponseType =
  | "text"
  | "table"
  | "approval"
  | "document"
  | "chart"
  | "summary"
  | "list"
  | "alert"
  | "timeline";

export interface RichResponse {
  id: string;
  type: RichResponseType;
  content?: string;
  data?: Record<string, unknown>;
}

// ─── Approval Card ───────────────────────────────────────────────────────

interface ApprovalCardProps {
  title: string;
  description?: string;
  items?: Array<{ label: string; value: string }>;
  onApprove?: () => void;
  onReject?: () => void;
  onAskAI?: () => void;
  isApproved?: boolean;
}

export function ApprovalCard({
  title,
  description,
  items,
  onApprove,
  onReject,
  onAskAI,
  isApproved,
}: ApprovalCardProps) {
  if (isApproved) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-900">Approved</p>
            <p className="text-xs text-emerald-700">{title}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-amber-200/50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <p className="text-sm font-medium text-amber-900">
            AI needs your approval
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <p className="text-sm text-amber-800">{title}</p>
        {description && <p className="text-xs text-amber-700">{description}</p>}

        {/* Details */}
        {items && items.length > 0 && (
          <div className="rounded-lg bg-white/50 border border-amber-200/50 divide-y divide-amber-200/50">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3 py-2"
              >
                <span className="text-xs text-amber-700">{item.label}</span>
                <span className="text-xs font-medium text-amber-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-amber-200/50 bg-white/30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
          {onAskAI && (
            <button
              type="button"
              onClick={onAskAI}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Bot className="h-3.5 w-3.5" />
              Ask AI
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Document Card ───────────────────────────────────────────────────────

interface DocumentCardProps {
  name: string;
  type: string;
  size?: string;
  agent?: string;
  previewUrl?: string;
  onPreview?: () => void;
  onDownload?: () => void;
  onOpen?: () => void;
}

export function DocumentCard({
  name,
  type,
  size,
  agent,
  onPreview,
  onDownload,
  onOpen,
}: DocumentCardProps) {
  const typeColors: Record<string, string> = {
    pdf: "bg-red-100 text-red-600",
    excel: "bg-green-100 text-green-600",
    csv: "bg-blue-100 text-blue-600",
    default: "bg-gray-100 text-gray-600",
  };

  const colorClass = typeColors[type.toLowerCase()] || typeColors.default;

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden hover:shadow-md transition-all">
      {/* Preview Area */}
      <div className="h-32 bg-accent/30 flex items-center justify-center relative group">
        <FileText className="h-12 w-12 text-muted-foreground/30" />
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className="h-8 w-8 rounded-lg bg-white/90 flex items-center justify-center text-foreground hover:bg-white transition-colors shadow-sm"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="h-8 w-8 rounded-lg bg-white/90 flex items-center justify-center text-foreground hover:bg-white transition-colors shadow-sm"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Type Badge */}
        <div
          className={cn(
            "absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase",
            colorClass,
          )}
        >
          {type}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-medium text-foreground truncate">{name}</p>
        <div className="flex items-center gap-2 mt-1">
          {size && (
            <span className="text-[10px] text-muted-foreground">{size}</span>
          )}
          {agent && (
            <span className="text-[10px] text-muted-foreground">
              by {agent}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onOpen}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-[10px] font-medium text-foreground hover:bg-accent transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Open
        </button>
      </div>
    </div>
  );
}

// ─── Data Table ──────────────────────────────────────────────────────────

interface DataTableProps {
  columns: Array<{ key: string; label: string; align?: "left" | "right" }>;
  rows: Array<Record<string, string | number>>;
  caption?: string;
}

export function DataTable({ columns, rows, caption }: DataTableProps) {
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          {caption && (
            <caption className="px-4 py-2 text-xs font-medium text-muted-foreground bg-accent/30 text-left">
              {caption}
            </caption>
          )}
          <thead>
            <tr className="border-b border-border/50 bg-accent/20">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider",
                    col.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-accent/30 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-2.5 text-xs text-foreground",
                      col.align === "right"
                        ? "text-right tabular-nums"
                        : "text-left",
                    )}
                  >
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Summary Card ────────────────────────────────────────────────────────

interface SummaryCardProps {
  title: string;
  items: Array<{
    label: string;
    value: string;
    trend?: "up" | "down" | "neutral";
  }>;
}

export function SummaryCard({ title, items }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h4 className="text-xs font-semibold text-foreground mb-3">{title}</h4>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-foreground">
                {item.value}
              </span>
              {item.trend === "up" && (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              )}
              {item.trend === "down" && (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alert Card ──────────────────────────────────────────────────────────

interface AlertCardProps {
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

export function AlertCard({ type, title, message, action }: AlertCardProps) {
  const config = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: AlertTriangle,
      iconColor: "text-blue-600",
      titleColor: "text-blue-900",
      msgColor: "text-blue-700",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: AlertTriangle,
      iconColor: "text-amber-600",
      titleColor: "text-amber-900",
      msgColor: "text-amber-700",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: XCircle,
      iconColor: "text-red-600",
      titleColor: "text-red-900",
      msgColor: "text-red-700",
    },
    success: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      titleColor: "text-emerald-900",
      msgColor: "text-emerald-700",
    },
  };

  const c = config[type];
  const Icon = c.icon;

  return (
    <div className={cn("rounded-xl border p-4", c.bg, c.border)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 shrink-0", c.iconColor)} />
        <div className="flex-1">
          <p className={cn("text-sm font-medium", c.titleColor)}>{title}</p>
          <p className={cn("text-xs mt-1", c.msgColor)}>{message}</p>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {action.label}
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Timeline Card ───────────────────────────────────────────────────────

interface TimelineCardProps {
  events: Array<{
    time: string;
    message: string;
    agent?: string;
    type?: "info" | "success" | "warning" | "error";
  }>;
}

export function TimelineCard({ events }: TimelineCardProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        Timeline
      </h4>
      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/50" />
        <div className="space-y-3">
          {events.map((event, idx) => (
            <div key={idx} className="flex gap-3 relative">
              <div
                className={cn(
                  "h-[15px] w-[15px] rounded-full shrink-0 mt-0.5 z-10",
                  event.type === "success"
                    ? "bg-emerald-500"
                    : event.type === "warning"
                      ? "bg-amber-500"
                      : event.type === "error"
                        ? "bg-red-500"
                        : "bg-blue-500",
                )}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {event.time}
                  </span>
                  {event.agent && (
                    <span className="text-[10px] text-muted-foreground">
                      <Bot className="h-2.5 w-2.5 inline mr-0.5" />
                      {event.agent}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground mt-0.5">
                  {event.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
