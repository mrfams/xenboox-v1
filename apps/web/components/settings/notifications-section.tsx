"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Switch,
  Label,
} from "@xenboox/ui";
import {
  Bell,
  Mail,
  Smartphone,
  Calendar,
  Clock,
  Save,
  Loader2,
  FileText,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Bot,
  Shield,
  RefreshCw,
  Users,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  BrainCircuit,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

export function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    // Email notifications
    emailInvoices: true,
    emailReports: true,
    emailAlerts: true,
    emailReminders: true,
    emailDocuments: true,
    emailReconciliation: true,
    emailPayroll: true,
    // Push notifications
    pushPayments: true,
    pushApprovals: true,
    pushDeadlines: true,
    // AI notifications
    aiEscalations: true,
    aiAnomalies: true,
    aiAgentCompleted: true,
    aiConfidenceLow: true,
    // Digest
    weeklyDigest: true,
    dailyDigest: false,
  });

  const { data: currentPrefs, isLoading } =
    trpc.settings.getNotificationPrefs.useQuery();

  const savePrefs = trpc.settings.updateNotificationPrefs.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences saved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save preferences");
    },
  });

  useEffect(() => {
    if (currentPrefs) {
      setPrefs((prev) => ({ ...prev, ...currentPrefs }));
    }
  }, [currentPrefs]);

  const handleToggle = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which emails you want to receive. You can always change these
            later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "emailInvoices" as const,
              label: "Invoice updates",
              description:
                "Receive emails when invoices are created, paid, or overdue",
              icon: CreditCard,
            },
            {
              key: "emailReports" as const,
              label: "Report notifications",
              description:
                "Receive emails when financial reports are generated",
              icon: TrendingUp,
            },
            {
              key: "emailAlerts" as const,
              label: "System alerts",
              description:
                "Receive emails for important system alerts and warnings",
              icon: AlertTriangle,
            },
            {
              key: "emailReminders" as const,
              label: "Reminders",
              description: "Receive emails for upcoming deadlines and tasks",
              icon: Clock,
            },
            {
              key: "emailDocuments" as const,
              label: "Document processing",
              description:
                "Receive emails when documents are processed by AI or need review",
              icon: FileText,
            },
            {
              key: "emailReconciliation" as const,
              label: "Reconciliation alerts",
              description:
                "Receive emails when bank reconciliation needs attention",
              icon: RefreshCw,
            },
            {
              key: "emailPayroll" as const,
              label: "Payroll notifications",
              description:
                "Receive emails for payroll processing and approvals",
              icon: Users,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Label className="flex flex-col gap-0.5 cursor-pointer">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </Label>
                </div>
                <Switch
                  checked={prefs[item.key]}
                  onCheckedChange={() => handleToggle(item.key)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Configure push notifications for your mobile devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "pushPayments" as const,
              label: "Payment alerts",
              description: "Get notified when payments are sent or received",
              icon: CreditCard,
            },
            {
              key: "pushApprovals" as const,
              label: "Approval requests",
              description: "Get notified when transactions need your approval",
              icon: Bell,
            },
            {
              key: "pushDeadlines" as const,
              label: "Deadline reminders",
              description: "Get reminded about upcoming filing deadlines",
              icon: Calendar,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Label className="flex flex-col gap-0.5 cursor-pointer">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </Label>
                </div>
                <Switch
                  checked={prefs[item.key]}
                  onCheckedChange={() => handleToggle(item.key)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* AI Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            AI Notifications
          </CardTitle>
          <CardDescription>
            Get notified about AI agent activity, anomalies, and escalations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "aiEscalations" as const,
              label: "Agent escalations",
              description:
                "Get notified when an AI agent escalates a decision to you",
              icon: AlertCircle,
            },
            {
              key: "aiAnomalies" as const,
              label: "Anomaly detection",
              description:
                "Get notified when AI detects unusual transactions or patterns",
              icon: Shield,
            },
            {
              key: "aiAgentCompleted" as const,
              label: "Agent task completion",
              description:
                "Get notified when AI completes a task (reconciliation, categorization, etc.)",
              icon: CheckCircle2,
            },
            {
              key: "aiConfidenceLow" as const,
              label: "Low confidence alerts",
              description:
                "Get notified when AI confidence is below 70% and needs your review",
              icon: Sparkles,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <Label className="flex flex-col gap-0.5 cursor-pointer">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </Label>
                </div>
                <Switch
                  checked={prefs[item.key]}
                  onCheckedChange={() => handleToggle(item.key)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Digest & Summaries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Digest & Summaries
          </CardTitle>
          <CardDescription>
            Receive periodic summaries of your financial activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "dailyDigest" as const,
              label: "Daily digest",
              description:
                "Receive a daily summary of transactions, approvals, and AI activity",
              icon: Clock,
            },
            {
              key: "weeklyDigest" as const,
              label: "Weekly digest",
              description:
                "Receive a weekly summary of your financial activity and key metrics",
              icon: TrendingUp,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Label className="flex flex-col gap-0.5 cursor-pointer">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </Label>
                </div>
                <Switch
                  checked={prefs[item.key]}
                  onCheckedChange={() => handleToggle(item.key)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => savePrefs.mutate(prefs)}
          disabled={savePrefs.isPending}
        >
          {savePrefs.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
