// Enterprise Health Check Endpoints
// Provides comprehensive health monitoring for the application
// GET /api/health          — basic (always 200)
// GET /api/health?check=live   — liveness (always 200 if process alive)
// GET /api/health?check=ready  — readiness (503 if DB/Redis unreachable)
// GET /api/health?check=detailed — full system check

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime_s: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    external_apis?: HealthCheck;
    memory?: HealthCheck;
  };
}

interface HealthCheck {
  status: "pass" | "fail" | "warn";
  latency_ms?: number;
  message?: string;
}

const VERSION = process.env.npm_package_version || "0.1.0";
const ENVIRONMENT = process.env.NODE_ENV || "development";
const STARTUP_TIME = Date.now();

/**
 * GET /api/health — health check with optional ?check= parameter
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkType = url.searchParams.get("check") || "basic";

  try {
    switch (checkType) {
      case "ready":
        return await readinessCheck();
      case "live":
        return await livenessCheck();
      case "detailed":
        return await detailedHealthCheck();
      default:
        return await basicHealthCheck();
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}

/** Basic — always 200 if the process is alive */
async function basicHealthCheck(): Promise<NextResponse> {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime_s: Math.floor((Date.now() - STARTUP_TIME) / 1000),
    version: VERSION,
    environment: ENVIRONMENT,
  });
}

/** Liveness — always 200 if the process is alive (for k8s/lb probes) */
async function livenessCheck(): Promise<NextResponse> {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime_s: Math.floor((Date.now() - STARTUP_TIME) / 1000),
  });
}

/** Readiness — 200 if DB + Redis reachable, 503 if not (for traffic routing) */
async function readinessCheck(): Promise<NextResponse> {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
  };

  const overallStatus = Object.values(checks).every((c) => c.status === "pass")
    ? "healthy"
    : "unhealthy";

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime_s: Math.floor((Date.now() - STARTUP_TIME) / 1000),
      checks,
    },
    { status: overallStatus === "healthy" ? 200 : 503 },
  );
}

/** Detailed — full system check for dashboards and debugging */
async function detailedHealthCheck(): Promise<NextResponse> {
  const checks: HealthCheckResult["checks"] = {
    database: await checkDatabase(),
    redis: await checkRedis(),
  };

  // External API check (only if key is set)
  if (process.env.ANTHROPIC_API_KEY) {
    checks.external_apis = await checkExternalAPIs();
  }

  checks.memory = await checkMemory();

  const overallStatus = determineOverallStatus(checks);

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime_s: Math.floor((Date.now() - STARTUP_TIME) / 1000),
      version: VERSION,
      environment: ENVIRONMENT,
      checks,
    },
    { status: overallStatus === "unhealthy" ? 503 : 200 },
  );
}

/** Ping the database with a simple SELECT 1 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1 as ok`);
    return {
      status: "pass",
      latency_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "fail",
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : "DB connection failed",
    };
  }
}

/** Ping Redis via Upstash REST API */
async function checkRedis(): Promise<HealthCheck> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return { status: "warn", message: "Upstash Redis not configured" };
  }
  const start = Date.now();
  try {
    const res = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return {
        status: "fail",
        latency_ms: Date.now() - start,
        message: `Redis returned ${res.status}`,
      };
    }
    return { status: "pass", latency_ms: Date.now() - start };
  } catch (error) {
    return {
      status: "fail",
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : "Redis ping failed",
    };
  }
}

/** Check Anthropic API reachability (lightweight HEAD/GET) */
async function checkExternalAPIs(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Just verify the endpoint is reachable — don't spend tokens
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    // 200 or 400 both mean the API is reachable
    const reachable = res.ok || res.status === 400;
    return {
      status: reachable ? "pass" : "fail",
      latency_ms: Date.now() - start,
      message: reachable ? "Anthropic reachable" : `Status ${res.status}`,
    };
  } catch (error) {
    return {
      status: "fail",
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : "Anthropic unreachable",
    };
  }
}

/** Check heap memory usage */
async function checkMemory(): Promise<HealthCheck> {
  const mem = process.memoryUsage();
  const usedMB = mem.heapUsed / 1024 / 1024;
  const totalMB = mem.heapTotal / 1024 / 1024;
  const pct = (usedMB / totalMB) * 100;
  return {
    status: pct < 80 ? "pass" : pct < 90 ? "warn" : "fail",
    message: `${usedMB.toFixed(0)}MB / ${totalMB.toFixed(0)}MB (${pct.toFixed(0)}%)`,
  };
}

function determineOverallStatus(
  checks: HealthCheckResult["checks"],
): "healthy" | "degraded" | "unhealthy" {
  const values = Object.values(checks);
  if (values.some((c) => c.status === "fail")) return "unhealthy";
  if (values.some((c) => c.status === "warn")) return "degraded";
  return "healthy";
}
