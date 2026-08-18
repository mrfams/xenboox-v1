import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', '__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
    globals: true,
    // Pin runtime env vars so a polluted shell/CI environment (e.g. a
    // literal placeholder NEXTAUTH_URL) can never break module load.
    // DATABASE_URL is intentionally NOT pinned: the DB-layer integration
    // tests (rls-db-layer, audit-append-only) need the real connection
    // string and self-skip when none is set (see hasDb guards).
    env: {
      NEXTAUTH_URL: 'http://localhost:3000',
      AUTH_URL: 'http://localhost:3000',
      AUTH_SECRET: 'test-secret-for-unit-tests',
      NEXTAUTH_SECRET: 'test-secret-for-unit-tests',
      // Pin Upstash vars to empty so the rate-limiter tests deterministically
      // exercise the in-memory fallback (what the suite asserts) instead of
      // making real network calls to Redis, which flakes on CI and in the
      // shell when UPSTASH_REDIS_REST_URL is set in .env.
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    },
    // Liveness/agent components render large trees in a heavy happy-dom
    // environment — allow generous per-test time so the first test in a
    // file never flakes on environment warm-up.
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '.next/', '__tests__/'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});