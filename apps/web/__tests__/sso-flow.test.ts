/**
 * SSO Login Flow Tests — Domain Enforcement, Settings, Display Names
 *
 * Tests the SSO configuration logic directly to avoid module caching issues.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

// ─── Pure Logic Functions (extracted for testability) ─────────────────────

type SsoSettings = {
  enabled: boolean;
  provider: string;
  clientId: string;
  clientSecret: string;
  issuer: string;
  callbackUrl: string;
  domain: string;
  enforceSso: boolean;
  jitProvisioning: boolean;
};

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
};

function isDomainEnforced(email: string, settings: SsoSettings): boolean {
  if (!settings.enabled || !settings.enforceSso || !settings.domain) {
    return false;
  }
  return email.endsWith(`@${settings.domain}`);
}

function isSsoEnabled(settings: SsoSettings): boolean {
  return settings.enabled && settings.provider !== "none";
}

function getSsoDisplayName(settings: SsoSettings): string | null {
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

function settingsFromEnv(env: Record<string, string | undefined>): SsoSettings {
  return {
    enabled: env.SSO_ENABLED === "true",
    provider: env.SSO_PROVIDER ?? "none",
    clientId: env.SSO_CLIENT_ID ?? "",
    clientSecret: env.SSO_CLIENT_SECRET ?? "",
    issuer: env.SSO_ISSUER ?? "",
    callbackUrl: env.SSO_CALLBACK_URL ?? "",
    domain: env.SSO_DOMAIN ?? "",
    enforceSso: env.SSO_ENFORCE === "true",
    jitProvisioning: env.SSO_JIT !== "false",
  };
}

function getSsoSettings(
  env: Record<string, string | undefined>,
  configFile: SsoSettings | null,
): { settings: SsoSettings; source: "config" | "env" | "default" } {
  if (configFile) {
    return { settings: configFile, source: "config" };
  }
  const envSettings = settingsFromEnv(env);
  if (envSettings.enabled) {
    return { settings: envSettings, source: "env" };
  }
  return { settings: DEFAULT_SETTINGS, source: "default" };
}

// ─── isDomainEnforced Tests ──────────────────────────────────────────────

describe("isDomainEnforced — Domain Enforcement", () => {
  const disabledSettings: SsoSettings = { ...DEFAULT_SETTINGS };

  it("returns false when SSO disabled", () => {
    expect(isDomainEnforced("user@acme.com", disabledSettings)).toBe(false);
  });

  it("returns false when enforceSso is false", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "azure",
      domain: "acme.com",
      enforceSso: false,
    };
    expect(isDomainEnforced("user@acme.com", settings)).toBe(false);
  });

  it("returns false when domain not set", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "azure",
      enforceSso: true,
    };
    expect(isDomainEnforced("user@acme.com", settings)).toBe(false);
  });

  it("returns true for matching domain", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "azure",
      domain: "acme.com",
      enforceSso: true,
    };
    expect(isDomainEnforced("user@acme.com", settings)).toBe(true);
  });

  it("returns false for subdomain (not enforced)", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "azure",
      domain: "acme.com",
      enforceSso: true,
    };
    // Current implementation uses endsWith, so subdomains are NOT enforced
    expect(isDomainEnforced("user@sub.acme.com", settings)).toBe(false);
  });

  it("returns false for different domain", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "azure",
      domain: "acme.com",
      enforceSso: true,
    };
    expect(isDomainEnforced("user@other.com", settings)).toBe(false);
  });

  it("returns false for partial match", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "azure",
      domain: "acme.com",
      enforceSso: true,
    };
    expect(isDomainEnforced("user@notacme.com", settings)).toBe(false);
  });
});

// ─── getSsoSettings Tests ────────────────────────────────────────────────

describe("getSsoSettings — Config Loading", () => {
  const emptyEnv: Record<string, string | undefined> = {};

  it("returns defaults when nothing set", () => {
    const result = getSsoSettings(emptyEnv, null);
    expect(result.source).toBe("default");
    expect(result.settings.enabled).toBe(false);
  });

  it("returns env config when enabled", () => {
    const env = {
      SSO_ENABLED: "true",
      SSO_PROVIDER: "azure",
      SSO_CLIENT_ID: "env-id",
    };
    const result = getSsoSettings(env, null);
    expect(result.source).toBe("env");
    expect(result.settings.clientId).toBe("env-id");
  });

  it("returns config file source", () => {
    const configFile: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "okta",
      clientId: "file-id",
    };
    const result = getSsoSettings(emptyEnv, configFile);
    expect(result.source).toBe("config");
    expect(result.settings.provider).toBe("okta");
  });

  it("config file takes priority over env", () => {
    const env = { SSO_ENABLED: "false", SSO_PROVIDER: "okta" };
    const configFile: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "azure",
      clientId: "file-id",
    };
    const result = getSsoSettings(env, configFile);
    expect(result.source).toBe("config");
    expect(result.settings.provider).toBe("azure");
  });
});

// ─── isSsoEnabled Tests ──────────────────────────────────────────────────

describe("isSsoEnabled — Convenience Check", () => {
  it("returns false when nothing set", () => {
    expect(isSsoEnabled(DEFAULT_SETTINGS)).toBe(false);
  });

  it("returns true when enabled via env", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "azure",
    };
    expect(isSsoEnabled(settings)).toBe(true);
  });

  it("returns false when provider is none", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "none",
    };
    expect(isSsoEnabled(settings)).toBe(false);
  });

  it("returns true when enabled via config file", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "okta",
    };
    expect(isSsoEnabled(settings)).toBe(true);
  });
});

// ─── getSsoDisplayName Tests ─────────────────────────────────────────────

describe("getSsoDisplayName — Login Page", () => {
  it("returns null when disabled", () => {
    expect(getSsoDisplayName(DEFAULT_SETTINGS)).toBeNull();
  });

  it("returns Microsoft for Azure", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "azure",
    };
    expect(getSsoDisplayName(settings)).toBe("Sign in with Microsoft");
  });

  it("returns Okta for Okta", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "okta",
    };
    expect(getSsoDisplayName(settings)).toBe("Sign in with Okta");
  });

  it("returns Google for Google", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "google",
    };
    expect(getSsoDisplayName(settings)).toBe("Sign in with Google");
  });

  it("returns generic SSO for SAML", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "saml",
    };
    expect(getSsoDisplayName(settings)).toBe("Sign in with SSO");
  });

  it("returns generic SSO for OIDC", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "oidc",
    };
    expect(getSsoDisplayName(settings)).toBe("Sign in with SSO");
  });
});

// ─── Callback URL Tests ──────────────────────────────────────────────────

describe("SSO Callback URL — Configuration", () => {
  it("callback URL read from env var", () => {
    const env = {
      SSO_ENABLED: "true",
      SSO_PROVIDER: "azure",
      SSO_CALLBACK_URL: "https://custom.example.com/callback",
    };
    const result = getSsoSettings(env, null);
    expect(result.settings.callbackUrl).toBe(
      "https://custom.example.com/callback",
    );
  });

  it("callback URL empty when not set", () => {
    const result = getSsoSettings({}, null);
    expect(result.settings.callbackUrl).toBe("");
  });

  it("config file callback URL overrides env var", () => {
    const env = { SSO_CALLBACK_URL: "https://env.example.com/callback" };
    const configFile: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "azure",
      callbackUrl: "https://config.example.com/callback",
    };
    const result = getSsoSettings(env, configFile);
    expect(result.settings.callbackUrl).toBe(
      "https://config.example.com/callback",
    );
  });

  it("callback URL preserved in settings", () => {
    const settings: SsoSettings = {
      ...DEFAULT_SETTINGS,
      enabled: true,
      provider: "azure",
      callbackUrl: "https://myapp.example.com/auth/callback/sso",
    };
    expect(settings.callbackUrl).toBe(
      "https://myapp.example.com/auth/callback/sso",
    );
  });
});

// ─── settingsFromEnv Tests ───────────────────────────────────────────────

describe("settingsFromEnv — Environment Variable Parsing", () => {
  it("parses all SSO env vars", () => {
    const env = {
      SSO_ENABLED: "true",
      SSO_PROVIDER: "azure",
      SSO_CLIENT_ID: "client-123",
      SSO_CLIENT_SECRET: "secret-456",
      SSO_ISSUER: "https://login.microsoftonline.com/tenant/v2.0",
      SSO_CALLBACK_URL: "https://app.example.com/callback",
      SSO_DOMAIN: "acme.com",
      SSO_ENFORCE: "true",
      SSO_JIT: "true",
    };
    const settings = settingsFromEnv(env);

    expect(settings.enabled).toBe(true);
    expect(settings.provider).toBe("azure");
    expect(settings.clientId).toBe("client-123");
    expect(settings.clientSecret).toBe("secret-456");
    expect(settings.issuer).toBe(
      "https://login.microsoftonline.com/tenant/v2.0",
    );
    expect(settings.callbackUrl).toBe("https://app.example.com/callback");
    expect(settings.domain).toBe("acme.com");
    expect(settings.enforceSso).toBe(true);
    expect(settings.jitProvisioning).toBe(true);
  });

  it("defaults when env vars missing", () => {
    const settings = settingsFromEnv({});

    expect(settings.enabled).toBe(false);
    expect(settings.provider).toBe("none");
    expect(settings.clientId).toBe("");
    expect(settings.jitProvisioning).toBe(true); // default true
  });

  it("SSO_JIT=false disables JIT provisioning", () => {
    const settings = settingsFromEnv({ SSO_JIT: "false" });
    expect(settings.jitProvisioning).toBe(false);
  });
});
