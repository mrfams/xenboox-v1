import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { applySecurityHeaders } from "@/lib/security/headers"
import { getRateLimiter } from "@/lib/security/rate-limiter"

const PUBLIC_ROUTES = ["/", "/features", "/pricing", "/login", "/register", "/about", "/blog", "/careers", "/contact", "/download", "/privacy", "/terms"]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
}

export default auth(async (req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname
  const isOnAuth = pathname.startsWith("/login") || pathname.startsWith("/register")
  const isOnApi = pathname.startsWith("/api")
  const isHealthCheck = pathname.startsWith("/api/health")
  const isPublic = isPublicRoute(pathname)

  const response = NextResponse.next()
  applySecurityHeaders(response.headers)

  if (isHealthCheck) {
    return response
  }

  if (isOnApi) {
    const rateLimiter = getRateLimiter()
    const identifier = req.auth?.user?.id || req.headers.get('x-forwarded-for') || 'anonymous'

    try {
      const result = await rateLimiter.checkApiRateLimit(identifier)

      response.headers.set('X-RateLimit-Limit', result.limit.toString())
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
      response.headers.set('X-RateLimit-Reset', result.reset.toString())

      if (!result.success) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          {
            status: 429,
            headers: response.headers
          }
        )
      }
    } catch (error) {
      console.error('Rate limiting error:', error)
    }

    return response
  }

  if (isLoggedIn && isOnAuth) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  }

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  return response
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)"
  ]
}