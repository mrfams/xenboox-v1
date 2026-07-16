import { defineConfig } from "@trigger.dev/sdk"

export default defineConfig({
  runtime: "node",
  project: "proj_xenboox",
  dirs: ["packages/jobs"],
  Telemetry: {
    enabled: false,
  },
})
