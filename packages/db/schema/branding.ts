// ─── White-Label / Branding Schema (Phase 3) ────────────────────────────
//
// Firm-tier branding for accounting firms per PRD Section 15.
// Presentation-layer only — never touches data isolation, RBAC, or agent
// behavior underneath.
//
// Core constraint: White-labeling changes presentation only. Any surface
// not yet white-label-capable falls back to clearly stating "powered by
// Xenboox" rather than presenting a broken, half-branded experience.
//
// Tables:
//   firm_branding_config  — Firm's branding configuration (logo, colors, name)
//   custom_domains        — Firm's custom domains/subdomains

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, timestamps } from "./helpers";
import { organizations } from "./organization";

// ─── FIRM BRANDING CONFIG ──────────────────────────────────────────────
//
// Single row per firm org. Contains the logo URL, color scheme, and display
// name that overrides Xenboox branding in the firm's client-facing surfaces.

export const firmBrandingConfig = pgTable(
  "firm_branding_config",
  {
    id: uuidId(),
    firmOrgId: uuid("firm_org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" })
      .unique(), // One branding config per firm org
    // Display name shown instead of "Xenboox"
    displayName: text("display_name").notNull(),
    // Whether branding is active (if false, falls back to Xenboox branding)
    isActive: boolean("is_active").notNull().default(false),
    // Logo URL (stored in R2 or external CDN)
    logoUrl: text("logo_url"),
    // Favicon URL
    faviconUrl: text("favicon_url"),
    // Color scheme — CSS custom properties to override
    colorScheme: jsonb("color_scheme")
      .$type<Record<string, string> | null>()
      .default({}),
    // Custom CSS to inject (limited, sanitized)
    customCss: text("custom_css"),
    // "Powered by Xenboox" can be hidden only if branding is active
    hideXenbooxBranding: boolean("hide_xenboox_branding")
      .notNull()
      .default(false),
    // Footer/email footer text
    footerText: text("footer_text"),
    // Audit trail
    updatedById: uuid("updated_by_id"),
    ...timestamps,
  },
  (t) => [index("fbc_firm_org").on(t.firmOrgId)],
);

export const firmBrandingConfigRelations = relations(
  firmBrandingConfig,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [firmBrandingConfig.firmOrgId],
      references: [organizations.id],
    }),
  }),
);

// ─── CUSTOM DOMAINS ────────────────────────────────────────────────────
//
// Firm can serve their client-facing portal under their own domain or
// subdomain. DNS verification required before the domain becomes active.

export const customDomains = pgTable(
  "custom_domains",
  {
    id: uuidId(),
    firmOrgId: uuid("firm_org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(), // e.g. "clients.myfirm.com" or "portal.myauditfirm.com"
    verified: boolean("verified").notNull().default(false),
    verificationToken: text("verification_token"), // DNS TXT record value
    verifiedAt: timestamp("verified_at"),
    isPrimary: boolean("is_primary").notNull().default(false),
    sslProvisioned: boolean("ssl_provisioned").notNull().default(false),
    updatedById: uuid("updated_by_id"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("cd_domain").on(t.domain),
    index("cd_firm").on(t.firmOrgId),
  ],
);

export const customDomainsRelations = relations(customDomains, ({ one }) => ({
  organization: one(organizations, {
    fields: [customDomains.firmOrgId],
    references: [organizations.id],
  }),
}));
