import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@xenboox/db": path.resolve(__dirname, "../db"),
      "@xenboox/db/schema": path.resolve(__dirname, "../db/schema/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
});
