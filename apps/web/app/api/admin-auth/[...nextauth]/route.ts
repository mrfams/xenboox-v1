import { NextRequest } from "next/server";

// Lazy-import the admin handlers so module initialization (including the full
// @xenboox/db schema barrel) happens at request time, not at build-time page
// data collection.

export async function GET(request: NextRequest) {
  const { adminHandlers } = await import("@/lib/auth/admin");
  return adminHandlers.GET(request);
}

export async function POST(request: NextRequest) {
  const { adminHandlers } = await import("@/lib/auth/admin");
  return adminHandlers.POST(request);
}
