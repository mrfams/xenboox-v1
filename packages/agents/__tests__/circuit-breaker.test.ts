/**
 * Agent Circuit Breaker Tests
 *
 * Verifies that the circuit breaker pattern prevents cascading failures
 * when an agent or downstream service is repeatedly failing. Tests sustained
 * failure scenarios, recovery, and half-open state transitions.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Circuit Breaker Implementation ────────────────────────────────────────

type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  halfOpenMaxAttempts: number;
}

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  rejectedRequests: number;
}

class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalRequests = 0;
  private rejectedRequests = 0;
  private halfOpenAttempts = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === "open") {
      if (this.shouldAttemptRecovery()) {
        this.state = "half-open";
        this.halfOpenAttempts = 0;
      } else {
        this.rejectedRequests++;
        throw new Error("Circuit breaker is OPEN — request rejected");
      }
    }

    if (
      this.state === "half-open" &&
      this.halfOpenAttempts >= this.config.halfOpenMaxAttempts
    ) {
      this.rejectedRequests++;
      throw new Error(
        "Circuit breaker is HALF-OPEN — max recovery attempts reached",
      );
    }

    try {
      if (this.state === "half-open") {
        this.halfOpenAttempts++;
      }
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = Date.now();

    if (this.state === "half-open") {
      // Recovery successful — close the circuit
      this.state = "closed";
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      // Failed during recovery — reopen the circuit
      this.state = "open";
      return;
    }

    if (this.failures >= this.config.failureThreshold) {
      this.state = "open";
    }
  }

  private shouldAttemptRecovery(): boolean {
    if (!this.lastFailureTime) return false;
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeoutMs;
  }

  getState(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      rejectedRequests: this.rejectedRequests,
    };
  }

  reset(): void {
    this.state = "closed";
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.totalRequests = 0;
    this.rejectedRequests = 0;
    this.halfOpenAttempts = 0;
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("Circuit Breaker", () => {
  let breaker: CircuitBreaker;

  const defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 3,
    recoveryTimeoutMs: 100, // Short for testing
    halfOpenMaxAttempts: 1,
  };

  beforeEach(() => {
    breaker = new CircuitBreaker(defaultConfig);
  });

  describe("Closed state (normal operation)", () => {
    it("should start in closed state", () => {
      const stats = breaker.getState();
      expect(stats.state).toBe("closed");
      expect(stats.failures).toBe(0);
    });

    it("should pass through successful requests", async () => {
      const result = await breaker.execute(async () => "ok");
      expect(result).toBe("ok");
      const stats = breaker.getState();
      expect(stats.successes).toBe(1);
      expect(stats.failures).toBe(0);
    });

    it("should count failures without opening circuit below threshold", async () => {
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error("fail");
          });
        } catch {
          // Expected
        }
      }
      const stats = breaker.getState();
      expect(stats.state).toBe("closed");
      expect(stats.failures).toBe(2);
    });
  });

  describe("Open state (circuit tripped)", () => {
    it("should open circuit after reaching failure threshold", async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error("fail");
          });
        } catch {
          // Expected
        }
      }
      const stats = breaker.getState();
      expect(stats.state).toBe("open");
    });

    it("should reject requests when circuit is open", async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error("fail");
          });
        } catch {
          // Expected
        }
      }

      // Attempt request — should be rejected
      await expect(
        breaker.execute(async () => "should not run"),
      ).rejects.toThrow("Circuit breaker is OPEN");
    });

    it("should track rejected requests", async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error("fail");
          });
        } catch {
          // Expected
        }
      }

      // Try a few more — all should be rejected
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(async () => "nope");
        } catch {
          // Expected
        }
      }

      const stats = breaker.getState();
      expect(stats.rejectedRequests).toBe(5);
    });
  });

  describe("Half-open state (recovery attempt)", () => {
    it("should transition to half-open after recovery timeout", async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error("fail");
          });
        } catch {
          // Expected
        }
      }
      expect(breaker.getState().state).toBe("open");

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Next request should trigger half-open
      const result = await breaker.execute(async () => "recovered");
      expect(result).toBe("recovered");
      const stats = breaker.getState();
      expect(stats.state).toBe("closed"); // Recovery successful
    });

    it("should reopen circuit if half-open attempt fails", async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error("fail");
          });
        } catch {
          // Expected
        }
      }

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Half-open attempt fails
      try {
        await breaker.execute(async () => {
          throw new Error("still broken");
        });
      } catch {
        // Expected
      }

      const stats = breaker.getState();
      expect(stats.state).toBe("open");
    });
  });

  describe("Sustained failure scenario", () => {
    it("should handle intermittent failures without getting stuck", async () => {
      let callCount = 0;

      // Simulate: fail, fail, fail (trip), wait, succeed (recover), fail again
      const flakyService = async () => {
        callCount++;
        if (callCount <= 3) throw new Error("transient failure");
        return "ok";
      };

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(flakyService);
        } catch {
          // Expected
        }
      }
      expect(breaker.getState().state).toBe("open");

      // Wait for recovery
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should recover
      const result = await breaker.execute(flakyService);
      expect(result).toBe("ok");
      expect(breaker.getState().state).toBe("closed");
    });

    it("should handle sustained failures without recovering prematurely", async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error("persistent failure");
          });
        } catch {
          // Expected
        }
      }

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Half-open attempt also fails
      try {
        await breaker.execute(async () => {
          throw new Error("still failing");
        });
      } catch {
        // Expected
      }

      // Should be back to open
      expect(breaker.getState().state).toBe("open");

      // Immediate request should be rejected
      await expect(breaker.execute(async () => "nope")).rejects.toThrow(
        "Circuit breaker is OPEN",
      );
    });
  });

  describe("Reset", () => {
    it("should reset all state to initial values", async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error("fail");
          });
        } catch {
          // Expected
        }
      }

      breaker.reset();
      const stats = breaker.getState();
      expect(stats.state).toBe("closed");
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.totalRequests).toBe(0); // reset clears all counters
    });
  });
});
