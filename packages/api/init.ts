import { initTRPC, TRPCError } from "@trpc/server"
import { z } from "zod"

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
}

const t = initTRPC.context<Context>().create({
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
  }
})

export const router = t.router
export const publicProcedure = t.procedure

export function createAuthMiddleware(authFn: () => Promise<Session>) {
  return t.middleware(async ({ ctx, next }) => {
    const session = await authFn()

    if (!session?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access this resource"
      })
    }

    return next({ ctx: { ...ctx, session } })
  })
}

export function createEntityScopingMiddleware(
  dbQuery: (userId: string, entityId: string) => Promise<{ role: string } | undefined>
) {
  return t.middleware(async ({ ctx, next }) => {
    const entityId = (ctx as { entityId?: string }).entityId

    if (!entityId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Entity ID is required. Pass it in the x-entity-id header."
      })
    }

    const access = await dbQuery(ctx.session!.user!.id!, entityId)

    if (!access) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this entity"
      })
    }

    return next({ ctx: { ...ctx, entityId, entityRole: access.role } })
  })
}

export function createRequireRoleMiddleware(...roles: string[]) {
  return t.middleware(async ({ ctx, next }) => {
    const role = (ctx as { entityRole?: string }).entityRole
    if (!role || !roles.includes(role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This action requires one of these roles: ${roles.join(", ")}`
      })
    }
    return next({ ctx })
  })
}
