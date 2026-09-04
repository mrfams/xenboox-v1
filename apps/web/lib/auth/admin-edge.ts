import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import type { AdminRole } from "@/lib/admin/roles";
import { applyAdminIdleTimeout } from "@/lib/auth/idle-session";

/**
 * Lightweight admin auth config for Edge middleware.
 *
 * Mirrors the full config in ./admin.ts but omits database / bcrypt /
 * authorize logic (only runs on /api/admin-auth routes). In middleware the
 * JWT is only verified/decoded — the DB-backed session enforcement happens
 * in the tRPC `adminProtectedProcedure`.
 */
const useSecureCookies = process.env.NODE_ENV === "production";

export const { auth: edgeAdminAuth } = NextAuth({
  basePath: "/api/admin-auth",
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  trustHost: true,
  pages: {
    signIn: "/admin-login",
    error: "/admin-login",
  },
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
      // Never called in middleware — only on /api/admin-auth/signin
      async authorize() {
        return null;
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
        token.lastActivity = Date.now();
      } else {
        const maybe = applyAdminIdleTimeout(
          token as Record<string, unknown>,
        );
        if (maybe === null) return null as unknown as typeof token;
        return maybe as typeof token;
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
  },
});
