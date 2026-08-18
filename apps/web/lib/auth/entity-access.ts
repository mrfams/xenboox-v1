// ─── Shared entity-access validation for raw route handlers ────────────────
//
// Mirrors the logic in lib/trpc/server.ts `entityScopingMiddleware` so that
// non-tRPC routes (SSE streams, webhooks, cron) enforce the same access rule:
//   1. Org-level owner/admin (org_roles) → full access to every entity in org
//   2. Otherwise explicit user_entity_access row required
//
// Returns the resolved access info, or null when the user has no access.

import { eq, and } from "drizzle-orm";
import {
  userEntityAccess,
  entities,
  organizations,
} from "@xenboox/db/schema/organization";
import { orgRoles } from "@xenboox/db/schema/org-roles";

import { db } from "@/lib/db";

export interface EntityAccessInfo {
  entityId: string;
  role: string | null;
  billingPlan: string | undefined;
}

/**
 * Verifies a user can access the given entity. Throws nothing — returns
 * `null` when access is denied so callers can decide the HTTP status.
 */
export async function resolveEntityAccess(
  userId: string,
  entityId: string,
): Promise<EntityAccessInfo | null> {
  if (!entityId) return null;

  // Step 1: org-level owner/admin has full access to all entities in the org
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
    columns: { id: true, organizationId: true },
  });

  let billingPlan: string | undefined;
  if (entity?.organizationId) {
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

    if (orgRole && ["owner", "admin"].includes(orgRole.role)) {
      return { entityId, role: orgRole.role, billingPlan };
    }
  }

  // Step 2: explicit entity-level access
  const access = await db.query.userEntityAccess.findFirst({
    where: and(
      eq(userEntityAccess.userId, userId),
      eq(userEntityAccess.entityId, entityId),
    ),
    columns: { entityId: true, role: true },
  });

  if (!access) return null;
  return { entityId: access.entityId, role: access.role, billingPlan };
}
