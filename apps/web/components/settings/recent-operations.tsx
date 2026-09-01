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
  RotateCcw,
  Trash2,
  Clock,
  Loader2,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { toast } from "sonner";

// ─── Operation Icons ──────────────────────────────────────────────────────────

const OPERATION_ICONS: Record<string, typeof History> = {
  "Onboarding reset": History,
  "All settings reset": Settings,
  "Settings imported": History,
  "Restored from v": RotateCcw,
};

function getOperationIcon(name: string) {
  for (const [key, Icon] of Object.entries(OPERATION_ICONS)) {
    if (name.startsWith(key)) return Icon;
  }
  return AlertTriangle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecentOperations() {
  const { entityId } = useEntity();
  const [isExpanded, setIsExpanded] = useState(false);
  const utils = trpc.useUtils();

  const {
    data: auditData,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.settings.getAuditLog.useQuery(
    { limit: 10, offset: 0 },
    { enabled: !!entityId },
  );
  const restoreVersion = trpc.settings.restoreVersion.useMutation({
    onSuccess: () => {
      toast.success("Settings restored");
      utils.settings.getAuditLog.invalidate();
      window.location.reload();
    },
    onError: (err) => toast.error(err.message || "Restore failed"),
  });

  const operations =
    (
      auditData as unknown as
        | {
            logs?: Array<{
              id: string;
              action: string;
              createdAt: string;
              versionLabel?: string | null;
            }>;
          }
        | undefined
    )?.logs ?? [];

  const handleRestore = async (operation: { id: string }) => {
    try {
      await restoreVersion.mutateAsync({ versionId: operation.id });
    } catch {
      // handled by mutation onError
    }
  };

  const handleClearAll = () => {
    // Audit log is append-only — clear is not supported server-side.
    // We just collapse the panel; real audit retention is via settings_versions prune.
    setIsExpanded(false);
    toast.info("Audit log is append-only and retained per retention policy");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted/50" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-4">
          <p className="text-sm text-destructive">
            Failed to load recent operations
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {String((error as Error)?.message ?? error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-2"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

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
            {operations.map((op) => {
              const Icon = getOperationIcon(op.action);
              return (
                <div
                  key={op.id}
                  className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <Icon
                    className="h-4 w-4 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{op.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(op.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(op)}
                    disabled={restoreVersion.isPending}
                    className="shrink-0"
                  >
                    {restoreVersion.isPending ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-1 h-3 w-3" />
                    )}
                    Undo
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  try {
    const then = new Date(dateStr).getTime();
    if (Number.isNaN(then)) return "—";
    const diffMs = Date.now() - then;
    const locale =
      typeof navigator !== "undefined" ? navigator.language : "en-US";
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const minutes = Math.floor(diffMs / 60_000);
    const hours = Math.floor(diffMs / 3_600_000);
    const days = Math.floor(diffMs / 86_400_000);
    if (minutes < 1) return rtf.format(0, "second");
    if (minutes < 60) return rtf.format(-minutes, "minute");
    if (hours < 24) return rtf.format(-hours, "hour");
    return rtf.format(-days, "day");
  } catch {
    return "—";
  }
}
