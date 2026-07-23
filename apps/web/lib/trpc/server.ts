import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { userEntityAccess } from "@xenboox/db/schema/organization";
import { sessions } from "@xenboox/db/schema/auth";
import { idempotencyKeys } from "@xenboox/db/schema";
import { z } from "zod";
import { logger } from "@/lib/logger";

const cacheStore = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

function getCacheKey(path: string, ctx: Context): string {
  return `${ctx.entityId ?? "anon"}:${path}`;
}

function getFromCache(key: string): unknown | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache(key: string, data: unknown): void {
  if (cacheStore.size > 500) {
    const oldest = cacheStore.keys().next().value;
    if (oldest) cacheStore.delete(oldest);
  }
  cacheStore.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

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
      logger.error(
        {
          requestId: reqId,
          userId,
          error: error.message,
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

const queryCacheMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  if (type !== "query") return next({ ctx });
  const cacheKey = getCacheKey(path, ctx as Context);
  const cached = getFromCache(cacheKey);
  if (cached !== null) {
    return { result: { data: cached }, ctx } as unknown as Awaited<
      ReturnType<typeof next>
    >;
  }
  const result = await next({ ctx });
  try {
    const data =
      result && typeof result === "object" && "result" in result
        ? (result as { result: { data?: unknown } }).result?.data
        : result;
    if (data !== undefined) setInCache(cacheKey, data);
  } catch {
    /* best effort */
  }
  return result;
});

// RLS session context setup
// Uses SET LOCAL so variables persist for the current transaction only.
// Requires Neon WebSocket mode (Pool-based driver) — HTTP driver cannot use session variables.
export async function setRlsContext(
  userId: string,
  entityId: string,
): Promise<void> {
  await db.execute(
    `SELECT set_config('app.current_user_id', ${JSON.stringify(userId)}, true)`,
  );
  await db.execute(
    `SELECT set_config('app.current_entity_id', ${JSON.stringify(entityId)}, true)`,
  );
}

export const router = t.router;

export const publicProcedure = t.procedure;

const loggingMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const start = Date.now();
  const result = await next({ ctx });
  const duration = Date.now() - start;
  const level = type === "query" ? "debug" : "info";
  const log = (ctx as { log?: typeof logger }).log ?? logger;
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

const entityScopingMiddleware = t.middleware(async ({ ctx, next }) => {
  const entityId = (ctx as { entityId?: string }).entityId;

  if (!entityId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Entity ID is required. Pass it in the x-entity-id header.",
    });
  }

  const access = await db.query.userEntityAccess.findFirst({
    where: and(
      eq(userEntityAccess.userId, ctx.session!.user!.id!),
      eq(userEntityAccess.entityId, entityId),
    ),
  });

  if (!access) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this entity",
    });
  }

  return next({ ctx: { ...ctx, entityId, entityRole: access.role } });
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

// RLS-aware procedure that sets session context before queries.
// Always sets RLS context — entity scoping is enforced at the DB layer as defense-in-depth.
export const rlsProtectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(authMiddleware)
  .use(entityScopingMiddleware)
  .use(async ({ ctx, next }) => {
    await setRlsContext(ctx.session!.user!.id!, ctx.entityId!);
    return next({ ctx });
  });

export const protectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(authMiddleware)
  .use(entityScopingMiddleware)
  .use(queryCacheMiddleware);

export const adminProcedure = t.procedure
  .use(loggingMiddleware)
  .use(authMiddleware)
  .use(entityScopingMiddleware)
  .use(requireRole("owner", "admin", "finance_director"));

const IDEMPOTENCY_HEADER = "x-idempotency-key";
const LOCK_TIMEOUT_SECONDS = 30;
const KEY_TTL_HOURS = 24;

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
    if (existing.expiresAt < now) {
      await db
        .delete(idempotencyKeys)
        .where(eq(idempotencyKeys.key, idempotencyKey));
    } else if (existing.lockedAt) {
      const lockAge = (now.getTime() - existing.lockedAt.getTime()) / 1000;
      if (lockAge > LOCK_TIMEOUT_SECONDS) {
        await db
          .delete(idempotencyKeys)
          .where(eq(idempotencyKeys.key, idempotencyKey));
      } else if (existing.responseBody) {
        return {
          result: { data: existing.responseBody },
          ctx,
        } as unknown as Awaited<ReturnType<typeof next>>;
      } else {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Request is still being processed",
        });
      }
    } else if (existing.responseBody) {
      return {
        result: { data: existing.responseBody },
        ctx,
      } as unknown as Awaited<ReturnType<typeof next>>;
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
    const data =
      result && typeof result === "object" && "result" in result
        ? ((result as { result: { data?: unknown } }).result?.data ?? result)
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

export const mutateProcedure = t.procedure
  .use(loggingMiddleware)
  .use(authMiddleware)
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
  });
}

// Use createCaller from ./caller.ts to avoid circular dependency
