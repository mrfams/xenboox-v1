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
};

type HealthResponse = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  region: string;
  latencyMs: number;
  checks: Record<string, ComponentHealth>;
};

// ─── Health Checks ──────────────────────────────────────────────────────────

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { status: "up", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
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
    return { status: "up", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkResend(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { status: "not_configured", error: "RESEND_API_KEY not set" };
    }
    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (response.ok || response.status === 403) {
      return { status: "up", latencyMs: Date.now() - start };
    }
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: `Resend API returned ${response.status}`,
    };
  } catch (error) {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

async function checkSentry(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
      return { status: "not_configured", error: "SENTRY_DSN not set" };
    }
    const url = new URL(dsn);
    if (url.protocol === "https:" && url.hostname.includes("sentry")) {
      return { status: "up", latencyMs: Date.now() - start };
    }
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: "SENTRY_DSN has unexpected format",
    };
  } catch {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: "SENTRY_DSN is not a valid URL",
    };
  }
}

async function checkPostHog(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) {
      return { status: "not_configured", error: "NEXT_PUBLIC_POSTHOG_KEY not set" };
    }
    if (key.startsWith("phc_") && key.length > 10) {
      return { status: "up", latencyMs: Date.now() - start };
    }
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: "PostHog key has unexpected format",
    };
  } catch (error) {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkLangFuse(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    if (!publicKey || !secretKey) {
      return {
        status: "not_configured",
        error: "LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY not set",
      };
    }
    if (publicKey.startsWith("pk-") && secretKey.startsWith("sk-")) {
      return { status: "up", latencyMs: Date.now() - start };
    }
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: "LangFuse keys have unexpected format",
    };
  } catch (error) {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkR2(): Promise<ComponentHealth> {
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
    return { status: "up", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkPlaid(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const clientId = process.env.PLAID_CLIENT_ID;
    const secret = process.env.PLAID_SECRET;
    if (!clientId || !secret) {
      return {
        status: "not_configured",
        error: "PLAID_CLIENT_ID/PLAID_SECRET not set",
      };
    }
    return { status: "up", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkMono(): Promise<ComponentHealth> {
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
      };
    }
    return { status: "up", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function GET() {
  const start = Date.now();

  // Run all checks in parallel for speed
  const [database, redis, resend, sentry, posthog, langfuse, r2, plaid, mono] =
    await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkResend(),
      checkSentry(),
      checkPostHog(),
      checkLangFuse(),
      checkR2(),
      checkPlaid(),
      checkMono(),
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
  // "healthy"    = all critical services up; non-critical can be not_configured
  // "degraded"    = non-critical services down or degraded
  // "unhealthy"   = critical services down (database, redis)
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

  const body: HealthResponse = {
    status: overall,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: APP_CONFIG.version,
    region: process.env.VERCEL_REGION || "local",
    latencyMs: Date.now() - start,
    checks,
  };

  return NextResponse.json(body, {
    status: statusCode,
    headers: {
      "Cache-Control": "public, max-age=30",
    },
  });
}
