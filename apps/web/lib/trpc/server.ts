import { initTRPC, TRPCError } from "@trpc/server";
import { eq, and, sql } from "drizzle-orm";
import {
  userEntityAccess,
  entities,
  organizations,
} from "@xenboox/db/schema/organization";
import { orgRoles } from "@xenboox/db/schema/org-roles";
import { sessions, users } from "@xenboox/db/schema/auth";
import { adminUsers, adminSessions } from "@xenboox/db/schema";
import { idempotencyKeys } from "@xenboox/db/schema";
import { z } from "zod";
import {
  rolePermissions,
  userPermissionOverrides,
} from "@xenboox/db/schema/permissions";

import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isSessionActive } from "@/lib/admin/session";
import {
  getRateLimiter,
  getConcurrencyLimiter,
} from "@/lib/security/rate-limiter";
import { tracingMiddleware } from "@/lib/trpc/tracing-middleware";
import {
  hasAdminPermission,
  type AdminEpic,
  type AdminRole,
} from "@/lib/admin/roles";

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

type AuthUser = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export type Session = {
  user?: AuthUser;
  expires: string;
} | null;

export type Context = {
  session: Session;
  entityId?: string;
  entityRole?: string;
  headers?: Record<string, string>;
  requestId?: string;
  log?: typeof logger;
  /** Populated by rate-limit middleware; emitted as X-RateLimit-* headers (§19.4) */
  rateLimitInfo?: { limit: number; remaining: number; reset: number };
};

export function createTRPCContext(
  { headers }: { headers?: Record<string, string> } = { headers: {} },
): Context {
  return { session: null, headers: headers || {} };
}

export const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error, ctx }) {
    const reqId = (ctx as { requestId?: string })?.requestId;
    const userId =
      (ctx as { session?: Session })?.session?.user?.id ?? "anonymous";

    if (error.code === "INTERNAL_SERVER_ERROR") {
      // Walk the full cause chain — nested driver errors (e.g. drizzle
      // wrapping the underlying neon/postgres error) otherwise stay hidden.
      const chain: string[] = [];
      let cause: unknown = (error as { cause?: unknown }).cause;
      for (let i = 0; i < 4 && cause !== undefined && cause !== null; i++) {
        chain.push(
          typeof cause === "object" && "message" in cause
            ? String((cause as { message: unknown }).message)
            : String(cause),
        );
        cause = (cause as { cause?: unknown })?.cause;
      }
      logger.error(
        {
          requestId: reqId,
          userId,
          error: error.message,
          causeMessage:
            cause && typeof cause === "object" && "message" in cause
              ? String((cause as { message: unknown }).message)
              : undefined,
          causeChain: chain,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        "Unhandled tRPC error",
      );
    }

    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === "BAD_REQUEST" && error.cause instanceof z.ZodError
            ? error.cause.flatten()
            : null,
        requestId: reqId,
      },
      message:
        error.code === "INTERNAL_SERVER_ERROR"
          ? "An unexpected error occurred. Our team has been notified."
          : shape.message,
    };
  },
  transformer: undefined,
});

// RLS session context setup
// Uses SET LOCAL so variables persist for the current transaction only.
// Requires Neon WebSocket mode (Pool-based driver) — HTTP driver cannot use session variables.
//
// Context values are bound as real parameters via Drizzle's `sql` template.
// Hand-rolled quote-doubling (the old sqlLiteral helper) breaks on
// non-standard string literals (backslashes) and is the classic SQLi
// footgun — never inline user or session values into statement text.
export async function setRlsContext(
  userId: string,
  entityId: string,
): Promise<void> {
  await db.execute(
    sql`SELECT set_config('app.current_user_id', ${userId}, true)`,
  );
  await db.execute(
    sql`SELECT set_config('app.current_entity_id', ${entityId}, true)`,
  );
}

export const router = t.router;

export const publicProcedure = t.procedure;

const loggingMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const start = Date.now();
  const result = await next({ ctx });
  const duration = Date.now() - start;
  const level = type === "query" ? "debug" : "info";
  // Authenticated procedures carry a requestId+userId-scoped logger on ctx
  // (set by authMiddleware). Public procedures fall back to a requestId-
  // scoped child derived from the x-request-id header the edge middleware
  // sets, so every log entry is traceable to a request.
  let log = (ctx as { log?: typeof logger }).log;
  if (!log) {
    const requestId =
      (ctx as { headers?: Record<string, string> }).headers?.["x-request-id"] ??
      "unknown";
    log = logger.child({ requestId });
  }
  log[level]({ path, type, durationMs: duration }, `tRPC ${type} ${path}`);
  return result;
});

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const rawSession = await auth();
  const session = rawSession as Session & { sid?: string };

  if (!session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  // Check session validity — if the JWT has a sid, verify it still exists in the DB
  if (session.sid) {
    try {
      const validSession = await db.query.sessions.findFirst({
        where: eq(sessions.sessionToken, session.sid),
        columns: { id: true },
      });
      if (!validSession) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Session has been revoked. Please sign in again.",
        });
      }
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      logger.error({ error }, "Session validity check failed");
    }
  }

  const requestId = ctx.headers?.["x-request-id"] || "unknown";
  const reqLog = logger.child({ requestId, userId: session.user?.id });

  return next({ ctx: { ...ctx, session, requestId, log: reqLog } });
});

/**
 * Entity bootstrap helper — resolves the first entity a user can access.
 * Used at login time (jwt callback) and by the entity switcher so every
 * authenticated user gets a usable default entity without requiring an
 * already-selected entity (chicken-and-egg prevention).
 */
export async function resolveFirstEntityId(
  userId: string,
): Promise<{ entityId: string | null; role: string | null }> {
  // Step 1: org_roles (owner/admin) → first entity in the org
  const userOrgRoles = await db.query.orgRoles.findMany({
    where: eq(orgRoles.userId, userId),
    columns: { orgId: true, role: true },
  });
  if (userOrgRoles.length > 0) {
    for (const r of userOrgRoles) {
      const firstEntity = await db.query.entities.findFirst({
        where: eq(entities.organizationId, r.orgId),
        columns: { id: true },
      });
      if (firstEntity) {
        return { entityId: firstEntity.id, role: r.role };
      }
    }
  }

  // Step 2: user_entity_access → first accessible entity
  const access = await db.query.userEntityAccess.findFirst({
    where: eq(userEntityAccess.userId, userId),
    columns: { entityId: true, role: true },
  });
  return access
    ? { entityId: access.entityId, role: access.role }
    : { entityId: null, role: null };
}

const entityScopingMiddleware = t.middleware(async ({ ctx, next }) => {
  const entityId = (ctx as { entityId?: string }).entityId;

  if (!entityId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Entity ID is required. Pass it in the x-entity-id header.",
    });
  }

  const userId = ctx.session!.user!.id!;

  // Step 1: Check org_roles — is this user an org-level owner/admin?
  // Find the entity to get its orgId, then check if user has org-level role
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
    columns: { id: true, organizationId: true, currency: true, name: true },
  });

  let billingPlan: string | undefined;

  if (entity?.organizationId) {
    // Look up the org's billing plan for rate-limit tiering
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, entity.organizationId),
      columns: { plan: true },
    });
    billingPlan = org?.plan;

    const orgRole = await db.query.orgRoles.findFirst({
      where: and(
        eq(orgRoles.userId, userId),
        eq(orgRoles.orgId, entity.organizationId),
      ),
    });

    if (orgRole) {
      // Org-level owner/admin has full access to all entities under this org
      return next({
        ctx: {
          ...ctx,
          entityId,
          entityRole: orgRole.role,
          permissionScope: "full",
          billingPlan,
          // Entity facts every financial procedure needs — resolved once here
          // so routers never re-query or hardcode fallbacks (engreview N1/N2).
          entityCurrency: entity?.currency ?? null,
          entityName: entity?.name ?? null,
          userId,
        },
      });
    }
  }

  // Step 2: Check entity-level access via user_entity_access
  const access = await db.query.userEntityAccess.findFirst({
    where: and(
      eq(userEntityAccess.userId, userId),
      eq(userEntityAccess.entityId, entityId),
    ),
  });

  if (!access) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this entity",
    });
  }

  return next({
    ctx: {
      ...ctx,
      entityId,
      entityRole: access.role,
      billingPlan,
      // Entity facts every financial procedure needs — resolved once here
      // so routers never re-query or hardcode fallbacks (engreview N1/N2).
      entityCurrency: entity?.currency ?? null,
      entityName: entity?.name ?? null,
      userId,
    },
  });
});

/**
 * Email Verification Gate (Milestone 11)
 * Blocks write/approve/trigger actions for unverified users.
 * View-only actions (queries) are allowed so users can see their onboarding screen.
 */
export const requireVerifiedEmail = t.middleware(async ({ ctx, next }) => {
  const session = (ctx as { session?: Session }).session;
  if (!session?.user?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id!),
    columns: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Please verify your email before performing this action. Check your inbox for the verification link or request a new one from Settings.",
    });
  }
  return next({ ctx });
});

export const requireRole = (...roles: string[]) =>
  t.middleware(async ({ ctx, next }) => {
    const role = (ctx as { entityRole?: string }).entityRole;
    if (!role || !roles.includes(role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This action requires one of these roles: ${roles.join(", ")}`,
      });
    }
    return next({ ctx });
  });

export type PermissionModule =
  | "general_ledger"
  | "chart_of_accounts"
  | "bank_reconciliation"
  | "mobile_money"
  | "accounts_payable"
  | "accounts_receivable"
  | "cash_imprest"
  | "payroll"
  | "invoicing"
  | "expense_management"
  | "fixed_assets"
  | "inventory"
  | "budgeting"
  | "financial_reporting"
  | "tax_compliance"
  | "audit_preparation"
  | "donor_grant_reporting"
  | "multi_entity"
  | "multi_currency"
  | "document_management"
  | "analytics_insights"
  | "settings_users"
  | "settings_entities"
  | "settings_billing";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "approve"
  | "post"
  | "delete"
  | "export"
  | "configure";

/**
 * requirePermission middleware — checks the RBAC Matrix for role × module × action.
 *
 * Uses the in-memory permission cache populated from the rolePermissions table.
 * Falls back to requireRole if the permission check fails for backward compatibility.
 *
 * Usage:
 *   .use(requirePermission("general_ledger", "post"))
 *   .use(requirePermission("payroll", "view", "scoped")) // Allow scoped too
 */
const permissionCache = new Map<string, { scope: string } | null>();
const CACHE_TTL = 60_000; // 1 minute
let lastCacheRefresh = 0;

async function refreshPermissionCache(): Promise<void> {
  if (Date.now() - lastCacheRefresh < CACHE_TTL) return;
  permissionCache.clear();
  lastCacheRefresh = Date.now();
  // Cache is populated lazily on first request
}

/**
 * Clear the in-memory permission cache.
 * Called by admin routers after permission mutations.
 */
export function clearPermissionCache(): void {
  permissionCache.clear();
  lastCacheRefresh = 0;
}

export async function checkPermission(
  ctx: Context,
  module: PermissionModule,
  action: PermissionAction,
): Promise<{ allowed: boolean; scope: string }> {
  const role = ctx.entityRole;
  const userId = ctx.session?.user?.id;
  const entityId = ctx.entityId;

  if (!role) {
    return { allowed: false, scope: "none" };
  }

  // Step 1: Check role-based permission (cached)
  const cacheKey = `${role}:${module}:${action}`;
  const cached = permissionCache.get(cacheKey);

  let roleScope: string;
  if (cached !== undefined) {
    roleScope = cached?.scope ?? "none";
  } else {
    try {
      const perm = await db.query.rolePermissions.findFirst({
        where: and(
          eq(rolePermissions.role, role as any),
          eq(rolePermissions.module, module as any),
          eq(rolePermissions.action, action as any),
        ),
        columns: { scope: true, scopeCondition: true },
      });

      roleScope = perm?.scope ?? "none";
      permissionCache.set(cacheKey, perm ? { scope: perm.scope } : null);
    } catch (error) {
      logger.error({ error, role, module, action }, "Permission check failed");
      return { allowed: false, scope: "none" };
    }
  }

  // Step 2: Check user-specific overrides (not cached — per-user)
  if (userId && entityId) {
    try {
      const override = await db.query.userPermissionOverrides.findFirst({
        where: and(
          eq(userPermissionOverrides.userId, userId),
          eq(userPermissionOverrides.entityId, entityId),
          eq(userPermissionOverrides.module, module as any),
          eq(userPermissionOverrides.action, action as any),
        ),
        columns: { grant: true, expiresAt: true },
      });

      if (override) {
        // Check if override has expired
        const notExpired =
          !override.expiresAt || override.expiresAt > new Date();
        if (notExpired) {
          if (override.grant === false) {
            // Revocation override — deny even if role allows
            return { allowed: false, scope: "none" };
          }
          if (override.grant === true) {
            // Grant override — allow even if role denies, use "full" scope
            return { allowed: true, scope: "full" };
          }
        }
      }
    } catch (error) {
      logger.error({ error, userId, module, action }, "Override check failed");
      // Fall through to role-based result
    }
  }

  // Step 3: Return role-based result
  return {
    allowed: roleScope === "full" || roleScope === "scoped",
    scope: roleScope,
  };
}

/**
 * Middleware that checks the role × module × action permission from the RBAC Matrix.
 * Throws FORBIDDEN if the permission is "none" for the current role.
 *
 * @param minScope minimum required scope (default: "scoped"). Use "full" to require full access.
 */
export const requirePermission = (
  module: PermissionModule,
  action: PermissionAction,
  minScope: "scoped" | "full" = "scoped",
) =>
  t.middleware(async ({ ctx, next }) => {
    await refreshPermissionCache();
    const { allowed, scope } = await checkPermission(
      ctx as Context,
      module,
      action,
    );

    if (!allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Access denied: your role does not have "${action}" permission on ${module}`,
      });
    }

    if (minScope === "full" && scope !== "full") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Access denied: your role only has scoped access to ${module}:${action}, full access required`,
      });
    }

    return next({ ctx: { ...ctx, permissionScope: scope } });
  });

/**
 * Middleware that checks if the user has ANY of the specified action permissions on a module.
 */
export const requireAnyPermission = (
  module: PermissionModule,
  actions: PermissionAction[],
) =>
  t.middleware(async ({ ctx, next }) => {
    await refreshPermissionCache();

    for (const action of actions) {
      const { allowed } = await checkPermission(ctx as Context, module, action);
      if (allowed) {
        return next({ ctx: { ...ctx, permissionScope: "scoped" } });
      }
    }

    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Access denied: your role does not have any of the required permissions on ${module}`,
    });
  });

const IDEMPOTENCY_HEADER = "x-idempotency-key";
const LOCK_TIMEOUT_SECONDS = 30;
const KEY_TTL_HOURS = 24;

/**
 * Idempotency middleware — dedupes retried mutations via the
 * `x-idempotency-key` header (24h TTL, 30s lock window, response replay).
 * Defined ABOVE the procedures that consume it so module evaluation never
 * hits a temporal-dead-zone reference (a real crash in ESM test loading).
 */
const idempotencyMiddleware = t.middleware(async ({ ctx, next, path }) => {
  const headers = ctx.headers || {};
  const idempotencyKey = headers[IDEMPOTENCY_HEADER] as string | undefined;

  if (!idempotencyKey) {
    return next({ ctx });
  }

  if (idempotencyKey.length > 255) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Idempotency key too long (max 255 characters)",
    });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + KEY_TTL_HOURS * 60 * 60 * 1000);

  const existing = await db.query.idempotencyKeys.findFirst({
    where: eq(idempotencyKeys.key, idempotencyKey),
  });

  if (existing) {
    // Keys are derived from (entityId, path, input), so a key is owned by the
    // caller who created it. Only replay the stored response for the owner —
    // a foreign row (different user/entity) must never leak a replayed
    // response; it is reclaimed and re-executed instead.
    const ownsKey =
      existing.userId === ctx.session?.user?.id &&
      existing.entityId === ctx.entityId;

    if (existing.expiresAt < now) {
      await db
        .delete(idempotencyKeys)
        .where(eq(idempotencyKeys.key, idempotencyKey));
    } else if (existing.lockedAt && !existing.responseBody) {
      // In-flight: the original request hasn't completed yet.
      const lockAge = (now.getTime() - existing.lockedAt.getTime()) / 1000;
      if (lockAge > LOCK_TIMEOUT_SECONDS) {
        // Stale lock (previous attempt died mid-flight) — reclaim.
        await db
          .delete(idempotencyKeys)
          .where(eq(idempotencyKeys.key, idempotencyKey));
      } else {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Request is still being processed",
        });
      }
    } else if (ownsKey && existing.responseBody) {
      // Completed retry of the same operation by the same caller — replay.
      // tRPC v11 middlewares must return the { ok, data } envelope, not the
      // v10 { result, ctx } shape — the caller unwraps `result.data`.
      return {
        ok: true,
        data: existing.responseBody,
      } as unknown as Awaited<ReturnType<typeof next>>;
    } else if (!ownsKey) {
      // Foreign or stale completed row — never replay someone else's result;
      // reclaim and execute as a fresh operation.
      await db
        .delete(idempotencyKeys)
        .where(eq(idempotencyKeys.key, idempotencyKey));
    }
  }

  await db
    .insert(idempotencyKeys)
    .values({
      key: idempotencyKey,
      userId: ctx.session?.user?.id || "",
      entityId: ctx.entityId || "",
      route: path,
      expiresAt,
      lockedAt: now,
    })
    .onConflictDoUpdate({
      target: idempotencyKeys.key,
      set: {
        lockedAt: now,
        responseBody: null,
      },
    });

  const result = await next({ ctx });

  try {
    // v11: `next()` resolves to the { ok, data, marker } envelope — store the
    // actual procedure result (`.data`), not the envelope itself.
    const data =
      result && typeof result === "object" && "ok" in result
        ? ((result as { ok: boolean; data?: unknown }).data ?? result)
        : result;

    await db
      .update(idempotencyKeys)
      .set({ responseBody: data as Record<string, unknown> })
      .where(eq(idempotencyKeys.key, idempotencyKey));
  } catch {
    // best effort
  }

  return result;
});

// RLS-aware procedure that sets session context before queries.
// Always sets RLS context — entity scoping is enforced at the DB layer as defense-in-depth.
export const rlsProtectedProcedure = t.procedure
  .use(tracingMiddleware)
  .use(loggingMiddleware)
  .use(authMiddleware)
  .use(entityScopingMiddleware)
  .use(async ({ ctx, next }) => {
    await setRlsContext(ctx.session!.user!.id!, ctx.entityId!);
    return next({ ctx });
  });

// RLS-aware mutation procedure (email verification + idempotency + RLS)
export const rlsMutateProcedure = t.procedure
  .use(tracingMiddleware)
  .use(loggingMiddleware)
  .use(authMiddleware)
  .use(requireVerifiedEmail)
  .use(entityScopingMiddleware)
  .use(idempotencyMiddleware)
  .use(async ({ ctx, next }) => {
    await setRlsContext(ctx.session!.user!.id!, ctx.entityId!);
    return next({ ctx });
  });

export const protectedProcedure = t.procedure
  .use(tracingMiddleware)
  .use(loggingMiddleware)
  .use(authMiddleware)
  .use(entityScopingMiddleware);

export const adminProcedure = t.procedure
  .use(tracingMiddleware)
  .use(loggingMiddleware)
  .use(authMiddleware)
  .use(entityScopingMiddleware)
  .use(requireRole("owner", "admin", "finance_director"));

// ─── Plan-Aware Rate Limit Procedure (§19.2) ──────────────────────────────
//
// Rate limits scale with the organization's billing plan:
//   free:    200 API / 5 agent / 10 chat / 20 webhook per minute
//   starter: 500 / 10 / 20 / 50
//   growth:  1000 / 20 / 30 / 100
//   pro:     5000 / 50 / 60 / 200
//   firm:    10000 / 100 / 120 / 500

const planAwareRateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  const plan = (ctx as { billingPlan?: string }).billingPlan || "free";
  const userId = ctx.session!.user?.id || "unknown";
  const headers = ctx.headers as Record<string, string> | undefined;
  const ip = headers?.["x-forwarded-for"] || "anonymous";
  const identifier = `${userId}:${ip}`;

  const limiter = getRateLimiter();
  const result = await limiter.checkApiRateLimitForPlan(identifier, plan);

  // Expose the current window's state so the response carries standard
  // X-RateLimit-* headers (§19.4) — even on success, so clients can back off.
  ctx.rateLimitInfo = {
    limit: result.limit,
    remaining: Math.max(0, result.remaining),
    reset: result.reset,
  };

  if (!result.success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded for ${plan} plan. Try again in ${result.reset - Math.floor(Date.now() / 1000)}s.`,
    });
  }

  return next({ ctx });
});

export const planAwareProcedure = t.procedure
  .use(tracingMiddleware)
  .use(loggingMiddleware)
  .use(authMiddleware)
  .use(requireVerifiedEmail)
  .use(entityScopingMiddleware)
  .use(planAwareRateLimitMiddleware)
  .use(idempotencyMiddleware)
  .use(async ({ ctx, next }) => {
    await setRlsContext(ctx.session!.user!.id!, ctx.entityId!);
    return next({ ctx });
  });

// ─── Concurrent-Request Limiter (§19.2) ────────────────────────────────────
//
// Heavy endpoints (report generation, bulk export, document OCR pipelines)
// get a per-tenant concurrency cap so one tenant can't starve the pool.
// Acquires a slot before the handler runs and releases it in `finally` so a
// throwing handler can never leak a slot (the TTL bounds crashes anyway).

export const concurrencyLimitedProcedure = (maxConcurrent: number) =>
  t.procedure
    .use(tracingMiddleware)
    .use(loggingMiddleware)
    .use(authMiddleware)
    .use(entityScopingMiddleware)
    .use(
      t.middleware(async ({ ctx, next }) => {
        const entityId = ctx.entityId ?? "unknown";
        const userId = ctx.session?.user?.id ?? "anonymous";
        const key = `${entityId}:${userId}`;
        const acquired = await getConcurrencyLimiter().acquire(
          key,
          maxConcurrent,
          120, // slot TTL — a crashed handler frees itself in 2 minutes
        );
        if (!acquired) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Too many heavy operations in flight for this workspace. Wait a moment and retry.",
          });
        }
        try {
          return await next({ ctx });
        } finally {
          await getConcurrencyLimiter().release(key);
        }
      }),
    );

// ─────────────────────────────────────────────
// Admin control-plane procedures
//
// The admin control plane uses its OWN identity system (admin_users /
// admin_sessions), completely separate from customer auth. Every admin
// procedure verifies the admin JWT, then re-checks the DB session row so
// revocation, inactivity timeouts, and the 12h hard cap are enforced on
// every single call.
// ─────────────────────────────────────────────

type AdminContext = {
  adminUser: typeof adminUsers.$inferSelect;
  adminRole: AdminRole;
  adminSid: string;
};

export type { AdminContext };

const adminSessionMiddleware = t.middleware(async ({ ctx, next }) => {
  // Lazy-import so the shared trpc server module never pulls the admin
  // next-auth instance (and its next/server dependency) into module graphs
  // that never touch admin procedures (e.g. unit tests).
  const { adminAuth } = await import("@/lib/auth/admin");
  const raw = await adminAuth();
  const session = raw as unknown as {
    admin?: { id?: string; role?: AdminRole };
    adminSid?: string;
  } | null;

  const adminUserId = session?.admin?.id;
  const adminSid = session?.adminSid;

  if (!adminUserId || !adminSid) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Admin sign-in required",
    });
  }

  const [adminUser, dbSession] = await Promise.all([
    db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, adminUserId),
    }),
    db.query.adminSessions.findFirst({
      where: eq(adminSessions.id, adminSid),
    }),
  ]);

  if (!adminUser || !adminUser.isActive) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Admin account is disabled or missing",
    });
  }

  if (!dbSession || !isSessionActive(dbSession, new Date())) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Admin session has expired or been revoked. Sign in again.",
    });
  }

  // Best-effort inactivity touch — never block the request on it.
  try {
    await db
      .update(adminSessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(adminSessions.id, adminSid));
  } catch {
    /* best effort */
  }

  return next({
    ctx: {
      ...ctx,
      adminUser,
      adminRole: adminUser.role,
      adminSid,
    } as Context & AdminContext,
  });
});

export const adminProtectedProcedure = t.procedure
  .use(tracingMiddleware)
  .use(loggingMiddleware)
  .use(adminSessionMiddleware);

/** Require an admin role × epic permission. Write implies read. */
export const adminPermissionProcedure = (
  epic: AdminEpic,
  mode: "read" | "write" = "read",
) =>
  adminProtectedProcedure.use(async ({ ctx, next }) => {
    const role = (ctx as Context & AdminContext).adminRole;
    if (!role || !hasAdminPermission(role, epic, mode)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Your admin role does not have "${mode}" access to ${epic}`,
      });
    }
    return next({ ctx });
  });

// Authenticated procedure that DOES NOT require entity scoping.
// Use for operations like entity creation where no entity exists yet.
export const authProcedure = t.procedure
  .use(tracingMiddleware)
  .use(loggingMiddleware)
  .use(authMiddleware);

export const mutateProcedure = t.procedure
  .use(tracingMiddleware)
  .use(loggingMiddleware)
  .use(authMiddleware)
  .use(requireVerifiedEmail)
  .use(entityScopingMiddleware)
  .use(idempotencyMiddleware);

/**
 * Handle errors in mutation try/catch blocks.
 * Re-throws TRPCError instances unchanged (e.g. NOT_FOUND, BAD_REQUEST).
 * Wraps unexpected errors in a generic 500 error.
 *
 * Usage:
 *   try { ... } catch (error) {
 *     handleMutationError(error, "Failed to create invoice");
 *   }
 */
export function handleMutationError(error: unknown, message: string): never {
  if (error instanceof TRPCError) throw error;
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message,
    // Preserve the original error so the errorFormatter's causeMessage
    // logging can surface the real failure instead of hiding it.
    cause: error,
  });
}

// Use createCaller from ./caller.ts to avoid circular dependency
