// Lazy-import the admin handlers so module initialization (including the full
// @xenboox/db schema barrel) happens at request time, not at build-time page
// data collection.  This avoids a pre-existing ReferenceError: timestamp is
// not defined that only manifests in the minified webpack chunk during
// Next.js's "Collecting page data" phase.

export async function GET(request: Request) {
  const { adminHandlers } = await import("@/lib/auth/admin");
  return adminHandlers.GET(request);
}

export async function POST(request: Request) {
  const { adminHandlers } = await import("@/lib/auth/admin");
  return adminHandlers.POST(request);
}
