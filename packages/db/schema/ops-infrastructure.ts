import {
  pgEnum,
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";

// Enums
export const infrastructureStatusEnum = pgEnum("infrastructure_status", [
  "healthy",
  "degraded",
  "unhealthy",
  "maintenance",
  "unknown",
]);

export const alertSeverityEnum = pgEnum("alert_severity", [
  "critical",
  "warning",
  "info",
]);

export const incidentSeverityEnum = pgEnum("incident_severity", [
  "major",
  "minor",
  "maintenance",
]);

export const serviceTypeEnum = pgEnum("service_type", [
  "api",
  "worker",
  "database",
  "cache",
  "queue",
  "storage",
  "cdn",
  "other",
]);

// Infrastructure Health Overview (daily snapshots)
export const infraHealthOverview = pgTable("infra_health_overview", {
  id: uuidId(),
  ...timestamps,

  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD

  // Overall status
  overallStatus: infrastructureStatusEnum("overall_status")
    .notNull()
    .default("healthy"),

  // Uptime
  uptimePercent: numeric("uptime_percent", { precision: 7, scale: 4 })
    .notNull()
    .default("100"),

  // Incidents
  incidentCount: integer("incident_count").notNull().default(0),

  // Services
  totalServices: integer("total_services").notNull().default(0),
  healthyServices: integer("healthy_services").notNull().default(0),
  degradedServices: integer("degraded_services").notNull().default(0),
  unhealthyServices: integer("unhealthy_services").notNull().default(0),
  maintenanceServices: integer("maintenance_services").notNull().default(0),
  unknownServices: integer("unknown_services").notNull().default(0),

  // Alerts
  activeAlerts: integer("active_alerts").notNull().default(0),
  criticalAlerts: integer("critical_alerts").notNull().default(0),
  warningAlerts: integer("warning_alerts").notNull().default(0),
  infoAlerts: integer("info_alerts").notNull().default(0),

  // API Metrics
  avgResponseTimeMs: integer("avg_response_time_ms").notNull().default(0),
  errorRatePercent: numeric("error_rate_percent", { precision: 7, scale: 4 })
    .notNull()
    .default("0"),

  // Resource Usage
  cpuUsagePercent: numeric("cpu_usage_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  memoryUsagePercent: numeric("memory_usage_percent", {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default("0"),
  diskUsagePercent: numeric("disk_usage_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  networkInMbps: numeric("network_in_mbps", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  networkOutMbps: numeric("network_out_mbps", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
});

// Services (individual service health)
export const infraServices = pgTable("infra_services", {
  id: uuidId(),
  ...timestamps,

  name: varchar("name", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
  type: serviceTypeEnum("type").notNull(),

  // Status
  status: infrastructureStatusEnum("status").notNull().default("healthy"),
  environment: varchar("environment", { length: 100 })
    .notNull()
    .default("production"),

  // Metrics
  uptimePercent30d: numeric("uptime_percent_30d", { precision: 7, scale: 4 })
    .notNull()
    .default("100"),
  responseTimeP95Ms: integer("response_time_p95_ms"),
  errorRatePercent7d: numeric("error_rate_percent_7d", {
    precision: 7,
    scale: 4,
  }),

  // Delta indicators
  responseTimeDelta: integer("response_time_delta"), // Percentage change
  errorRateDelta: numeric("error_rate_delta", { precision: 7, scale: 4 }),

  // Last check
  lastCheckedAt: timestamp("last_checked_at"),

  // Metadata
  metadata: text("metadata"), // JSON string
});

// Current Alerts
export const infraAlerts = pgTable("infra_alerts", {
  id: uuidId(),
  ...timestamps,

  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  severity: alertSeverityEnum("severity").notNull(),

  // Source
  serviceName: varchar("service_name", { length: 255 }),
  environment: varchar("environment", { length: 100 })
    .notNull()
    .default("production"),

  // Status
  isAcknowledged: boolean("is_acknowledged").default(false),
  acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
  acknowledgedAt: timestamp("acknowledged_at"),

  // Resolution
  resolvedAt: timestamp("resolved_at"),
});

// Recent Incidents
export const infraIncidents = pgTable("infra_incidents", {
  id: uuidId(),
  ...timestamps,

  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  severity: incidentSeverityEnum("severity").notNull(),

  // Timing
  startedAt: timestamp("started_at").notNull(),
  resolvedAt: timestamp("resolved_at"),
  durationMinutes: integer("duration_minutes"),

  // Impact
  affectedServices: text("affected_services"), // JSON array of service names
  environment: varchar("environment", { length: 100 })
    .notNull()
    .default("production"),

  // Status
  status: varchar("status", { length: 50 }).notNull().default("investigating"),
});

// Resource Usage by Environment
export const infraResourceUsage = pgTable("infra_resource_usage", {
  id: uuidId(),
  ...timestamps,

  environment: varchar("environment", { length: 100 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD

  // CPU
  cpuAvgPercent: numeric("cpu_avg_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  cpuPeakPercent: numeric("cpu_peak_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),

  // Memory
  memoryAvgPercent: numeric("memory_avg_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  memoryPeakPercent: numeric("memory_peak_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),

  // Disk
  diskAvgPercent: numeric("disk_avg_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  diskPeakPercent: numeric("disk_peak_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),

  // Network
  networkInMbps: numeric("network_in_mbps", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  networkOutMbps: numeric("network_out_mbps", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
});
