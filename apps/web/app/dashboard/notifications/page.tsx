"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  Inbox,
  CheckCheck,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useNotificationMutations } from "@/lib/hooks/use-notification-mutations";

type Filter = "all" | "unread";

type NotificationRow = {
  id: string;
  type: string;
  priority: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date | string | null;
};

// Priority → icon chip treatment. Follows the design language of the Work
// page's stat cards (soft tinted square + colored icon).
const PRIORITY_STYLES: Record<
  string,
  { chip: string; icon: typeof Bell; label: string }
> = {
  critical: {
    chip: "bg-red-100 text-red-600",
    icon: AlertTriangle,
    label: "Critical",
  },
  high: {
    chip: "bg-amber-100 text-amber-600",
    icon: AlertTriangle,
    label: "High priority",
  },
  medium: {
    chip: "bg-primary/10 text-primary",
    icon: Bell,
    label: "Notification",
  },
  low: {
    chip: "bg-slate-100 text-slate-500",
    icon: Bell,
    label: "Low priority",
  },
};

function priorityStyle(priority: string) {
  return (
    PRIORITY_STYLES[priority] ?? {
      chip: "bg-primary/10 text-primary",
      icon: Bell,
      label: "Notification",
    }
  );
}

function formatTimeAgo(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function NotificationsPage() {
  const { entityId, isLoaded } = useEntity();
  const enabled = isLoaded && !!entityId;
  const [filter, setFilter] = useState<Filter>("unread");

  const utils = trpc.useUtils();

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(
    undefined,
    {
      enabled,
      staleTime: 15 * 1000,
      refetchOnWindowFocus: true,
      refetchInterval: 30 * 1000,
    },
  );

  const { data: notifications } = trpc.notifications.list.useQuery(
    { limit: 100, onlyUnread: filter === "unread" },
    {
      enabled,
      staleTime: 15 * 1000,
      refetchOnWindowFocus: true,
      refetchInterval: 30 * 1000,
    },
  );

  // Shared optimistic mutations — same cache keys as the top-nav badge, so a
  // mark-read here decrements the bell in this tab instantly.
  const { markRead, markAllRead, deleteNotif } = useNotificationMutations();

  const items = notifications ?? [];
  const unreadTotal = unreadCount?.count ?? 0;

  /** The page's own list cache key — matches the query above exactly. */
  function pageListKey() {
    return { limit: 100, onlyUnread: filter === "unread" } as const;
  }

  function handleMarkRead(row: NotificationRow) {
    // Optimistically update the page list too: remove it from the Unread tab,
    // restyle it in the All tab. The shared mutation handles the badge + the
    // shared dropdown caches.
    const list = utils.notifications.list.getData(pageListKey());
    if (list) {
      utils.notifications.list.setData(
        pageListKey(),
        list.map((n) => (n.id === row.id ? { ...n, read: true } : n)),
      );
    }
    markRead.mutate({ id: row.id });
  }

  function handleDelete(row: NotificationRow) {
    const list = utils.notifications.list.getData(pageListKey());
    if (list) {
      utils.notifications.list.setData(
        pageListKey(),
        list.filter((n) => n.id !== row.id),
      );
    }
    deleteNotif.mutate({ id: row.id });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            {unreadTotal > 0
              ? `${unreadTotal} unread notification${unreadTotal === 1 ? "" : "s"}`
              : "You're all caught up"}
          </p>
        </div>
        {unreadTotal > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <CheckCheck className="h-4 w-4 text-primary" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex w-fit rounded-lg border border-border bg-card p-0.5">
        {(
          [
            { id: "unread", label: "Unread" },
            { id: "all", label: "All" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            aria-pressed={filter === tab.id}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              filter === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">
            {filter === "unread" ? "You're all caught up!" : "No notifications"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === "unread"
              ? "New alerts will appear here the moment they land."
              : "Notifications from your agents and accounting workflow will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((row) => {
            const style = priorityStyle(row.priority);
            const Icon = style.icon;
            return (
              <div
                key={row.id}
                onClick={() => !row.read && handleMarkRead(row)}
                role={row.read ? undefined : "button"}
                tabIndex={row.read ? undefined : 0}
                onKeyDown={
                  row.read
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleMarkRead(row);
                        }
                      }
                }
                className={cn(
                  "group relative rounded-xl border bg-card p-4 transition-all",
                  row.read
                    ? "border-border/50 hover:border-border"
                    : "border-primary/30 shadow-sm hover:shadow-md cursor-pointer",
                )}
              >
                {/* Unread accent — indigo, matching the bell badge */}
                {!row.read && (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-primary"
                  />
                )}
                <div className="flex items-start gap-3 pl-1">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      style.chip,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-sm text-foreground",
                          row.read ? "font-normal" : "font-semibold",
                        )}
                      >
                        {row.title}
                      </p>
                      {!row.read && (
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.body}
                    </p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                      {style.label} · {formatTimeAgo(row.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {!row.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(row);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(row);
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer — back into the work stream */}
      <div className="flex items-center justify-end">
        <Link
          href="/dashboard/work?tab=notifications"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Open in Work center <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
