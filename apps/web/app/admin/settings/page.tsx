"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import { Input } from "@xenboox/ui";
import { Label } from "@xenboox/ui";
import { Switch } from "@xenboox/ui";
import { Key, Save, RefreshCw, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

import { trpc } from "@/lib/trpc/client";
import { AdminMfaSetup } from "@/components/admin/admin-mfa-setup";

export default function AdminSettingsPage() {
  const saveMutation = trpc.admin.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  // Load persisted settings so the form reflects what was actually saved
  // server-side, instead of resetting to defaults on every page load.
  const { data: savedSettings } = trpc.admin.getSettings.useQuery();

  const [emailAlerts, setEmailAlerts] = useState<boolean | null>(null);
  const [slackAlerts, setSlackAlerts] = useState<boolean | null>(null);
  const [smsAlerts, setSmsAlerts] = useState<boolean | null>(null);
  const [autoScaling, setAutoScaling] = useState<boolean | null>(null);
  const [costOptimization, setCostOptimization] = useState<boolean | null>(
    null,
  );
  const [providerFallback, setProviderFallback] = useState<boolean | null>(
    null,
  );
  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null);
  const [debugMode, setDebugMode] = useState<boolean | null>(null);
  const [auditLogging, setAuditLogging] = useState<boolean | null>(null);

  const [anthropicBudget, setAnthropicBudget] = useState<string | null>(null);
  const [openaiBudget, setOpenaiBudget] = useState<string | null>(null);
  const [haikuBudget, setHaikuBudget] = useState<string | null>(null);

  useEffect(() => {
    if (!savedSettings) return;
    setEmailAlerts(savedSettings.emailAlerts);
    setSlackAlerts(savedSettings.slackAlerts);
    setSmsAlerts(savedSettings.smsAlerts);
    setAutoScaling(savedSettings.autoScaling);
    setCostOptimization(savedSettings.costOptimization);
    setProviderFallback(savedSettings.providerFallback);
    setMaintenanceMode(savedSettings.maintenanceMode);
    setDebugMode(savedSettings.debugMode);
    setAuditLogging(savedSettings.auditLogging);
    setAnthropicBudget(savedSettings.budgets.anthropic);
    setOpenaiBudget(savedSettings.budgets.openai);
    setHaikuBudget(savedSettings.budgets.haiku);
  }, [savedSettings]);

  const handleSave = () => {
    saveMutation.mutate({
      emailAlerts: emailAlerts ?? true,
      slackAlerts: slackAlerts ?? false,
      smsAlerts: smsAlerts ?? false,
      autoScaling: autoScaling ?? false,
      costOptimization: costOptimization ?? true,
      providerFallback: providerFallback ?? true,
      maintenanceMode: maintenanceMode ?? false,
      debugMode: debugMode ?? false,
      auditLogging: auditLogging ?? true,
      budgets: {
        anthropic: anthropicBudget ?? "25000",
        openai: openaiBudget ?? "20000",
        haiku: haikuBudget ?? "5000",
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure system settings and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure how you receive alerts and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1.5">
                <span>Email Alerts</span>
                <span className="text-xs text-muted-foreground">
                  Receive alerts via email
                </span>
              </Label>
              <Switch
                checked={emailAlerts ?? true}
                onCheckedChange={setEmailAlerts}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1.5">
                <span>Slack Alerts</span>
                <span className="text-xs text-muted-foreground">
                  Receive alerts via Slack
                </span>
              </Label>
              <Switch
                checked={slackAlerts ?? false}
                onCheckedChange={setSlackAlerts}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1.5">
                <span>SMS Alerts</span>
                <span className="text-xs text-muted-foreground">
                  Receive alerts via SMS
                </span>
              </Label>
              <Switch
                checked={smsAlerts ?? false}
                onCheckedChange={setSmsAlerts}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Settings</CardTitle>
            <CardDescription>
              Configure AI provider settings and cost optimization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1.5">
                <span>Auto Budget Scaling</span>
                <span className="text-xs text-muted-foreground">
                  Automatically increase budgets when approaching limits
                </span>
              </Label>
              <Switch
                checked={autoScaling ?? false}
                onCheckedChange={setAutoScaling}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1.5">
                <span>Cost Optimization</span>
                <span className="text-xs text-muted-foreground">
                  Enable automatic cost optimization recommendations
                </span>
              </Label>
              <Switch
                checked={costOptimization ?? true}
                onCheckedChange={setCostOptimization}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1.5">
                <span>Provider Fallback</span>
                <span className="text-xs text-muted-foreground">
                  Automatically switch providers on failure
                </span>
              </Label>
              <Switch
                checked={providerFallback ?? true}
                onCheckedChange={setProviderFallback}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>Configure global system behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1.5">
                <span>Maintenance Mode</span>
                <span className="text-xs text-muted-foreground">
                  Temporarily disable non-essential features
                </span>
              </Label>
              <Switch
                checked={maintenanceMode ?? false}
                onCheckedChange={setMaintenanceMode}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1.5">
                <span>Debug Mode</span>
                <span className="text-xs text-muted-foreground">
                  Enable detailed logging and debugging
                </span>
              </Label>
              <Switch
                checked={debugMode ?? false}
                onCheckedChange={setDebugMode}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1.5">
                <span>Audit Logging</span>
                <span className="text-xs text-muted-foreground">
                  Log all user actions for compliance
                </span>
              </Label>
              <Switch
                checked={auditLogging ?? true}
                onCheckedChange={setAuditLogging}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>
              Configure security and authentication settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminMfaSetup />
            <Button variant="outline" className="w-full justify-start">
              <Key className="h-4 w-4 mr-2" />
              Change Admin Password
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <UserCheck className="h-4 w-4 mr-2" />
              Manage API Keys
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset All Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Configuration</CardTitle>
          <CardDescription>
            Configure monthly budgets for AI providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="anthropic-budget">
                Anthropic Budget (Monthly)
              </Label>
              <Input
                type="number"
                value={anthropicBudget ?? ""}
                onChange={(e) => setAnthropicBudget(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openai-budget">OpenAI Budget (Monthly)</Label>
              <Input
                type="number"
                value={openaiBudget ?? ""}
                onChange={(e) => setOpenaiBudget(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="haiku-budget">
                Anthropic Haiku Budget (Monthly)
              </Label>
              <Input
                type="number"
                value={haikuBudget ?? ""}
                onChange={(e) => setHaikuBudget(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
