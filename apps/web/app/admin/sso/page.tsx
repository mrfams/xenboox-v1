"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Label,
  Switch,
  Separator,
} from "@xenboox/ui";
import {
  Shield,
  Key,
  Globe,
  Settings,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

// ─── Types ────────────────────────────────────────────────────────────────

type SsoProviderType = "azure" | "okta" | "google" | "saml" | "oidc" | "none";

interface SsoFormData {
  enabled: boolean;
  provider: SsoProviderType;
  clientId: string;
  clientSecret: string;
  issuer: string;
  callbackUrl: string;
  domain: string;
  enforceSso: boolean;
  jitProvisioning: boolean;
  samlEntryPoint: string;
  samlCert: string;
}

const DEFAULT_FORM: SsoFormData = {
  enabled: false,
  provider: "none",
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

// ─── Component ────────────────────────────────────────────────────────────

export default function SsoSettingsPage() {
  const [form, setForm] = useState<SsoFormData>(DEFAULT_FORM);
  const [hasChanges, setHasChanges] = useState(false);

  // tRPC queries
  const settingsQuery = trpc.sso.getSettings.useQuery();
  const providersQuery = trpc.sso.getProviders.useQuery();
  const saveMutation = trpc.sso.saveSettings.useMutation();

  // Load settings from server
  useEffect(() => {
    if (settingsQuery.data) {
      const d = settingsQuery.data;
      setForm({
        enabled: d.enabled,
        provider: d.provider as SsoProviderType,
        clientId: d.clientId,
        clientSecret: "", // Don't populate masked secret
        issuer: d.issuer,
        callbackUrl: d.callbackUrl,
        domain: d.domain,
        enforceSso: d.enforceSso,
        jitProvisioning: d.jitProvisioning,
        samlEntryPoint: d.samlEntryPoint,
        samlCert: d.samlCert,
      });
    }
  }, [settingsQuery.data]);

  const update = <K extends keyof SsoFormData>(
    key: K,
    value: SsoFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(form);
      setHasChanges(false);
    } catch {
      // Error handled by tRPC
    }
  };

  const isOidcProvider = ["azure", "okta", "google", "oidc"].includes(
    form.provider,
  );
  const isSaml = form.provider === "saml";
  const isConfigured =
    form.enabled &&
    form.provider !== "none" &&
    form.clientId.length > 0 &&
    form.clientSecret.length > 0;

  const isSaving = saveMutation.isPending;
  const saveError = saveMutation.error?.message;
  const saveSuccess = saveMutation.isSuccess && !hasChanges;

  if (settingsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            SSO Configuration
          </h1>
          <p className="text-muted-foreground">
            Configure Single Sign-On for enterprise identity providers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {settingsQuery.data?.source === "env" && (
            <Badge variant="outline">Managed via Environment Variables</Badge>
          )}
          {isConfigured ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Configured
            </Badge>
          ) : form.enabled ? (
            <Badge variant="destructive">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Incomplete
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Shield className="mr-1 h-3 w-3" />
              Disabled
            </Badge>
          )}
        </div>
      </div>

      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            SSO Status
          </CardTitle>
          <CardDescription>
            Enable Single Sign-On to allow users to authenticate via your
            identity provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Switch
              id="sso-enabled"
              checked={form.enabled}
              onCheckedChange={(v) => update("enabled", v)}
            />
            <Label htmlFor="sso-enabled" className="cursor-pointer">
              {form.enabled ? "SSO is enabled" : "SSO is disabled"}
            </Label>
          </div>
        </CardContent>
      </Card>

      {form.enabled && (
        <>
          {/* Provider Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Identity Provider
              </CardTitle>
              <CardDescription>
                Select your organization&apos;s identity provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(providersQuery.data ?? []).map((p) => (
                  <button
                    key={p.value}
                    onClick={() =>
                      update("provider", p.value as SsoProviderType)
                    }
                    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                      form.provider === p.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <div className="font-medium">{p.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {p.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Provider Configuration */}
          {form.provider !== "none" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Provider Credentials
                </CardTitle>
                <CardDescription>
                  Enter the credentials from your identity provider&apos;s
                  application registration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client-id">Client ID</Label>
                    <Input
                      id="client-id"
                      placeholder="abc123..."
                      value={form.clientId}
                      onChange={(e) => update("clientId", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-secret">Client Secret</Label>
                    <Input
                      id="client-secret"
                      type="password"
                      placeholder={
                        settingsQuery.data?.clientSecret === "***"
                          ? "•••••••• (set)"
                          : "••••••••"
                      }
                      value={form.clientSecret}
                      onChange={(e) => update("clientSecret", e.target.value)}
                    />
                    {settingsQuery.data?.clientSecret === "***" &&
                      !form.clientSecret && (
                        <p className="text-xs text-muted-foreground">
                          Secret is set. Leave blank to keep current value.
                        </p>
                      )}
                  </div>
                </div>

                {isOidcProvider && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="issuer">Issuer URL</Label>
                      <Input
                        id="issuer"
                        placeholder="https://login.microsoftonline.com/{tenant-id}/v2.0"
                        value={form.issuer}
                        onChange={(e) => update("issuer", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="callback-url">Callback URL</Label>
                      <Input
                        id="callback-url"
                        placeholder="https://app.xenboox.com/api/auth/callback/sso"
                        value={form.callbackUrl}
                        onChange={(e) => update("callbackUrl", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Configure this URL in your identity provider&apos;s
                        redirect URI settings
                      </p>
                    </div>
                  </>
                )}

                {isSaml && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="saml-entry">SAML Entry Point</Label>
                      <Input
                        id="saml-entry"
                        placeholder="https://idp.example.com/sso/saml"
                        value={form.samlEntryPoint}
                        onChange={(e) =>
                          update("samlEntryPoint", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="saml-cert">SAML Certificate (PEM)</Label>
                      <Input
                        id="saml-cert"
                        placeholder="-----BEGIN CERTIFICATE-----..."
                        value={form.samlCert}
                        onChange={(e) => update("samlCert", e.target.value)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Domain & Policies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Policies
              </CardTitle>
              <CardDescription>
                Configure SSO enforcement and user provisioning policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Restricted Domain</Label>
                <Input
                  id="domain"
                  placeholder="acme.com"
                  value={form.domain}
                  onChange={(e) => update("domain", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Only users with this email domain will be required to use SSO.
                  Leave blank for all users.
                </p>
              </div>

              <Separator />

              <div className="flex items-center gap-4">
                <Switch
                  id="enforce-sso"
                  checked={form.enforceSso}
                  onCheckedChange={(v) => update("enforceSso", v)}
                />
                <div>
                  <Label htmlFor="enforce-sso" className="cursor-pointer">
                    Enforce SSO for domain users
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Disable password login for users with the restricted domain.
                    They must use SSO.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Switch
                  id="jit-provisioning"
                  checked={form.jitProvisioning}
                  onCheckedChange={(v) => update("jitProvisioning", v)}
                />
                <div>
                  <Label htmlFor="jit-provisioning" className="cursor-pointer">
                    Just-in-time user provisioning
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create user accounts on first SSO login. Users
                    are assigned the &quot;member&quot; role by default.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Environment Variables Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Environment Variables
              </CardTitle>
              <CardDescription>
                These environment variables can override the UI settings in your
                deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                <div className="space-y-1 text-muted-foreground">
                  <div>
                    <span className="text-green-600">SSO_ENABLED</span>=
                    {form.enabled ? "true" : "false"}
                  </div>
                  <div>
                    <span className="text-green-600">SSO_PROVIDER</span>=
                    {form.provider}
                  </div>
                  {form.clientId && (
                    <div>
                      <span className="text-green-600">SSO_CLIENT_ID</span>=***
                    </div>
                  )}
                  {form.issuer && (
                    <div>
                      <span className="text-green-600">SSO_ISSUER</span>=
                      {form.issuer}
                    </div>
                  )}
                  {form.domain && (
                    <div>
                      <span className="text-green-600">SSO_DOMAIN</span>=
                      {form.domain}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3">
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
            {saveSuccess && (
              <p className="text-sm text-green-600">
                Settings saved successfully
              </p>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || (!hasChanges && !saveMutation.isError)}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
