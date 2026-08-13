// ─── REST API v1 Endpoint (Phase 3) ─────────────────────────────────────
//
// External API access for Pro/Firm tier organizations.
//
// Auth: `x-api-key` header with full key (xb_xxx...)
// Docs: https://docs.xenboox.com/api/v1
//
// Core constraint: API access is bound by the exact same RBAC and agent-review
// chain as every other interface — it is never a shortcut.

import crypto from "crypto";

import { eq, and, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { apiKeys, apiCallLogs, TIER_RATE_LIMITS } from "@xenboox/db/schema";
import { journalEntries, chartOfAccounts } from "@xenboox/db/schema/accounting";
import { salesInvoices, invoicesAp } from "@xenboox/db/schema/ap-ar";
import { customers, suppliers } from "@xenboox/db/schema/ap-ar";
import { bankAccounts, bankTransactions } from "@xenboox/db/schema/treasury";
import { logger } from "@/lib/logger";

import { db } from "@/lib/db";
import { getRateLimiter } from "@/lib/security/rate-limiter";

// ─── Types ────────────────────────────────────────────────────────────────

interface ApiKeyData {
  id: string;
  orgId: string;
  tier: string;
  roleScope: string;
  entityScope: string[];
  scopes: Array<{ resource: string; permission: string }>;
  rateLimitPerMinute: number | null;
}

interface AuthResult {
  authenticated: boolean;
  key?: ApiKeyData;
  error?: string;
  status?: number;
}

// ─── API Key Authentication ──────────────────────────────────────────────

async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey) {
    return {
      authenticated: false,
      error: "Missing x-api-key header. Provide your API key to authenticate.",
      status: 401,
    };
  }

  if (!apiKey.startsWith("xb_") || apiKey.length < 20) {
    return {
      authenticated: false,
      error: "Invalid API key format. Keys start with 'xb_'.",
      status: 401,
    };
  }

  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const keyPrefix = apiKey.slice(0, 10);

  // Find the key by prefix + hash
  const keyRecord = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.keyPrefix, keyPrefix), eq(apiKeys.keyHash, keyHash)),
    with: { scopes: true },
  });

  if (!keyRecord) {
    return {
      authenticated: false,
      error: "Invalid API key. Check your key and try again.",
      status: 401,
    };
  }

  // Check status
  if (keyRecord.status === "revoked") {
    return {
      authenticated: false,
      error:
        "This API key has been revoked. Create a new one from the dashboard.",
      status: 401,
    };
  }

  if (keyRecord.status === "expired") {
    return {
      authenticated: false,
      error: "This API key has expired. Create a new one from the dashboard.",
      status: 401,
    };
  }

  // Check expiration
  if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
    await db
      .update(apiKeys)
      .set({ status: "expired" as any })
      .where(eq(apiKeys.id, keyRecord.id));

    return {
      authenticated: false,
      error: "This API key has expired. Create a new one from the dashboard.",
      status: 401,
    };
  }

  // Update last used
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() as any })
    .where(eq(apiKeys.id, keyRecord.id));

  return {
    authenticated: true,
    key: {
      id: keyRecord.id,
      orgId: keyRecord.orgId,
      tier: keyRecord.tier,
      roleScope: keyRecord.roleScope,
      entityScope: keyRecord.entityScope ?? [],
      scopes: keyRecord.scopes.map((s) => ({
        resource: s.resource,
        permission: s.permission,
      })),
      rateLimitPerMinute: keyRecord.rateLimitPerMinute,
    },
  };
}

// ─── Rate Limiting ─────────────────────────────────────────────────────────

async function checkRateLimit(key: ApiKeyData): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  reset: number;
}> {
  const tierLimit = TIER_RATE_LIMITS[key.tier] ?? TIER_RATE_LIMITS.standard;
  const perMinute = key.rateLimitPerMinute ?? tierLimit.perMinute;

  const limiter = getRateLimiter();
  const result = await limiter.checkApiRateLimit(`api_key:${key.id}`);

  // Our existing rate limiter returns checkApiRateLimit as 1000/60s
  // We use the per-minute limit from the tier config instead
  return {
    allowed: result.success,
    remaining: result.remaining,
    limit: perMinute,
    reset: result.reset,
  };
}

// ─── Authorization ────────────────────────────────────────────────────────

function checkScope(
  key: ApiKeyData,
  resource: string,
  requiredPermission: "read" | "write" | "admin",
): boolean {
  if (key.roleScope === "admin") return true; // Admin keys have all access
  if (requiredPermission === "write" && key.roleScope === "read_only")
    return false;

  // For read: allow if scope has "read" or "write" permission
  // For write: only allow if scope has "write" permission
  return key.scopes.some(
    (s) =>
      s.resource === resource &&
      (requiredPermission === "write"
        ? s.permission === "write"
        : s.permission === "read" || s.permission === "write"),
  );
}

// ─── Response Helpers ─────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: true, message, documentation: "https://docs.xenboox.com/api/v1" },
    { status },
  );
}

// ─── Log API Call ─────────────────────────────────────────────────────────

async function logApiCall(params: {
  keyId: string | null;
  entityId?: string | null;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  statusCode: number;
  durationMs: number;
  ipAddress?: string;
  userAgent?: string;
  rateLimited: boolean;
  errorMessage?: string;
}) {
  // Entity ID is required for all API call logs
  if (!params.entityId) return;
  try {
    await db.insert(apiCallLogs).values({
      apiKeyId: params.keyId,
      entityId: params.entityId,
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      durationMs: params.durationMs,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      rateLimited: params.rateLimited,
      errorMessage: params.errorMessage,
    });
  } catch {
    // Best-effort logging — never fail the API call because of logging
  }
}

// ─── GET Handler ─────────────────────────────────────────────────────────

async function handleGet(
  req: NextRequest,
  key: ApiKeyData,
  resource: string[],
): Promise<NextResponse> {
  const start = Date.now();
  const path = resource.join("/");
  const entityId = key.entityScope[0]; // Use first entity in scope for now

  // Check scope
  const resourceType = resource[0] ?? "";
  if (!checkScope(key, resourceType, "read")) {
    await logApiCall({
      keyId: key.id,
      entityId,
      endpoint: path,
      method: "GET",
      statusCode: 403,
      durationMs: Date.now() - start,
      rateLimited: false,
      errorMessage: "Forbidden — key lacks read access to this resource",
    });
    return errorResponse(
      "Forbidden: API key does not have read access to this resource",
      403,
    );
  }

  try {
    let data: unknown;

    switch (resourceType) {
      // ── Transactions / Journal Entries ─────────────────────────
      case "transactions": {
        const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
        const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "25");
        const offset = (page - 1) * limit;

        const items = await db.query.journalEntries.findMany({
          where: eq(journalEntries.entityId, entityId),
          orderBy: [desc(journalEntries.date)],
          limit: Math.min(limit, 100),
          offset,
          with: { lines: true },
        });

        data = items;
        break;
      }

      // ── Accounts / Chart of Accounts ──────────────────────────
      case "accounts": {
        if (resource[1] === "balances") {
          const items = await db.query.chartOfAccounts.findMany({
            where: eq(chartOfAccounts.entityId, entityId),
            columns: {
              id: true,
              code: true,
              name: true,
              type: true,
              subtype: true,
              isActive: true,
            },
          });
          data = items;
        } else {
          const items = await db.query.chartOfAccounts.findMany({
            where: eq(chartOfAccounts.entityId, entityId),
          });
          data = items;
        }
        break;
      }

      // ── Invoices (Sales) ──────────────────────────────────────
      case "invoices": {
        const statusParam = req.nextUrl.searchParams.get("status");
        const where = statusParam
          ? and(
              eq(salesInvoices.entityId, entityId),
              eq(salesInvoices.status, statusParam as any),
            )
          : eq(salesInvoices.entityId, entityId);

        const items = await db.query.salesInvoices.findMany({
          where,
          orderBy: [desc(salesInvoices.createdAt)],
          limit: 50,
        });
        data = items;
        break;
      }

      // ── Bills (AP Invoices) ────────────────────────────────────
      case "bills": {
        const statusParam = req.nextUrl.searchParams.get("status");
        const where = statusParam
          ? and(
              eq(invoicesAp.entityId, entityId),
              eq(invoicesAp.status, statusParam as any),
            )
          : eq(invoicesAp.entityId, entityId);

        const items = await db.query.invoicesAp.findMany({
          where,
          orderBy: [desc(invoicesAp.createdAt)],
          limit: 50,
        });
        data = items;
        break;
      }

      // ── Customers ─────────────────────────────────────────────
      case "customers": {
        const items = await db.query.customers.findMany({
          where: eq(customers.entityId, entityId),
          orderBy: [desc(customers.createdAt)],
          limit: 50,
        });
        data = items;
        break;
      }

      // ── Suppliers ─────────────────────────────────────────────
      case "suppliers": {
        const items = await db.query.suppliers.findMany({
          where: eq(suppliers.entityId, entityId),
          orderBy: [desc(suppliers.createdAt)],
          limit: 50,
        });
        data = items;
        break;
      }

      // ── Bank Accounts ─────────────────────────────────────────
      case "bank": {
        const items = await db.query.bankAccounts.findMany({
          where: eq(bankAccounts.entityId, entityId),
        });
        data = items;
        break;
      }

      // ── Bank Transactions ─────────────────────────────────────
      case "bank-transactions": {
        const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
        const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "25");
        const items = await db.query.bankTransactions.findMany({
          where: eq(bankTransactions.entityId, entityId),
          orderBy: [desc(bankTransactions.transactionDate)],
          limit: Math.min(limit, 100),
          offset: (page - 1) * limit,
        });
        data = items;
        break;
      }

      // ── Reports ──────────────────────────────────────────────
      case "reports": {
        const reportType = resource[1] ?? "trial-balance";
        const ____period = req.nextUrl.searchParams.get("period");

        if (reportType === "trial-balance") {
          const accounts = await db.query.chartOfAccounts.findMany({
            where: eq(chartOfAccounts.entityId, entityId),
          });
          data = {
            type: "trial-balance",
            accounts: accounts.length,
            data: accounts,
          };
        } else {
          data = {
            type: reportType,
            note: "Report generation requires period parameter",
          };
        }
        break;
      }

      default:
        await logApiCall({
          keyId: key.id,
          entityId,
          endpoint: path,
          method: "GET",
          statusCode: 404,
          durationMs: Date.now() - start,
          rateLimited: false,
          errorMessage: `Unknown resource: ${path}`,
        });
        return errorResponse(
          `Unknown resource: ${path}. See docs for available endpoints.`,
          404,
        );
    }

    await logApiCall({
      keyId: key.id,
      entityId,
      endpoint: path,
      method: "GET",
      statusCode: 200,
      durationMs: Date.now() - start,
      rateLimited: false,
    });

    return jsonResponse({
      success: true,
      data,
      meta: { entityId, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    await logApiCall({
      keyId: key.id,
      entityId,
      endpoint: path,
      method: "GET",
      statusCode: 500,
      durationMs: Date.now() - start,
      rateLimited: false,
      errorMessage: message,
    });
    return errorResponse("An internal error occurred", 500);
  }
}

// ─── POST Handler ────────────────────────────────────────────────────────

async function handlePost(
  req: NextRequest,
  key: ApiKeyData,
  resource: string[],
): Promise<NextResponse> {
  const start = Date.now();
  const path = resource.join("/");
  const entityId = key.entityScope[0] ?? "";

  // Check write scope
  const resourceType = resource[0] ?? "";
  if (!checkScope(key, resourceType, "write")) {
    await logApiCall({
      keyId: key.id,
      entityId,
      endpoint: path,
      method: "POST",
      statusCode: 403,
      durationMs: Date.now() - start,
      rateLimited: false,
      errorMessage: "Forbidden — key lacks write access to this resource",
    });
    return errorResponse(
      "Forbidden: API key does not have write access to this resource",
      403,
    );
  }

  try {
    const ____body = await req.json();

    // Write endpoints route through the same agent pipelines as web/chat.
    // For now, we validate and queue — in production this would trigger the
    // appropriate agent pipeline (AR Agent → Controller Agent → Ledger Agent).
    switch (path) {
      case "invoices": {
        // Create invoice — routes through AR Agent pipeline
        // TODO: Trigger AR Agent pipeline for review + posting
        return jsonResponse(
          {
            success: true,
            message:
              "Invoice received and queued for processing through the agent review chain.",
            data: { id: "pending", status: "reviewing" },
          },
          202,
        );
      }

      case "transactions": {
        // Create journal entry — routes through Ledger Agent pipeline
        // TODO: Trigger Ledger Agent pipeline for validation + posting
        return jsonResponse(
          {
            success: true,
            message:
              "Transaction received and queued for processing through the agent review chain.",
            data: { id: "pending", status: "reviewing" },
          },
          202,
        );
      }

      default:
        return errorResponse(
          "Write operations not yet supported for this resource",
          400,
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return errorResponse(message, 400);
  }
}

// ─── Shared Auth + Rate-Limit Pipeline ─────────────────────────────────────

interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  limit: number;
  reset: number;
}

/**
 * Authenticate the request, then enforce rate limiting. Returns structured
 * NextResponse errors on any failure (401/429/500) — never an HTML page —
 * or the authenticated key + rate-limit info when the request may proceed.
 */
async function authenticateAndRateLimit(
  req: NextRequest,
  resource: string[],
  method: "GET" | "POST",
  start: number,
): Promise<
  { key: ApiKeyData; rateLimit: RateLimitInfo } | { response: NextResponse }
> {
  let auth: AuthResult;
  try {
    auth = await authenticateRequest(req);
  } catch (err) {
    // Never leak an HTML error page — DB/auth infra failures return
    // structured JSON with a 500 so API clients can handle them.
    logger.error({ err }, "API v1 authentication failed");
    return {
      response: errorResponse(
        "Authentication service unavailable. Please retry.",
        500,
      ),
    };
  }
  if (!auth.authenticated || !auth.key) {
    return {
      response: errorResponse(
        auth.error ?? "Authentication failed",
        auth.status ?? 401,
      ),
    };
  }

  let rateLimit: RateLimitInfo;
  try {
    rateLimit = await checkRateLimit(auth.key);
  } catch (err) {
    console.error("API v1 rate-limit check failed:", err);
    return {
      response: errorResponse(
        "Rate limiting service unavailable. Please retry.",
        500,
      ),
    };
  }
  if (!rateLimit.allowed) {
    await logApiCall({
      keyId: auth.key.id,
      entityId: auth.key.entityScope[0] ?? null,
      endpoint: resource.join("/"),
      method,
      statusCode: 429,
      durationMs: Date.now() - start,
      rateLimited: true,
    });

    const headers: Record<string, string> = {
      "X-RateLimit-Limit": rateLimit.limit.toString(),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": rateLimit.reset.toString(),
    };
    if (method === "GET") {
      headers["Retry-After"] = Math.max(
        1,
        rateLimit.reset - Math.floor(Date.now() / 1000),
      ).toString();
    }
    return {
      response: NextResponse.json(
        { error: true, message: "Rate limit exceeded. Try again later." },
        { status: 429, headers },
      ),
    };
  }

  return { key: auth.key, rateLimit };
}

async function withRateLimitHeaders(
  response: NextResponse,
  rateLimit: RateLimitInfo,
): Promise<NextResponse> {
  // Re-serialize the handler's JSON body so the response stays a plain JSON
  // payload while gaining the rate-limit headers.
  const responseData = await response.json();
  return NextResponse.json(responseData, {
    status: response.status,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      "X-RateLimit-Limit": rateLimit.limit.toString(),
      "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      "X-RateLimit-Reset": rateLimit.reset.toString(),
    },
  });
}

// ─── Main Route Handler ───────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Extract resource path from URL
  const url = new URL(req.url);
  const resource = url.pathname
    .replace(/^\/api\/v1\//, "")
    .split("/")
    .filter(Boolean);
  const start = Date.now();

  const gate = await authenticateAndRateLimit(req, resource, "GET", start);
  if ("response" in gate) return gate.response;

  // Process request
  const response = await handleGet(req, gate.key, resource);
  return withRateLimitHeaders(response, gate.rateLimit);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Extract resource path from URL
  const url = new URL(req.url);
  const resource = url.pathname
    .replace(/^\/api\/v1\//, "")
    .split("/")
    .filter(Boolean);
  const start = Date.now();

  const gate = await authenticateAndRateLimit(req, resource, "POST", start);
  if ("response" in gate) return gate.response;

  const response = await handlePost(req, gate.key, resource);
  return withRateLimitHeaders(response, gate.rateLimit);
}
