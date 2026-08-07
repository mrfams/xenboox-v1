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
} from "lucide-react";

const INTEGRATIONS = [
  {
    id: "mono",
    name: "Mono",
    description: "Connect bank accounts for automatic transaction syncing",
    icon: Building2,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
    features: [
      "Real-time transaction sync",
      "Account balance monitoring",
      "Statement downloads",
    ],
    status: "available",
  },
  {
    id: "flutterwave",
    name: "Flutterwave",
    description: "Process payments and manage transactions",
    icon: CreditCard,
    color:
      "bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    features: ["Payment processing", "Multi-currency support", "Payment links"],
    status: "available",
  },
  {
    id: "paystack",
    name: "Paystack",
    description: "Accept payments online",
    icon: CreditCard,
    color:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    features: ["Payment processing", "Recurring payments", "Invoicing"],
    status: "available",
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
    status: "available",
  },
];

export function IntegrationsSection() {
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null,
  );

  // In production, this would fetch connected integrations from the database
  const connectedIntegrations: string[] = [];

  const handleConnect = (integrationId: string) => {
    setSelectedIntegration(integrationId);
    setShowConnectDialog(true);
  };

  const handleConfirmConnect = async () => {
    if (!selectedIntegration) return;

    setConnectingId(selectedIntegration);

    // Simulate connection process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast.success(`Connected to ${selectedIntegration}`);
    setConnectingId(null);
    setShowConnectDialog(false);
    setSelectedIntegration(null);
  };

  const handleDisconnect = (integrationId: string) => {
    toast.success(`Disconnected from ${integrationId}`);
  };

  const selectedIntegrationDetails = INTEGRATIONS.find(
    (i) => i.id === selectedIntegration,
  );

  return (
    <div className="space-y-6">
      {/* Connected Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Connected Integrations
          </CardTitle>
          <CardDescription>
            Manage your connected third-party services and bank accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectedIntegrations.length > 0 ? (
            <div className="space-y-3">
              {connectedIntegrations.map((id) => {
                const integration = INTEGRATIONS.find((i) => i.id === id);
                if (!integration) return null;
                const Icon = integration.icon;

                return (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${integration.color}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {integration.name}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Connected
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Sync
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDisconnect(id)}
                      >
                        <Unlink className="h-4 w-4 mr-1" />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Link className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No integrations connected yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Connect your bank accounts and payment processors below
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
            const isConnected = connectedIntegrations.includes(integration.id);
            const isConnecting = connectingId === integration.id;

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
                      {isConnected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </span>
                      )}
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
                  {isConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(integration.id)}
                    >
                      <Unlink className="h-4 w-4 mr-1" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(integration.id)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Link className="h-4 w-4 mr-1" />
                      )}
                      Connect
                    </Button>
                  )}
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
              You will be redirected to {selectedIntegrationDetails?.name} to
              authorize the connection.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
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
              disabled={connectingId !== null}
            >
              {connectingId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Continue to {selectedIntegrationDetails?.name}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
