"use client";

import { useState } from "react";
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
  Users,
  AlertTriangle,
  CheckCircle2,
  Settings,
  ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

type SsoProviderType = "azure" | "okta" | "google" | "saml" | "oidc" | "none";

interface SsoSettings {
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

const PROVIDERS: Array<{
  value: SsoProviderType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: "azure",
    label: "Azure AD",
    description: "Microsoft Entra ID (formerly Azure AD)",
    icon: "🔷",
  },
  {
    value: "okta",
    label: "Okta",
    description: "Okta workforce identity",
    icon: "🔵",
  },
  {
    value: "google",
    label: "Google Workspace",
    description: "Google Cloud Identity",
    icon: "🔴",
  },
  {
    value: "saml",
    label: "SAML 2.0",
    description: "Generic SAML 2.0 identity provider",
    icon: "🔐",
  },
  {
    value: "oidc",
    label: "OpenID Connect",
    description: "Generic OIDC identity provider",
    icon: "🌐",
  },
];

const DEFAULT_SETTINGS: SsoSettings = {
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
  const [settings, setSettings] = useState<SsoSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof SsoSettings>(
    key: K,
    value: SsoSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    // TODO: Wire to tRPC mutation when SSO settings router is created
    console.log("Saving SSO settings:", settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isOidcProvider = ["azure", "okta", "google", "oidc"].includes(
    settings.provider,
  );
  const isSaml = settings.provider === "saml";
  const isConfigured =
    settings.enabled &&
    settings.provider !== "none" &&
    settings.clientId &&
    settings.clientSecret;

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
          {isConfigured ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Configured
            </Badge>
          ) : settings.enabled ? (
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
              checked={settings.enabled}
              onCheckedChange={(v) => update("enabled", v)}
            />
            <Label htmlFor="sso-enabled" className="cursor-pointer">
              {settings.enabled ? "SSO is enabled" : "SSO is disabled"}
            </Label>
          </div>
        </CardContent>
      </Card>

      {settings.enabled && (
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
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => update("provider", p.value)}
                    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                      settings.provider === p.value
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
          {settings.provider !== "none" && (
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
                      value={settings.clientId}
                      onChange={(e) => update("clientId", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-secret">Client Secret</Label>
                    <Input
                      id="client-secret"
                      type="password"
                      placeholder="••••••••"
                      value={settings.clientSecret}
                      onChange={(e) => update("clientSecret", e.target.value)}
                    />
                  </div>
                </div>

                {isOidcProvider && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="issuer">Issuer URL</Label>
                      <Input
                        id="issuer"
                        placeholder="https://login.microsoftonline.com/{tenant-id}/v2.0"
                        value={settings.issuer}
                        onChange={(e) => update("issuer", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="callback-url">Callback URL</Label>
                      <Input
                        id="callback-url"
                        placeholder="https://app.xenboox.com/api/auth/callback/sso"
                        value={settings.callbackUrl}
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
                        value={settings.samlEntryPoint}
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
                        value={settings.samlCert}
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
                  value={settings.domain}
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
                  checked={settings.enforceSso}
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
                  checked={settings.jitProvisioning}
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
                These environment variables must be set in your deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                <div className="space-y-1 text-muted-foreground">
                  <div>
                    <span className="text-green-600">SSO_ENABLED</span>=
                    {settings.enabled ? "true" : "false"}
                  </div>
                  <div>
                    <span className="text-green-600">SSO_PROVIDER</span>=
                    {settings.provider}
                  </div>
                  {settings.clientId && (
                    <div>
                      <span className="text-green-600">SSO_CLIENT_ID</span>=***
                    </div>
                  )}
                  {settings.clientSecret && (
                    <div>
                      <span className="text-green-600">SSO_CLIENT_SECRET</span>
                      =***
                    </div>
                  )}
                  {settings.issuer && (
                    <div>
                      <span className="text-green-600">SSO_ISSUER</span>=
                      {settings.issuer}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!isConfigured && settings.enabled}
            >
              {saved ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Saved
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
