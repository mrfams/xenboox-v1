import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { buildSsoProviders, loadSsoConfig } from "./sso";
import { getSsoSettings, isDomainEnforced } from "@/lib/sso-settings";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@xenboox/db";
import { eq, sql } from "drizzle-orm";
import { users } from "@xenboox/db/schema/auth";
import {
  organizations,
  entities,
  userEntityAccess,
} from "@xenboox/db/schema/organization";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { logger } from "@/lib/logger";

const JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET);

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

async function ensureUserEntity(userId: string, userName: string) {
  const existingAccess = await db.query.userEntityAccess.findFirst({
    where: eq(userEntityAccess.userId, userId),
  });
  if (existingAccess) return existingAccess.entityId;

  const slug =
    (userName || "organization")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now().toString(36);

  const [org] = await db
    .insert(organizations)
    .values({
      name: `${userName}'s Organization`,
      slug,
      type: "business",
      plan: "free",
      ownerId: userId,
    })
    .returning();

  if (!org) return null;

  const [entity] = await db
    .insert(entities)
    .values({
      organizationId: org.id,
      name: `${userName}'s Organization`,
      type: "company",
      currency: "GMD",
      country: "GM",
      fiscalYearEnd: "12",
      isActive: true,
    })
    .returning();

  if (!entity) return null;

  await db.insert(userEntityAccess).values({
    userId,
    entityId: entity.id,
    role: "owner",
    grantedBy: userId,
  });

  return entity.id;
}

async function verifyDirectAuthToken(
  token: string,
): Promise<{ id: string; email: string; name: string | null } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (payload.purpose === "direct_auth" && payload.sub && payload.email) {
      return {
        id: payload.sub as string,
        email: payload.email as string,
        name: (payload.name as string) ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// Build SSO providers from environment config
const ssoProviders = buildSsoProviders();
const ssoConfig = loadSsoConfig();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // SSO providers (Azure AD, Okta, generic OIDC) — loaded from env vars
    ...ssoProviders,
    // Google (consumer) — always available if configured
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    // Email/password credentials
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
        directAuthToken: { label: "Direct Auth Token" },
      },
      async authorize(credentials, request) {
        // If a direct auth token is provided, verify it and return the user
        if (credentials?.directAuthToken) {
          const verified = await verifyDirectAuthToken(
            credentials.directAuthToken as string,
          );
          if (verified) {
            return {
              id: verified.id,
              email: verified.email,
              name: verified.name,
              image: null,
            };
          }
          return null;
        }

        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });

        if (!user?.passwordHash) return null;

        // Check account lockout
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
          logger.warn({ userId: user.id }, "Login blocked — account locked");
          return null;
        }

        // Require email verification
        if (!user.emailVerified) {
          logger.warn(
            { userId: user.id },
            "Login blocked — email not verified",
          );
          return null;
        }

        const passwordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );

        if (!passwordValid) {
          // Track failed attempt
          const newAttempts = (user.failedLoginAttempts ?? 0) + 1;
          const updates: Record<string, unknown> = {
            failedLoginAttempts: newAttempts,
          };
          if (newAttempts >= LOCKOUT_THRESHOLD) {
            updates.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
            logger.warn(
              { userId: user.id, attempts: newAttempts },
              "Account locked due to failed login attempts",
            );
          }
          await db.update(users).set(updates).where(eq(users.id, user.id));
          return null;
        }

        // Reset failed attempts on successful login
        if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
          await db
            .update(users)
            .set({ failedLoginAttempts: 0, lockoutUntil: null })
            .where(eq(users.id, user.id));
        }

        // Check MFA — if enabled, require a directAuthToken to proceed
        if (user.twoFactorEnabled) {
          return null;
        }

        // Create session record
        const sid =
          crypto.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const ipAddress =
          request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request?.headers?.get("x-real-ip") ||
          null;
        const userAgent = request?.headers?.get("user-agent") || null;

        try {
          const expires = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString();
          await db.execute(
            sql`INSERT INTO sessions (session_token, user_id, expires, ip_address, user_agent)
                VALUES (${sid}, ${user.id}, ${expires}, ${ipAddress}, ${userAgent})`,
          );
          // Cleanup: keep max 10 most recent sessions
          await db.execute(
            sql`DELETE FROM sessions WHERE user_id = ${user.id} AND id NOT IN (
              SELECT id FROM sessions WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 10
            )`,
          );
        } catch (err) {
          logger.error({ err }, "Failed to create session record");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          sid,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // JIT provisioning: create org+entity for new SSO users
      if (account?.provider && account.provider !== "credentials" && user?.id) {
        await ensureUserEntity(user.id, user.name ?? "User");
      }

      // SSO domain enforcement: block password login for SSO domain users
      if (
        ssoConfig.enabled &&
        ssoConfig.provider !== "none" &&
        account?.provider === "credentials"
      ) {
        // Check if user email matches an SSO-restricted domain
        // Reads from config file (admin UI) or env vars
        if (user?.email && isDomainEnforced(user.email)) {
          console.warn(
            `[sso] Password login blocked for SSO domain user: ${user.email}`,
          );
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // sid is set by authorize callback and passed through user object
        token.sid = (user as Record<string, unknown>).sid as string | undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session as unknown as Record<string, unknown>).sid = token.sid;
      }
      return session;
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const pathname = request.nextUrl.pathname;
      const isOnAuth =
        pathname.startsWith("/login") || pathname.startsWith("/register");
      const isOnMfaChallenge = pathname.startsWith("/mfa-challenge");
      const isOnApi = pathname.startsWith("/api/trpc");
      const isPublicMarketing =
        pathname === "/" ||
        pathname.startsWith("/features") ||
        pathname.startsWith("/pricing") ||
        pathname.startsWith("/about") ||
        pathname.startsWith("/blog") ||
        pathname.startsWith("/careers") ||
        pathname.startsWith("/contact") ||
        pathname.startsWith("/download") ||
        pathname.startsWith("/privacy") ||
        pathname.startsWith("/terms");

      if (isOnApi) return true;
      if (isPublicMarketing) return true;
      if (isOnMfaChallenge) return true;
      if (isOnAuth) {
        if (isLoggedIn)
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        return true;
      }
      if (!isLoggedIn) return false;

      return true;
    },
  },
});
