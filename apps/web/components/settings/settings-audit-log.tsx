"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";
import {
  History,
  RefreshCw,
  Check,
  Replace,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditEntry = {
  id: string;
  action: string;
  category: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string | null;
};

// ─── Action Config ────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  create: { label: "Created", icon: Check, color: "text-emerald-500" },
  update: { label: "Updated", icon: RefreshCw, color: "text-blue-500" },
  replace: { label: "Replaced", icon: Replace, color: "text-amber-500" },
  reset_all: { label: "Reset All", icon: Trash2, color: "text-destructive" },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function SettingsAuditLog() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 10;

  const { data: logs, isLoading } = trpc.settings.getAuditLog.useQuery(
    { limit, offset: page * limit },
    { enabled: isExpanded },
  );

  const hasMore = logs?.length === limit;

  return (
    <Card>
      <CardHeader>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full"
        >
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Settings Audit Log
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Track all changes to your settings across devices.
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No settings changes yet
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {logs.map((log) => (
                  <AuditLogEntry key={log.id} log={log} />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Audit Log Entry ──────────────────────────────────────────────────────────

function AuditLogEntry({ log }: { log: AuditEntry }) {
  const [showDetails, setShowDetails] = useState(false);
  const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.update;
  const Icon = config.icon;

  const timeAgo = log.createdAt ? formatTimeAgo(log.createdAt) : "Unknown";

  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-3 w-full p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
        {showDetails ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {showDetails && (
        <div className="border-t p-3 space-y-2 bg-background">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="font-medium text-muted-foreground">Action</p>
              <p>{log.action}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Category</p>
              <p>{log.category}</p>
            </div>
          </div>

          {log.previousValue && Object.keys(log.previousValue).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Previous
              </p>
              <pre className="rounded bg-muted p-2 text-[10px] overflow-x-auto max-h-32 overflow-y-auto">
                {JSON.stringify(log.previousValue, null, 2)}
              </pre>
            </div>
          )}

          {log.newValue && Object.keys(log.newValue).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                New
              </p>
              <pre className="rounded bg-muted p-2 text-[10px] overflow-x-auto max-h-32 overflow-y-auto">
                {JSON.stringify(log.newValue, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
