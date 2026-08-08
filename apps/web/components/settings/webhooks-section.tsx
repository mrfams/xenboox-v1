"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  Badge,
} from "@xenboox/ui";
import {
  Webhook,
  Plus,
  Trash2,
  Copy,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";

const EVENT_OPTIONS = [
  { value: "close.completed", label: "Month-end close completed" },
  { value: "invoice.paid", label: "Invoice paid" },
  { value: "invoice.overdue", label: "Invoice overdue" },
  { value: "reconciliation.flagged", label: "Reconciliation flagged" },
  { value: "budget.threshold_exceeded", label: "Budget threshold exceeded" },
  { value: "transaction.created", label: "Transaction created" },
  { value: "expense.approved", label: "Expense approved" },
  { value: "payroll.completed", label: "Payroll completed" },
  { value: "document.processed", label: "Document processed" },
];

export function WebhooksSection() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState({
    eventType: "",
    targetUrl: "",
    description: "",
    maxRetries: "3",
  });
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const { data: entities } = trpc.organization.listEntities.useQuery({});
  const { entityId: currentEntityId } = useEntity();
  const entityId = currentEntityId ?? entities?.[0]?.id;

  const {
    data: webhooks,
    isLoading,
    refetch,
  } = trpc.apiPlatform.listWebhooks.useQuery(undefined, {
    enabled: !!entityId,
  });

  const createWebhook = trpc.apiPlatform.createWebhook.useMutation({
    onSuccess: (data) => {
      setCreatedSecret(data.secret ?? null);
      setShowCreateDialog(false);
      setForm({
        eventType: "",
        targetUrl: "",
        description: "",
        maxRetries: "3",
      });
      refetch();
      toast.success("Webhook created");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to create webhook"),
  });

  const deleteWebhook = trpc.apiPlatform.deleteWebhook.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Webhook deleted");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to delete webhook"),
  });

  const copySecret = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleCreate = () => {
    if (!form.eventType || !form.targetUrl) {
      toast.error("Please select an event and enter a destination URL");
      return;
    }
    createWebhook.mutate({
      eventType: form.eventType,
      targetUrl: form.targetUrl,
      description: form.description || undefined,
      maxRetries: parseInt(form.maxRetries, 10) || 3,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Webhooks List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Receive real-time notifications when events happen in your
                accounting data.
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {webhooks && webhooks.length > 0 ? (
            webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className="capitalize">
                      {webhook.eventType.replace(".", " ")}
                    </Badge>
                    {webhook.status === "active" ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">{webhook.status}</Badge>
                    )}
                    {webhook.lastDeliveryStatus === "success" && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Last delivery OK
                      </span>
                    )}
                    {webhook.lastDeliveryStatus === "failed" && (
                      <span className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        Last delivery failed ({webhook.failureCount})
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <a
                      href={webhook.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:underline"
                    >
                      {webhook.targetUrl}
                    </a>
                  </div>
                  {webhook.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {webhook.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Retries: {webhook.maxRetries} · Delivered:{" "}
                    {webhook.deliveryCount} · Failed: {webhook.failureCount}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                      <AlertDialogDescription>
                        This webhook will stop receiving events immediately.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteWebhook.mutate({ id: webhook.id })}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Webhook
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No webhooks configured yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a webhook to get notified when events happen.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              We&apos;ll send a POST request to your endpoint whenever the event
              fires.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Event</Label>
              <Select
                value={form.eventType}
                onValueChange={(v) => setForm({ ...form, eventType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_OPTIONS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destination URL</Label>
              <Input
                value={form.targetUrl}
                onChange={(e) =>
                  setForm({ ...form, targetUrl: e.target.value })
                }
                placeholder="https://your-app.com/webhooks/xenboox"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="e.g., Sync to Slack channel #accounting"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Retries</Label>
              <Select
                value={form.maxRetries}
                onValueChange={(v) => setForm({ ...form, maxRetries: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["0", "1", "3", "5", "10"].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r} times
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createWebhook.isPending}>
              {createWebhook.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Webhook className="h-4 w-4 mr-2" />
              )}
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show secret dialog */}
      <Dialog
        open={createdSecret !== null}
        onOpenChange={(o) => {
          if (!o) setCreatedSecret(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-emerald-600">
              <CheckCircle2 className="h-5 w-5 inline-block mr-1" />
              Webhook Created
            </DialogTitle>
            <DialogDescription>
              Save your signing secret. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative rounded-lg border bg-muted p-4 font-mono text-sm break-all">
              {createdSecret}
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => copySecret(createdSecret ?? "")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Use this secret to verify that webhook payloads actually come from
              Xenboox (HMAC-SHA256 signature verification).
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedSecret(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
