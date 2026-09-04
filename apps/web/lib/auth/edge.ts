import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

import { buildSsoProviders } from "./sso";
import { applyIdleTimeout } from "./idle-session";

/**
 * Lightweight auth config for Edge middleware.
 *
 * Mirrors the full auth config in ./index.ts but omits:
 * - DrizzleAdapter / database imports (not Edge-compatible)
 * - bcrypt / credentials authorize logic (only runs on API routes)
 *
 * In the middleware context NextAuth only verifies the existing JWT —
 * it never calls `authorize` or touches the adapter.
 */

// Build SSO providers from environment config
const ssoProviders = buildSsoProviders();

export const { auth: edgeAuth } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // SSO providers (Azure AD, Okta, generic OIDC)
    ...ssoProviders,
    // Google (consumer)
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    // Credentials — stub for middleware (authorize never called here)
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize() {
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.lastActivity = Date.now();
      } else {
        // §20.1 idle — Edge must enforce same timeout as server (index.ts) or
        // middleware will keep isLoggedIn=true after 60 min and never redirect.
        const maybe = applyIdleTimeout(token as Record<string, unknown>);
        if (maybe === null) return null as unknown as typeof token;
        return maybe as typeof token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
