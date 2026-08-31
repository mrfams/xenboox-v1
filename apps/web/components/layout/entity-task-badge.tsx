"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useEntity } from "@/lib/entity-context";
import {
  getOtherEntityTaskCounts,
  subscribeTaskChanges,
  type EntityTask,
} from "@/lib/entity-task-tracker";
import { cn } from "@/lib/utils";

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Tracks task counts on OTHER entities so the entity switcher can show badges.
 * Re-checks on mount, on entity switch, and when cross-tab broadcasts arrive.
 */
export function useOtherEntityTasks() {
  const { entityId } = useEntity();
  const [otherCounts, setOtherCounts] = useState<
    Record<string, { running: number; completed: number }>
  >({});

  const refresh = useCallback(() => {
    if (!entityId) return;
    setOtherCounts(getOtherEntityTaskCounts(entityId));
  }, [entityId]);

  // Refresh on entity change
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh on cross-tab broadcasts
  useEffect(() => {
    return subscribeTaskChanges(() => {
      refresh();
    });
  }, [refresh]);

  // Poll every 15 seconds for server-side changes
  useEffect(() => {
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return otherCounts;
}

// ─── Badge Component ────────────────────────────────────────────────────────

/**
 * Small badge showing task status for a specific entity.
 * Renders nothing if no tasks are running/completed.
 */
export function EntityTaskBadge({
  entityId,
  otherCounts,
}: {
  entityId: string;
  otherCounts: Record<string, { running: number; completed: number }>;
}) {
  const counts = otherCounts[entityId];
  if (!counts || (counts.running === 0 && counts.completed === 0)) return null;

  return (
    <span className="inline-flex items-center gap-1 ml-auto">
      {counts.running > 0 && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
          )}
          title={`${counts.running} task${counts.running > 1 ? "s" : ""} running`}
        >
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          {counts.running}
        </span>
      )}
      {counts.completed > 0 && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
          )}
          title={`${counts.completed} task${counts.completed > 1 ? "s" : ""} completed`}
        >
          <CheckCircle2 className="h-2.5 w-2.5" />
          {counts.completed}
        </span>
      )}
    </span>
  );
}

// ─── Toast Notification ─────────────────────────────────────────────────────

/**
 * Shows a toast-like notification when tasks complete on other entities.
 * Used in the dashboard layout to notify users who switched entities.
 */
export function EntityTaskNotifier() {
  const { entityId } = useEntity();
  const [notification, setNotification] = useState<{
    entityName: string;
    task: EntityTask;
  } | null>(null);

  useEffect(() => {
    return subscribeTaskChanges((broadcast) => {
      if (broadcast.kind === "completed" && broadcast.task.entityId !== entityId) {
        // Show notification for completed tasks on other entities
        setNotification({
          entityName: broadcast.task.entityId, // Would need entity name lookup
          task: broadcast.task,
        });

        // Auto-dismiss after 5 seconds
        setTimeout(() => setNotification(null), 5000);
      }
    });
  }, [entityId]);

  if (!notification) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Task completed</p>
            <p className="text-xs text-muted-foreground truncate">
              {notification.task.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
