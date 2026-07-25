import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/__tests__/**/*.test.ts"],
    globals: true,
    deps: {
      fallbackCJS: true,
      // Inline workspace packages to avoid ESM directory import issues
      // with the @xenboox/db package which uses `import * as schema from "./schema"` pattern
      inline: [/@xenboox\/db/],
    },
    server: {
      deps: {
        fallbackCJS: true,
      },
    },
  },
});
