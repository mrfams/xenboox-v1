import { NextResponse } from "next/server";

/**
 * Liveness probe — always returns 200 if the Node.js process is alive.
 * K8s/Vercel uses this to decide if the container needs a restart.
 * No external dependencies checked — just "am I alive?"
 */
export async function GET() {
  return NextResponse.json({
    alive: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
