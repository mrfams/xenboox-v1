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

import { getSsoSettings } from "@/lib/sso-settings";
import { logger } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────

export type SsoProviderType = "azure" | "okta" | "saml" | "oidc" | "none";

// SAML is supported via an OIDC bridge (most SAML IdPs expose OIDC endpoints).
// Generic OIDC covers Keycloak, Auth0, OneLogin, PingFederate, etc.

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
 * Load SSO configuration. Priority: config file > env vars.
 */
export function loadSsoConfig(): SsoConfig {
  // 1. Try config file first (admin UI writes here)
  const { settings, source } = getSsoSettings();

  if (source === "config" || settings.enabled) {
    return {
      enabled: settings.enabled,
      provider: settings.provider as SsoProviderType,
      clientId: settings.clientId || undefined,
      clientSecret: settings.clientSecret || undefined,
      issuer: settings.issuer || undefined,
      callbackUrl: settings.callbackUrl || undefined,
    };
  }

  // 2. Fall back to env vars
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
    logger.warn(
      "[sso] SSO enabled but missing SSO_CLIENT_ID or SSO_CLIENT_SECRET",
    );
    return [];
  }

  switch (config.provider) {
    case "azure":
      return buildAzureAdProvider(config);
    case "okta":
      return buildOktaProvider(config);
    case "oidc":
      return buildGenericOidcProvider(config);
    case "saml":
      // SAML via OIDC bridge: most SAML IdPs (Keycloak, Auth0, OneLogin, Azure AD)
      // expose an OIDC Discovery endpoint. Configure SSO_ISSUER to the OIDC
      // discovery URL and the SAML settings in the admin console for JIT
      // provisioning and domain enforcement.
      return buildGenericOidcProvider(config);
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
    logger.warn(
      "[sso] Azure AD requires SSO_ISSUER (e.g., https://login.microsoftonline.com/{tenant-id}/v2.0)",
    );
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AzureAD = require("next-auth/providers/azure-ad").default;

  return [
    AzureAD({
      clientId: config.clientId!,
      clientSecret: config.clientSecret!,
      issuer: config.issuer,
      // callbackUrl tells the IdP where to redirect after authentication
      // This is the URL that must be registered in the Azure AD app's redirect URIs
      callbacks: {
        async redirectTo({ baseUrl }: { baseUrl: string }) {
          return config.callbackUrl ?? `${baseUrl}/api/auth/callback/sso`;
        },
      },
      authorization: {
        params: {
          scope: "openid profile email User.Read",
          response_type: "code",
          // redirect_uri is derived from the callback URL
          ...(config.callbackUrl ? { redirect_uri: config.callbackUrl } : {}),
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
    logger.warn(
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
      // callbackUrl tells the IdP where to redirect after authentication
      callbacks: {
        async redirectTo({ baseUrl }: { baseUrl: string }) {
          return config.callbackUrl ?? `${baseUrl}/api/auth/callback/sso`;
        },
      },
      authorization: {
        params: {
          scope: "openid profile email",
          response_type: "code",
          ...(config.callbackUrl ? { redirect_uri: config.callbackUrl } : {}),
        },
      },
    }),
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Generic OIDC provider — covers Keycloak, Auth0, OneLogin, PingFederate,
 * and any SAML-to-OIDC bridge.
 *
 * Required env vars:
 * - SSO_CLIENT_ID
 * - SSO_CLIENT_SECRET
 * - SSO_ISSUER (OIDC Discovery URL, e.g., https://keycloak.example.com/realms/myorg)
 */
function buildGenericOidcProvider(config: SsoConfig): Provider[] {
  if (!config.issuer) {
    logger.warn(
      "[sso] Generic OIDC/SAML requires SSO_ISSUER (OIDC Discovery URL)",
    );
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const OIDC = require("next-auth/providers/oidc").default;

  return [
    OIDC({
      clientId: config.clientId!,
      clientSecret: config.clientSecret!,
      issuer: config.issuer,
      checks: ["pkce", "state"],
      authorization: {
        params: {
          scope: "openid profile email",
          response_type: "code",
        },
      },
    }),
  ];
}

/**
 * Check if SSO is enabled.
 */
export function isSsoEnabled(): boolean {
  const { settings } = getSsoSettings();
  return settings.enabled && settings.provider !== "none";
}

/**
 * Get the SSO provider display name for the login page.
 */
export function getSsoDisplayName(): string | null {
  const { settings, source } = getSsoSettings();
  if (!settings.enabled || settings.provider === "none") return null;

  // Prefer config-file name (admin-configured)
  if (source === "config") {
    switch (settings.provider) {
      case "azure":
        return "Sign in with Microsoft";
      case "okta":
        return "Sign in with Okta";
      case "saml":
        return "Sign in with SSO";
      case "oidc":
        return "Sign in with Company SSO";
      default:
        return "Sign in with SSO";
    }
  }

  // Env-var fallback
  const provider = process.env.SSO_PROVIDER;
  switch (provider) {
    case "azure":
      return "Sign in with Microsoft";
    case "okta":
      return "Sign in with Okta";
    case "saml":
      return "Sign in with SSO";
    case "oidc":
      return "Sign in with Company SSO";
    default:
      return "Sign in with SSO";
  }
}
