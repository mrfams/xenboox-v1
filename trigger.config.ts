import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  runtime: "node",
  project: "proj_xenboox",
  dirs: ["packages/jobs"],
  // Default task compute-time ceiling (each task overrides with its own).
  maxDuration: 300,
  retries: {
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 5_000,
      maxTimeoutInMs: 60_000,
    },
  },
});
