import {
  pgEnum,
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";

// Enums
export const logLevelEnum = pgEnum("log_level", [
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
]);

export const traceStatusEnum = pgEnum("trace_status", [
  "success",
  "error",
  "unset",
]);

export const spanKindEnum = pgEnum("span_kind", [
  "internal",
  "server",
  "client",
  "producer",
  "consumer",
]);

// Log Entries (individual log lines)
export const logEntries = pgTable("log_entries", {
  id: uuidId(),
  ...timestamps,

  timestamp: timestamp("timestamp").notNull(),
  level: logLevelEnum("level").notNull(),
  message: text("message").notNull(),

  // Source
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  environment: varchar("environment", { length: 100 })
    .notNull()
    .default("production"),

  // Context
  traceId: varchar("trace_id", { length: 255 }),
  spanId: varchar("span_id", { length: 255 }),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

// Traces (distributed traces)
export const traces = pgTable("traces", {
  id: uuidId(),
  ...timestamps,

  traceId: varchar("trace_id", { length: 255 }).notNull().unique(),

  // Root span info
  rootOperation: varchar("root_operation", { length: 500 }).notNull(),
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  environment: varchar("environment", { length: 100 })
    .notNull()
    .default("production"),

  // Timing
  startTime: timestamp("start_time").notNull(),
  durationMs: integer("duration_ms").notNull(),

  // Status
  status: traceStatusEnum("status").notNull().default("success"),

  // Metrics
  spanCount: integer("span_count").notNull().default(1),
  errorCount: integer("error_count").notNull().default(0),
});

// Spans (individual spans within a trace)
export const spans = pgTable("spans", {
  id: uuidId(),
  ...timestamps,

  traceId: varchar("trace_id", { length: 255 }).notNull(),
  spanId: varchar("span_id", { length: 255 }).notNull(),
  parentSpanId: varchar("parent_span_id", { length: 255 }),

  // Operation
  operationName: varchar("operation_name", { length: 500 }).notNull(),
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  kind: spanKindEnum("kind").notNull().default("internal"),

  // Timing
  startTime: timestamp("start_time").notNull(),
  durationMs: integer("duration_ms").notNull(),

  // Status
  status: traceStatusEnum("status").notNull().default("success"),
  statusCode: integer("status_code"),
  statusMessage: text("status_message"),

  // Tags
  tags: jsonb("tags").$type<Record<string, unknown>>(),

  // Logs (events within the span)
  logs: jsonb("logs").$type<
    Array<{ timestamp: string; level: string; message: string }>
  >(),
});

// Performance Metrics (aggregated)
export const performanceMetrics = pgTable("performance_metrics", {
  id: uuidId(),
  ...timestamps,

  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  environment: varchar("environment", { length: 100 })
    .notNull()
    .default("production"),

  // Latency
  p50LatencyMs: integer("p50_latency_ms"),
  p95LatencyMs: integer("p95_latency_ms"),
  p99LatencyMs: integer("p99_latency_ms"),
  avgLatencyMs: integer("avg_latency_ms"),

  // Throughput
  requestCount: integer("request_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  errorRatePercent: numeric("error_rate_percent", { precision: 7, scale: 4 })
    .notNull()
    .default("0"),

  // Volume
  logCount: integer("log_count").notNull().default(0),
  traceCount: integer("trace_count").notNull().default(0),
});
