import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/__tests__/**/*.test.ts"],
    globals: true,
    deps: {
      // fallbackCJS enables CJS-compatible resolution for packages
      // that have ESM incompatibilities (like directory imports)
      fallbackCJS: true,
    },
  },
});
