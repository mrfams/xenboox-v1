import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    include: ["**/__tests__/**/*.test.ts"],
    globals: true,
    // Latency/perf assertions (load-test, golden-eval) can flake under CI
    // machine load — retry once before failing.
    retry: 1,
    server: {
      deps: {
        // @xenboox/db is TS source (main: ./index.ts) with directory imports
        // (./schema) that Node's ESM loader cannot resolve — it must be
        // transpiled/inlined by Vite. In vitest 3.x this belongs under
        // server.deps.inline, and its strings are normalized against
        // moduleDirectories — so the monorepo packages dir must be listed
        // there and the package referenced by its directory name ("db").
        inline: ["db"],
        fallbackCJS: true,
      },
    },
    deps: {
      moduleDirectories: ["node_modules", resolve(__dirname, "..")],
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "**/__tests__/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
