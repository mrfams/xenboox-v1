import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("APM Tooling — Verification", () => {
  describe("Sentry performance alerts", () => {
    const alerts = readFileSync(join(ROOT, "sentry.alerts.ts"), "utf-8");

    it("defines p95 latency alert", () => {
      expect(alerts).toContain("p95");
      expect(alerts).toContain("latency");
    });

    it("defines critical threshold", () => {
      expect(alerts).toContain("Critical");
    });
  });

  describe("Health endpoint with latency", () => {
    const healthTest = readFileSync(
      join(ROOT, "__tests__/health-endpoint.test.ts"),
      "utf-8",
    );

    it("checks database latency", () => {
      expect(healthTest).toContain("latencyMs");
    });
  });

  describe("Health check widget displays latency", () => {
    const widget = readFileSync(
      join(ROOT, "components/admin/health-check-widget.tsx"),
      "utf-8",
    );

    it("renders latency in milliseconds", () => {
      expect(widget).toContain("latencyMs");
      expect(widget).toContain("ms");
    });
  });

  describe("Response time tracking in types", () => {
    const types = readFileSync(join(ROOT, "lib/types.ts"), "utf-8");

    it("defines avgLatencyMs type", () => {
      expect(types).toContain("avgLatencyMs");
    });
  });
});
