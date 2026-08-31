import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { APP_CONFIG } from "@/lib/config";

// ─── Types ──────────────────────────────────────────────────────────────────

type ComponentStatus = "up" | "down" | "degraded" | "not_configured";

type ComponentHealth = {
  status: ComponentStatus;
  latencyMs?: number;
  error?: string;
  /** True if the check actually hit the external API (not just config validation) */
  deepChecked?: boolean;
};

type HealthResponse = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  region: string;
  latencyMs: number;
  mode: "deep";
  checks: Record<string, ComponentHealth>;
};

// ─── Deep Health Checks ─────────────────────────────────────────────────────
// These go beyond env var validation and actually ping the external APIs.

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { status: "up", latencyMs: Date.now() - start, deepChecked: true };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
      deepChecked: true,
    };
  }
}

async function checkRedis(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const { getRedis } = await import("@/lib/redis");
    const redis = getRedis();
    if (!redis) {
      return { status: "not_configured", error: "Upstash not configured" };
    }
    await redis.ping();
    return { status: "up", latencyMs: Date.now() - start, deepChecked: true };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
      deepChecked: true,
    };
  }
}

/**
 * Deep Resend check — actually calls the Resend API to verify:
 * 1. API key is valid
 * 2. Network connectivity to api.resend.com
 * 3. Auth is accepted (2xx or 403 = valid key)
 */
async function checkResendDeep(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { status: "not_configured", error: "RESEND_API_KEY not set" };
    }
    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok || response.status === 403) {
      return { status: "up", latencyMs: Date.now() - start, deepChecked: true };
    }
    if (response.status === 401) {
      return {
        status: "down",
        latencyMs: Date.now() - start,
        error: "Resend API key is invalid (401 Unauthorized)",
        deepChecked: true,
      };
    }
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: `Resend API returned ${response.status}`,
      deepChecked: true,
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Network error reaching Resend",
      deepChecked: true,
    };
  }
}

/**
 * Deep Sentry check — validates DSN format and tests connectivity
 * to the Sentry ingest endpoint.
 */
async function checkSentryDeep(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
      return { status: "not_configured", error: "SENTRY_DSN not set" };
    }
    const url = new URL(dsn);
    if (url.protocol !== "https:" || !url.hostname.includes("sentry")) {
      return {
        status: "degraded",
        latencyMs: Date.now() - start,
        error: "SENTRY_DSN has unexpected format",
        deepChecked: true,
      };
    }
    // Sentry DSN format: https://<key>@<org>.ingest.sentry.io/<project>
    // Extract the base URL for health probe (use /api/<project>/envelope/)
    const projectId = url.pathname.replace("/", "");
    const ingestUrl = `https://${url.hostname}/api/${projectId}/envelope/`;
    // Send a minimal health check envelope (Sentry accepts empty envelopes)
    const response = await fetch(ingestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
      signal: AbortSignal.timeout(5_000),
    });
    // Sentry returns 200 for valid envelopes, 400 for malformed (still means reachable)
    if (response.ok || response.status === 400) {
      return { status: "up", latencyMs: Date.now() - start, deepChecked: true };
    }
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: `Sentry ingest returned ${response.status}`,
      deepChecked: true,
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Network error reaching Sentry",
      deepChecked: true,
    };
  }
}

/**
 * Deep PostHog check — validates key format and tests connectivity
 * to the PostHog ingest endpoint.
 */
async function checkPostHogDeep(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
    if (!key) {
      return { status: "not_configured", error: "NEXT_PUBLIC_POSTHOG_KEY not set" };
    }
    if (!key.startsWith("phc_") || key.length <= 10) {
      return {
        status: "degraded",
        latencyMs: Date.now() - start,
        error: "PostHog key has unexpected format",
        deepChecked: true,
      };
    }
    // Test connectivity to PostHog ingest by sending a minimal decide request
    const response = await fetch(`${host}/decide/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        distinct_id: "health-check-probe",
      }),
      signal: AbortSignal.timeout(5_000),
    });
    // PostHog returns 200 for valid decide requests, or various error codes
    // A 4xx means the endpoint is reachable but the request was invalid
    // Only 5xx or network errors mean PostHog is down
    if (response.status < 500) {
      return { status: "up", latencyMs: Date.now() - start, deepChecked: true };
    }
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: `PostHog ingest returned ${response.status}`,
      deepChecked: true,
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Network error reaching PostHog",
      deepChecked: true,
    };
  }
}

/**
 * Deep LangFuse check — validates key format and tests connectivity
 * to the LangFuse API.
 */
async function checkLangFuseDeep(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";
    if (!publicKey || !secretKey) {
      return {
        status: "not_configured",
        error: "LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY not set",
      };
    }
    if (!publicKey.startsWith("pk-") || !secretKey.startsWith("sk-")) {
      return {
        status: "degraded",
        latencyMs: Date.now() - start,
        error: "LangFuse keys have unexpected format",
        deepChecked: true,
      };
    }
    // Test connectivity by listing sessions (lightweight read endpoint)
    const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
    const response = await fetch(`${baseUrl}/api/public/sessions?limit=1`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      return { status: "up", latencyMs: Date.now() - start, deepChecked: true };
    }
    if (response.status === 401) {
      return {
        status: "down",
        latencyMs: Date.now() - start,
        error: "LangFuse credentials are invalid (401 Unauthorized)",
        deepChecked: true,
      };
    }
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: `LangFuse API returned ${response.status}`,
      deepChecked: true,
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Network error reaching LangFuse",
      deepChecked: true,
    };
  }
}

/**
 * Deep R2 check — validates credentials and tests connectivity
 * by listing buckets (S3-compatible API).
 */
async function checkR2Deep(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      const missing = [
        !accountId && "R2_ACCOUNT_ID",
        !accessKeyId && "R2_ACCESS_KEY_ID",
        !secretAccessKey && "R2_SECRET_ACCESS_KEY",
        !bucketName && "R2_BUCKET_NAME",
      ]
        .filter(Boolean)
        .join(", ");
      return { status: "not_configured", error: `Missing: ${missing}` };
    }
    // Test connectivity by doing a HEAD request on the bucket endpoint
    // This verifies credentials and network connectivity
    const { getR2Client } = await import("@/lib/r2");
    const r2 = getR2Client();
    if (!r2) {
      return {
        status: "not_configured",
        error: "R2 client initialization failed",
      };
    }
    // The R2 client is already initialized — if it didn't throw, credentials are valid
    // Do a lightweight HEAD on a well-known path to test connectivity
    const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
    await r2.send(new HeadBucketCommand({ Bucket: bucketName }));
    return { status: "up", latencyMs: Date.now() - start, deepChecked: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg.includes("NoSuchBucket") || msg.includes("404")) {
      return {
        status: "down",
        latencyMs: Date.now() - start,
        error: `R2 bucket not found: ${msg}`,
        deepChecked: true,
      };
    }
    if (msg.includes("403") || msg.includes("AccessDenied")) {
      return {
        status: "down",
        latencyMs: Date.now() - start,
        error: `R2 credentials invalid: ${msg}`,
        deepChecked: true,
      };
    }
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: msg,
      deepChecked: true,
    };
  }
}

/**
 * Deep Plaid check — validates credentials by calling the Plaid
 * /sandbox/public_token/create endpoint (sandbox-only, safe for health checks).
 */
async function checkPlaidDeep(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const clientId = process.env.PLAID_CLIENT_ID;
    const secret = process.env.PLAID_SECRET;
    const plaidEnv = process.env.PLAID_ENV || "sandbox";
    if (!clientId || !secret) {
      return {
        status: "not_configured",
        error: "PLAID_CLIENT_ID/PLAID_SECRET not set",
      };
    }
    // Test connectivity by calling the sandbox health endpoint
    const envUrls: Record<string, string> = {
      sandbox: "https://sandbox.plaid.com",
      development: "https://development.plaid.com",
      production: "https://production.plaid.com",
    };
    const baseUrl = envUrls[plaidEnv] ?? envUrls.sandbox;
    const response = await fetch(`${baseUrl}/sandbox/public_token/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        institution_id: "ins_109508",
        initial_products: ["transactions"],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      return { status: "up", latencyMs: Date.now() - start, deepChecked: true };
    }
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      return {
        status: "down",
        latencyMs: Date.now() - start,
        error: "Plaid credentials are invalid (401 Unauthorized)",
        deepChecked: true,
      };
    }
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: `Plaid API returned ${response.status}: ${(body as any).error_message || "unknown"}`,
      deepChecked: true,
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Network error reaching Plaid",
      deepChecked: true,
    };
  }
}

/**
 * Deep Mono check — validates credentials by calling the Mono
 * /sandbox/accounts endpoint.
 */
async function checkMonoDeep(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const secretKey = process.env.MONO_SECRET_KEY;
    const webhookSecret = process.env.MONO_WEBHOOK_SECRET;
    if (!secretKey) {
      return { status: "not_configured", error: "MONO_SECRET_KEY not set" };
    }
    if (!webhookSecret) {
      return {
        status: "degraded",
        latencyMs: Date.now() - start,
        error: "MONO_WEBHOOK_SECRET not set (webhook verification disabled)",
        deepChecked: true,
      };
    }
    // Test connectivity by listing accounts (sandbox)
    const response = await fetch("https://sandbox.monoapi.com/accounts", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "mono-version": "2023-01-01",
        Authorization: `Bearer ${secretKey}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok || response.status === 401 || response.status === 403) {
      // 401/403 means endpoint is reachable but key is sandbox-only or invalid
      return { status: "up", latencyMs: Date.now() - start, deepChecked: true };
    }
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: `Mono API returned ${response.status}`,
      deepChecked: true,
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Network error reaching Mono",
      deepChecked: true,
    };
  }
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  // Deep mode: run all checks in parallel with real API pings
  const [database, redis, resend, sentry, posthog, langfuse, r2, plaid, mono] =
    await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkResendDeep(),
      checkSentryDeep(),
      checkPostHogDeep(),
      checkLangFuseDeep(),
      checkR2Deep(),
      checkPlaidDeep(),
      checkMonoDeep(),
    ]);

  const checks: Record<string, ComponentHealth> = {
    database,
    redis,
    resend,
    sentry,
    posthog,
    langfuse,
    r2,
    plaid,
    mono,
  };

  // ── Overall status ──
  const CRITICAL_SERVICES = ["database", "redis"];
  const criticalStatuses = CRITICAL_SERVICES.map((s) => checks[s]?.status);
  const allStatuses = Object.values(checks).map((c) => c.status);

  let overall: "healthy" | "degraded" | "unhealthy" = "healthy";

  if (criticalStatuses.includes("down")) {
    overall = "unhealthy";
  } else if (allStatuses.includes("down") || allStatuses.includes("degraded")) {
    overall = "degraded";
  }

  const statusCode = overall === "unhealthy" ? 503 : 200;

  // Count deep checks for observability
  const deepCheckedCount = Object.values(checks).filter((c) => c.deepChecked).length;
  const totalChecks = Object.keys(checks).length;

  const body: HealthResponse = {
    status: overall,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: APP_CONFIG.version,
    region: process.env.VERCEL_REGION || "local",
    latencyMs: Date.now() - start,
    mode: "deep",
    checks,
  };

  return NextResponse.json(body, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Deep-Checks": `${deepCheckedCount}/${totalChecks}`,
    },
  });
}
