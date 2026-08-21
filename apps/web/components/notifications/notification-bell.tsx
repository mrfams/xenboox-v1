"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  BellRing,
  Check,
  X,
  Inbox,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { cn } from "@/lib/utils";

// ─── Notification Bell ─────────────────────────────────────────────────────
//
// Header notification bell that shows pending items count and quick actions.
// Clicking opens a dropdown with recent notifications.

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string;
  priority: string;
  createdAt: Date;
};

export function NotificationBell() {
  const { entityId } = useEntity();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Get pending approvals count
  const { data: approvalStats } = trpc.autoApprove.getStats.useQuery(
    undefined,
    {
      enabled: !!entityId,
      refetchInterval: 30000, // Poll every 30 seconds
    },
  );

  const pendingCount = approvalStats?.pendingApprovals ?? 0;

  // Build notifications from real data
  useEffect(() => {
    const notifs: Notification[] = [];

    if (pendingCount > 0) {
      notifs.push({
        id: "approvals",
        type: "approval_needed",
        title: "Approvals Needed",
        body: `${pendingCount} item${pendingCount !== 1 ? "s" : ""} awaiting your approval`,
        actionUrl: "/dashboard/activity-hub",
        priority: "high",
        createdAt: new Date(),
      });
    }

    setNotifications(notifs);
  }, [pendingCount]);

  const handleNotificationClick = (notification: Notification) => {
    window.location.href = notification.actionUrl;
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label={`Notifications${pendingCount > 0 ? ` (${pendingCount} pending)` : ""}`}
      >
        {pendingCount > 0 ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border/60 bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Notifications
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Notifications list */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Check className="h-8 w-8 text-emerald-500/50 mb-2" />
                  <p className="text-sm text-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground">
                    No pending notifications
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full text-left rounded-lg p-3 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            notification.priority === "urgent"
                              ? "bg-red-500/10"
                              : notification.priority === "high"
                                ? "bg-amber-500/10"
                                : "bg-primary/10",
                          )}
                        >
                          {notification.type === "approval_needed" ? (
                            <Inbox className="h-4 w-4 text-primary" />
                          ) : notification.type === "deadline_approaching" ? (
                            <Clock className="h-4 w-4 text-amber-500" />
                          ) : notification.type === "anomaly_detected" ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Sparkles className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/50 px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/dashboard/activity-hub";
                  setIsOpen(false);
                }}
                className="w-full text-center text-xs font-medium text-primary hover:text-primary/80"
              >
                View all activity
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
