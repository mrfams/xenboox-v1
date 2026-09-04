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
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui";

// Mirrors banking.listConnections — timestamps arrive as ISO strings
// (neon-http driver), provider/status are enums.
type Connection = {
  id: string;
  provider: "manual" | "mono" | "plaid" | "stitch";
  institutionName: string;
  accountName: string | null;
  accountNumber: string | null;
  accountType: string | null;
  currency: string;
  status: "pending" | "active" | "error" | "disconnected";
  lastSyncedAt: string | null;
  syncError: string | null;
  createdAt: string;
};

export function BankConnectionCard({ connection }: { connection: Connection }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
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
      setShowDisconnectConfirm(false);
      utils.banking.listConnections.invalidate();
    },
  });

  const handleSync = () => {
    setIsSyncing(true);
    syncMutation.mutate({ connectionId: connection.id });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate({ connectionId: connection.id });
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
      {lastSync && !hasError && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Last synced: {lastSync}
        </p>
      )}

      {connection.syncError && (
        <div className="mt-2 rounded-lg border border-red-500/25 bg-red-500/5 px-2.5 py-2">
          <p className="text-xs font-medium text-red-600">
            {connection.syncError.includes("Reconnect required")
              ? "Reconnect required"
              : "Sync failed"}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-red-500/90">
            {connection.syncError}
          </p>
          {connection.syncError.includes("Reconnect required") ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Your bank requires you to re-authenticate. Disconnect this
              connection and connect it again to resume syncing — past
              transactions stay in your books.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">
              This is usually temporary. Try syncing again — if it keeps
              failing, disconnect and reconnect the connection.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleSync}
          // M1: retry must be possible in place — allow Sync on error so a
          // transient provider failure can recover without disconnect.
          disabled={
            isSyncing ||
            (connection.status !== "active" && connection.status !== "error")
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSyncing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {hasError ? "Retry sync" : "Sync"}
        </button>
        <AlertDialog
          open={showDisconnectConfirm}
          onOpenChange={setShowDisconnectConfirm}
        >
          <AlertDialogTrigger asChild>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/5 transition-colors">
              <Unlink className="h-3 w-3" />
              Disconnect
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Disconnect {connection.institutionName}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Sync will stop for this connection. Past transactions stay in
                your books for the audit trail.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisconnect}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
