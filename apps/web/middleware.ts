import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { edgeAuth as auth } from "@/lib/auth/edge";
import { applySecurityHeaders, generateNonce } from "@/lib/security/headers";
import { getRateLimiter } from "@/lib/security/rate-limiter";
import { logger } from "@/lib/logger";

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
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

function validateOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (!host) return false;
  if (!origin) {
    // Same-origin navigations may omit Origin; require a safe Content-Type or GET
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

export default auth(async (req) => {
  const requestId = nanoid();
  const reqLog = logger.child({ requestId });

  reqLog.info(
    { method: req.method, path: req.nextUrl.pathname },
    "Incoming request",
  );

  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isOnAuth =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isOnApi = pathname.startsWith("/api");
  const isHealthCheck = pathname.startsWith("/api/health");
  const isPublic = isPublicRoute(pathname);
  const isMutation =
    req.method === "POST" ||
    req.method === "PUT" ||
    req.method === "PATCH" ||
    req.method === "DELETE";

  const nonce = generateNonce();
  const response = NextResponse.next();
  applySecurityHeaders(response.headers, nonce);
  response.headers.set("x-nonce", nonce);
  response.headers.set("x-request-id", requestId);

  if (isHealthCheck) {
    reqLog.debug("Health check request");
    return response;
  }

  if (isOnApi && isMutation && !isHealthCheck) {
    if (!validateOrigin(req)) {
      reqLog.warn(
        { origin: req.headers.get("origin") },
        "Invalid origin detected",
      );
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  if (isOnApi) {
    const rateLimiter = getRateLimiter();
    const identifier =
      req.auth?.user?.id || req.headers.get("x-forwarded-for") || "anonymous";

    try {
      const result = await rateLimiter.checkApiRateLimit(identifier);

      response.headers.set("X-RateLimit-Limit", result.limit.toString());
      response.headers.set(
        "X-RateLimit-Remaining",
        result.remaining.toString(),
      );
      response.headers.set("X-RateLimit-Reset", result.reset.toString());

      if (!result.success) {
        reqLog.warn({ identifier }, "Rate limit exceeded");
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          {
            status: 429,
            headers: response.headers,
          },
        );
      }
    } catch (error) {
      reqLog.error({ error }, "Rate limiting error");
    }

    return response;
  }

  if (isLoggedIn && isOnAuth) {
    reqLog.debug("Redirecting logged-in user from auth page");
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  if (!isLoggedIn && !isPublic) {
    reqLog.debug("Redirecting unauthenticated user to login");
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  reqLog.debug("Request allowed");
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
