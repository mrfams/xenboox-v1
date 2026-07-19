import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

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
export const { auth: edgeAuth } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // Never called in middleware — only on /api/auth/signin
      async authorize() {
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
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
