import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

type HealthStatus = "healthy" | "degraded" | "unhealthy";

type ComponentHealth = {
  status: "up" | "down" | "degraded";
  latencyMs?: number;
  error?: string;
};

export async function GET() {
  const start = Date.now();
  const checks: Record<string, ComponentHealth> = {};

  // ── Database check ──
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = {
      status: "up",
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // ── Redis check ── (gracefully degrades if Upstash not configured)
  try {
    const { getRedis } = await import("@/lib/redis");
    const redis = getRedis();
    if (!redis) {
      checks.redis = { status: "degraded", error: "Upstash not configured" };
    } else {
      const redisStart = Date.now();
      await redis.ping();
      checks.redis = {
        status: "up",
        latencyMs: Date.now() - redisStart,
      };
    }
  } catch (error) {
    checks.redis = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // ── Overall status ──
  const componentStatuses = Object.values(checks).map((c) => c.status);
  let overall: HealthStatus = "healthy";
  if (componentStatuses.includes("down")) {
    overall = "unhealthy";
  } else if (componentStatuses.includes("degraded")) {
    overall = "degraded";
  }

  const statusCode =
    overall === "healthy" ? 200 : overall === "degraded" ? 200 : 503;

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0",
      region: process.env.VERCEL_REGION || "local",
      latencyMs: Date.now() - start,
      checks,
    },
    { status: statusCode },
  );
}
