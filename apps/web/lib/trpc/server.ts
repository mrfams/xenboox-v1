import { initTRPC, TRPCError } from "@trpc/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { userEntityAccess } from "@xenboox/db/schema/organization"
import { idempotencyKeys } from "@xenboox/db/schema"
import { z } from "zod"
import { logger } from "@/lib/logger"

type AuthUser = {
  id?: string | null
  name?: string | null
  email?: string | null
  image?: string | null
}

export type Session = {
  user?: AuthUser
  expires: string
} | null

export type Context = {
  session: Session
  entityId?: string
  entityRole?: string
  headers?: Record<string, string>
  requestId?: string
  log?: typeof logger
}

export function createTRPCContext({ headers }: { headers?: Record<string, string> } = { headers: {} }): Context {
  return { session: null, headers: headers || {} }
}

export const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.code === "BAD_REQUEST" && error.cause instanceof z.ZodError
          ? error.cause.flatten()
          : null
      }
    }
  },
  transformer: undefined,
})

function formatDbError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return "A record with that value already exists"
    }
    if (msg.includes("foreign key") || msg.includes("violates")) {
      return "This operation references a record that does not exist"
    }
    if (msg.includes("not null") || msg.includes("null")) {
      return "A required field is missing"
    }
    return "A database error occurred. Please try again."
  }
  return "An unexpected error occurred"
}

// RLS session context setup
// Uses SET LOCAL so variables persist for the current transaction only.
// Requires Neon WebSocket mode (Pool-based driver) — HTTP driver cannot use session variables.
export async function setRlsContext(userId: string, entityId: string): Promise<void> {
  await db.execute(`SELECT set_config('app.current_user_id', ${JSON.stringify(userId)}, true)`);
  await db.execute(`SELECT set_config('app.current_entity_id', ${JSON.stringify(entityId)}, true)`);
}

export const router = t.router

export const publicProcedure = t.procedure

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const rawSession = await auth()
  const session = rawSession as Session

  if (!session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource"
    })
  }

  const requestId = ctx.headers?.['x-request-id'] || 'unknown'
  const reqLog = logger.child({ requestId, userId: session.user?.id })

  return next({ ctx: { ...ctx, session, requestId, log: reqLog } })
})

const entityScopingMiddleware = t.middleware(async ({ ctx, next }) => {
  const entityId = (ctx as { entityId?: string }).entityId

  if (!entityId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Entity ID is required. Pass it in the x-entity-id header."
    })
  }

  const access = await db.query.userEntityAccess.findFirst({
    where: and(
      eq(userEntityAccess.userId, ctx.session!.user!.id!),
      eq(userEntityAccess.entityId, entityId)
    )
  })

  if (!access) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this entity"
    })
  }

  return next({ ctx: { ...ctx, entityId, entityRole: access.role } })
})

const requireRole = (...roles: string[]) =>
  t.middleware(async ({ ctx, next }) => {
    const role = (ctx as { entityRole?: string }).entityRole
    if (!role || !roles.includes(role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This action requires one of these roles: ${roles.join(", ")}`
      })
    }
    return next({ ctx })
  })

// RLS-aware procedure that sets session context before queries.
// Always sets RLS context — entity scoping is enforced at the DB layer as defense-in-depth.
export const rlsProtectedProcedure = t.procedure
  .use(authMiddleware)
  .use(entityScopingMiddleware)
  .use(async ({ ctx, next }) => {
    await setRlsContext(ctx.session!.user!.id!, ctx.entityId!)
    return next({ ctx })
  })

export const protectedProcedure = t.procedure
  .use(authMiddleware)
  .use(entityScopingMiddleware)

export const adminProcedure = t.procedure
  .use(authMiddleware)
  .use(entityScopingMiddleware)
  .use(requireRole("owner", "admin", "finance_director"))

const IDEMPOTENCY_HEADER = "x-idempotency-key"
const LOCK_TIMEOUT_SECONDS = 30
const KEY_TTL_HOURS = 24

const idempotencyMiddleware = t.middleware(async ({ ctx, next, path }) => {
  const headers = ctx.headers || {}
  const idempotencyKey = headers[IDEMPOTENCY_HEADER] as string | undefined

  if (!idempotencyKey) {
    return next({ ctx })
  }

  if (idempotencyKey.length > 255) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Idempotency key too long (max 255 characters)"
    })
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + KEY_TTL_HOURS * 60 * 60 * 1000)

  const existing = await db.query.idempotencyKeys.findFirst({
    where: eq(idempotencyKeys.key, idempotencyKey)
  })

  if (existing) {
    if (existing.expiresAt < now) {
      await db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, idempotencyKey))
    } else if (existing.lockedAt) {
      const lockAge = (now.getTime() - existing.lockedAt.getTime()) / 1000
      if (lockAge > LOCK_TIMEOUT_SECONDS) {
        await db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, idempotencyKey))
      } else if (existing.responseBody) {
        return { result: { data: existing.responseBody }, ctx } as unknown as Awaited<ReturnType<typeof next>>
      } else {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Request is still being processed"
        })
      }
    } else if (existing.responseBody) {
      return { result: { data: existing.responseBody }, ctx } as unknown as Awaited<ReturnType<typeof next>>
    }
  }

  await db.insert(idempotencyKeys).values({
    key: idempotencyKey,
    userId: ctx.session?.user?.id || "",
    entityId: ctx.entityId || "",
    route: path,
    expiresAt,
    lockedAt: now
  }).onConflictDoUpdate({
    target: idempotencyKeys.key,
    set: {
      lockedAt: now,
      responseBody: null
    }
  })

  const result = await next({ ctx })

  try {
    const data = result && typeof result === "object" && "result" in result
      ? (result as { result: { data?: unknown } }).result?.data ?? result
      : result

    await db.update(idempotencyKeys)
      .set({ responseBody: data as Record<string, unknown> })
      .where(eq(idempotencyKeys.key, idempotencyKey))
  } catch {
    // best effort
  }

  return result
})

export const mutateProcedure = t.procedure
  .use(authMiddleware)
  .use(entityScopingMiddleware)
  .use(idempotencyMiddleware)

// Use createCaller from ./caller.ts to avoid circular dependency
