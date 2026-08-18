import "@testing-library/jest-dom";

// Mock environment variables. DATABASE_URL is only defaulted when the
// environment provides none — the DB-layer integration tests
// (rls-db-layer, audit-append-only) need the real connection string and
// self-skip when it is absent, so a real value must never be clobbered.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
}
process.env.AUTH_SECRET = "test-secret";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// Mock crypto.subtle for tests
if (typeof globalThis.crypto?.subtle === "undefined") {
  const subtle = {
    digest: async (algorithm: string, data: ArrayBuffer) => {
      return new Uint8Array(0);
    },
  };
  (globalThis as any).crypto = { subtle };
}
