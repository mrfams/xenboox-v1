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
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertCircle,
  Wifi,
  WifiOff,
  ArrowDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type RealTimeSyncIndicatorProps = {
  isCloudEnabled: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  hasRemoteChanges: boolean;
  remoteUpdatedAt: string | null;
  onForceSync?: () => void;
  onAcceptRemote?: () => void;
  onDismissRemote?: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RealTimeSyncIndicator({
  isCloudEnabled,
  isSyncing,
  lastSyncedAt,
  error,
  hasRemoteChanges,
  remoteUpdatedAt,
  onForceSync,
  onAcceptRemote,
  onDismissRemote,
}: RealTimeSyncIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Main sync status */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <>
              <WifiOff className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-amber-600">
                Offline — changes will sync when reconnected
              </span>
            </>
          ) : error ? (
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
          ) : !isCloudEnabled ? (
            <>
              <CloudOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Sign in to sync settings across devices
              </span>
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">
                {lastSyncedAt
                  ? `Synced ${formatTime(lastSyncedAt)}`
                  : "Connected — real-time sync active"}
              </span>
            </>
          )}
        </div>

        {/* Sync status dots */}
        {isCloudEnabled && isOnline && (
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-muted-foreground">Live</span>
          </div>
        )}

        {/* Force sync button */}
        {onForceSync && isCloudEnabled && isOnline && !isSyncing && (
          <button
            onClick={onForceSync}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Force sync settings"
          >
            Sync now
          </button>
        )}
      </div>

      {/* Remote changes notification */}
      {hasRemoteChanges && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Settings updated on another device
              </span>
            </div>
            <button
              onClick={onDismissRemote}
              className="text-blue-400 hover:text-blue-600 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {remoteUpdatedAt && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Last updated {formatTime(remoteUpdatedAt)}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onAcceptRemote}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Check className="mr-1 h-3 w-3" />
              Apply changes
            </Button>
            <Button size="sm" variant="outline" onClick={onDismissRemote}>
              Ignore
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString();
}
