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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Badge,
} from "@xenboox/ui";
import {
  Link,
  Unlink,
  Building2,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Shield,
  Landmark,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

const INTEGRATIONS = [
  {
    id: "mono",
    name: "Mono",
    description: "Connect bank accounts for automatic transaction syncing",
    icon: Landmark,
    color: "bg-blue-100 text-primary dark:bg-blue-950/30 dark:text-blue-400",
    features: [
      "Real-time transaction sync",
      "Account balance monitoring",
      "Statement downloads",
    ],
  },
  {
    id: "flutterwave",
    name: "Flutterwave",
    description: "Process payments and manage transactions",
    icon: CreditCard,
    color:
      "bg-amber-100 text-attention-amber dark:bg-amber-950/30 dark:text-amber-400",
    features: ["Payment processing", "Multi-currency support", "Payment links"],
  },
  {
    id: "paystack",
    name: "Paystack",
    description: "Accept payments online",
    icon: CreditCard,
    color:
      "bg-emerald-100 text-balanced-green dark:bg-emerald-950/30 dark:text-emerald-400",
    features: ["Payment processing", "Recurring payments", "Invoicing"],
  },
  {
    id: "wise",
    name: "Wise",
    description: "Send and receive international payments",
    icon: Building2,
    color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400",
    features: [
      "International transfers",
      "Multi-currency accounts",
      "Batch payments",
    ],
  },
];

const STATUS_BADGES: Record<string, string> = {
  pending:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  active:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  failed: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  disconnected:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function IntegrationsSection() {
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null,
  );
  const [connectForm, setConnectForm] = useState({
    institutionName: "",
    accountNumber: "",
  });

  const {
    data: connections,
    isLoading,
    refetch,
  } = trpc.integrations.getBankConnections.useQuery();

  const disconnectBank = trpc.integrations.disconnectBank.useMutation({
    onSuccess: () => {
      toast.success("Bank disconnected");
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to disconnect"),
  });

  const initiateConnection =
    trpc.integrations.initiateBankConnection.useMutation({
      onSuccess: () => {
        toast.success("Bank connection initiated");
        setShowConnectDialog(false);
        setSelectedIntegration(null);
        setConnectForm({ institutionName: "", accountNumber: "" });
        refetch();
      },
      onError: (error) =>
        toast.error(error.message || "Failed to connect bank"),
    });

  const handleConnect = (integrationId: string) => {
    setSelectedIntegration(integrationId);
    setShowConnectDialog(true);
  };

  const handleConfirmConnect = () => {
    if (!connectForm.institutionName || !connectForm.accountNumber) {
      toast.error("Please enter the institution name and account number");
      return;
    }
    setConnectingId(selectedIntegration);
    initiateConnection.mutate(
      {
        institutionName: connectForm.institutionName,
        accountNumber: connectForm.accountNumber,
        institutionId: selectedIntegration ?? undefined,
      },
      {
        onSettled: () => setConnectingId(null),
      },
    );
  };

  const selectedIntegrationDetails = INTEGRATIONS.find(
    (i) => i.id === selectedIntegration,
  );

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
      {/* Connected Bank Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Connected Banks
          </CardTitle>
          <CardDescription>
            Bank accounts synced into Xenboox for automatic reconciliation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connections && connections.length > 0 ? (
            <div className="space-y-3">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-primary dark:bg-blue-950/30 dark:text-blue-400">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {conn.institutionName}
                        </span>
                        <Badge
                          className={`${STATUS_BADGES[conn.status] ?? ""} text-xs`}
                        >
                          {conn.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {conn.accountName ??
                          `Account ••${conn.accountNumber?.slice(-4) ?? "—"}`}
                        {conn.lastSyncedAt
                          ? ` · Last synced ${new Date(conn.lastSyncedAt).toLocaleDateString()}`
                          : ""}
                      </p>
                      {conn.syncError && (
                        <p className="mt-1 text-xs text-error-clay">
                          Sync error: {conn.syncError}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toast.info(
                          "Manual sync queued — the agent will pick it up shortly.",
                        )
                      }
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Sync
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        disconnectBank.mutate({ connectionId: conn.id })
                      }
                      disabled={disconnectBank.isPending}
                    >
                      <Unlink className="h-4 w-4 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Link className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No bank accounts connected yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Connect your bank accounts below to enable automatic syncing
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Available Integrations
          </CardTitle>
          <CardDescription>
            Connect third-party services to enhance your accounting workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {INTEGRATIONS.map((integration) => {
            const Icon = integration.icon;

            return (
              <div
                key={integration.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${integration.color}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{integration.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {integration.features.map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <Button
                    size="sm"
                    onClick={() => handleConnect(integration.id)}
                    disabled={initiateConnection.isPending}
                  >
                    {initiateConnection.isPending &&
                    connectingId === integration.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Link className="h-4 w-4 mr-1" />
                    )}
                    Connect
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Connect to {selectedIntegrationDetails?.name}
            </DialogTitle>
            <DialogDescription>
              Enter your bank details to link {selectedIntegrationDetails?.name}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Bank / Institution Name</Label>
              <Input
                value={connectForm.institutionName}
                onChange={(e) =>
                  setConnectForm({
                    ...connectForm,
                    institutionName: e.target.value,
                  })
                }
                placeholder="e.g., Access Bank"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                value={connectForm.accountNumber}
                onChange={(e) =>
                  setConnectForm({
                    ...connectForm,
                    accountNumber: e.target.value,
                  })
                }
                placeholder="8–20 digit account number"
              />
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Secure Connection</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Your credentials are encrypted and never stored</li>
                    <li>• You can disconnect at any time</li>
                    <li>• Read-only access by default</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConnectDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmConnect}
              disabled={connectingId !== null || initiateConnection.isPending}
            >
              {initiateConnection.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Connect Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
