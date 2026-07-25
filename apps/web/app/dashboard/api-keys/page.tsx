"use client";

import { useState } from "react";
import {
  KeyRound,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Activity,
  Copy,
  Webhook,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";

// ─── Status Badge ──────────────────────────────────────────────────────────

function KeyStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    active: {
      label: "Active",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    },
    revoked: {
      label: "Revoked",
      className: "bg-red-500/10 text-red-600 border-red-200",
    },
    expired: {
      label: "Expired",
      className: "bg-amber-500/10 text-amber-600 border-amber-200",
    },
  };
  const v = variants[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", v.className)}>
      {v.label}
    </Badge>
  );
}

function WebhookStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    active: {
      label: "Active",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    },
    paused: {
      label: "Paused",
      className: "bg-amber-500/10 text-amber-600 border-amber-200",
    },
    disabled: {
      label: "Disabled",
      className: "bg-muted text-muted-foreground border-border",
    },
  };
  const v = variants[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", v.className)}>
      {v.label}
    </Badge>
  );
}

// ─── Create API Key Dialog ──────────────────────────────────────────────

function CreateApiKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (key: string) => void;
}) {
  const [name, setName] = useState("");
  const [roleScope, setRoleScope] = useState("standard");
  const [scopes, setScopes] = useState<
    Array<{ resource: string; permission: string }>
  >([{ resource: "transactions", permission: "read" }]);

  const createKey = trpc.apiPlatform.createApiKey.useMutation({
    onSuccess: (data) => {
      onCreated(data.apiKey);
      onOpenChange(false);
      setName("");
      setScopes([{ resource: "transactions", permission: "read" }]);
    },
  });

  const addScope = () => {
    setScopes([...scopes, { resource: "invoices", permission: "read" }]);
  };

  const updateScope = (index: number, field: string, value: string) => {
    const updated = [...scopes];
    updated[index] = { ...updated[index], [field]: value };
    setScopes(updated);
  };

  const removeScope = (index: number) => {
    setScopes(scopes.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createKey.mutate({
      name: name.trim(),
      scopes: scopes.map((s) => ({
        resource: s.resource as any,
        permission: s.permission as any,
      })),
      roleScope: roleScope as any,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Key Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production API Key"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Role Scope</Label>
            <select
              value={roleScope}
              onChange={(e) => setRoleScope(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="read_only">Read Only</option>
              <option value="standard">Standard (Read + Write)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Scopes</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addScope}
              >
                <Plus className="mr-1 h-3 w-3" /> Add Scope
              </Button>
            </div>
            {scopes.map((scope, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={scope.resource}
                  onChange={(e) => updateScope(i, "resource", e.target.value)}
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="transactions">Transactions</option>
                  <option value="invoices">Invoices</option>
                  <option value="customers">Customers</option>
                  <option value="suppliers">Suppliers</option>
                  <option value="accounts">Accounts</option>
                  <option value="reports">Reports</option>
                  <option value="documents">Documents</option>
                </select>
                <select
                  value={scope.permission}
                  onChange={(e) => updateScope(i, "permission", e.target.value)}
                  className="w-28 rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="read">Read</option>
                  <option value="write">Write</option>
                </select>
                {scopes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeScope(i)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createKey.isPending}>
              {createKey.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" /> Create Key
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Key Reveal Dialog ──────────────────────────────────────────────────

function KeyRevealDialog({
  open,
  onOpenChange,
  apiKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            Save Your API Key
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-amber-500/5 p-4 text-sm">
            <p className="font-medium text-amber-700">
              This is the only time you&apos;ll see this key.
            </p>
            <p className="mt-1 text-muted-foreground">
              Copy it now and store it securely. If lost, you must revoke and
              create a new one.
            </p>
          </div>
          <div className="relative">
            <code className="block w-full rounded-lg border bg-muted p-3 text-xs font-mono break-all">
              {apiKey}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="absolute right-2 top-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500" />{" "}
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Webhook Dialog ─────────────────────────────────────────────

function CreateWebhookDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [eventType, setEventType] = useState("close.completed");
  const [targetUrl, setTargetUrl] = useState("");
  const [description, setDescription] = useState("");

  const createWebhook = trpc.apiPlatform.createWebhook.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      setEventType("close.completed");
      setTargetUrl("");
      setDescription("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;
    createWebhook.mutate({
      eventType,
      targetUrl: targetUrl.trim(),
      description,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Event Type</Label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="close.completed">Close Completed</option>
              <option value="invoice.paid">Invoice Paid</option>
              <option value="invoice.overdue">Invoice Overdue</option>
              <option value="reconciliation.flagged">
                Reconciliation Flagged
              </option>
              <option value="budget.threshold_exceeded">
                Budget Threshold Exceeded
              </option>
              <option value="transaction.created">Transaction Created</option>
              <option value="expense.approved">Expense Approved</option>
              <option value="payroll.completed">Payroll Completed</option>
              <option value="document.processed">Document Processed</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Target URL</Label>
            <Input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://your-app.com/webhooks/xenboox"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notify my accounting system"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createWebhook.isPending}>
              {createWebhook.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Webhook className="mr-2 h-4 w-4" /> Create Webhook
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showRevealKey, setShowRevealKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("keys");

  const {
    data: keysData,
    refetch: refetchKeys,
    isLoading: loadingKeys,
  } = trpc.apiPlatform.listApiKeys.useQuery();
  const { data: webhooksData, refetch: refetchWebhooks } =
    trpc.apiPlatform.listWebhooks.useQuery();
  const { data: usageData } = trpc.apiPlatform.getUsage.useQuery({ days: 7 });

  const revokeKey = trpc.apiPlatform.revokeApiKey.useMutation({
    onSuccess: () => refetchKeys(),
  });

  const deleteWebhook = trpc.apiPlatform.deleteWebhook.useMutation({
    onSuccess: () => refetchWebhooks(),
  });

  const keys = keysData ?? [];
  const webhooks = webhooksData ?? [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">API & Developer Platform</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Integrate with Xenboox programmatically. Manage API keys and webhook
            subscriptions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCreateWebhook(true)}>
            <Webhook className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
          <Button onClick={() => setShowCreateKey(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">
                {keys.filter((k) => k.status === "active").length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">
                {webhooks.filter((w) => w.status === "active").length}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {webhooks.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              API Calls (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">
                {usageData?.totals.totalCalls ?? 0}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {usageData?.totals.errorCalls ?? 0} errors
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold">
                {usageData?.totals.avgLatency ?? 0}ms
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="usage">Usage & Analytics</TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-4 pt-4">
          {loadingKeys ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading API keys...
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
              <KeyRound className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium">No API keys yet</p>
                <p className="text-sm text-muted-foreground">
                  Create an API key to start integrating with Xenboox.
                </p>
              </div>
              <Button onClick={() => setShowCreateKey(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create First Key
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <Card key={key.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <KeyRound className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{key.name}</p>
                          <KeyStatusBadge status={key.status} />
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                            {key.keyPrefix}...{key.keyLastChars}
                          </code>
                          <span>
                            {key.scopes?.length ?? 0} scopes · {key.tier} tier
                          </span>
                          {key.lastUsedAt && (
                            <span>
                              Last used:{" "}
                              {new Date(key.lastUsedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {key.scopes && key.scopes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {key.scopes.map((scope: any) => (
                              <Badge
                                key={scope.id ?? scope.resource}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {scope.resource}:{scope.permission}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => {
                          if (
                            confirm(
                              "Revoke this API key? This cannot be undone.",
                            )
                          ) {
                            revokeKey.mutate({ keyId: key.id });
                          }
                        }}
                        disabled={key.status !== "active"}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Revoke
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4 pt-4">
          {webhooks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
              <Webhook className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium">No webhook subscriptions</p>
                <p className="text-sm text-muted-foreground">
                  Subscribe to events to receive real-time notifications.
                </p>
              </div>
              <Button onClick={() => setShowCreateWebhook(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((wh) => (
                <Card key={wh.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                        <Webhook className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{wh.eventType}</p>
                          <WebhookStatusBadge status={wh.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {wh.targetUrl}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Delivered: {wh.deliveryCount}</span>
                          <span>Failed: {wh.failureCount}</span>
                          {wh.lastDeliveredAt && (
                            <span>
                              Last:{" "}
                              {new Date(
                                wh.lastDeliveredAt,
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => deleteWebhook.mutate({ id: wh.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Usage & Analytics Tab */}
        <TabsContent value="usage" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {usageData?.totals.totalCalls ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-500">
                  {usageData?.totals.errorCalls ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Rate Limited
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-500">
                  {usageData?.totals.rateLimitedCalls ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {usageData?.byEndpoint && usageData.byEndpoint.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Calls by Endpoint
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {usageData.byEndpoint.map((ep) => (
                    <div
                      key={ep.endpoint}
                      className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm"
                    >
                      <code className="text-xs font-mono">{ep.endpoint}</code>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{ep.count} calls</span>
                        {ep.errors > 0 && (
                          <Badge
                            variant="outline"
                            className="text-red-500 text-[10px]"
                          >
                            {ep.errors} errors
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                API requests use the{" "}
                <code className="rounded bg-muted px-1.5 py-0.5">
                  x-api-key
                </code>{" "}
                header for authentication. All requests must be made over HTTPS.
              </p>
              <div className="rounded-lg bg-muted/30 p-3 font-mono text-xs">
                curl https://api.xenboox.com/v1/transactions \<br />
                &nbsp;&nbsp;-H &quot;x-api-key: xb_your_api_key_here&quot;
              </div>
              <p className="text-xs">
                Keys are scoped to specific entities and resources. Write
                operations route through the same agent review chain as web and
                chat interfaces.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateApiKeyDialog
        open={showCreateKey}
        onOpenChange={setShowCreateKey}
        onCreated={(key) => {
          setNewApiKey(key);
          setShowRevealKey(true);
        }}
      />
      <KeyRevealDialog
        open={showRevealKey}
        onOpenChange={setShowRevealKey}
        apiKey={newApiKey}
      />
      <CreateWebhookDialog
        open={showCreateWebhook}
        onOpenChange={setShowCreateWebhook}
      />
    </div>
  );
}
