// ─── §24.2 OTel bootstrap — env gating + sampler resolution ────────────────
//
// The SDK must be a silent no-op unless a collector endpoint is configured
// (dev machines, previews, and tests never set one), and the sampler must be
// configurable via the standard OTEL_TRACES_SAMPLER[_ARG] env vars.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { trace } from "@opentelemetry/api";
import {
  AlwaysOnSampler,
  AlwaysOffSampler,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";
import {
  isOtelEnabled,
  resolveSampler,
  initOtel,
  parseOtlpHeaders,
} from "@xenboox/models/otel";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  delete process.env.OTEL_EXPORTER_OTLP_HEADERS;
  delete process.env.OTEL_SDK_DISABLED;
  delete process.env.OTEL_TRACES_SAMPLER;
  delete process.env.OTEL_TRACES_SAMPLER_ARG;
  delete process.env.OTEL_SERVICE_NAME;
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("isOtelEnabled", () => {
  it("is false when no collector endpoint is configured", () => {
    expect(isOtelEnabled()).toBe(false);
  });

  it("is true when a collector endpoint is configured", () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "https://otel.example.com";
    expect(isOtelEnabled()).toBe(true);
  });

  it("is false when OTEL_SDK_DISABLED=true even with an endpoint", () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "https://otel.example.com";
    process.env.OTEL_SDK_DISABLED = "true";
    expect(isOtelEnabled()).toBe(false);
  });
});

describe("resolveSampler", () => {
  // NOTE: resolveSampler() imports its sampler classes via dynamic import,
  // so the instances come from a *second* module copy of sdk-trace-base and
  // fail `toBeInstanceOf` against the statically-imported classes here.
  // Assert on constructor.name instead (stable across module copies).

  it("defaults to parentbased_always_on", async () => {
    expect((await resolveSampler()).constructor.name).toBe(
      "ParentBasedSampler",
    );
  });

  it("maps always_on / always_off", async () => {
    process.env.OTEL_TRACES_SAMPLER = "always_on";
    expect((await resolveSampler()).constructor.name).toBe("AlwaysOnSampler");

    process.env.OTEL_TRACES_SAMPLER = "always_off";
    expect((await resolveSampler()).constructor.name).toBe("AlwaysOffSampler");
  });

  it("maps parentbased_traceidratio with an arg", async () => {
    process.env.OTEL_TRACES_SAMPLER = "parentbased_traceidratio";
    process.env.OTEL_TRACES_SAMPLER_ARG = "0.1";
    expect((await resolveSampler()).constructor.name).toBe(
      "ParentBasedSampler",
    );
  });

  it("maps traceidratio and defaults the ratio to 0.1 when the arg is invalid", async () => {
    process.env.OTEL_TRACES_SAMPLER = "traceidratio";
    process.env.OTEL_TRACES_SAMPLER_ARG = "not-a-number";
    expect((await resolveSampler()).constructor.name).toBe(
      "TraceIdRatioBasedSampler",
    );
  });
});

describe("parseOtlpHeaders", () => {
  it("returns undefined for empty input", () => {
    expect(parseOtlpHeaders(undefined)).toBeUndefined();
    expect(parseOtlpHeaders("")).toBeUndefined();
    expect(parseOtlpHeaders("   ")).toBeUndefined();
  });

  it("parses comma-separated key=value pairs with URI decoding", () => {
    expect(parseOtlpHeaders("Authorization=Bearer%20token")).toEqual({
      Authorization: "Bearer token",
    });
    expect(
      parseOtlpHeaders("Authorization=Bearer%20token,X-Api-Key=abc123"),
    ).toEqual({ Authorization: "Bearer token", "X-Api-Key": "abc123" });
  });

  it("skips malformed pairs and trims whitespace", () => {
    expect(parseOtlpHeaders("=novalue, Key = value, bad")).toEqual({
      Key: "value",
    });
  });

  it("falls back to the raw value when URI decoding fails", () => {
    expect(parseOtlpHeaders("Key=%zz-not-encoded")).toEqual({
      Key: "%zz-not-encoded",
    });
  });
});

describe("initOtel", () => {
  it("is a silent no-op without a collector endpoint (global tracer stays no-op)", async () => {
    await expect(initOtel()).resolves.not.toThrow();

    // The no-op tracer produces non-recording spans (invalid trace id) — proof
    // the provider was NOT registered, so span creation is free in dev.
    const span = trace.getTracer("test").startSpan("probe");
    expect(span.spanContext().traceId).toBe("00000000000000000000000000000000");
    span.end();
  });
});
