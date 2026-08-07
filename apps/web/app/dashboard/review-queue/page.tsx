"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@xenboox/ui";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Inbox,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

type Tab = "all" | "pending" | "escalated" | "resolved";

const TAB_CONFIG: Record<Tab, { label: string; icon: React.ElementType }> = {
  all: { label: "All", icon: Inbox },
  pending: { label: "Pending", icon: Clock },
  escalated: { label: "Escalated", icon: ShieldAlert },
  resolved: { label: "Resolved", icon: CheckCircle2 },
};

export default function ReviewQueuePage() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  // Use the dashboard's pending approvals + escalations as a lightweight
  // review queue. The admin review-queue router is admin-only, so we surface
  // entity-scoped review items from the dashboard endpoint instead.
  const dashboardQuery = trpc.dashboard.getDashboardData.useQuery();

  const data = dashboardQuery.data;
  const pendingApprovals = data?.pendingApprovals ?? [];
  const isLoading = dashboardQuery.isLoading;

  // Filter items by tab
  const filteredItems = pendingApprovals.filter((item) => {
    if (activeTab === "pending") return item.status === "pending";
    if (activeTab === "escalated") return item.status === "review";
    if (activeTab === "resolved") return false; // No resolved items from dashboard
    return true; // "all"
  });

  // Filter by search
  const searchFiltered = search
    ? filteredItems.filter(
        (item) =>
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(search.toLowerCase()),
      )
    : filteredItems;

  const counts = {
    all: pendingApprovals.length,
    pending: pendingApprovals.filter((i) => i.status === "pending").length,
    escalated: pendingApprovals.filter((i) => i.status === "review").length,
    resolved: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-sm text-muted-foreground">
            Items requiring your attention — approvals, escalations, and flagged
            transactions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => dashboardQuery.refetch()}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{counts.pending}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Escalated</p>
                <p className="text-2xl font-bold">{counts.escalated}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <ShieldAlert className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{counts.all}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Inbox className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{counts.resolved}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
          <TabsList>
            {Object.entries(TAB_CONFIG).map(([key, config]) => (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                <config.icon className="h-3.5 w-3.5" />
                {config.label}
                {counts[key as Tab] > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 text-xs"
                  >
                    {counts[key as Tab]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 sm:w-64"
          />
        </div>
      </div>

      {/* Items List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : searchFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="mt-4 text-sm font-medium">All clear!</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                No items need your review right now.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {searchFiltered.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      item.status === "review"
                        ? "bg-red-500/10"
                        : "bg-amber-500/10"
                    }`}
                  >
                    {item.status === "review" ? (
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.subtitle}
                    </p>
                  </div>
                  <Badge
                    variant={
                      item.status === "review" ? "destructive" : "outline"
                    }
                    className="shrink-0"
                  >
                    {item.status === "review" ? "Escalated" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
