/**
 * Graceful Degradation System
 *
 * Provides circuit breakers, fallbacks, and degradation strategies
 * to ensure the system remains functional even when services fail.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in milliseconds to wait before trying again */
  resetTimeoutMs: number;
  /** Number of successes needed to close the circuit */
  successThreshold: number;
  /** Time window for counting failures */
  monitoringWindowMs: number;
}

export interface CircuitBreakerState {
  /** Current state of the circuit */
  state: CircuitState;
  /** Number of consecutive failures */
  failureCount: number;
  /** Number of consecutive successes */
  successCount: number;
  /** When the circuit was last opened */
  lastOpenedAt?: Date;
  /** When the circuit was last closed */
  lastClosedAt?: Date;
}

export interface FallbackConfig<T> {
  /** Primary function to execute */
  primary: () => Promise<T>;
  /** Fallback function if primary fails */
  fallback: () => Promise<T>;
  /** Optional: Function to determine if error is retryable */
  isRetryable?: (error: Error) => boolean;
  /** Optional: Maximum retry attempts */
  maxRetries?: number;
}

// ─── Default Configuration ──────────────────────────────────────────────

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
  successThreshold: 3,
  monitoringWindowMs: 300000, // 5 minutes
};

// ─── Circuit Breaker ────────────────────────────────────────────────────

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private failureTimestamps: number[] = [];

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
    this.state = {
      state: "closed",
      failureCount: 0,
      successCount: 0,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state.state === "open") {
      if (this.shouldAttemptReset()) {
        this.state.state = "half-open";
        this.state.successCount = 0;
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a success
   */
  private onSuccess(): void {
    this.state.failureCount = 0;

    if (this.state.state === "half-open") {
      this.state.successCount++;

      if (this.state.successCount >= this.config.successThreshold) {
        this.state.state = "closed";
        this.state.lastClosedAt = new Date();
      }
    }
  }

  /**
   * Record a failure
   */
  private onFailure(): void {
    const now = Date.now();
    this.failureTimestamps.push(now);

    // Clean old failures outside monitoring window
    this.failureTimestamps = this.failureTimestamps.filter(
      (ts) => now - ts < this.config.monitoringWindowMs,
    );

    this.state.failureCount = this.failureTimestamps.length;

    if (this.state.state === "half-open") {
      this.tripCircuit();
    } else if (this.state.failureCount >= this.config.failureThreshold) {
      this.tripCircuit();
    }
  }

  /**
   * Trip the circuit to open state
   */
  private tripCircuit(): void {
    this.state.state = "open";
    this.state.lastOpenedAt = new Date();
    this.state.successCount = 0;
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    if (!this.state.lastOpenedAt) return false;
    return (
      Date.now() - this.state.lastOpenedAt.getTime() >=
      this.config.resetTimeoutMs
    );
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Manually reset the circuit
   */
  reset(): void {
    this.state = {
      state: "closed",
      failureCount: 0,
      successCount: 0,
      lastClosedAt: new Date(),
    };
    this.failureTimestamps = [];
  }
}

// ─── Graceful Degradation Manager ───────────────────────────────────────

export class GracefulDegradation {
  private circuits: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker for a service
   */
  getCircuitBreaker(
    serviceId: string,
    config?: Partial<CircuitBreakerConfig>,
  ): CircuitBreaker {
    if (!this.circuits.has(serviceId)) {
      this.circuits.set(serviceId, new CircuitBreaker(config));
    }
    return this.circuits.get(serviceId)!;
  }

  /**
   * Execute with fallback
   */
  async withFallback<T>(config: FallbackConfig<T>): Promise<T> {
    const {
      primary,
      fallback,
      isRetryable = () => true,
      maxRetries = 1,
    } = config;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await primary();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!isRetryable(lastError) || attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 100),
        );
      }
    }

    // All retries failed, use fallback
    return fallback();
  }

  /**
   * Execute with circuit breaker and fallback
   */
  async withCircuitBreaker<T>(
    serviceId: string,
    config: FallbackConfig<T>,
    circuitConfig?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const circuit = this.getCircuitBreaker(serviceId, circuitConfig);

    try {
      return await circuit.execute(config.primary);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Circuit breaker is open"
      ) {
        return config.fallback();
      }
      throw error;
    }
  }

  /**
   * Get all circuit states
   */
  getAllCircuitStates(): Map<string, CircuitBreakerState> {
    const states = new Map<string, CircuitBreakerState>();
    const entries = Array.from(this.circuits.entries());
    for (const [id, circuit] of entries) {
      states.set(id, circuit.getState());
    }
    return states;
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    const circuits = Array.from(this.circuits.values());
    for (const circuit of circuits) {
      circuit.reset();
    }
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────

let degradationInstance: GracefulDegradation | null = null;

/**
 * Get or create the graceful degradation instance
 */
export function getGracefulDegradation(): GracefulDegradation {
  if (!degradationInstance) {
    degradationInstance = new GracefulDegradation();
  }
  return degradationInstance;
}

// ─── Common Fallback Strategies ─────────────────────────────────────────

/**
 * Cached response fallback - return cached data if service fails
 */
export function cachedResponseFallback<T>(
  cacheKey: string,
  cache: Map<string, T>,
): FallbackConfig<T>["fallback"] {
  return async () => {
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    throw new Error("No cached response available");
  };
}

/**
 * Default value fallback - return a default value
 */
export function defaultValueFallback<T>(
  defaultValue: T,
): FallbackConfig<T>["fallback"] {
  return async () => defaultValue;
}

/**
 * Partial response fallback - return partial data
 */
export function partialResponseFallback<T extends Record<string, unknown>>(
  partialData: Partial<T>,
): FallbackConfig<T>["fallback"] {
  return async () => partialData as T;
}
