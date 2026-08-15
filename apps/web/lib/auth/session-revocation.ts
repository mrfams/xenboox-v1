/**
 * Session revocation — the JWT sessions created at login carry a `sid` that
 * the tRPC authMiddleware verifies against the `sessions` table on every
 * request. Deleting rows therefore kills JWTs server-side within one request
 * — the stateless-token equivalent of destroying a session store.
 *
 * - Password change: revoke every session EXCEPT the one that performed the
 *   change (industry standard — the actor stays signed in, stolen copies die).
 * - Password reset / role revocation / disable: revoke ALL sessions.
 */

import { eq, and, ne } from "drizzle-orm";
import { sessions } from "@xenboox/db/schema/auth";
import { adminSessions } from "@xenboox/db/schema/admin";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Delete all user sessions, optionally keeping one (the current sid).
 * @param keepSid — session_token of the session to preserve (or null/undefined
 * to revoke everything).
 */
export async function revokeUserSessions(
  userId: string,
  keepSid?: string | null,
): Promise<number> {
  const conditions = [eq(sessions.userId, userId)];
  if (keepSid) {
    conditions.push(ne(sessions.sessionToken, keepSid));
  }
  const result = await db
    .delete(sessions)
    .where(and(...conditions))
    .returning({ id: sessions.id });

  logger.info(
    {
      userId,
      revokedCount: result.length,
      keptCurrentSession: Boolean(keepSid),
    },
    "User sessions revoked",
  );
  return result.length;
}

/**
 * Delete all admin-control-plane sessions for an admin user, optionally
 * keeping one. Called on admin role changes so the new role takes effect on
 * the next request (no stale-role sessions survive).
 */
export async function revokeAdminSessions(
  adminUserId: string,
  keepSessionId?: string | null,
): Promise<number> {
  const conditions = [eq(adminSessions.adminUserId, adminUserId)];
  if (keepSessionId) {
    conditions.push(ne(adminSessions.id, keepSessionId));
  }
  const result = await db
    .delete(adminSessions)
    .where(and(...conditions))
    .returning({ id: adminSessions.id });

  logger.info(
    { adminUserId, revokedCount: result.length },
    "Admin sessions revoked",
  );
  return result.length;
}
