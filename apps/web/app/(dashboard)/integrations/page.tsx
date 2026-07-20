"use client";

import { useState } from "react";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/loading";
import { ConnectBankDialog } from "@/components/integrations/connect-bank-dialog";
import { EmailForwardingDialog } from "@/components/integrations/email-forwarding-dialog";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Building2,
  Mail,
  RefreshCw,
  Unplug,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
} from "lucide-react";

export default function IntegrationsPage() {
  const [showConnectBank, setShowConnectBank] = useState(false);
  const [showEmailForwarding, setShowEmailForwarding] = useState(false);

  const overview = trpc.integrations.getOverview.useQuery();
  const bankConnections = trpc.integrations.getBankConnections.useQuery();
  const emailRules = trpc.integrations.getEmailRules.useQuery();
  const inboundEmails = trpc.integrations.getInboundEmails.useQuery();

  const syncBank = trpc.integrations.syncBankTransactions.useMutation({
    onSuccess: () => toast.success("Bank sync triggered!"),
    onError: (error) => toast.error(error.message),
  });

  const disconnectBank = trpc.integrations.disconnectBank.useMutation({
    onSuccess: () => {
      toast.success("Bank disconnected");
      bankConnections.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteEmailRule = trpc.integrations.deleteEmailRule.useMutation({
    onSuccess: () => {
      toast.success("Email rule deleted");
      emailRules.refetch();
    },
  });

  const isLoading =
    overview.isLoading || bankConnections.isLoading || emailRules.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect your bank accounts and set up email forwarding"
      />

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {overview.data?.bankConnections.active ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Bank accounts connected
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <Mail className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {overview.data?.emailRules.active ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Email rules active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {overview.data?.emailsReceived.total ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Emails received</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Connections */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Bank Connections</h3>
            </div>
            <Button size="sm" onClick={() => setShowConnectBank(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Connect Bank
            </Button>
          </div>

          {bankConnections.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !bankConnections.data?.length ? (
            <EmptyState
              icon={<Building2 className="h-8 w-8" />}
              title="No bank accounts connected"
              description="Connect your bank to automatically sync transactions."
              className="py-8"
            />
          ) : (
            <div className="space-y-3">
              {bankConnections.data.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {conn.institutionName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conn.accountNumber ?? "Account linked"}
                        {conn.lastSyncedAt && (
                          <>
                            {" "}
                            · Last synced{" "}
                            {new Date(conn.lastSyncedAt).toLocaleDateString()}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        conn.status === "active"
                          ? "default"
                          : conn.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {conn.status === "active" && (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      {conn.status === "error" && (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {conn.status === "pending" && (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {conn.status}
                    </Badge>
                    {conn.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          syncBank.mutate({ connectionId: conn.id })
                        }
                        disabled={syncBank.isPending}
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${syncBank.isPending ? "animate-spin" : ""}`}
                        />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        disconnectBank.mutate({ connectionId: conn.id })
                      }
                    >
                      <Unplug className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Forwarding */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Email Forwarding</h3>
            </div>
            <Button size="sm" onClick={() => setShowEmailForwarding(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Rule
            </Button>
          </div>

          {emailRules.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !emailRules.data?.length ? (
            <EmptyState
              icon={<Mail className="h-8 w-8" />}
              title="No email forwarding rules"
              description="Set up email forwarding to automatically process invoices and receipts."
              className="py-8"
            />
          ) : (
            <div className="space-y-3">
              {emailRules.data.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{rule.emailAddress}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.displayName ?? "No label"}
                        {rule.forwardTo && ` → ${rule.forwardTo}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={rule.isActive ? "default" : "secondary"}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        deleteEmailRule.mutate({ ruleId: rule.id })
                      }
                    >
                      <Unplug className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Inbound Emails */}
      {inboundEmails.data && inboundEmails.data.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Recent Emails</h3>
            </div>
            <div className="space-y-2">
              {inboundEmails.data.slice(0, 5).map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {email.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      From: {email.fromAddress} · {email.attachmentCount}{" "}
                      attachment(s)
                    </p>
                  </div>
                  <Badge
                    variant={
                      email.status === "processed"
                        ? "default"
                        : email.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {email.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ConnectBankDialog
        open={showConnectBank}
        onOpenChange={setShowConnectBank}
      />
      <EmailForwardingDialog
        open={showEmailForwarding}
        onOpenChange={setShowEmailForwarding}
      />
    </div>
  );
}
