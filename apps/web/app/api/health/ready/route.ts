import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Readiness probe — K8s/Vercel returns 200 only when the app can serve traffic.
 * Used by load balancers to decide whether to route requests.
 */
export async function GET() {
  try {
    // Check DB is reachable
    await db.execute(sql`SELECT 1`);

    // Check Redis is reachable
    const { redis } = await import("@/lib/redis");
    await redis.ping();

    return NextResponse.json({ ready: true });
  } catch (error) {
    return NextResponse.json(
      {
        ready: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
