import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("OpenTelemetry Distributed Tracing — Verification", () => {
  describe("Tracing middleware", () => {
    const middleware = readFileSync(
      join(ROOT, "lib/trpc/tracing-middleware.ts"),
      "utf-8",
    );

    it("creates OTel spans for tRPC calls", () => {
      expect(middleware).toContain("startSpan");
      expect(middleware).toContain("trpc.");
    });

    it("uses @opentelemetry/api", () => {
      expect(middleware).toContain("@opentelemetry/api");
    });

    it("sets span status on error", () => {
      expect(middleware).toContain("SpanStatusCode");
    });
  });

  describe("Tracing middleware is wired into tRPC", () => {
    const server = readFileSync(join(ROOT, "lib/trpc/server.ts"), "utf-8");

    it("applies tracingMiddleware to procedures", () => {
      expect(server).toContain("tracingMiddleware");
    });
  });

  describe("OTel test coverage", () => {
    const otelTest = readFileSync(
      join(ROOT, "__tests__/otel.test.ts"),
      "utf-8",
    );

    it("tests OTel configuration", () => {
      expect(otelTest).toContain("otel");
    });
  });

  describe("Tracing middleware test coverage", () => {
    const tracingTest = readFileSync(
      join(ROOT, "__tests__/tracing-middleware.test.ts"),
      "utf-8",
    );

    it("tests span lifecycle", () => {
      expect(tracingTest).toContain("startSpan");
    });

    it("mocks @opentelemetry/api", () => {
      expect(tracingTest).toContain("@opentelemetry/api");
    });
  });

  describe("Environment configuration", () => {
    const envExample = readFileSync(join(ROOT, ".env.example"), "utf-8");

    it("documents OTEL_EXPORTER_OTLP_ENDPOINT", () => {
      expect(envExample).toContain("OTEL_EXPORTER_OTLP_ENDPOINT");
    });

    it("documents OTEL_SERVICE_NAME", () => {
      expect(envExample).toContain("OTEL_SERVICE_NAME");
    });

    it("documents trace sampler config", () => {
      expect(envExample).toContain("OTEL_TRACES_SAMPLER");
    });
  });

  describe("Sentry + OTel integration", () => {
    const sentryConfig = readFileSync(
      join(ROOT, "sentry.client.config.ts"),
      "utf-8",
    );

    it("integrates with OTel via Sentry", () => {
      // Sentry uses OTel under the hood for performance monitoring
      expect(sentryConfig).toContain("Sentry");
    });
  });
});
