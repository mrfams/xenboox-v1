/**
 * SSO Integration — P5
 *
 * Provides SAML and OIDC provider configurations for Auth.js v5.
 * Enterprise customers can configure SSO via environment variables or admin UI.
 *
 * Supported providers:
 * - Azure AD (OIDC)
 * - Okta (OIDC)
 * - Google Workspace (OIDC)
 * - Generic SAML 2.0 (via @auth/saml)
 * - Generic OIDC (via @auth/oidc)
 *
 * Environment variables:
 * - SSO_ENABLED=true
 * - SSO_PROVIDER=azure|okta|google|saml|oidc
 * - SSO_CLIENT_ID, SSO_CLIENT_SECRET, SSO_ISSUER
 * - SSO_CALLBACK_URL
 * - SAML_ENTRY_POINT, SAML_ISSUER, SAML_CERT (for SAML)
 */

import type { Provider } from "next-auth/providers";

// ─── Types ────────────────────────────────────────────────────────────────

export type SsoProviderType =
  | "azure"
  | "okta"
  | "google"
  | "saml"
  | "oidc"
  | "none";

export interface SsoConfig {
  enabled: boolean;
  provider: SsoProviderType;
  clientId?: string;
  clientSecret?: string;
  issuer?: string;
  callbackUrl?: string;
  // SAML-specific
  samlEntryPoint?: string;
  samlCert?: string;
  // OIDC-specific
  oidcAuthorizationUrl?: string;
  oidcTokenUrl?: string;
  oidcUserInfoUrl?: string;
}

export interface SsoAdminConfig {
  enabled: boolean;
  provider: SsoProviderType;
  displayName: string;
  iconUrl?: string;
  domain?: string; // Restrict to email domain (e.g., "acme.com")
  enforceSso: boolean; // If true, password login is disabled for SSO domain users
  jitProvisioning: boolean; // Just-in-time user creation on first SSO login
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
    samlEntryPoint: process.env.SAML_ENTRY_POINT,
    samlCert: process.env.SAML_CERT,
    oidcAuthorizationUrl: process.env.OIDC_AUTHORIZATION_URL,
    oidcTokenUrl: process.env.OIDC_TOKEN_URL,
    oidcUserInfoUrl: process.env.OIDC_USER_INFO_URL,
  };
}

// ─── Provider Factory ─────────────────────────────────────────────────────

/**
 * Build Auth.js provider from SSO config.
 * Returns null if SSO is not enabled or config is incomplete.
 *
 * NOTE: This function returns a provider config object that can be spread
 * into the NextAuth providers array. The actual `import(...)` of
 * `next-auth/providers/*` must happen at the top level due to bundler
 * requirements. This function provides the config shape.
 */
export function buildSsoProvider(
  config: SsoConfig,
): Omit<Provider, "id"> | null {
  if (!config.enabled || config.provider === "none") return null;

  switch (config.provider) {
    case "azure":
    case "okta":
    case "oidc": {
      // Generic OIDC provider config
      // In practice, use: import AzureAD from "next-auth/providers/azure-ad"
      // or: import Okta from "next-auth/providers/okta"
      if (!config.clientId || !config.clientSecret || !config.issuer) {
        console.warn(
          "[sso] OIDC provider configured but missing clientId/clientSecret/issuer",
        );
        return null;
      }

      return {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        issuer: config.issuer,
        authorization: {
          params: {
            scope: "openid profile email",
            response_type: "code",
          },
        },
      };
    }

    case "google": {
      if (!config.clientId || !config.clientSecret) {
        console.warn(
          "[sso] Google provider configured but missing clientId/clientSecret",
        );
        return null;
      }

      return {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      };
    }

    case "saml": {
      // SAML requires @auth/saml adapter
      // Config is passed to the SAML provider
      if (!config.samlEntryPoint || !config.clientId || !config.clientSecret) {
        console.warn(
          "[sso] SAML provider configured but missing entry point or credentials",
        );
        return null;
      }

      return {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        issuer: config.issuer ?? "xenboox",
      };
    }

    default:
      return null;
  }
}

// ─── Admin Config Defaults ────────────────────────────────────────────────

export const DEFAULT_SSO_ADMIN_CONFIG: SsoAdminConfig = {
  enabled: false,
  provider: "none",
  displayName: "Enterprise SSO",
  enforceSso: false,
  jitProvisioning: true,
};

// ─── Domain Mapping ───────────────────────────────────────────────────────

const PROVIDER_DOMAINS: Record<string, SsoProviderType> = {
  "microsoftonline.com": "azure",
  "okta.com": "okta",
  "google.com": "google",
};

/**
 * Detect SSO provider from email domain.
 */
export function detectProviderFromEmail(email: string): SsoProviderType | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  // Check known enterprise domains
  for (const [providerDomain, providerType] of Object.entries(
    PROVIDER_DOMAINS,
  )) {
    if (domain.endsWith(providerDomain)) return providerType;
  }

  return null;
}

/**
 * Check if a user's email domain matches an SSO configuration.
 */
export function isSsoDomain(email: string, config: SsoAdminConfig): boolean {
  if (!config.enabled || !config.domain) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === config.domain.toLowerCase();
}
