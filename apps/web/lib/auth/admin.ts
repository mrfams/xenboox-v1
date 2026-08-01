import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq, and, gt, asc, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminUsers, adminSessions } from "@xenboox/db/schema";
import { verifyTOTP } from "@/lib/auth/totp";
import { decryptSecret } from "@/lib/admin/totp";
import {
  computeSessionExpiry,
  MAX_CONCURRENT_SESSIONS,
} from "@/lib/admin/session";
import type { AdminRole } from "@/lib/admin/roles";
import { verifyMfaChallenge } from "@/lib/admin/mfa-challenge";
import { logger } from "@/lib/logger";

const useSecureCookies = process.env.NODE_ENV === "production";

export const {
  handlers: adminHandlers,
  auth: adminAuth,
  signIn: adminSignIn,
  signOut: adminSignOut,
} = NextAuth({
  basePath: "/api/admin-auth",
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 }, // 12h hard cap
  trustHost: true,
  pages: {
    signIn: "/admin-login",
    error: "/admin-login",
  },
  // Isolate admin cookies so they never collide with customer auth cookies.
  cookies: {
    sessionToken: {
      name: "admin.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: "admin.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  providers: [
    Credentials({
      name: "admin-credentials",
      credentials: {
        challengeToken: { label: "Challenge" },
        totpCode: { label: "TOTP Code" },
      },
      async authorize(credentials, request) {
        const rawChallenge = credentials?.challengeToken;
        const challenge = rawChallenge
          ? await verifyMfaChallenge(String(rawChallenge))
          : null;
        const totpCode = credentials?.totpCode as string | undefined;

        if (!challenge?.adminUserId || !totpCode) return null;

        const user = await db.query.adminUsers.findFirst({
          where: eq(adminUsers.id, challenge.adminUserId),
        });

        if (!user || !user.isActive) {
          logger.warn(
            { adminUserId: challenge.adminUserId },
            "Admin login blocked — user missing or inactive",
          );
          return null;
        }

        // 2FA is mandatory — accounts that never enrolled cannot sign in.
        if (!user.totpEnrolled || !user.totpSecretEncrypted) return null;

        const secret = decryptSecret(user.totpSecretEncrypted);
        if (!secret || !verifyTOTP(totpCode, secret)) {
          logger.warn(
            { adminUserId: user.id },
            "Admin login blocked — invalid TOTP code",
          );
          return null;
        }

        const now = new Date();
        const sid = crypto.randomUUID();
        const expiresAt = computeSessionExpiry({
          issuedAt: now,
          lastActiveAt: now,
          now,
        });
        const ipAddress =
          request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request?.headers?.get("x-real-ip") ||
          null;
        const userAgent = request?.headers?.get("user-agent") || null;

        try {
          // Enforce concurrency cap: evict oldest sessions until under the cap.
          const active = await db.query.adminSessions.findMany({
            where: and(
              eq(adminSessions.adminUserId, user.id),
              isNull(adminSessions.revokedAt),
              gt(adminSessions.expiresAt, now),
            ),
            columns: { id: true },
            orderBy: asc(adminSessions.createdAt),
          });

          const toEvict = Math.max(
            0,
            active.length - (MAX_CONCURRENT_SESSIONS - 1),
          );
          for (const session of active.slice(0, toEvict)) {
            await db
              .update(adminSessions)
              .set({ revokedAt: now })
              .where(eq(adminSessions.id, session.id));
          }

          await db.insert(adminSessions).values({
            id: sid,
            adminUserId: user.id,
            tokenHash: sid,
            ipAddress,
            userAgent,
            issuedAt: now,
            lastActiveAt: now,
            expiresAt,
          });

          await db
            .update(adminUsers)
            .set({ lastLoginAt: now })
            .where(eq(adminUsers.id, user.id));
        } catch (err) {
          logger.error(
            { err, adminUserId: user.id },
            "Failed to create admin session record",
          );
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          adminSid: sid,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.adminUserId = user.id;
        token.adminSid = (user as Record<string, unknown>).adminSid as
          | string
          | undefined;
        token.adminRole = (user as Record<string, unknown>).role as
          | AdminRole
          | undefined;
      }
      return token;
    },
    async session({ session, token }) {
      const admin = session as unknown as Record<string, unknown>;
      admin.admin = {
        id: token.adminUserId,
        role: token.adminRole,
      };
      admin.adminSid = token.adminSid;
      return session;
    },
    async authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;
      const isApi = pathname.startsWith("/api");
      if (isApi) return true;
      const adminSession = auth as unknown as {
        admin?: { id?: string };
      } | null;
      const isAdminLoggedIn = !!adminSession?.admin?.id;
      if (pathname.startsWith("/admin-login")) {
        if (isAdminLoggedIn)
          return Response.redirect(new URL("/admin", request.nextUrl));
        return true;
      }
      if (pathname.startsWith("/admin")) return isAdminLoggedIn;
      return true;
    },
  },
});
