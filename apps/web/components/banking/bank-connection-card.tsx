"use client";

import {
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";

type Connection = {
  id: string;
  provider: string;
  institutionName: string;
  accountName: string | null;
  accountNumber: string | null;
  accountType: string | null;
  currency: string;
  status: string;
  lastSyncedAt: Date | null;
  syncError: string | null;
  createdAt: Date;
};

export function BankConnectionCard({ connection }: { connection: Connection }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const utils = trpc.useUtils();

  const syncMutation = trpc.integrations.syncBankTransactions.useMutation({
    onSuccess: () => {
      setIsSyncing(false);
      utils.banking.listConnections.invalidate();
      utils.banking.listTransactions.invalidate();
    },
    onError: () => {
      setIsSyncing(false);
    },
  });

  const disconnectMutation = trpc.integrations.disconnectBank.useMutation({
    onSuccess: () => {
      utils.banking.listConnections.invalidate();
    },
  });

  const handleSync = () => {
    setIsSyncing(true);
    syncMutation.mutate({ connectionId: connection.id });
  };

  const handleDisconnect = () => {
    if (confirm(`Disconnect ${connection.institutionName}?`)) {
      disconnectMutation.mutate({ connectionId: connection.id });
    }
  };

  const isActive = connection.status === "active";
  const hasError = connection.status === "error";
  const lastSync = connection.lastSyncedAt
    ? new Date(connection.lastSyncedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-all",
        isActive
          ? "border-border/50 hover:border-border/80"
          : hasError
            ? "border-red-500/30"
            : "border-border/50",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isActive
                ? "bg-emerald-500/10"
                : hasError
                  ? "bg-red-500/10"
                  : "bg-muted/30",
            )}
          >
            <Landmark
              className={cn(
                "h-5 w-5",
                isActive
                  ? "text-emerald-500"
                  : hasError
                    ? "text-red-500"
                    : "text-muted-foreground",
              )}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {connection.institutionName}
            </p>
            <p className="text-xs text-muted-foreground">
              {connection.accountName || "Connected account"}
              {connection.accountNumber && ` · ${connection.accountNumber}`}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
            isActive
              ? "bg-emerald-500/10 text-emerald-600"
              : hasError
                ? "bg-red-500/10 text-red-600"
                : "bg-muted/50 text-muted-foreground",
          )}
        >
          {isActive ? (
            <CheckCircle2 className="h-2.5 w-2.5" />
          ) : hasError ? (
            <AlertTriangle className="h-2.5 w-2.5" />
          ) : (
            <Clock className="h-2.5 w-2.5" />
          )}
          {connection.status}
        </div>
      </div>

      {/* Last Sync */}
      {lastSync && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Last synced: {lastSync}
        </p>
      )}

      {connection.syncError && (
        <p className="mt-1 text-[10px] text-red-500">{connection.syncError}</p>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleSync}
          disabled={isSyncing || !isActive}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSyncing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Sync
        </button>
        <button
          onClick={handleDisconnect}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/5 transition-colors"
        >
          <Unlink className="h-3 w-3" />
          Disconnect
        </button>
      </div>
    </div>
  );
}
