import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { edgeAuth as auth } from "@/lib/auth/edge";
import { applySecurityHeaders, generateNonce } from "@/lib/security/headers";

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
  const response = NextResponse.next();
  applySecurityHeaders(response.headers, nonce);
  response.headers.set("x-nonce", nonce);
  response.headers.set("x-request-id", requestId);

  // CSRF-style origin validation for mutations
  if (isOnApi && isMutation) {
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  // Rate limiting
  if (isOnApi || isOnAuthRoute) {
    try {
      const limiter = await getRateLimiter();
      const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
      const identifier = req.auth?.user?.id || ip;

      let result: Awaited<ReturnType<typeof limiter.checkApiRateLimit>>;

      if (
        pathname === "/login" ||
        pathname.startsWith("/api/auth/callback/credentials")
      ) {
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

    if (isOnApi) return response;
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
