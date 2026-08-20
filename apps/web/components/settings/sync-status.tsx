"use client";

import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SyncStatusProps = {
  isCloudEnabled: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  onForceSync?: () => void;
};

export function SyncStatus({
  isCloudEnabled,
  isSyncing,
  lastSyncedAt,
  error,
  onForceSync,
}: SyncStatusProps) {
  if (!isCloudEnabled) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <CloudOff className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Cloud sync unavailable — sign in to sync settings across devices
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2">
        {error ? (
          <>
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs text-destructive">
              Sync error: {error}
            </span>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="h-4 w-4 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">Syncing...</span>
          </>
        ) : (
          <>
            <Cloud className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">
              {lastSyncedAt
                ? `Last synced: ${formatTime(lastSyncedAt)}`
                : "Synced to cloud"}
            </span>
          </>
        )}
      </div>
      {onForceSync && !isSyncing && (
        <button
          onClick={onForceSync}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Force sync settings"
        >
          Sync now
        </button>
      )}
    </div>
  );
}

function formatTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString();
}
