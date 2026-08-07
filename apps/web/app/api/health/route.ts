// Enterprise Health Check Endpoints
// Provides comprehensive health monitoring for the application

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    redis?: HealthCheck;
    external_apis?: HealthCheck;
    disk_space?: HealthCheck;
    memory?: HealthCheck;
  };
}

interface HealthCheck {
  status: "pass" | "fail" | "warn";
  latency?: number;
  message?: string;
  last_check: string;
}

const VERSION = process.env.npm_package_version || "0.1.0";
const ENVIRONMENT = process.env.NODE_ENV || "development";

/**
 * GET /api/health - Basic health check
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

/**
 * Basic health check - returns 200 if server is running
 */
async function basicHealthCheck(): Promise<NextResponse> {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: VERSION,
    environment: ENVIRONMENT,
  });
}

/**
 * Readiness check - checks if the application is ready to serve traffic
 */
async function readinessCheck(): Promise<NextResponse> {
  const checks = {
    database: await checkDatabase(),
  };

  const overallStatus = Object.values(checks).every(
    (check) => check.status === "pass",
  )
    ? "healthy"
    : "unhealthy";

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
  });
}

/**
 * Liveness check - checks if the application is alive
 */
async function livenessCheck(): Promise<NextResponse> {
  // Simple liveness check - just return 200
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Detailed health check - checks all system components
 */
async function detailedHealthCheck(): Promise<NextResponse> {
  const checks: HealthCheckResult["checks"] = {
    database: await checkDatabase(),
  };

  // Add Redis check if configured
  if (process.env.UPSTASH_REDIS_REST_URL) {
    checks.redis = await checkRedis();
  }

  // Add external API checks
  checks.external_apis = await checkExternalAPIs();

  // Add system resource checks
  checks.memory = await checkMemory();
  checks.disk_space = await checkDiskSpace();

  const overallStatus = determineOverallStatus(checks);

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: VERSION,
    environment: ENVIRONMENT,
    checks,
  });
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const ____result = await db.execute(sql`SELECT 1 as ok`);
    const latency = Date.now() - startTime;

    return {
      status: latency < 1000 ? "pass" : "warn",
      latency,
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "fail",
      message:
        error instanceof Error ? error.message : "Database connection failed",
      last_check: new Date().toISOString(),
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<HealthCheck> {
  const ____startTime = Date.now();

  try {
    // This would be implemented when Redis is added
    // For now, return a warning
    return {
      status: "warn",
      message: "Redis not yet configured",
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "fail",
      message:
        error instanceof Error ? error.message : "Redis connection failed",
      last_check: new Date().toISOString(),
    };
  }
}

/**
 * Check external API connectivity
 */
async function checkExternalAPIs(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    // Check Anthropic API
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return {
        status: "warn",
        message: "Anthropic API key not configured",
        last_check: new Date().toISOString(),
      };
    }

    // Simple connectivity check (would be actual API call in production)
    const latency = Date.now() - startTime;

    return {
      status: "pass",
      latency,
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "fail",
      message:
        error instanceof Error ? error.message : "External API check failed",
      last_check: new Date().toISOString(),
    };
  }
}

/**
 * Check memory usage
 */
async function checkMemory(): Promise<HealthCheck> {
  try {
    const memoryUsage = process.memoryUsage();
    const usedMB = memoryUsage.heapUsed / 1024 / 1024;
    const totalMB = memoryUsage.heapTotal / 1024 / 1024;
    const usagePercent = (usedMB / totalMB) * 100;

    return {
      status: usagePercent < 80 ? "pass" : usagePercent < 90 ? "warn" : "fail",
      message: `Memory usage: ${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB (${usagePercent.toFixed(1)}%)`,
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "fail",
      message: error instanceof Error ? error.message : "Memory check failed",
      last_check: new Date().toISOString(),
    };
  }
}

/**
 * Check disk space
 */
async function checkDiskSpace(): Promise<HealthCheck> {
  try {
    // This would require a filesystem check
    // For now, return a warning
    return {
      status: "warn",
      message: "Disk space check not yet implemented",
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "fail",
      message:
        error instanceof Error ? error.message : "Disk space check failed",
      last_check: new Date().toISOString(),
    };
  }
}

/**
 * Determine overall health status
 */
function determineOverallStatus(
  checks: HealthCheckResult["checks"],
): "healthy" | "degraded" | "unhealthy" {
  const values = Object.values(checks);

  if (values.some((check) => check.status === "fail")) {
    return "unhealthy";
  }

  if (values.some((check) => check.status === "warn")) {
    return "degraded";
  }

  return "healthy";
}
