// ─── Enterprise Retry, Circuit Breaker & Timeout Utilities ───────────────────
//
// Three critical enterprise patterns:
//   1. Retry with exponential backoff + jitter — for transient failures
//   2. Circuit breaker — stops cascading failures to a failing agent
//   3. Pipeline-level timeout — prevents runaway executions

import { langfuse } from "./langfuse";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number; // 0-1, adds randomness to prevent thundering herd
  retryableErrors: Array<{ name: string; messagePattern?: string }>;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureAt: number;
  state: "closed" | "open" | "half_open";
  openedAt: number | null;
}

export interface PipelineTimeoutConfig {
  maxExecutionMs: number; // Total wall-clock time for the pipeline
  maxStepExecutionMs: number; // Per-step timeout
  maxAgentInvokeMs: number; // Per-agent invoke timeout
}

// ─── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.25,
  retryableErrors: [
    { name: "TimeoutError" },
    { name: "NetworkError" },
    { name: "RateLimitError" },
    { name: "InternalServerError" },
    { name: "ServiceUnavailable" },
    { name: "ConflictError" },
    { name: "ECONNRESET" },
    { name: "ETIMEDOUT" },
    { name: "ENOTFOUND" },
  ],
};

export const DEFAULT_PIPELINE_TIMEOUT: PipelineTimeoutConfig = {
  maxExecutionMs: 30_000, // 30 seconds for full pipeline
  maxStepExecutionMs: 15_000, // 15 seconds per step
  maxAgentInvokeMs: 10_000, // 10 seconds per agent call
};

// ─── Circuit Breaker Store ──────────────────────────────────────────────────
// Tracks failure state per agent ID across the process lifetime.

const circuitBreakers = new Map<string, CircuitBreakerState>();

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5, // Open circuit after 5 consecutive failures
  resetTimeoutMs: 60_000, // Try half-open after 60 seconds
  halfOpenMaxRequests: 1, // Allow 1 request in half-open state
};

export function getCircuitBreakerState(agentId: string): CircuitBreakerState {
  let state = circuitBreakers.get(agentId);
  if (!state) {
    state = { failures: 0, lastFailureAt: 0, state: "closed", openedAt: null };
    circuitBreakers.set(agentId, state);
  }
  return state;
}

export function isCircuitOpen(agentId: string): boolean {
  const state = getCircuitBreakerState(agentId);
  if (state.state === "closed") return false;

  // Check if enough time has passed to try half-open
  if (
    state.state === "open" &&
    Date.now() - state.openedAt! >= CIRCUIT_BREAKER_CONFIG.resetTimeoutMs
  ) {
    state.state = "half_open";
    return false; // Allow one request through
  }

  return true;
}

export function recordCircuitSuccess(agentId: string): void {
  const state = getCircuitBreakerState(agentId);
  if (state.state === "half_open") {
    state.state = "closed"; // Reset on success
  }
  state.failures = 0;
}

export function recordCircuitFailure(agentId: string): void {
  const state = getCircuitBreakerState(agentId);
  state.failures++;
  state.lastFailureAt = Date.now();

  if (state.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    state.state = "open";
    state.openedAt = Date.now();
  }
}

// ─── Retry with Exponential Backoff + Jitter ────────────────────────────────

function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs,
  );
  const jitter = exponentialDelay * config.jitterFactor * Math.random();
  return Math.round(exponentialDelay + jitter);
}

function isRetryable(error: Error, config: RetryConfig): boolean {
  return config.retryableErrors.some((rule) => {
    if (error.name === rule.name) {
      if (rule.messagePattern) {
        return error.message.includes(rule.messagePattern);
      }
      return true;
    }
    return false;
  });
}

/**
 * Execute an async function with retry, exponential backoff + jitter.
 * Tracks circuit breaker state per agent.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    agentId: string;
    operationName: string;
    retryConfig?: Partial<RetryConfig>;
    context?: Record<string, unknown>;
  },
): Promise<T> {
  const config: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...options.retryConfig,
  };
  let lastError: Error | null = null;

  const trace = await langfuse.trace({
    name: `retry-${options.operationName}`,
    metadata: {
      agentId: options.agentId,
      maxAttempts: config.maxAttempts,
      ...options.context,
    },
  });

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    // Check circuit breaker before attempting
    if (isCircuitOpen(options.agentId)) {
      const msg = `Circuit breaker open for agent ${options.agentId} — request blocked`;
      await trace.update({
        output: { status: "circuit_open", agentId: options.agentId },
      });
      throw new Error(msg);
    }

    try {
      const result = await fn();
      recordCircuitSuccess(options.agentId);

      if (attempt > 0) {
        await trace.update({
          output: { status: "recovered", attempts: attempt + 1 },
        });
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryable(lastError, config)) {
        // Non-retryable error — record circuit failure and throw
        recordCircuitFailure(options.agentId);
        await trace.update({
          output: {
            status: "non_retryable_error",
            error: lastError.message,
            attempt: attempt + 1,
          },
        });
        throw lastError;
      }

      if (attempt < config.maxAttempts - 1) {
        const delay = calculateDelay(attempt, config);
        await trace.update({
          output: {
            status: "retrying",
            attempt: attempt + 1,
            nextDelayMs: delay,
            error: lastError.message,
          },
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  recordCircuitFailure(options.agentId);
  await trace.update({
    output: {
      status: "exhausted",
      attempts: config.maxAttempts,
      error: lastError?.message,
    },
  });
  throw lastError ?? new Error("Retry exhausted");
}

// ─── Pipeline Timeout ──────────────────────────────────────────────────────

/**
 * Execute an async function with a timeout.
 * Throws TimeoutError if the function doesn't complete within the limit.
 *
 * Batch 2 / N16 — `onTimeout` fires when the limit trips, BEFORE the reject.
 * A timed-out async fn cannot be force-killed in JS, so long-running work
 * (the close pipeline) observes a shared abort flag via this callback and
 * stops at its next step boundary instead of continuing to post financial
 * entries in the background while the caller reports failure.
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  operationName: string,
  opts?: { onTimeout?: () => void },
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        opts?.onTimeout?.();
      } catch {
        // an observer throwing must not mask the TimeoutError
      }
      reject(
        new TimeoutError(
          `Operation "${operationName}" timed out after ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);

    fn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

// ─── Concurrency Limiter ───────────────────────────────────────────────────

/**
 * Execute async functions with a concurrency limit.
 * Enterprise pattern: prevents overwhelming agents and network.
 */
export async function withConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];
  let index = 0;

  async function enqueue(): Promise<void> {
    if (index >= tasks.length) return;

    const currentIndex = index++;
    const task = tasks[currentIndex];

    const result = await task();
    results[currentIndex] = result;
  }

  // Start initial batch
  const initialBatch = Math.min(limit, tasks.length);
  for (let i = 0; i < initialBatch; i++) {
    const promise = enqueue().finally(() => {
      const idx = executing.indexOf(promise);
      if (idx >= 0) executing.splice(idx, 1);
    });
    executing.push(promise);
  }

  // Wait for all to complete
  while (executing.length > 0) {
    await Promise.race(executing);
    // Fill empty slots
    while (executing.length < limit && index < tasks.length) {
      const promise = enqueue().finally(() => {
        const idx = executing.indexOf(promise);
        if (idx >= 0) executing.splice(idx, 1);
      });
      executing.push(promise);
    }
  }

  return results;
}

// ─── PII Redaction ──────────────────────────────────────────────────────────

/**
 * Patterns for detecting common PII in text.
 * Extends to cover financial PII which is particularly sensitive.
 */
const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Email addresses
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL REDACTED]",
  },
  // Phone numbers (international formats)
  {
    pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
    replacement: "[PHONE REDACTED]",
  },
  // National ID numbers (generic patterns)
  {
    pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    replacement: "[SSN REDACTED]",
  },
  // Bank account numbers (common patterns — varies by jurisdiction)
  { pattern: /\b\d{8,20}\b/g, replacement: "[ACCOUNT REDACTED]" },
  // Credit card numbers (Luhn-checkable)
  { pattern: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g, replacement: "[CARD REDACTED]" },
  // Tax IDs / TINs
  {
    pattern: /\b(TIN|VAT|TAX)[:\s]*[A-Z0-9]{6,15}\b/gi,
    replacement: "[TAX ID REDACTED]",
  },
  // Passport numbers (common patterns)
  { pattern: /\b[A-Z]{1,2}\d{6,9}\b/g, replacement: "[PASSPORT REDACTED]" },
  // IP addresses
  {
    pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    replacement: "[IP REDACTED]",
  },
];

/**
 * Redact PII from a string — safe for audit logs.
 * Keeps the structure and meaning but replaces sensitive values.
 */
export function redactPII(text: string): string {
  if (!text) return text;
  let redacted = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
}

/**
 * Deep-redact PII from an object (recursive).
 * Use this before writing anything to audit logs.
 */
export function redactPIIFromObject<T>(obj: T): T {
  if (typeof obj === "string") {
    return redactPII(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(redactPIIFromObject) as unknown as T;
  }
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Skip redacting certain safe fields to preserve debugging value
      const safeKeys = [
        "status",
        "confidence",
        "tier",
        "type",
        "agentId",
        "severity",
        "action",
      ];
      if (safeKeys.includes(key)) {
        result[key] = value;
      } else {
        result[key] = redactPIIFromObject(value);
      }
    }
    return result as unknown as T;
  }
  return obj;
}

// ─── Idempotency / Request Deduplication ───────────────────────────────────

interface IdempotencyRecord {
  key: string;
  result: unknown;
  expiresAt: number;
}

const idempotencyCache = new Map<string, IdempotencyRecord>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a request has already been processed (idempotency key).
 * Returns cached result if found, or null if new request.
 */
export function checkIdempotency(key: string): unknown | null {
  const record = idempotencyCache.get(key);
  if (record && Date.now() < record.expiresAt) {
    return record.result;
  }
  if (record) {
    idempotencyCache.delete(key); // Expired
  }
  return null;
}

/**
 * Store the result of an idempotent operation.
 */
export function setIdempotencyResult(key: string, result: unknown): void {
  idempotencyCache.set(key, {
    key,
    result,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
  });
}

/**
 * Clear all cached idempotency results. Used by tests to isolate pipeline
 * runs (the consolidation/onboarding pipelines share one in-memory cache
 * keyed by entity+period, so without this the first test's result would
 * leak into every subsequent test with the same params).
 */
export function clearIdempotencyCache(): void {
  idempotencyCache.clear();
}

/**
 * Generate an idempotency key from the input event.
 */
export function generateIdempotencyKey(event: {
  userId: string;
  entityId: string;
  rawContent: string;
  sessionId: string;
  channel: string;
}): string {
  // Hash the normalized input to detect duplicate submissions
  const normalized = `${event.userId}:${event.entityId}:${event.channel}:${event.rawContent.trim().toLowerCase()}`;

  // Simple hash for dedup key (not cryptographic, just for dedup)
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `${event.sessionId}:${Math.abs(hash).toString(36)}`;
}

// ─── Cleanup expired entries ───────────────────────────────────────────────

// Periodically clean up expired entries from caches
const CLEANUP_INTERVAL_MS = 60_000; // Every 60 seconds
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function startCacheCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();

    // Clean idempotency cache
    for (const [key, record] of idempotencyCache) {
      if (now >= record.expiresAt) {
        idempotencyCache.delete(key);
      }
    }

    // Clean circuit breaker - reset old open circuits
    for (const [agentId, state] of circuitBreakers) {
      if (
        state.state === "open" &&
        now - state.openedAt! >= CIRCUIT_BREAKER_CONFIG.resetTimeoutMs
      ) {
        state.state = "half_open";
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

export function stopCacheCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
