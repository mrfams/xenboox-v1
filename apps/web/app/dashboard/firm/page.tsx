"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from "@/components/ui";
import { Skeleton } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Building2,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  RefreshCw,
  ArrowUpRight,
  ExternalLink,
  FileText,
  Wallet,
} from "lucide-react";

// ─── Health Badge ──────────────────────────────────────────────────────

function HealthBadge({
  status,
}: {
  status: "healthy" | "needs_review" | "critical" | "unknown";
}) {
  const config = {
    healthy: {
      label: "Healthy",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
      icon: CheckCircle2,
    },
    needs_review: {
      label: "Needs Review",
      className: "bg-amber-500/10 text-amber-600 border-amber-200",
      icon: Clock,
    },
    critical: {
      label: "Critical",
      className: "bg-red-500/10 text-red-600 border-red-200",
      icon: AlertCircle,
    },
    unknown: {
      label: "Unknown",
      className: "bg-muted text-muted-foreground border-border",
      icon: AlertCircle,
    },
  };

  const c = config[status];
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={cn("gap-1.5 px-2.5 py-1", c.className)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

// ─── Add Client Dialog ─────────────────────────────────────────────────

function AddClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [engagementType, setEngagementType] = useState("full");
  const [clientConsented, setClientConsented] = useState(false);

  const { data: availableEntities, isLoading } =
    trpc.firm.listAvailableEntities.useQuery(
      { search: search || undefined },
      { enabled: open },
    );

  const linkClient = trpc.firm.linkClient.useMutation({
    onSuccess: () => {
      toast.success("Client linked successfully");
      utils.firm.listClients.invalidate();
      onOpenChange(false);
      setSelectedEntityId("");
      setSearch("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!selectedEntityId) return;
    linkClient.mutate({
      clientEntityId: selectedEntityId,
      engagementType: engagementType as
        "full" | "review" | "tax_only" | "audit_only",
      clientConsented,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search entities</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by entity name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !availableEntities || availableEntities.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {search
                ? "No entities match your search"
                : "No available entities to link. Create a new entity first."}
            </div>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border">
              {availableEntities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => setSelectedEntityId(entity.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    selectedEntityId === entity.id && "bg-accent font-medium",
                  )}
                >
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{entity.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {entity.currency}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedEntityId && (
            <>
              <div className="space-y-2">
                <Label>Engagement type</Label>
                <Select
                  value={engagementType}
                  onValueChange={setEngagementType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full accounting</SelectItem>
                    <SelectItem value="review">Review only</SelectItem>
                    <SelectItem value="tax_only">Tax only</SelectItem>
                    <SelectItem value="audit_only">Audit only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={clientConsented}
                  onChange={(e) => setClientConsented(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="consent" className="text-sm font-normal">
                  Client consent obtained
                </Label>
              </div>
            </>
          )}

          <Button
            className="w-full"
            disabled={!selectedEntityId || linkClient.isPending}
            onClick={handleSubmit}
          >
            {linkClient.isPending ? "Linking..." : "Link Client"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Firm Dashboard Page ─────────────────────────────────────────

export default function FirmDashboardPage() {
  const { entityId } = useEntity();
  const router = useRouter();
  const [showAddClient, setShowAddClient] = useState(false);

  const { data, isLoading, error, refetch } = trpc.firm.listClients.useQuery(
    { status: "active" },
    { enabled: !!entityId },
  );

  const refreshSnapshot = trpc.firm.refreshSnapshot.useMutation({
    onSuccess: () => {
      toast.success("Dashboard snapshot refreshed");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-10 w-10 text-destructive" />}
        title="Failed to load firm dashboard"
        description={error.message}
        action={
          <Button onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        }
      />
    );
  }

  const firms = data?.firms ?? [];
  const clients = data?.clients ?? [];

  const criticalCount = clients.filter(
    (c) => c.snapshot?.healthStatus === "critical",
  ).length;
  const needsReviewCount = clients.filter(
    (c) => c.snapshot?.healthStatus === "needs_review",
  ).length;
  const healthyCount = clients.filter(
    (c) => c.snapshot?.healthStatus === "healthy",
  ).length;

  if (firms.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="h-10 w-10" />}
        title="Not an accounting firm"
        description="This dashboard is available for accounting firm organizations. Create or switch to a firm account to manage clients."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {firms[0]?.name ?? "Firm Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clients.length} active client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddClient(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Client
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{healthyCount}</p>
              <p className="text-xs text-muted-foreground">Healthy clients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{needsReviewCount}</p>
              <p className="text-xs text-muted-foreground">Need review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Clients
            </CardTitle>
            <Badge variant="secondary">{clients.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No clients yet"
              description="Add your first client to start managing their accounting from this dashboard."
              action={
                <Button size="sm" onClick={() => setShowAddClient(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Client
                </Button>
              }
              className="py-8"
            />
          ) : (
            <div className="divide-y">
              {clients.map((client) => (
                <div
                  key={client.engagementId}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  {/* Entity info */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/firm/clients/${client.entity.id}`}
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      {client.entity.name}
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {client.entity.currency} · {client.entity.country}
                    </p>
                  </div>

                  {/* Health badge */}
                  <div className="hidden sm:block">
                    <HealthBadge
                      status={
                        (client.snapshot?.healthStatus ?? "unknown") as
                          "healthy" | "needs_review" | "critical" | "unknown"
                      }
                    />
                  </div>

                  {/* Key metrics */}
                  {client.snapshot && (
                    <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {client.snapshot.overdueInvoices}
                        </p>
                        <p>Overdue</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {client.snapshot.unreconciledItems}
                        </p>
                        <p>Unreconciled</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {formatCurrency(client.snapshot.cashBalance)}
                        </p>
                        <p>Cash</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Refresh snapshot"
                      onClick={() =>
                        refreshSnapshot.mutate({
                          clientEntityId: client.entity.id,
                        })
                      }
                      disabled={refreshSnapshot.isPending}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Link href={`/dashboard/firm/clients/${client.entity.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                      >
                        Open <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <AddClientDialog open={showAddClient} onOpenChange={setShowAddClient} />
    </div>
  );
}
