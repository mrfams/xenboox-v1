/**
 * SSO Settings Storage — Read/write SSO configuration.
 *
 * In production, this would be a database table. For now, uses a JSON config
 * file with env-var fallback (enterprise customers set env vars in deployment).
 *
 * The config file path is: .sso-config.json (in the project root)
 * This file is gitignored and never committed.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

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

// ─── Config File Path ─────────────────────────────────────────────────────

const CONFIG_DIR = join(process.cwd(), ".config");
const CONFIG_PATH = join(CONFIG_DIR, "sso-settings.json");

// ─── Config File Operations ───────────────────────────────────────────────

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readConfigFile(): SsoSettings | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    // Merge with defaults to handle schema evolution
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return null;
  }
}

function writeConfigFile(settings: SsoSettings): void {
  ensureConfigDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(settings, null, 2), "utf-8");
}

// ─── Env Var Fallback ─────────────────────────────────────────────────────

function settingsFromEnv(): SsoSettings {
  const enabled = process.env.SSO_ENABLED === "true";
  const provider = (process.env.SSO_PROVIDER ?? "none") as SsoProviderType;

  return {
    enabled,
    provider,
    clientId: process.env.SSO_CLIENT_ID ?? "",
    clientSecret: process.env.SSO_CLIENT_SECRET ?? "",
    issuer: process.env.SSO_ISSUER ?? "",
    callbackUrl: process.env.SSO_CALLBACK_URL ?? "",
    domain: process.env.SSO_DOMAIN ?? "",
    enforceSso: process.env.SSO_ENFORCE === "true",
    jitProvisioning: process.env.SSO_JIT !== "false", // default true
    samlEntryPoint: process.env.SAML_ENTRY_POINT ?? "",
    samlCert: process.env.SAML_CERT ?? "",
    updatedAt: null,
    updatedBy: null,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Get SSO settings. Priority: config file > env vars > defaults.
 */
export function getSsoSettings(): SsoSettingsResponse {
  // 1. Try config file first (admin UI writes here)
  const configFile = readConfigFile();
  if (configFile) {
    return { settings: configFile, source: "config" };
  }

  // 2. Fall back to env vars
  const envSettings = settingsFromEnv();
  if (envSettings.enabled) {
    return { settings: envSettings, source: "env" };
  }

  // 3. Defaults
  return { settings: DEFAULT_SETTINGS, source: "default" };
}

/**
 * Save SSO settings to the config file.
 * Returns the saved settings with timestamp.
 */
export function saveSsoSettings(
  settings: Partial<SsoSettings>,
  updatedBy: string,
): SsoSettings {
  const current = readConfigFile() ?? DEFAULT_SETTINGS;

  const merged: SsoSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  writeConfigFile(merged);
  return merged;
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
