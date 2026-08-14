"use client";

import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  Clock,
  Bot,
  Info,
  TrendingUp,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  parseMessage,
  renderMarkdownSimple,
  type RichBlock,
} from "@/lib/chat/message-parser";

// ─── Rich Block Renderer ────────────────────────────────────────────────

function RichBlockRenderer({ block }: { block: RichBlock }) {
  switch (block.type) {
    case "approval":
      return <ApprovalBlockRenderer data={block.data} />;
    case "document":
      return <DocumentBlockRenderer data={block.data} />;
    case "table":
      return <TableBlockRenderer data={block.data} />;
    case "alert":
      return <AlertBlockRenderer data={block.data} />;
    case "summary":
      return <SummaryBlockRenderer data={block.data} />;
    case "timeline":
      return <TimelineBlockRenderer data={block.data} />;
    default:
      return null;
  }
}

// ─── Approval Block ─────────────────────────────────────────────────────

function ApprovalBlockRenderer({ data }: { data: Record<string, unknown> }) {
  const title = String(data.title || "Approval Required");
  const description = data.description ? String(data.description) : undefined;
  const items = Array.isArray(data.items)
    ? (data.items as Array<{ label: string; value: string }>)
    : undefined;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden my-2">
      <div className="px-4 py-3 border-b border-amber-200/50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <p className="text-sm font-medium text-amber-900">
            AI needs your approval
          </p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-amber-800">{title}</p>
        {description && <p className="text-xs text-amber-700">{description}</p>}
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
      <div className="px-4 py-3 border-t border-amber-200/50 bg-white/30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Document Block ─────────────────────────────────────────────────────

function DocumentBlockRenderer({ data }: { data: Record<string, unknown> }) {
  const name = String(data.name || "Document");
  const type = String(data.type || "pdf");
  const size = data.size ? String(data.size) : undefined;
  const agent = data.agent ? String(data.agent) : undefined;

  const typeColors: Record<string, string> = {
    pdf: "bg-red-100 text-red-600",
    excel: "bg-green-100 text-green-600",
    csv: "bg-blue-100 text-blue-600",
    default: "bg-gray-100 text-gray-600",
  };

  const colorClass = typeColors[type.toLowerCase()] || typeColors.default;

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden my-2 hover:shadow-md transition-all">
      <div className="h-24 bg-accent/30 flex items-center justify-center relative group">
        <FileText className="h-10 w-10 text-muted-foreground/30" />
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-white/90 shadow-sm">
          <span className={colorClass}>{type}</span>
        </div>
      </div>
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
      <div className="px-3 pb-3 flex items-center gap-2">
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-[10px] font-medium text-foreground hover:bg-accent transition-colors"
        >
          <Eye className="h-3 w-3" />
          Preview
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Download className="h-3 w-3" />
          Download
        </button>
      </div>
    </div>
  );
}

// ─── Table Block ────────────────────────────────────────────────────────

function TableBlockRenderer({ data }: { data: Record<string, unknown> }) {
  const columns = Array.isArray(data.columns)
    ? (data.columns as Array<{ key: string; label: string; align?: string }>)
    : [];
  const rows = Array.isArray(data.rows)
    ? (data.rows as Array<Record<string, string | number>>)
    : [];
  const caption = data.caption ? String(data.caption) : undefined;

  if (columns.length === 0 && rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden my-2">
      <div className="overflow-x-auto">
        <table className="w-full">
          {caption && (
            <caption className="px-4 py-2 text-xs font-medium text-muted-foreground bg-accent/30 text-left">
              {caption}
            </caption>
          )}
          {columns.length > 0 && (
            <thead>
              <tr className="border-b border-border/50 bg-accent/20">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
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
          )}
          <tbody className="divide-y divide-border/50">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-accent/30 transition-colors">
                {columns.length > 0
                  ? columns.map((col) => (
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
                    ))
                  : Object.values(row).map((val, vi) => (
                      <td
                        key={vi}
                        className="px-4 py-2.5 text-xs text-foreground"
                      >
                        {val}
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

// ─── Alert Block ────────────────────────────────────────────────────────

function AlertBlockRenderer({ data }: { data: Record<string, unknown> }) {
  const type =
    (data.type as "info" | "warning" | "error" | "success") || "info";
  const title = String(data.title || "Notice");
  const message = String(data.message || "");

  const config: Record<
    string,
    {
      bg: string;
      border: string;
      icon: LucideIcon;
      iconColor: string;
      titleColor: string;
      msgColor: string;
    }
  > = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: Info,
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

  const c = config[type] || config.info;
  const Icon = c.icon;

  return (
    <div className={cn("rounded-xl border p-4 my-2", c.bg, c.border)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 shrink-0", c.iconColor)} />
        <div className="flex-1">
          <p className={cn("text-sm font-medium", c.titleColor)}>{title}</p>
          {message && (
            <p className={cn("text-xs mt-1", c.msgColor)}>{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Summary Block ──────────────────────────────────────────────────────

function SummaryBlockRenderer({ data }: { data: Record<string, unknown> }) {
  const title = String(data.title || "Summary");
  const items = Array.isArray(data.items)
    ? (data.items as Array<{
        label: string;
        value: string;
        trend?: "up" | "down" | "neutral";
      }>)
    : [];

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 my-2">
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

// ─── Timeline Block ─────────────────────────────────────────────────────

function TimelineBlockRenderer({ data }: { data: Record<string, unknown> }) {
  const events = Array.isArray(data.events)
    ? (data.events as Array<{
        time: string;
        message: string;
        agent?: string;
        type?: "info" | "success" | "warning" | "error";
      }>)
    : [];

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 my-2">
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

// ─── Markdown Table Renderer ────────────────────────────────────────────

function MarkdownTableRenderer({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  // Pad rows to match header length for consistent rendering
  const paddedRows = rows.map((row) => {
    const padded = [...row];
    while (padded.length < headers.length) {
      padded.push("");
    }
    return padded;
  });

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden my-2">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 bg-accent/20">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {paddedRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-accent/30 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-xs text-foreground">
                    {cell}
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

// ─── Main Rich Message Renderer ─────────────────────────────────────────

export interface RichMessageRendererProps {
  content: string;
  className?: string;
}

export function RichMessageRenderer({
  content,
  className,
}: RichMessageRendererProps) {
  const parsed = parseMessage(content);

  return (
    <div className={cn("space-y-2", className)}>
      {parsed.segments.map((segment, idx) => {
        switch (segment.type) {
          case "text":
            return (
              <div
                key={idx}
                className="text-xs leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownSimple(segment.content),
                }}
              />
            );
          case "rich":
            return <RichBlockRenderer key={idx} block={segment.block} />;
          case "table":
            return (
              <MarkdownTableRenderer
                key={idx}
                headers={segment.headers}
                rows={segment.rows}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
