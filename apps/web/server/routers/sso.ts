/**
 * SSO Router — Admin-only tRPC procedures for SSO configuration.
 *
 * Provides:
 * - getSettings: Read current SSO configuration (admin-only)
 * - saveSettings: Save SSO configuration (admin-only, audit-logged)
 * - getProviders: List available SSO providers
 * - testConnection: Validate SSO credentials (admin-only)
 */

import { z } from "zod";
import { router, adminProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { auditLog } from "@xenboox/db/schema/documents";
import {
  getSsoSettings,
  isSsoEnabled,
  getSsoDisplayName,
  isDomainEnforced,
} from "@/lib/sso-settings";
import {
  getSsoSettingsWithFile,
  saveSsoSettings,
} from "@/lib/sso-settings-node";

// ─── Validation Schema ────────────────────────────────────────────────────

const ssoProviderEnum = z.enum([
  "azure",
  "okta",
  "google",
  "saml",
  "oidc",
  "none",
]);

const saveSsoSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: ssoProviderEnum,
  clientId: z.string().max(500),
  clientSecret: z.string().max(500),
  issuer: z.string().max(500),
  callbackUrl: z.string().max(500),
  domain: z.string().max(200),
  enforceSso: z.boolean(),
  jitProvisioning: z.boolean(),
  samlEntryPoint: z.string().max(500),
  samlCert: z.string().max(10000),
});

// ─── Router ───────────────────────────────────────────────────────────────

export const ssoRouter = router({
  /**
   * Get current SSO settings.
   * Returns the settings with source (config/env/default) and derived state.
   */
  getSettings: adminProcedure.query(async ({ ctx }) => {
    const { settings, source } = getSsoSettings();

    // Derive status flags
    const isConfigured =
      settings.enabled &&
      settings.provider !== "none" &&
      settings.clientId.length > 0 &&
      settings.clientSecret.length > 0;

    return {
      ...settings,
      // Mask secrets for API response
      clientSecret: settings.clientSecret ? "***" : "",
      // Derived state
      source,
      isConfigured,
      displayName: getSsoDisplayName(),
    };
  }),

  /**
   * Save SSO settings.
   * Validates input, persists to config file, logs to audit trail.
   */
  saveSettings: adminProcedure
    .input(saveSsoSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? "admin";

      // Validate: if SSO is enabled, provider and credentials are required
      if (input.enabled && input.provider === "none") {
        throw new Error(
          "SSO is enabled but no provider is selected. Choose a provider or disable SSO.",
        );
      }

      if (input.enabled && input.provider !== "none") {
        if (!input.clientId || !input.clientSecret) {
          throw new Error(
            `SSO provider "${input.provider}" requires Client ID and Client Secret.`,
          );
        }

        // OIDC providers need issuer
        if (["azure", "okta", "google", "oidc"].includes(input.provider)) {
          if (!input.issuer) {
            throw new Error(
              `SSO provider "${input.provider}" requires an Issuer URL.`,
            );
          }
        }

        // SAML providers need entry point
        if (input.provider === "saml" && !input.samlEntryPoint) {
          throw new Error("SAML provider requires a SAML Entry Point URL.");
        }
      }

      // Save settings
      const saved = saveSsoSettings(
        {
          enabled: input.enabled,
          provider: input.provider,
          clientId: input.clientId,
          clientSecret:
            input.clientSecret === "***"
              ? getSsoSettings().settings.clientSecret // Don't overwrite with mask
              : input.clientSecret,
          issuer: input.issuer,
          callbackUrl: input.callbackUrl,
          domain: input.domain,
          enforceSso: input.enforceSso,
          jitProvisioning: input.jitProvisioning,
          samlEntryPoint: input.samlEntryPoint,
          samlCert: input.samlCert,
        },
        userId,
      );

      // Audit log
      await db.insert(auditLog).values({
        entityId: "platform",
        userId,
        action: "sso.settings.save",
        entityType: "sso_config",
        newValues: {
          enabled: saved.enabled,
          provider: saved.provider,
          domain: saved.domain,
          enforceSso: saved.enforceSso,
          jitProvisioning: saved.jitProvisioning,
          // Never log secrets
        },
      });

      return {
        success: true,
        message:
          "SSO settings saved. Changes take effect on next server restart.",
        updatedAt: saved.updatedAt,
      };
    }),

  /**
   * List available SSO providers with descriptions.
   */
  getProviders: adminProcedure.query(async () => {
    return [
      {
        value: "azure",
        label: "Azure AD",
        description: "Microsoft Entra ID (formerly Azure AD)",
        icon: "🔷",
        fields: ["clientId", "clientSecret", "issuer", "callbackUrl"],
      },
      {
        value: "okta",
        label: "Okta",
        description: "Okta workforce identity",
        icon: "🔵",
        fields: ["clientId", "clientSecret", "issuer", "callbackUrl"],
      },
      {
        value: "google",
        label: "Google Workspace",
        description: "Google Cloud Identity",
        icon: "🔴",
        fields: ["clientId", "clientSecret", "issuer", "callbackUrl"],
      },
      {
        value: "saml",
        label: "SAML 2.0",
        description: "Generic SAML 2.0 identity provider",
        icon: "🔐",
        fields: ["samlEntryPoint", "samlCert"],
      },
      {
        value: "oidc",
        label: "OpenID Connect",
        description: "Generic OIDC identity provider",
        icon: "🌐",
        fields: ["clientId", "clientSecret", "issuer", "callbackUrl"],
      },
    ];
  }),

  /**
   * Get SSO status summary (lightweight, for nav/header).
   */
  getStatus: adminProcedure.query(async () => {
    const { settings, source } = getSsoSettings();
    const isConfigured =
      settings.enabled &&
      settings.provider !== "none" &&
      settings.clientId.length > 0;

    return {
      enabled: settings.enabled,
      provider: settings.provider,
      isConfigured,
      source,
      displayName: getSsoDisplayName(),
    };
  }),

  /**
   * Test SSO domain enforcement.
   * Returns whether the given email would be forced to use SSO.
   */
  testDomainEnforcement: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const enforced = isDomainEnforced(input.email);
      const { settings } = getSsoSettings();

      return {
        email: input.email,
        enforced,
        domain: settings.domain,
        enforceSso: settings.enforceSso,
      };
    }),
});
