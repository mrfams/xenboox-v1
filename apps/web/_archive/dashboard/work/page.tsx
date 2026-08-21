"use client";

import { useState } from "react";
import {
  Inbox,
  FileCheck,
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";

// ─── Notifications Tab Component ─────────────────────────────────────────

function NotificationsTab({ entityId }: { entityId: string | null }) {
  const { data: notifications } = trpc.notifications.list.useQuery(
    { limit: 10, onlyUnread: false },
    { enabled: !!entityId },
  );

  function formatTimeAgo(date: Date | string | null): string {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  }

  const items = notifications ?? [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border/50">
        <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-foreground">No notifications</p>
        <p className="text-xs text-muted-foreground mt-1">
          You're all caught up!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((notification) => (
        <div
          key={notification.id}
          className="rounded-xl border border-border/50 bg-card p-4 hover:shadow-sm transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {notification.body}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-2">
                {formatTimeAgo(notification.createdAt)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const workTabs = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "approvals", label: "Approvals", icon: FileCheck },
  { id: "tasks", label: "Tasks", icon: Clock },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function WorkPage() {
  const { entityId } = useEntity();
  const [activeTab, setActiveTab] = useState("inbox");

  // Fetch pending approvals
  const { data: approvalsData } = trpc.aiWorkspace.getPendingApprovals.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  // Fetch agent stats for pending items
  const { data: stats } = trpc.ingestion.getStats.useQuery(undefined, {
    refetchInterval: 60000,
    enabled: !!entityId,
  });

  const pendingApprovals = approvalsData?.approvals ?? [];
  const pendingReview = stats?.pendingReview ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Work
          </h1>
          <p className="text-sm text-muted-foreground">
            Everything requiring your attention — approvals, reviews, and tasks.
          </p>
        </div>
        <AiSimulationTrigger
          traceId="approval-pre-review"
          label="AI Pre-Review"
          variant="outline"
          className="shrink-0"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {pendingReview}
              </p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <FileCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {pendingApprovals.length}
              </p>
              <p className="text-xs text-muted-foreground">Approvals</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats?.autoPosted ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Auto-Posted</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats?.failed ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50">
        {workTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground",
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {/* Inbox Tab */}
        {activeTab === "inbox" && (
          <div className="space-y-3">
            {pendingReview === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border/50">
                <Inbox className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Inbox is empty
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  No items requiring your attention
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-border/50 bg-card p-4 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                      <FileCheck className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Document Processing Review
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pendingReview} documents need OCR verification
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                      <RefreshCw className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Bank Reconciliation Exceptions
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pendingReview} documents need attention
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === "approvals" && (
          <div className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border/50">
                <CheckCircle2 className="h-12 w-12 text-emerald-500/30 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  All caught up!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  No pending approvals
                </p>
              </div>
            ) : (
              pendingApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="rounded-xl border border-border/50 bg-card p-4 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <FileCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {approval.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {approval.description}
                      </p>
                      {approval.amount && (
                        <p className="text-sm font-medium text-foreground mt-2">
                          {approval.amount}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <button className="flex-1 h-9 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors">
                      Approve
                    </button>
                    <button className="flex-1 h-9 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-accent transition-colors">
                      Review
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Month-End Close
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Close June 2026 books
                  </p>
                  <div className="mt-3">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: "65%" }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      65% complete
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Payroll Processing
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Run July payroll for 24 employees
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <NotificationsTab entityId={entityId} />
        )}
      </div>
    </div>
  );
}
