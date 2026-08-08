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
} from "@xenboox/ui";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

const PROVIDERS = [
  { id: "mono", name: "Mono", description: "Bank account linking" },
  { id: "flutterwave", name: "Flutterwave", description: "Payment processing" },
  { id: "stripe", name: "Stripe", description: "Payment processing" },
  { id: "paystack", name: "Paystack", description: "Payment processing" },
  { id: "wise", name: "Wise", description: "International transfers" },
  { id: "custom", name: "Custom", description: "Custom API integration" },
];

const SCOPES = [
  { id: "read:transactions", label: "Read transactions" },
  { id: "write:transactions", label: "Write transactions" },
  { id: "read:invoices", label: "Read invoices" },
  { id: "write:invoices", label: "Write invoices" },
  { id: "read:reports", label: "Read reports" },
  { id: "write:ledger", label: "Post to ledger" },
];

const EXPIRY_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "0", label: "Never expires" },
];

export function ApiKeysSection() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKey, setNewKey] = useState({
    name: "",
    provider: "",
    scopes: [] as string[],
    expiresInDays: "0",
  });
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showCreatedKey, setShowCreatedKey] = useState(false);

  const {
    data: apiKeys,
    isLoading,
    refetch,
  } = trpc.settings.getApiKeys.useQuery();

  const createKey = trpc.settings.createApiKey.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.key);
      setShowCreatedKey(true);
      setShowCreateDialog(false);
      setNewKey({ name: "", provider: "", scopes: [], expiresInDays: "0" });
      refetch();
      toast.success("API key created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create API key");
    },
  });

  const revokeKey = trpc.settings.revokeApiKey.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("API key revoked");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke API key");
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleCreateKey = () => {
    if (!newKey.name || !newKey.provider) {
      toast.error("Please fill in all required fields");
      return;
    }
    createKey.mutate({
      name: newKey.name,
      provider: newKey.provider,
      scopes: newKey.scopes,
      expiresInDays: parseInt(newKey.expiresInDays, 10) || undefined,
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
      {/* API Keys List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage API keys for external integrations. Keys are shown only
                once when created.
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {apiKeys && apiKeys.length > 0 ? (
            apiKeys.map(
              (key: {
                id: string;
                name: string;
                provider: string;
                keyPrefix: string;
                scopes: string[];
                isActive: boolean;
                lastUsedAt: string | null;
                expiresAt: string | null;
                createdAt: string;
              }) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Key className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{key.name}</span>
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                          {key.provider}
                        </span>
                        {!key.isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            Revoked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="font-mono">{key.keyPrefix}...</span>
                        </span>
                        {key.lastUsedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last used{" "}
                            {new Date(key.lastUsedAt).toLocaleDateString()}
                          </span>
                        )}
                        {key.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires{" "}
                            {new Date(key.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {key.isActive && (
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
                            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently revoke this API key. Any
                              applications using this key will stop working
                              immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => revokeKey.mutate({ id: key.id })}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {revokeKey.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-1" />
                              )}
                              Revoke Key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ),
            )
          ) : (
            <div className="text-center py-8">
              <Key className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No API keys created yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Create an API key to connect with external services
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for external integrations. The key will be
              shown only once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input
                value={newKey.name}
                onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                placeholder="e.g., Production Mono API"
              />
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={newKey.provider}
                onValueChange={(v) => setNewKey({ ...newKey, provider: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {p.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scopes</Label>
              <div className="space-y-1.5">
                {SCOPES.map((s) => {
                  const isSelected = newKey.scopes.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          setNewKey({
                            ...newKey,
                            scopes: isSelected
                              ? newKey.scopes.filter((x) => x !== s.id)
                              : [...newKey.scopes, s.id],
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span>{s.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expiration</Label>
              <Select
                value={newKey.expiresInDays}
                onValueChange={(v) =>
                  setNewKey({ ...newKey, expiresInDays: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
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
            <Button onClick={handleCreateKey} disabled={createKey.isPending}>
              {createKey.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Created Key Dialog */}
      <Dialog open={showCreatedKey} onOpenChange={setShowCreatedKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Copy your API key now. It will not be shown again for security
              reasons.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative rounded-lg border bg-muted p-4 font-mono text-sm break-all">
              {createdKey}
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => copyToClipboard(createdKey || "")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Save this key securely</p>
                  <p className="text-xs mt-1">
                    This is the only time you will see this key. Store it in a
                    secure location like a password manager.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCreatedKey(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
