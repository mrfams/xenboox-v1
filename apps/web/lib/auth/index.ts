import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@xenboox/db";
import { eq } from "drizzle-orm";
import { users } from "@xenboox/db/schema/auth";
import {
  organizations,
  entities,
  userEntityAccess,
} from "@xenboox/db/schema/organization";
import bcrypt from "bcryptjs";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });

        if (!user?.passwordHash) return null;

        const passwordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );

        if (!passwordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user?.id) {
        await ensureUserEntity(user.id, user.name ?? "User");
      }
      return true;
    },
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
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const pathname = request.nextUrl.pathname;
      const isOnAuth =
        pathname.startsWith("/login") || pathname.startsWith("/register");
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
