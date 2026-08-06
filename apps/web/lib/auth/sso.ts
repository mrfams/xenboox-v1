/**
 * SSO Integration — Enterprise SSO Providers for Auth.js v5
 *
 * Provides SSO provider instances that can be spread into the NextAuth providers array.
 * Enterprise customers configure SSO via environment variables.
 *
 * Supported providers:
 * - Azure AD (OIDC) — via next-auth/providers/azure-ad
 * - Okta (OIDC) — via next-auth/providers/okta
 *
 * Environment variables:
 * - SSO_ENABLED=true
 * - SSO_PROVIDER=azure|okta
 * - SSO_CLIENT_ID, SSO_CLIENT_SECRET, SSO_ISSUER
 * - SSO_CALLBACK_URL (optional)
 */

import type { Provider } from "next-auth/providers";

// ─── Types ────────────────────────────────────────────────────────────────

export type SsoProviderType = "azure" | "okta" | "none";

// Note: Generic OIDC is not supported in this version.
// For other OIDC providers (Keycloak, Auth0, etc.), use a specific provider.

export interface SsoConfig {
  enabled: boolean;
  provider: SsoProviderType;
  clientId?: string;
  clientSecret?: string;
  issuer?: string;
  callbackUrl?: string;
}

// ─── Config Loader ────────────────────────────────────────────────────────

/**
 * Load SSO configuration from environment variables.
 */
export function loadSsoConfig(): SsoConfig {
  const enabled = process.env.SSO_ENABLED === "true";
  const provider = (process.env.SSO_PROVIDER ?? "none") as SsoProviderType;

  return {
    enabled,
    provider,
    clientId: process.env.SSO_CLIENT_ID,
    clientSecret: process.env.SSO_CLIENT_SECRET,
    issuer: process.env.SSO_ISSUER,
    callbackUrl: process.env.SSO_CALLBACK_URL,
  };
}

// ─── Provider Factory ─────────────────────────────────────────────────────

/**
 * Build SSO provider(s) from environment configuration.
 * Returns an array of providers to spread into the NextAuth providers array.
 * Returns empty array if SSO is not enabled or config is incomplete.
 */
export function buildSsoProviders(): Provider[] {
  const config = loadSsoConfig();

  if (!config.enabled || config.provider === "none") return [];
  if (!config.clientId || !config.clientSecret) {
    console.warn(
      "[sso] SSO enabled but missing SSO_CLIENT_ID or SSO_CLIENT_SECRET",
    );
    return [];
  }

  switch (config.provider) {
    case "azure":
      return buildAzureAdProvider(config);
    case "okta":
      return buildOktaProvider(config);
    default:
      return [];
  }
}

/**
 * Azure AD provider — uses next-auth/providers/azure-ad.
 *
 * Required env vars:
 * - SSO_CLIENT_ID (Application/client ID from Azure portal)
 * - SSO_CLIENT_SECRET (Client secret from Azure portal)
 * - SSO_ISSUER (e.g., https://login.microsoftonline.com/{tenant-id}/v2.0)
 */
function buildAzureAdProvider(config: SsoConfig): Provider[] {
  if (!config.issuer) {
    console.warn(
      "[sso] Azure AD requires SSO_ISSUER (e.g., https://login.microsoftonline.com/{tenant-id}/v2.0)",
    );
    return [];
  }

  // Dynamic import to avoid bundling when not used
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AzureAD = require("next-auth/providers/azure-ad").default;

  return [
    AzureAD({
      clientId: config.clientId!,
      clientSecret: config.clientSecret!,
      issuer: config.issuer,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
          response_type: "code",
        },
      },
    }),
  ];
}

/**
 * Okta provider — uses next-auth/providers/okta.
 *
 * Required env vars:
 * - SSO_CLIENT_ID (Client ID from Okta app)
 * - SSO_CLIENT_SECRET (Client secret from Okta app)
 * - SSO_ISSUER (e.g., https://your-domain.okta.com/oauth2/default)
 */
function buildOktaProvider(config: SsoConfig): Provider[] {
  if (!config.issuer) {
    console.warn(
      "[sso] Okta requires SSO_ISSUER (e.g., https://your-domain.okta.com/oauth2/default)",
    );
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Okta = require("next-auth/providers/okta").default;

  return [
    Okta({
      clientId: config.clientId!,
      clientSecret: config.clientSecret!,
      issuer: config.issuer,
      authorization: {
        params: {
          scope: "openid profile email",
          response_type: "code",
        },
      },
    }),
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Check if SSO is enabled.
 */
export function isSsoEnabled(): boolean {
  return (
    process.env.SSO_ENABLED === "true" && process.env.SSO_PROVIDER !== "none"
  );
}

/**
 * Get the SSO provider display name for the login page.
 */
export function getSsoDisplayName(): string | null {
  if (!isSsoEnabled()) return null;

  const provider = process.env.SSO_PROVIDER;
  switch (provider) {
    case "azure":
      return "Sign in with Microsoft";
    case "okta":
      return "Sign in with Okta";
    default:
      return "Sign in with SSO";
  }
}
