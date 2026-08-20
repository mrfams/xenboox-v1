"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";
import { History, RotateCcw, Trash2, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type RecentOperation,
  getRecentOperations,
  clearRecentOperations,
} from "@/lib/settings-undo";

// ─── Operation Icons ──────────────────────────────────────────────────────────

const OPERATION_ICONS: Record<string, string> = {
  "Onboarding reset": "🔄",
  "All settings reset": "🗑️",
  "Settings imported": "📥",
  "Restored from v": "⏪",
};

function getOperationIcon(name: string): string {
  for (const [key, icon] of Object.entries(OPERATION_ICONS)) {
    if (name.startsWith(key)) return icon;
  }
  return "⚡";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecentOperations() {
  const [operations, setOperations] = useState<RecentOperation[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setOperations(getRecentOperations());
  }, []);

  const handleRestore = async (operation: RecentOperation) => {
    if (!operation.versionId) {
      // No version ID — fetch latest and restore
      setRestoringId(operation.id);
      try {
        const response = await fetch(
          "/api/trpc/settings.getVersions?input=%7B%22limit%22%3A1%7D",
          {
            headers: { "Content-Type": "application/json" },
          },
        );
        const data = await response.json();
        const latestVersion = data?.result?.data?.[0];

        if (latestVersion) {
          const restoreResponse = await fetch(
            "/api/trpc/settings.restoreVersion",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ json: { versionId: latestVersion.id } }),
            },
          );
          const restoreData = await restoreResponse.json();
          if (restoreData?.result?.data) {
            window.location.reload();
          }
        }
      } catch {
        // Silent fail
      }
      setRestoringId(null);
      return;
    }

    // Restore specific version
    setRestoringId(operation.id);
    try {
      const response = await fetch("/api/trpc/settings.restoreVersion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { versionId: operation.versionId } }),
      });
      const data = await response.json();
      if (data?.result?.data) {
        window.location.reload();
      }
    } catch {
      // Silent fail
    }
    setRestoringId(null);
  };

  const handleClearAll = () => {
    clearRecentOperations();
    setOperations([]);
  };

  if (operations.length === 0) {
    return null; // Don't show panel if no operations
  }

  return (
    <Card>
      <CardHeader>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full"
        >
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Operations
            <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              {operations.length}
            </span>
          </CardTitle>
          {isExpanded ? (
            <History className="h-4 w-4 text-muted-foreground" />
          ) : (
            <History className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Last {operations.length} risky operation
              {operations.length !== 1 ? "s" : ""}. Click undo to restore.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-7 text-xs text-muted-foreground"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Clear
            </Button>
          </div>

          <div className="space-y-2">
            {operations.map((op) => (
              <div
                key={op.id}
                className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
              >
                <span className="text-lg">{getOperationIcon(op.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{op.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(op.timestamp)}
                    {op.versionLabel && (
                      <span className="ml-1">· {op.versionLabel}</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(op)}
                  disabled={restoringId === op.id}
                  className="shrink-0"
                >
                  {restoringId === op.id ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1 h-3 w-3" />
                  )}
                  Undo
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
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
