"use client";

import { useEffect, useState } from "react";
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
  Switch,
  Badge,
  Separator,
} from "@xenboox/ui";
import {
  Fingerprint,
  Loader2,
  Save,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

const PROVIDERS = [
  { value: "none", label: "No SSO / Password only" },
  { value: "azure", label: "Azure AD (Microsoft Entra)" },
  { value: "okta", label: "Okta" },
  { value: "google", label: "Google Workspace" },
  { value: "saml", label: "SAML 2.0" },
  { value: "oidc", label: "OpenID Connect (generic)" },
];

const DEFAULT_FORM = {
  enabled: false,
  provider: "none" as "none" | "azure" | "okta" | "google" | "saml" | "oidc",
  clientId: "",
  clientSecret: "",
  issuer: "",
  callbackUrl: "",
  domain: "",
  enforceSso: false,
  jitProvisioning: true,
  samlEntryPoint: "",
  samlCert: "",
};

export function SsoSection() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loaded, setLoaded] = useState(false);

  const { data: settings, isLoading } = trpc.sso.getSettings.useQuery();
  const saveSettings = trpc.sso.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("SSO settings saved");
      setLoaded(false);
    },
    onError: (error) =>
      toast.error(error.message || "Failed to save SSO settings"),
  });

  useEffect(() => {
    if (!settings || loaded) return;
    setForm({
      enabled: settings.enabled,
      provider: settings.provider,
      clientId: settings.clientId,
      clientSecret: settings.clientSecret,
      issuer: settings.issuer,
      callbackUrl: settings.callbackUrl,
      domain: settings.domain,
      enforceSso: settings.enforceSso,
      jitProvisioning: settings.jitProvisioning,
      samlEntryPoint: settings.samlEntryPoint,
      samlCert: settings.samlCert,
    });
    setLoaded(true);
  }, [settings, loaded]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    if (form.enabled && form.provider === "none") {
      toast.error(
        "Enable a provider before turning on SSO, or disable SSO entirely.",
      );
      return;
    }
    if (form.enabled && form.provider !== "none") {
      if (!form.clientId || !form.clientSecret) {
        toast.error("Client ID and Client Secret are required.");
        return;
      }
      if (
        ["azure", "okta", "google", "oidc"].includes(form.provider) &&
        !form.issuer
      ) {
        toast.error("Issuer URL is required for this provider.");
        return;
      }
      if (form.provider === "saml" && !form.samlEntryPoint) {
        toast.error("SAML Entry Point URL is required.");
        return;
      }
    }
    saveSettings.mutate({ ...form });
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

  const needsOidcFields = ["azure", "okta", "google", "oidc"].includes(
    form.provider,
  );
  const isSaml = form.provider === "saml";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4" />
            Single Sign-On
          </CardTitle>
          <CardDescription>
            Let your team sign in with their corporate identity provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status banner */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              {settings?.isConfigured ? (
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {settings?.isConfigured
                    ? `SSO is configured (${settings?.displayName})`
                    : "SSO is not configured"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {settings?.source === "env"
                    ? "Loaded from environment variables"
                    : "Loaded from config file"}
                </p>
              </div>
            </div>
            <Badge variant={settings?.enabled ? "success" : "secondary"}>
              {settings?.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          <Separator />

          {/* Enable SSO */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="sso-enabled">Enable SSO</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, team members can sign in with your identity
                provider.
              </p>
            </div>
            <Switch
              id="sso-enabled"
              checked={form.enabled}
              onCheckedChange={(v) => set("enabled", v)}
            />
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={form.provider}
              onValueChange={(v) =>
                set("provider", v as (typeof form)["provider"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.provider !== "none" && (
            <>
              {needsOidcFields && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input
                      value={form.clientId}
                      onChange={(e) => set("clientId", e.target.value)}
                      placeholder="Application (client) ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Secret</Label>
                    <Input
                      type="password"
                      value={form.clientSecret}
                      onChange={(e) => set("clientSecret", e.target.value)}
                      placeholder={
                        settings?.clientSecret === "***"
                          ? "••••••••"
                          : "Client secret"
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issuer URL</Label>
                    <Input
                      value={form.issuer}
                      onChange={(e) => set("issuer", e.target.value)}
                      placeholder="https://login.microsoftonline.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Callback URL</Label>
                    <Input
                      value={form.callbackUrl}
                      onChange={(e) => set("callbackUrl", e.target.value)}
                      placeholder="https://app.xenboox.com/api/auth/callback/..."
                    />
                  </div>
                </div>
              )}

              {isSaml && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>SAML Entry Point</Label>
                    <Input
                      value={form.samlEntryPoint}
                      onChange={(e) => set("samlEntryPoint", e.target.value)}
                      placeholder="https://idp.example.com/saml/sso"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IdP Certificate (X.509)</Label>
                    <textarea
                      value={form.samlCert}
                      onChange={(e) => set("samlCert", e.target.value)}
                      placeholder="-----BEGIN CERTIFICATE-----"
                      rows={4}
                      className="flex w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="sso-domain-enforce">
                      Domain enforcement
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Force users with your company domain to use SSO.
                    </p>
                  </div>
                  <Switch
                    id="sso-domain-enforce"
                    checked={form.enforceSso}
                    onCheckedChange={(v) => set("enforceSso", v)}
                  />
                </div>
                {form.enforceSso && (
                  <div className="space-y-2">
                    <Label>Company domain</Label>
                    <Input
                      value={form.domain}
                      onChange={(e) => set("domain", e.target.value)}
                      placeholder="acme.com"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="sso-jit">Auto-provision accounts</Label>
                    <p className="text-sm text-muted-foreground">
                      Create a Xenboox account for first-time SSO users
                      automatically.
                    </p>
                  </div>
                  <Switch
                    id="sso-jit"
                    checked={form.jitProvisioning}
                    onCheckedChange={(v) => set("jitProvisioning", v)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saveSettings.isPending}>
              {saveSettings.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save SSO Settings
            </Button>
          </div>
          <p className="text-right text-xs text-muted-foreground">
            Changes take effect on the next server restart.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
