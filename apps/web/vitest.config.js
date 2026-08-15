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
    env: {
      NEXTAUTH_URL: 'http://localhost:3000',
      AUTH_URL: 'http://localhost:3000',
      AUTH_SECRET: 'test-secret-for-unit-tests',
      NEXTAUTH_SECRET: 'test-secret-for-unit-tests',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
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