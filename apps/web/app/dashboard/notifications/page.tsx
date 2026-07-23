"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  CheckCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, Badge } from "@/components/ui";

const priorityIcons: Record<string, React.ReactNode> = {
  high: <AlertTriangle className="h-4 w-4 text-destructive" />,
  medium: <Info className="h-4 w-4 text-amber-500" />,
  low: <Info className="h-4 w-4 text-blue-500" />,
};

export default function NotificationsPage() {
  const [tab, setTab] = useState<"all" | "unread">("all");

  const {
    data: all,
    isLoading,
    refetch,
  } = trpc.notifications.list.useQuery({
    limit: 100,
    onlyUnread: tab === "unread",
  });
  const markRead = trpc.notifications.markAsRead.useMutation();
  const markAllRead = trpc.notifications.markAllAsRead.useMutation();
  const deleteNotification = trpc.notifications.delete.useMutation();

  function handleMarkRead(id: string) {
    markRead.mutate(
      { id },
      {
        onSuccess: () => refetch(),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleDelete(id: string) {
    deleteNotification.mutate(
      { id },
      {
        onSuccess: () => refetch(),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleMarkAll() {
    markAllRead.mutate(undefined, {
      onSuccess: () => refetch(),
      onError: (err) => toast.error(err.message),
    });
  }

  const items = all ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Your latest alerts and updates"
        badge={
          items.some((n) => !n.read) ? (
            <Badge variant="secondary" className="gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
              {items.filter((n) => !n.read).length} unread
            </Badge>
          ) : null
        }
      />

      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-1">
              Unread
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {items.some((n) => !n.read) && (
          <button
            onClick={handleMarkAll}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 w-full animate-pulse rounded-lg border bg-muted/50"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">No notifications</p>
            <p className="text-xs text-muted-foreground">
              We&apos;ll alert you when something needs your attention.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors",
                !n.read && "border-primary/50",
              )}
            >
              <div className="mt-0.5 shrink-0">
                {priorityIcons[n.priority ?? "low"]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      !n.read && "text-foreground",
                      n.read && "text-muted-foreground",
                    )}
                  >
                    {n.title}
                  </p>
                  {!n.read && (
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {n.body}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {formatDateTime(n.createdAt)}
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-1">
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-accent"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Read
                  </button>
                )}
                <button
                  onClick={() => handleDelete(n.id)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3.5 w-3.5" />
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
