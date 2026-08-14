// ─── OpenTelemetry Configuration ───────────────────────────────────────────
//
// Production-grade OTel bootstrap for the Xenboox server process.
//
//   - Env-gated: when OTEL_EXPORTER_OTLP_ENDPOINT is unset (or OTEL_SDK_DISABLED
//     is "true") the SDK stays unregistered — the global tracer remains the
//     OTel no-op and span creation is free.
//   - BatchSpanProcessor (async flush) — SimpleSpanProcessor would block the
//     event loop on every export and is dev-only.
//   - getNodeAutoInstrumentations() registers http/undici (covers the Neon
//     fetch driver), pg, and every other standard Node instrumentor, so
//     request → tRPC → DB spans chain automatically via W3C traceparent.
//   - LangChain/LangGraph agents emit spans through @opentelemetry/api once a
//     provider is registered here — agent runs appear in the same trace.
//   - Sampling is env-configurable (OTEL_TRACES_SAMPLER / _ARG). Default is
//     parentbased_always_on for full fidelity at launch; switch to
//     parentbased_traceidratio=0.1 when volume demands it.
//
// Exports a plain OTLP/HTTP trace stream — any OTLP-compatible backend
// (SigNoz, Grafana Tempo, New Relic, Datadog, Honeycomb…) can consume it.

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import {
  AlwaysOffSampler,
  AlwaysOnSampler,
  BatchSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  type Sampler,
} from "@opentelemetry/sdk-trace-base";

let sdk: NodeSDK | null = null;
/** Guards against double registration (dev hot-reload, multiple register() calls). */
let initialized = false;

/** Whether the SDK should boot at all. Collector endpoint must be set. */
export function isOtelEnabled(): boolean {
  if (process.env.OTEL_SDK_DISABLED === "true") return false;
  return Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
}

/**
 * Resolve the sampler from OTEL_TRACES_SAMPLER / OTEL_TRACES_SAMPLER_ARG
 * (standard OTel env names). Default: parentbased_always_on.
 */
export function resolveSampler(): Sampler {
  const name = process.env.OTEL_TRACES_SAMPLER || "parentbased_always_on";
  const rawArg = Number(process.env.OTEL_TRACES_SAMPLER_ARG);
  const ratio =
    Number.isFinite(rawArg) && rawArg > 0 && rawArg <= 1 ? rawArg : 0.1;

  switch (name) {
    case "always_on":
      return new AlwaysOnSampler();
    case "always_off":
      return new AlwaysOffSampler();
    case "traceidratio":
      return new TraceIdRatioBasedSampler(ratio);
    case "parentbased_traceidratio":
      return new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(ratio),
      });
    case "parentbased_always_off":
      return new ParentBasedSampler({ root: new AlwaysOffSampler() });
    case "parentbased_always_on":
    default:
      return new ParentBasedSampler({ root: new AlwaysOnSampler() });
  }
}

/**
 * Initialize the OTel SDK. Call once at app boot (Next.js instrumentation
 * hook). No-op when no collector endpoint is configured.
 */
export function initOtel(): void {
  if (initialized) return;
  initialized = true;

  if (!isOtelEnabled()) {
    return; // Silent no-op in dev / when no collector is configured
  }

  const endpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT as string).replace(
    /\/+$/,
    "",
  );

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "xenboox-web",
    [ATTR_SERVICE_VERSION]: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",
  });

  const exporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
    // OTLP env format: comma-separated `key=value` pairs, URI-encoded
    // (e.g. `Authorization=Bearer%20token`). Parse to a plain record.
    headers: parseOtlpHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
  });

  sdk = new NodeSDK({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(exporter, {
        maxQueueSize: 2048,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 30_000,
      }),
    ],
    sampler: resolveSampler(),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Filesystem/DNS/socket noise — not useful in traces, skip the overhead.
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
        "@opentelemetry/instrumentation-net": { enabled: false },
      }),
    ],
  });

  sdk.start();

  // eslint-disable-next-line no-console
  console.log(
    `[OTel] TracerProvider initialized → ${endpoint} (service: ${
      process.env.OTEL_SERVICE_NAME ?? "xenboox-web"
    }, sampler: ${process.env.OTEL_TRACES_SAMPLER ?? "parentbased_always_on"})`,
  );
}

/**
 * Parse the OTLP standard `OTEL_EXPORTER_OTLP_HEADERS` format into a plain
 * record: comma-separated `key=value` pairs, URI-encoded (RFC 6749 style, per
 * the OpenTelemetry spec). Invalid pairs are skipped, never thrown on.
 */
export function parseOtlpHeaders(
  raw: string | undefined,
): Record<string, string> | undefined {
  if (!raw || raw.trim() === "") return undefined;

  const headers: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const eq = pair.indexOf("=");
    if (eq <= 0) continue; // no key, or empty key — skip
    const key = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!key) continue;
    try {
      headers[key] = decodeURIComponent(value);
    } catch {
      headers[key] = value; // not URI-encoded — use raw value
    }
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}

/**
 * Shutdown OTel gracefully (flush pending spans). Call on process exit.
 */
export async function shutdownOtel(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
    } catch {
      // Best effort — never let shutdown failures crash the process.
    }
    sdk = null;
  }
}
