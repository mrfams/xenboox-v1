"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";
import {
  History,
  ChevronDown,
  ChevronUp,
  Check,
  Laptop,
  Cloud,
  GitMerge,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { getStrategyLabel, type MergeStrategy } from "@/lib/merge-strategies";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConflictEntry = {
  id: string;
  strategy: string;
  conflictCount: number;
  conflicts: Array<{
    path: string;
    localValue?: unknown;
    remoteValue?: unknown;
  }> | null;
  resolvedValues: Array<{
    path: string;
    resolvedValue?: unknown;
    resolvedBy: string;
  }> | null;
  localUpdatedAt: string | null;
  remoteUpdatedAt: string | null;
  deviceInfo: {
    userAgent?: string;
    screen?: string;
    language?: string;
  } | null;
  createdAt: string | null;
};

// ─── Strategy Colors ──────────────────────────────────────────────────────────

const STRATEGY_COLORS: Record<string, string> = {
  "last-write-wins":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "local-wins":
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "remote-wins":
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "deep-merge":
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  manual: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ConflictResolutionHistory() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const { data: history, isLoading } =
    trpc.settings.getConflictHistory.useQuery(
      { limit: 10 },
      { enabled: isExpanded },
    );

  return (
    <Card>
      <CardHeader>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full"
        >
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-4 w-4" />
            Conflict Resolution History
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
            Shows how past settings conflicts between devices were resolved.
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <GitMerge className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No conflicts resolved yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Conflicts appear when settings are modified on multiple devices
                simultaneously.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <ConflictHistoryEntry
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedEntry === entry.id}
                  onToggle={() =>
                    setExpandedEntry(
                      expandedEntry === entry.id ? null : entry.id,
                    )
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Conflict History Entry ───────────────────────────────────────────────────

function ConflictHistoryEntry({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: ConflictEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const timeAgo = entry.createdAt ? formatTimeAgo(entry.createdAt) : "Unknown";
  const strategyColor =
    STRATEGY_COLORS[entry.strategy] || "bg-muted text-muted-foreground";

  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {/* Strategy badge */}
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
            strategyColor,
          )}
        >
          {getStrategyLabel(entry.strategy as MergeStrategy)}
        </span>

        {/* Conflict count */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <AlertTriangle className="h-3 w-3" />
          <span>
            {entry.conflictCount} conflict{entry.conflictCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Time */}
        <span className="text-xs text-muted-foreground ml-auto">{timeAgo}</span>

        {/* Expand icon */}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t p-3 space-y-3">
          {/* Conflict details */}
          {entry.conflicts && entry.conflicts.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Conflicting fields:
              </p>
              {entry.conflicts.map((conflict, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded border bg-background px-2 py-1 text-xs"
                >
                  <span className="font-mono">{conflict.path}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Laptop className="h-3 w-3" />
                      {String(conflict.localValue)}
                    </span>
                    <span>→</span>
                    <span className="flex items-center gap-1">
                      <Cloud className="h-3 w-3" />
                      {String(conflict.remoteValue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolution details */}
          {entry.resolvedValues && entry.resolvedValues.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Resolved values:
              </p>
              {entry.resolvedValues.map((resolved, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs dark:border-emerald-800 dark:bg-emerald-950"
                >
                  <span className="font-mono">{resolved.path}</span>
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                    {String(resolved.resolvedValue)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Device info */}
          {entry.deviceInfo && (
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              {entry.localUpdatedAt && (
                <span>Local: {formatTimeAgo(entry.localUpdatedAt)}</span>
              )}
              {entry.remoteUpdatedAt && (
                <span>Remote: {formatTimeAgo(entry.remoteUpdatedAt)}</span>
              )}
              {entry.deviceInfo.screen && (
                <span>Screen: {entry.deviceInfo.screen}</span>
              )}
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
