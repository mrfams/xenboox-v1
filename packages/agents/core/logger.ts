// ─── Structured Logger ────────────────────────────────────────────────────
//
// Enterprise-grade structured logging replacing all console.log/warn/error
// calls in production code. Supports log levels, JSON output, and automatic
// context enrichment (agentId, traceId, timestamp).
//
// Usage:
//   import { logger } from "./logger";
//   logger.info("Ingestion complete", { count: 42 });
//   logger.warn("Threshold approaching", { current: 0.82, threshold: 0.85 });
//   logger.error("Pipeline failed", error);

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  agentId?: string;
  traceId?: string;
  entityId?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  error?: { message: string; stack?: string };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";

let globalAgentId: string | undefined;
let globalTraceId: string | undefined;

/**
 * Set global context that will be attached to every log entry.
 * Useful for setting agentId at pipeline startup.
 */
export function setLogContext(ctx: {
  agentId?: string;
  traceId?: string;
}): void {
  globalAgentId = ctx.agentId ?? globalAgentId;
  globalTraceId = ctx.traceId ?? globalTraceId;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function stringifyError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function emit(entry: LogEntry): void {
  const json = JSON.stringify(entry);

  switch (entry.level) {
    case "error":
      // eslint-disable-next-line no-console
      console.error(json);
      break;
    case "warn":
      // eslint-disable-next-line no-console
      console.warn(json);
      break;
    case "info":
      // eslint-disable-next-line no-console
      console.log(json);
      break;
    case "debug":
      // eslint-disable-next-line no-console
      console.debug(json);
      break;
  }
}

export const logger = {
  debug(message: string, metadata?: Record<string, unknown>): void {
    if (!shouldLog("debug")) return;
    emit({
      timestamp: new Date().toISOString(),
      level: "debug",
      message,
      agentId: globalAgentId,
      traceId: globalTraceId,
      metadata,
    });
  },

  info(message: string, metadata?: Record<string, unknown>): void {
    if (!shouldLog("info")) return;
    emit({
      timestamp: new Date().toISOString(),
      level: "info",
      message,
      agentId: globalAgentId,
      traceId: globalTraceId,
      metadata,
    });
  },

  warn(message: string, metadata?: Record<string, unknown>): void {
    if (!shouldLog("warn")) return;
    emit({
      timestamp: new Date().toISOString(),
      level: "warn",
      message,
      agentId: globalAgentId,
      traceId: globalTraceId,
      metadata,
    });
  },

  error(
    message: string,
    errorOrMetadata?: Error | Record<string, unknown>,
  ): void {
    if (!shouldLog("error")) return;
    const metadata: Record<string, unknown> = {};
    let error: { message: string; stack?: string } | undefined;

    if (errorOrMetadata instanceof Error) {
      error = stringifyError(errorOrMetadata);
    } else if (errorOrMetadata && typeof errorOrMetadata === "object") {
      Object.assign(metadata, errorOrMetadata);
    } else if (errorOrMetadata !== undefined) {
      error = { message: String(errorOrMetadata) };
    }

    emit({
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      agentId: globalAgentId,
      traceId: globalTraceId,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      error,
    });
  },
};
