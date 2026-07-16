import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@xenboox/db"
import { eq } from "drizzle-orm"
import { users } from "@xenboox/db/schema/auth"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login"
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string)
        })

        if (!user?.passwordHash) return null

        const passwordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!passwordValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const pathname = request.nextUrl.pathname
      const isOnAuth = pathname.startsWith("/login") || pathname.startsWith("/register")
      const isOnApi = pathname.startsWith("/api/trpc")
      const isPublicMarketing =
        pathname === "/" || pathname.startsWith("/features") || pathname.startsWith("/pricing") ||
        pathname.startsWith("/about") || pathname.startsWith("/blog") || pathname.startsWith("/careers") ||
        pathname.startsWith("/contact") || pathname.startsWith("/download") || pathname.startsWith("/privacy") ||
        pathname.startsWith("/terms")

      if (isOnApi) return true
      if (isPublicMarketing) return true
      if (isOnAuth) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", request.nextUrl))
        return true
      }
      if (!isLoggedIn) return false

      return true
    }
  }
})
