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
import {
  Settings,
  Bell,
  Shield,
  Database,
  Globe,
  Key,
  Save,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";

export default function AdminSettingsPage() {
  const saveMutation = trpc.admin.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      emailAlerts,
      slackAlerts,
      smsAlerts,
      autoScaling,
      costOptimization,
      providerFallback,
      maintenanceMode,
      debugMode,
      auditLogging,
      budgets: {
        anthropic: anthropicBudget,
        openai: openaiBudget,
        haiku: haikuBudget,
      },
    });
  };
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [autoScaling, setAutoScaling] = useState(false);
  const [costOptimization, setCostOptimization] = useState(true);
  const [providerFallback, setProviderFallback] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [auditLogging, setAuditLogging] = useState(true);

  const [anthropicBudget, setAnthropicBudget] = useState("25000");
  const [openaiBudget, setOpenaiBudget] = useState("20000");
  const [haikuBudget, setHaikuBudget] = useState("5000");

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
              <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1.5">
                <span>Slack Alerts</span>
                <span className="text-xs text-muted-foreground">
                  Receive alerts via Slack
                </span>
              </Label>
              <Switch checked={slackAlerts} onCheckedChange={setSlackAlerts} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1.5">
                <span>SMS Alerts</span>
                <span className="text-xs text-muted-foreground">
                  Receive alerts via SMS
                </span>
              </Label>
              <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
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
              <Switch checked={autoScaling} onCheckedChange={setAutoScaling} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1.5">
                <span>Cost Optimization</span>
                <span className="text-xs text-muted-foreground">
                  Enable automatic cost optimization recommendations
                </span>
              </Label>
              <Switch
                checked={costOptimization}
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
                checked={providerFallback}
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
                checked={maintenanceMode}
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
              <Switch checked={debugMode} onCheckedChange={setDebugMode} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1.5">
                <span>Audit Logging</span>
                <span className="text-xs text-muted-foreground">
                  Log all user actions for compliance
                </span>
              </Label>
              <Switch
                checked={auditLogging}
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
                value={anthropicBudget}
                onChange={(e) => setAnthropicBudget(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openai-budget">OpenAI Budget (Monthly)</Label>
              <Input
                type="number"
                value={openaiBudget}
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
                value={haikuBudget}
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
