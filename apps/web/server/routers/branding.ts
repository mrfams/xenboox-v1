// ─── White-Label / Branding Router (Phase 3) ────────────────────────────
//
// Firm-tier branding for accounting firms. Presentation-layer only.
// Core constraint: white-labeling changes presentation only, never data
// isolation, RBAC, or agent behavior.

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { firmBrandingConfig, customDomains } from "@xenboox/db/schema";
import { entities, organizations } from "@xenboox/db/schema/organization";
import { auditLog } from "@xenboox/db/schema/documents";
import {
  handleMutationError,
  router,
  protectedProcedure,
  mutateProcedure,
  requireRole,
} from "@/lib/trpc/server";
import crypto from "crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Check if org is on Firm tier (required for white-label features) */
async function checkFirmAccess(
  entityId: string,
): Promise<{ allowed: boolean; orgId: string }> {
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
    columns: { organizationId: true },
  });

  if (!entity) return { allowed: false, orgId: "" };

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, entity.organizationId),
    columns: { plan: true },
  });

  return {
    allowed: org?.plan === "firm",
    orgId: entity.organizationId,
  };
}

/** Generate a DNS verification token for custom domains */
function generateVerificationToken(): string {
  return `xenboox-verify=${crypto.randomBytes(16).toString("hex")}`;
}

// ─── Color scheme validation ─────────────────────────────────────────────

const colorSchemeSchema = z.object({
  primary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color (#RRGGBB)"),
  primaryForeground: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  accentForeground: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  destructive: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  muted: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  border: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

// ─── Router ──────────────────────────────────────────────────────────────

export const brandingRouter = router({
  // ── Check White-Label Access ───────────────────────────────────────
  checkAccess: protectedProcedure.query(async ({ ctx }) => {
    const { allowed } = await checkFirmAccess(ctx.entityId!);
    return { allowed };
  }),

  // ── Get Branding Config ────────────────────────────────────────────
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const { allowed, orgId } = await checkFirmAccess(ctx.entityId!);
    if (!allowed) return null;

    const config = await db.query.firmBrandingConfig.findFirst({
      where: eq(firmBrandingConfig.firmOrgId, orgId),
    });

    if (!config) return null;

    return {
      isActive: config.isActive,
      displayName: config.displayName,
      logoUrl: config.logoUrl,
      faviconUrl: config.faviconUrl,
      colorScheme: config.colorScheme,
      hideXenbooxBranding: config.hideXenbooxBranding,
      footerText: config.footerText,
      customCss: config.customCss,
    };
  }),

  // ── Upsert Branding Config ──────────────────────────────────────────
  updateConfig: mutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        displayName: z.string().min(1).max(100),
        isActive: z.boolean().optional().default(false),
        logoUrl: z.string().url().nullable().optional(),
        faviconUrl: z.string().url().nullable().optional(),
        colorScheme: colorSchemeSchema.optional(),
        hideXenbooxBranding: z.boolean().optional(),
        footerText: z.string().max(500).nullable().optional(),
        customCss: z.string().max(5000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { allowed, orgId } = await checkFirmAccess(ctx.entityId!);
        if (!allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "White-label features require a Firm plan. Please upgrade your organization.",
          });
        }

        const existing = await db.query.firmBrandingConfig.findFirst({
          where: eq(firmBrandingConfig.firmOrgId, orgId),
        });

        const values = {
          firmOrgId: orgId,
          displayName: input.displayName,
          isActive: input.isActive ?? false,
          logoUrl: input.logoUrl ?? null,
          faviconUrl: input.faviconUrl ?? null,
          colorScheme: input.colorScheme ?? ({} as any),
          hideXenbooxBranding: input.hideXenbooxBranding ?? false,
          footerText: input.footerText ?? null,
          customCss: input.customCss ?? null,
          updatedById: ctx.session!.user!.id!,
          updatedAt: new Date(),
        };

        if (existing) {
          await db
            .update(firmBrandingConfig)
            .set(values)
            .where(eq(firmBrandingConfig.id, existing.id));

          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "branding_updated",
            entityType: "firm_branding_config",
            entityIdRef: existing.id,
            oldValues: {
              displayName: existing.displayName,
              isActive: existing.isActive,
            },
            newValues: {
              displayName: input.displayName,
              isActive: input.isActive,
            },
          });
        } else {
          const [config] = await db
            .insert(firmBrandingConfig)
            .values(values)
            .returning();

          if (!config) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create branding configuration",
            });
          }

          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "branding_created",
            entityType: "firm_branding_config",
            entityIdRef: config.id,
            newValues: { displayName: input.displayName },
          });
        }

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to update branding configuration");
      }
    }),

  // ── List Custom Domains ────────────────────────────────────────────
  listDomains: protectedProcedure.query(async ({ ctx }) => {
    const { allowed, orgId } = await checkFirmAccess(ctx.entityId!);
    if (!allowed) return [];

    return db.query.customDomains.findMany({
      where: eq(customDomains.firmOrgId, orgId),
      orderBy: [desc(customDomains.createdAt)],
    });
  }),

  // ── Add Custom Domain ──────────────────────────────────────────────
  addDomain: mutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        domain: z.string().min(3).max(255),
        setAsPrimary: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { allowed, orgId } = await checkFirmAccess(ctx.entityId!);
        if (!allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "White-label features require a Firm plan.",
          });
        }

        // Check if domain already exists
        const existing = await db.query.customDomains.findFirst({
          where: eq(customDomains.domain, input.domain),
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This domain has already been added to Xenboox.",
          });
        }

        const verificationToken = generateVerificationToken();

        const [domain] = await db
          .insert(customDomains)
          .values({
            firmOrgId: orgId,
            domain: input.domain,
            verificationToken,
            isPrimary: input.setAsPrimary,
            updatedById: ctx.session!.user!.id!,
          })
          .returning();

        if (!domain) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to add custom domain",
          });
        }

        // If set as primary, unset other primary domains
        if (input.setAsPrimary) {
          await db
            .update(customDomains)
            .set({ isPrimary: false })
            .where(
              and(
                eq(customDomains.firmOrgId, orgId),
                eq(customDomains.isPrimary, true),
                eq(customDomains.id, domain.id), // Don't unset the newly added one
              ),
            );
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "custom_domain_added",
          entityType: "custom_domain",
          entityIdRef: domain.id,
          newValues: { domain: input.domain },
        });

        return {
          id: domain.id,
          domain: domain.domain,
          verificationToken: domain.verificationToken,
          message: `Add the following TXT record to your domain's DNS settings: ${domain.verificationToken}`,
        };
      } catch (error) {
        handleMutationError(error, "Failed to add custom domain");
      }
    }),

  // ── Verify Custom Domain ───────────────────────────────────────────
  verifyDomain: mutateProcedure
    .use(requireRole("owner", "admin"))
    .input(z.object({ domainId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { allowed, orgId } = await checkFirmAccess(ctx.entityId!);
        if (!allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "White-label features require a Firm plan.",
          });
        }

        const domain = await db.query.customDomains.findFirst({
          where: and(
            eq(customDomains.id, input.domainId),
            eq(customDomains.firmOrgId, orgId),
          ),
        });

        if (!domain) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Custom domain not found",
          });
        }

        if (domain.verified) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This domain is already verified",
          });
        }

        // In production, this would perform a DNS TXT record lookup
        // For now, we simulate verification by marking as verified
        await db
          .update(customDomains)
          .set({
            verified: true,
            verifiedAt: new Date(),
          })
          .where(eq(customDomains.id, input.domainId));

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "custom_domain_verified",
          entityType: "custom_domain",
          entityIdRef: input.domainId,
        });

        return { success: true, verified: true };
      } catch (error) {
        handleMutationError(error, "Failed to verify custom domain");
      }
    }),

  // ── Remove Custom Domain ───────────────────────────────────────────
  removeDomain: mutateProcedure
    .use(requireRole("owner", "admin"))
    .input(z.object({ domainId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { allowed, orgId } = await checkFirmAccess(ctx.entityId!);
        if (!allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "White-label features require a Firm plan.",
          });
        }

        const domain = await db.query.customDomains.findFirst({
          where: and(
            eq(customDomains.id, input.domainId),
            eq(customDomains.firmOrgId, orgId),
          ),
        });

        if (!domain) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Custom domain not found",
          });
        }

        await db
          .delete(customDomains)
          .where(eq(customDomains.id, input.domainId));

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "custom_domain_removed",
          entityType: "custom_domain",
          entityIdRef: input.domainId,
          oldValues: { domain: domain.domain, verified: domain.verified },
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to remove custom domain");
      }
    }),
});
