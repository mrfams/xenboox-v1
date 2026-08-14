import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { edgeAuth as auth } from "@/lib/auth/edge";
import { edgeAdminAuth } from "@/lib/auth/admin-edge";
import { getClientIp } from "@/lib/security/client-ip";
import {
  applySecurityHeaders,
  buildCSP,
  buildDevCSP,
  generateNonce,
} from "@/lib/security/headers";

const PUBLIC_ROUTES = [
  "/",
  "/features",
  "/pricing",
  "/login",
  "/register",
  "/about",
  "/blog",
  "/careers",
  "/contact",
  "/download",
  "/privacy",
  "/terms",
  "/cookies",
  "/refund",
  "/sla",
  "/docs",
  "/mfa-challenge",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/admin-login",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/api/auth/callback/credentials")
  );
}

function validateOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (!host) return false;
  if (!origin) {
    const method = req.method;
    if (method === "GET" || method === "HEAD") return true;
    const contentType = req.headers.get("content-type") ?? "";
    if (
      contentType.includes("application/json") ||
      contentType.includes("multipart/form-data")
    )
      return true;
    return false;
  }

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

async function getRateLimiter() {
  const mod = await import("@/lib/security/rate-limiter");
  return mod.getRateLimiter();
}

export default auth(async (req) => {
  const requestId = nanoid();
  const pathname = req.nextUrl.pathname;
  const method = req.method;

  if (pathname.startsWith("/api/health")) {
    const response = NextResponse.next();
    applySecurityHeaders(response.headers, generateNonce());
    return response;
  }

  const isOnApi = pathname.startsWith("/api");
  const isOnAuthRoute = isAuthRoute(pathname);
  const isPublic = isPublicRoute(pathname);
  const isMutation =
    method === "POST" ||
    method === "PUT" ||
    method === "PATCH" ||
    method === "DELETE";

  const isLoggedIn = !!req.auth;
  const nonce = generateNonce();

  // Next.js 15.5 reads the CSP nonce from the content-security-policy
  // REQUEST header (getScriptNonceFromHeader in app-render) and applies it to
  // its own inline <script>/<style> tags. The Next 14 x-nonce convention is
  // ignored. Setting the CSP only on the response headers leaves
  // <script nonce=""> tags, which the strict production CSP then blocks.
  const csp =
    process.env.NODE_ENV === "development" ? buildDevCSP() : buildCSP(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("content-security-policy", csp);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applySecurityHeaders(response.headers, nonce);
  response.headers.set("x-nonce", nonce);
  response.headers.set("x-request-id", requestId);

  // CSRF-style origin validation for mutations (skip auth — Auth.js handles CSRF)
  if (isOnApi && isMutation && !pathname.startsWith("/api/auth")) {
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  // Edge rate limiting — applies to ALL /api/* traffic (reads AND mutations)
  // plus auth routes, so abusive traffic is rejected at the edge before it
  // ever reaches a function invocation. The credentials callback IS the
  // brute-force surface (login form POSTs here), so it must be rate limited
  // — the earlier blanket exclusion left password guessing unbounded when the
  // DB lockout wasn't reachable. OAuth callbacks (google/azure/okta/sso) are
  // server-to-server redirects and stay excluded.
  const isCredentialsCallback = pathname.startsWith(
    "/api/auth/callback/credentials",
  );
  const isOAuthCallback =
    pathname.startsWith("/api/auth/callback/") && !isCredentialsCallback;
  if (isOnApi && !isOAuthCallback && !pathname.startsWith("/api/health")) {
    try {
      const limiter = await getRateLimiter();
      // Trusted-proxy-safe: x-vercel-forwarded-for, else the rightmost hop of
      // x-forwarded-for (client-prepended spoofs sit left of the proxy's own
      // observation). Never use the raw header as the key.
      const ip = getClientIp(req.headers);
      const identifier = req.auth?.user?.id || ip;

      let result: Awaited<ReturnType<typeof limiter.checkApiRateLimit>>;

      if (isCredentialsCallback || pathname === "/login") {
        result = await limiter.checkAuthLoginRateLimit(identifier);
        response.headers.set("X-RateLimit-Category", "auth-login");
      } else if (pathname === "/register") {
        result = await limiter.checkAuthRegisterRateLimit(identifier);
        response.headers.set("X-RateLimit-Category", "auth-register");
      } else if (
        pathname === "/forgot-password" ||
        pathname === "/reset-password"
      ) {
        result = await limiter.checkAuthPasswordRateLimit(identifier);
        response.headers.set("X-RateLimit-Category", "auth-password");
      } else if (pathname.startsWith("/api/webhooks/")) {
        result = await limiter.checkWebhookRateLimit(identifier);
        response.headers.set("X-RateLimit-Category", "webhook");
      } else if (!isMutation) {
        // Reads: generous ceiling so legit batch reads are never throttled,
        // but a scraper hammering GET endpoints still dies at the edge.
        result = await limiter.checkApiReadRateLimit(identifier);
        response.headers.set("X-RateLimit-Category", "api-read");
      } else {
        result = await limiter.checkApiRateLimit(identifier);
        response.headers.set("X-RateLimit-Category", "api");
      }

      response.headers.set("X-RateLimit-Limit", result.limit.toString());
      response.headers.set(
        "X-RateLimit-Remaining",
        result.remaining.toString(),
      );
      response.headers.set("X-RateLimit-Reset", result.reset.toString());

      if (!result.success) {
        const retryAfter = Math.max(
          1,
          result.reset - Math.floor(Date.now() / 1000),
        );
        const errorResponse = NextResponse.json(
          { error: "Too many requests. Please slow down." },
          {
            status: 429,
            headers: {
              "Retry-After": retryAfter.toString(),
              "X-RateLimit-Limit": result.limit.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": result.reset.toString(),
            },
          },
        );
        return errorResponse;
      }
    } catch {
      // Rate limiter completely unavailable — in-memory fallback handles this,
      // but if even that fails, allow the request through
    }
  }

  // Pass through all /api/* routes — Auth.js and tRPC handle auth themselves
  if (isOnApi) {
    return response;
  }

  // Admin control-plane gating — separate session from customer auth.
  // Any admin route requires an active admin JWT; unauthenticated admins
  // are sent to /admin-login, never the customer login.
  if (pathname.startsWith("/admin")) {
    const adminSession = await edgeAdminAuth();
    const admin = adminSession as unknown as { admin?: { id?: string } };
    const isAdminLoggedIn = !!admin?.admin?.id;

    if (pathname === "/admin-login") {
      if (isAdminLoggedIn) {
        return NextResponse.redirect(new URL("/admin", req.nextUrl));
      }
      return response;
    }

    if (!isAdminLoggedIn) {
      return NextResponse.redirect(new URL("/admin-login", req.nextUrl));
    }
    return response;
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isOnAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
