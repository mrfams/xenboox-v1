/**
 * SSO Settings — Edge-compatible, env-var-only SSO configuration.
 *
 * Used by middleware (Edge Runtime) and auth providers.
 * File-based config (for admin UI) lives in a separate Node.js-only module.
 */

// ─── Types ────────────────────────────────────────────────────────────────

export type SsoProviderType =
  | "azure"
  | "okta"
  | "google"
  | "saml"
  | "oidc"
  | "none";

export interface SsoSettings {
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
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface SsoSettingsResponse {
  settings: SsoSettings;
  source: "config" | "env" | "default";
}

// ─── Defaults ─────────────────────────────────────────────────────────────

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
  updatedAt: null,
  updatedBy: null,
};

// ─── Settings from Environment Variables (Edge-safe) ──────────────────────

function settingsFromEnv(): SsoSettings {
  return {
    enabled: process.env.SSO_ENABLED === "true",
    provider: (process.env.SSO_PROVIDER ?? "none") as SsoProviderType,
    clientId: process.env.SSO_CLIENT_ID ?? "",
    clientSecret: process.env.SSO_CLIENT_SECRET ?? "",
    issuer: process.env.SSO_ISSUER ?? "",
    callbackUrl: process.env.SSO_CALLBACK_URL ?? "",
    domain: process.env.SSO_DOMAIN ?? "",
    enforceSso: process.env.SSO_ENFORCE === "true",
    jitProvisioning: process.env.SSO_JIT !== "false",
    samlEntryPoint: process.env.SAML_ENTRY_POINT ?? "",
    samlCert: process.env.SAML_CERT ?? "",
    updatedAt: null,
    updatedBy: null,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Get SSO settings. Reads from env vars only (Edge-safe).
 * For file-based config (admin UI), use `getSsoSettingsWithFile()` from
 * `lib/sso-settings-node.ts` in Node.js API routes only.
 */
export function getSsoSettings(): SsoSettingsResponse {
  const envSettings = settingsFromEnv();
  if (envSettings.enabled) {
    return { settings: envSettings, source: "env" };
  }
  return { settings: DEFAULT_SETTINGS, source: "default" };
}

/**
 * Check if SSO is enabled (convenience function).
 */
export function isSsoEnabled(): boolean {
  const { settings } = getSsoSettings();
  return settings.enabled && settings.provider !== "none";
}

/**
 * Get the display name for the configured SSO provider.
 */
export function getSsoDisplayName(): string | null {
  const { settings } = getSsoSettings();
  if (!settings.enabled || settings.provider === "none") return null;

  switch (settings.provider) {
    case "azure":
      return "Sign in with Microsoft";
    case "okta":
      return "Sign in with Okta";
    case "google":
      return "Sign in with Google";
    case "saml":
      return "Sign in with SSO";
    case "oidc":
      return "Sign in with SSO";
    default:
      return "Sign in with SSO";
  }
}

/**
 * Check if a domain is SSO-enforced.
 */
export function isDomainEnforced(email: string): boolean {
  const { settings } = getSsoSettings();
  if (!settings.enabled || !settings.enforceSso || !settings.domain) {
    return false;
  }
  return email.endsWith(`@${settings.domain}`);
}
