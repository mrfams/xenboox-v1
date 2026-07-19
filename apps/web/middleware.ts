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

let rateLimiter: {
  checkApiRateLimit: (id: string) => Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
} | null = null;

async function getRateLimiter() {
  if (!rateLimiter) {
    const mod = await import("@/lib/security/rate-limiter");
    rateLimiter = mod.getRateLimiter();
  }
  return rateLimiter;
}

export default auth(async (req) => {
  const requestId = nanoid();
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/api/health")) {
    const response = NextResponse.next();
    applySecurityHeaders(response.headers, generateNonce());
    return response;
  }

  const isOnApi = pathname.startsWith("/api");
  const isOnAuth =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isPublic = isPublicRoute(pathname);
  const isMutation =
    req.method === "POST" ||
    req.method === "PUT" ||
    req.method === "PATCH" ||
    req.method === "DELETE";

  const isLoggedIn = !!req.auth;
  const nonce = generateNonce();
  const response = NextResponse.next();
  applySecurityHeaders(response.headers, nonce);
  response.headers.set("x-nonce", nonce);
  response.headers.set("x-request-id", requestId);

  if (isOnApi && isMutation) {
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  if (isOnApi) {
    try {
      const limiter = await getRateLimiter();
      const identifier =
        req.auth?.user?.id || req.headers.get("x-forwarded-for") || "anonymous";

      const result = await limiter.checkApiRateLimit(identifier);

      response.headers.set("X-RateLimit-Limit", result.limit.toString());
      response.headers.set(
        "X-RateLimit-Remaining",
        result.remaining.toString(),
      );
      response.headers.set("X-RateLimit-Reset", result.reset.toString());

      if (!result.success) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429, headers: response.headers },
        );
      }
    } catch {
      // Rate limiter unavailable — allow request through
    }

    return response;
  }

  if (isLoggedIn && isOnAuth) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
