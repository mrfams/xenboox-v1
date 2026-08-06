/**
 * SSO Settings — Node.js-only file-based config operations.
 *
 * This module uses `fs`/`path` and is NOT safe for Edge/Middleware.
 * Import only in Node.js API routes (tRPC routers, server actions).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { SsoSettings } from "@/lib/sso-settings";

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

// ─── Config File Operations ───────────────────────────────────────────────

function getConfigPath(): string {
  const configDir = join(process.cwd(), ".config");
  return join(configDir, "sso-settings.json");
}

function readConfigFile(): SsoSettings | null {
  try {
    const configPath = getConfigPath();
    if (!existsSync(configPath)) return null;
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return null;
  }
}

function writeConfigFile(settings: SsoSettings): void {
  const configDir = join(process.cwd(), ".config");
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  const configPath = join(configDir, "sso-settings.json");
  writeFileSync(configPath, JSON.stringify(settings, null, 2), "utf-8");
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Get SSO settings with file-based config support (Node.js only).
 * Priority: config file > env vars > defaults.
 */
export function getSsoSettingsWithFile(): {
  settings: SsoSettings;
  source: "config" | "env" | "default";
} {
  const configFile = readConfigFile();
  if (configFile) {
    return { settings: configFile, source: "config" };
  }

  const envSettings: SsoSettings = {
    enabled: process.env.SSO_ENABLED === "true",
    provider: (process.env.SSO_PROVIDER ?? "none") as SsoSettings["provider"],
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

  if (envSettings.enabled) {
    return { settings: envSettings, source: "env" };
  }

  return { settings: DEFAULT_SETTINGS, source: "default" };
}

/**
 * Save SSO settings to the config file (Node.js only).
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
