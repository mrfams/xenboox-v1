"use client";

import { useState, useEffect } from "react";
import {
  Palette,
  Globe,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  Upload,
  Eye,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  Textarea,
  Separator,
} from "@/components/ui";
import { toast } from "sonner";

// ─── Color Picker Field ─────────────────────────────────────────────────

function ColorField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-md border"
        />
      </div>
      <div className="flex-1">
        <Label className="text-xs font-medium">{label}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="mt-0.5 h-8 text-xs font-mono"
        />
      </div>
    </div>
  );
}

// ─── Preview Banner ───────────────────────────────────────────────────

function BrandPreview({
  displayName,
  logoUrl,
  primaryColor,
}: {
  displayName: string;
  logoUrl: string | null;
  primaryColor: string;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: primaryColor ? `${primaryColor}40` : undefined }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: primaryColor || "hsl(var(--primary))" }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-sm">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-6 w-6 object-contain" />
          ) : (
            displayName?.charAt(0) || "X"
          )}
        </div>
        <span className="text-sm font-semibold text-white">
          {displayName || "Your Firm Name"}
        </span>
      </div>
      <div className="bg-card px-4 py-3 text-xs text-muted-foreground">
        <p>Client portal preview — branded with your firm&apos;s identity</p>
        <p className="mt-1">
          <span className="text-primary">Dashboard</span> · Reports · Invoices
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────

export default function BrandingPage() {
  const [displayName, setDisplayName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [hideXenboox, setHideXenboox] = useState(false);
  const [footerText, setFooterText] = useState("");
  const [customCss, setCustomCss] = useState("");
  const [colors, setColors] = useState({
    primary: "#1a73e8",
    primaryForeground: "#ffffff",
    accent: "#f0f0f0",
    accentForeground: "#111111",
    destructive: "#ef4444",
    muted: "#f5f5f5",
    border: "#e5e7eb",
  });

  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");

  const {
    data: config,
    refetch: refetchConfig,
    isLoading: loadingConfig,
  } = trpc.branding.getConfig.useQuery();
  const { data: domains, refetch: refetchDomains } =
    trpc.branding.listDomains.useQuery();
  const { data: access } = trpc.branding.checkAccess.useQuery();

  const updateConfig = trpc.branding.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Branding configuration saved");
      refetchConfig();
    },
    onError: (err) => toast.error(err.message),
  });

  const addDomain = trpc.branding.addDomain.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchDomains();
      setAddDomainOpen(false);
      setNewDomain("");
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyDomain = trpc.branding.verifyDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain verified successfully");
      refetchDomains();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeDomain = trpc.branding.removeDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain removed");
      refetchDomains();
    },
    onError: (err) => toast.error(err.message),
  });

  // Load existing config
  useEffect(() => {
    if (config) {
      setDisplayName(config.displayName || "");
      setLogoUrl(config.logoUrl || "");
      setFaviconUrl(config.faviconUrl || "");
      setIsActive(config.isActive);
      setHideXenboox(config.hideXenbooxBranding);
      setFooterText(config.footerText || "");
      setCustomCss(config.customCss || "");
      if (config.colorScheme) {
        setColors({
          primary: config.colorScheme.primary || "#1a73e8",
          primaryForeground: config.colorScheme.primaryForeground || "#ffffff",
          accent: config.colorScheme.accent || "#f0f0f0",
          accentForeground: config.colorScheme.accentForeground || "#111111",
          destructive: config.colorScheme.destructive || "#ef4444",
          muted: config.colorScheme.muted || "#f5f5f5",
          border: config.colorScheme.border || "#e5e7eb",
        });
      }
    }
  }, [config]);

  const handleSave = () => {
    updateConfig.mutate({
      displayName: displayName || "My Firm",
      isActive,
      logoUrl: logoUrl || null,
      faviconUrl: faviconUrl || null,
      colorScheme: colors,
      hideXenbooxBranding: hideXenboox,
      footerText: footerText || null,
      customCss: customCss || null,
    });
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading branding...
      </div>
    );
  }

  if (!access?.allowed) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">White-Label Branding</h1>
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/10">
          <CardContent className="flex items-start gap-4 p-6">
            <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                Firm Plan Required
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                White-label branding is available exclusively on the Firm plan.
                Upgrade your organization to access custom branding, logo, color
                schemes, and custom domains.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">White-Label Branding</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customize the look and feel for your firm and clients.
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateConfig.isPending}>
          {updateConfig.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Branding
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Branding Config */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" />
                Brand Identity
              </CardTitle>
              <CardDescription>
                Your branding is shown to clients when they access their portal
                through your firm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm font-medium">Enable Branding</Label>
                  <p className="text-xs text-muted-foreground">
                    Replace Xenboox branding with your firm&apos;s identity
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Firm Name"
                />
              </div>

              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://your-firm.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  Square image recommended (64x64 or larger). PNG with
                  transparency preferred.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Favicon URL</Label>
                <Input
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://your-firm.com/favicon.ico"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm font-medium">
                    Hide &quot;Powered by Xenboox&quot;
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Only available when branding is active
                  </p>
                </div>
                <Switch
                  checked={hideXenboox}
                  onCheckedChange={setHideXenboox}
                  disabled={!isActive}
                />
              </div>

              <div className="space-y-2">
                <Label>Footer Text</Label>
                <Input
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Powered by Your Firm &middot; Terms &middot; Privacy"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" />
                Color Scheme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ColorField
                label="Primary Color"
                value={colors.primary}
                onChange={(v) => setColors({ ...colors, primary: v })}
              />
              <ColorField
                label="Primary Foreground"
                value={colors.primaryForeground}
                onChange={(v) => setColors({ ...colors, primaryForeground: v })}
              />
              <ColorField
                label="Accent Color"
                value={colors.accent}
                onChange={(v) => setColors({ ...colors, accent: v })}
              />
              <ColorField
                label="Accent Foreground"
                value={colors.accentForeground}
                onChange={(v) => setColors({ ...colors, accentForeground: v })}
              />
              <ColorField
                label="Destructive (errors/alerts)"
                value={colors.destructive}
                onChange={(v) => setColors({ ...colors, destructive: v })}
              />
              <ColorField
                label="Muted Background"
                value={colors.muted}
                onChange={(v) => setColors({ ...colors, muted: v })}
              />
              <ColorField
                label="Border Color"
                value={colors.border}
                onChange={(v) => setColors({ ...colors, border: v })}
              />
            </CardContent>
          </Card>
        </div>

        {/* Preview + Custom Domains */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BrandPreview
                displayName={displayName}
                logoUrl={logoUrl}
                primaryColor={colors.primary}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4" />
                  Custom Domains
                </CardTitle>
                <CardDescription>
                  Serve your client portal under your own domain.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddDomainOpen(true)}
              >
                <Plus className="mr-1 h-3 w-3" /> Add Domain
              </Button>
            </CardHeader>
            <CardContent>
              {domains && domains.length > 0 ? (
                <div className="space-y-2">
                  {domains.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{d.domain}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {d.verified ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="h-3 w-3" /> Verified
                              </span>
                            ) : (
                              <span className="text-amber-600">
                                Pending verification
                              </span>
                            )}
                            {d.isPrimary && (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                Primary
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!d.verified && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              verifyDomain.mutate({ domainId: d.id })
                            }
                          >
                            Verify
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => {
                            if (confirm("Remove this domain?")) {
                              removeDomain.mutate({ domainId: d.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  <Globe className="mx-auto h-8 w-8 mb-2 text-muted-foreground/40" />
                  <p>No custom domains configured.</p>
                  <p className="text-xs mt-1">
                    Add a domain to serve the client portal under your own web
                    address.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom CSS</CardTitle>
              <CardDescription>
                Advanced: inject custom CSS for additional styling.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                placeholder="/* Custom styles */"
                rows={4}
                className="font-mono text-xs"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Domain Dialog */}
      <Dialog open={addDomainOpen} onOpenChange={setAddDomainOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newDomain.trim()) {
                addDomain.mutate({ domain: newDomain.trim() });
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="portal.yourfirm.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter a subdomain or custom domain (e.g., clients.myfirm.com)
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAddDomainOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addDomain.isPending}>
                {addDomain.isPending ? "Adding..." : "Add Domain"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
