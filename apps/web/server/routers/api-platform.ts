// ─── API Platform Router (Phase 3) ──────────────────────────────────────
//
// External API access for Pro/Firm tier organizations.
// Management endpoints for API keys, webhooks, and usage monitoring.

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc, count, gte } from "drizzle-orm";
import {
  apiKeys,
  apiScopes,
  webhookSubscriptions,
  apiCallLogs,
  webhookDeliveryLogs,
} from "@xenboox/db/schema";
import { organizations } from "@xenboox/db/schema/organization";
import { auditLog } from "@xenboox/db/schema/documents";
import {
  handleMutationError,
  router,
  protectedProcedure,
  mutateProcedure,
  requireRole,
} from "@/lib/trpc/server";
import crypto from "crypto";
import { entities } from "@xenboox/db/schema/organization";

// ─── Helpers ──────────────────────────────────────────────────────────────

async function getOrgId(entityId: string): Promise<string | null> {
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
    columns: { organizationId: true },
  });
  return entity?.organizationId ?? null;
}

const RESOURCE_LIST = [
  "transactions",
  "reports",
  "invoices",
  "customers",
  "suppliers",
  "accounts",
  "documents",
  "payroll",
  "tax",
] as const;

const PERMISSION_LIST = ["read", "write", "admin"] as const;

/** Generate a cryptographically random API key in format xb_xxx...xxx */
function generateApiKey(): {
  fullKey: string;
  prefix: string;
  hash: string;
  lastChars: string;
} {
  const raw = crypto.randomBytes(32).toString("hex");
  const fullKey = `xb_${raw}`;
  const prefix = fullKey.slice(0, 10); // "xb_" + 7 chars
  const lastChars = fullKey.slice(-4);
  const hash = crypto.createHash("sha256").update(fullKey).digest("hex");
  return { fullKey, prefix, hash, lastChars };
}

/** Generate a unique webhook signing secret */
function generateWebhookSecret(): string {
  return crypto.randomBytes(24).toString("hex");
}

/** Check if org plan allows API access */
async function checkOrgApiAccess(
  orgId: string,
): Promise<{ allowed: boolean; tier: string }> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { plan: true },
  });

  if (!org) return { allowed: false, tier: "none" };

  // Free and starter plans don't get API access
  const allowedPlans: Record<string, string> = {
    pro: "pro",
    firm: "enterprise",
  };

  const tier = allowedPlans[org.plan];
  return {
    allowed: !!tier,
    tier: tier || "none",
  };
}

// ─── Router ────────────────────────────────────────────────────────────────

export const apiPlatformRouter = router({
  // ── List API Keys ─────────────────────────────────────────────────
  listApiKeys: protectedProcedure
    .input(
      z
        .object({ status: z.enum(["active", "revoked", "expired"]).optional() })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const orgId = await getOrgId(ctx.entityId!);
      if (!orgId) return [];
      const where = input?.status
        ? and(eq(apiKeys.orgId, orgId), eq(apiKeys.status, input.status))
        : eq(apiKeys.orgId, orgId);

      return db.query.apiKeys.findMany({
        where,
        with: { scopes: true },
        orderBy: [desc(apiKeys.createdAt)],
      });
    }),

  // ── Create API Key ─────────────────────────────────────────────────
  createApiKey: mutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        name: z.string().min(1).max(100),
        scopes: z
          .array(
            z.object({
              resource: z.enum(RESOURCE_LIST),
              permission: z.enum(PERMISSION_LIST).default("read"),
            }),
          )
          .min(1, "At least one scope is required"),
        entityScope: z.array(z.string().uuid()).optional(),
        roleScope: z
          .enum(["read_only", "standard", "admin"])
          .default("standard"),
        expiresInDays: z.number().int().min(1).max(365).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify org has API access
        const orgId = await getOrgId(ctx.entityId!);
        if (!orgId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Organization not found",
          });
        }
        const { allowed, tier } = await checkOrgApiAccess(orgId);
        if (!allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "API access requires Pro or Firm plan. Please upgrade your organization plan.",
          });
        }

        // Generate the API key
        const { fullKey, prefix, hash, lastChars } = generateApiKey();

        // Create the key record
        const [key] = await db
          .insert(apiKeys)
          .values({
            orgId,
            name: input.name,
            keyPrefix: prefix,
            keyHash: hash,
            keyLastChars: lastChars,
            tier,
            roleScope: input.roleScope,
            entityScope: input.entityScope ?? [],
            createdById: ctx.session!.user!.id!,
            expiresAt: input.expiresInDays
              ? new Date(Date.now() + input.expiresInDays * 86400000)
              : undefined,
            status: "active",
          })
          .returning();

        if (!key) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create API key",
          });
        }

        // Create scopes
        for (const scope of input.scopes) {
          await db.insert(apiScopes).values({
            apiKeyId: key.id,
            resource: scope.resource,
            permission: scope.permission,
          });
        }

        // Audit trail
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "api_key_created",
          entityType: "api_key",
          entityIdRef: key.id,
          newValues: {
            name: input.name,
            tier,
            scopesCount: input.scopes.length,
          },
        });

        return {
          id: key.id,
          name: key.name,
          // The full key is only shown ONCE at creation
          apiKey: fullKey,
          keyPrefix: prefix,
          keyLastChars: lastChars,
          tier,
          scopes: input.scopes,
          expiresAt: key.expiresAt,
          message:
            "Save this API key — it will not be shown again. If lost, you must revoke and create a new one.",
        };
      } catch (error) {
        handleMutationError(error, "Failed to create API key");
      }
    }),

  // ── Revoke API Key ─────────────────────────────────────────────────
  revokeApiKey: mutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({ keyId: z.string().uuid(), reason: z.string().optional() }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const orgId = await getOrgId(ctx.entityId!);
        if (!orgId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Organization not found",
          });
        }
        const key = await db.query.apiKeys.findFirst({
          where: and(eq(apiKeys.id, input.keyId), eq(apiKeys.orgId, orgId)),
        });

        if (!key) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "API key not found",
          });
        }

        if (key.status === "revoked") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This API key has already been revoked",
          });
        }

        await db
          .update(apiKeys)
          .set({
            status: "revoked",
            revokedAt: new Date(),
            revokedById: ctx.session!.user!.id!,
            revokedReason: input.reason,
          })
          .where(eq(apiKeys.id, input.keyId));

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "api_key_revoked",
          entityType: "api_key",
          entityIdRef: input.keyId,
          oldValues: { status: key.status },
          newValues: { status: "revoked", reason: input.reason },
        });

        return { success: true, revokedAt: new Date() };
      } catch (error) {
        handleMutationError(error, "Failed to revoke API key");
      }
    }),

  // ── List Webhooks ─────────────────────────────────────────────────
  listWebhooks: protectedProcedure.query(async ({ ctx }) => {
    return db.query.webhookSubscriptions.findMany({
      where: eq(webhookSubscriptions.entityId, ctx.entityId!),
      orderBy: [desc(webhookSubscriptions.createdAt)],
    });
  }),

  // ── Create Webhook Subscription ────────────────────────────────────
  createWebhook: mutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        eventType: z.string(),
        targetUrl: z.string().url(),
        description: z.string().optional(),
        maxRetries: z.number().int().min(0).max(10).default(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const secret = generateWebhookSecret();

        const [webhook] = await db
          .insert(webhookSubscriptions)
          .values({
            entityId: ctx.entityId!,
            eventType: input.eventType as any,
            targetUrl: input.targetUrl,
            secret,
            description: input.description,
            maxRetries: input.maxRetries,
            createdById: ctx.session!.user!.id!,
          })
          .returning();

        if (!webhook) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create webhook subscription",
          });
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "webhook_created",
          entityType: "webhook_subscription",
          entityIdRef: webhook.id,
          newValues: { eventType: input.eventType, targetUrl: input.targetUrl },
        });

        return {
          id: webhook.id,
          eventType: webhook.eventType,
          targetUrl: webhook.targetUrl,
          secret, // Only shown once at creation
          message: "Save the webhook secret — it will not be shown again.",
        };
      } catch (error) {
        handleMutationError(error, "Failed to create webhook subscription");
      }
    }),

  // ── Delete Webhook Subscription ────────────────────────────────────
  deleteWebhook: mutateProcedure
    .use(requireRole("owner", "admin"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.webhookSubscriptions.findFirst({
          where: and(
            eq(webhookSubscriptions.id, input.id),
            eq(webhookSubscriptions.entityId, ctx.entityId!),
          ),
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        await db
          .delete(webhookSubscriptions)
          .where(eq(webhookSubscriptions.id, input.id));

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "webhook_deleted",
          entityType: "webhook_subscription",
          entityIdRef: input.id,
          oldValues: {
            eventType: existing.eventType,
            targetUrl: existing.targetUrl,
          },
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete webhook subscription");
      }
    }),

  // ── Get API Usage Stats ─────────────────────────────────────────────
  getUsage: protectedProcedure
    .input(
      z
        .object({
          days: z.number().int().min(1).max(90).default(7),
          keyId: z.string().uuid().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - (input?.days ?? 7) * 86400000);

      const where = input?.keyId
        ? and(
            eq(apiCallLogs.apiKeyId, input.keyId),
            gte(apiCallLogs.timestamp, since),
          )
        : and(
            eq(apiCallLogs.entityId, ctx.entityId!),
            gte(apiCallLogs.timestamp, since),
          );

      const logs = await db.query.apiCallLogs.findMany({
        where,
        orderBy: [desc(apiCallLogs.timestamp)],
        limit: 1000,
      });

      const totalCalls = logs.length;
      const successCalls = logs.filter((l) => l.statusCode < 400).length;
      const errorCalls = logs.filter(
        (l) => l.statusCode >= 400 && !l.rateLimited,
      ).length;
      const rateLimitedCalls = logs.filter((l) => l.rateLimited).length;
      const avgLatency =
        logs.length > 0
          ? Math.round(
              logs.reduce((sum, l) => sum + (l.durationMs ?? 0), 0) /
                logs.length,
            )
          : 0;

      // Group by endpoint
      const byEndpoint = logs.reduce(
        (acc, l) => {
          const key = `${l.method} ${l.endpoint}`;
          if (!acc[key]) acc[key] = { count: 0, errors: 0 };
          acc[key].count++;
          if (l.statusCode >= 400) acc[key].errors++;
          return acc;
        },
        {} as Record<string, { count: number; errors: number }>,
      );

      return {
        period: { days: input?.days ?? 7, since: since.toISOString() },
        totals: {
          totalCalls,
          successCalls,
          errorCalls,
          rateLimitedCalls,
          avgLatency,
        },
        byEndpoint: Object.entries(byEndpoint).map(([endpoint, data]) => ({
          endpoint,
          ...data,
        })),
      };
    }),

  // ── List API Call Logs ──────────────────────────────────────────────
  listCallLogs: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(25),
          keyId: z.string().uuid().optional(),
          status: z.enum(["success", "error", "rate_limited"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(apiCallLogs.entityId, ctx.entityId!)];

      if (input?.keyId) conditions.push(eq(apiCallLogs.apiKeyId, input.keyId));
      if (input?.status === "error")
        conditions.push(gte(apiCallLogs.statusCode, 400));
      else if (input?.status === "rate_limited")
        conditions.push(eq(apiCallLogs.rateLimited, true));
      else if (input?.status === "success")
        conditions.push(eq(apiCallLogs.statusCode, 200));

      return db.query.apiCallLogs.findMany({
        where: and(...conditions),
        orderBy: [desc(apiCallLogs.timestamp)],
        limit: input?.limit ?? 25,
      });
    }),

  // ── Check API Access / Tier ─────────────────────────────────────────
  checkAccess: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await getOrgId(ctx.entityId!);
    if (!orgId) return { allowed: false, tier: "none" };
    const { allowed, tier } = await checkOrgApiAccess(orgId);
    return { allowed, tier };
  }),
});
