/**
 * Activation Tracking — TDD Tests
 *
 * Tests the activation event tracking logic, idempotency, rate limiting, and scoring.
 * Tests the pure logic functions from the schema module.
 */

import { describe, it, expect } from "vitest";

import {
  calculateActivationScore,
  getActivationStatus,
  getNextStep,
  ACTIVATION_EVENTS,
} from "@xenboox/db/schema/analytics";

describe("activation-scoring", () => {
  describe("calculateActivationScore", () => {
    it("returns 0 for no events", () => {
      const score = calculateActivationScore([]);
      expect(score).toBe(0);
    });

    it("increases score with more events", () => {
      const score1 = calculateActivationScore(["signup"]);
      const score2 = calculateActivationScore(["signup", "setup_business"]);
      expect(score2).toBeGreaterThan(score1);
    });

    it("returns max 1.0 when all events completed", () => {
      const allEvents = Object.keys(ACTIVATION_EVENTS);
      const score = calculateActivationScore(allEvents);
      expect(score).toBeGreaterThanOrEqual(0.9);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it("is idempotent - same events produce same score", () => {
      const events = ["signup", "setup_business", "import_bank"];
      const score1 = calculateActivationScore(events);
      const score2 = calculateActivationScore(events);
      expect(score1).toBe(score2);
    });

    it("ignores unknown events", () => {
      const score = calculateActivationScore(["unknown_event", "signup"]);
      const scoreOnlyKnown = calculateActivationScore(["signup"]);
      expect(score).toBe(scoreOnlyKnown);
    });
  });

  describe("getActivationStatus", () => {
    it("returns 'new' for score 0", () => {
      const status = getActivationStatus(0);
      expect(status.level).toBe("new");
      expect(status.label).toBe("Not Started");
    });

    it("returns 'complete' for score >= 1.0", () => {
      const status = getActivationStatus(1.0);
      expect(status.level).toBe("complete");
      expect(status.label).toBe("Fully Activated");
    });

    it("returns 'progress' for score 0.5", () => {
      const status = getActivationStatus(0.5);
      expect(status.level).toBe("progress");
    });

    it("returns 'started' for score 0.3", () => {
      const status = getActivationStatus(0.3);
      expect(status.level).toBe("started");
    });

    it("returns 'nearly' for score 0.8", () => {
      const status = getActivationStatus(0.8);
      expect(status.level).toBe("nearly");
    });

    it("always has level, label, and color", () => {
      for (const score of [0, 0.1, 0.3, 0.5, 0.75, 0.9, 1.0]) {
        const status = getActivationStatus(score);
        expect(status).toHaveProperty("level");
        expect(status).toHaveProperty("label");
        expect(status).toHaveProperty("color");
      }
    });
  });

  describe("getNextStep", () => {
    it("returns an object with event, description, weight for new user", () => {
      const next = getNextStep([]);
      expect(next).toBeDefined();
      expect(next).toHaveProperty("event");
      expect(next).toHaveProperty("description");
      expect(next).toHaveProperty("weight");
      expect(typeof next!.event).toBe("string");
      expect(typeof next!.description).toBe("string");
      expect(typeof next!.weight).toBe("number");
    });

    it("returns next incomplete step", () => {
      const next = getNextStep(["signup", "setup_business"]);
      expect(next).toBeDefined();
      // Should not return already completed steps
      expect(next!.event).not.toBe("signup");
      expect(next!.event).not.toBe("setup_business");
    });

    it("returns null when all priority steps complete", () => {
      // The priority order is: create_invoice, import_bank, see_narrative, setup_business, invite_team
      const allPriority = ["create_invoice", "import_bank", "see_narrative", "setup_business", "invite_team"];
      const next = getNextStep(allPriority);
      expect(next).toBeNull();
    });

    it("prioritizes high-impact steps first", () => {
      const next = getNextStep([]);
      // First step should be create_invoice (weight 0.30 - highest)
      expect(next!.event).toBe("create_invoice");
    });
  });

  describe("ACTIVATION_EVENTS", () => {
    it("has 6 events", () => {
      expect(Object.keys(ACTIVATION_EVENTS)).toHaveLength(6);
    });

    it("each event has weight and description", () => {
      for (const [key, value] of Object.entries(ACTIVATION_EVENTS)) {
        expect(value).toHaveProperty("weight");
        expect(value).toHaveProperty("description");
        expect(typeof value.weight).toBe("number");
        expect(value.weight).toBeGreaterThan(0);
        expect(value.weight).toBeLessThanOrEqual(1);
      }
    });

    it("weights sum to 1.0", () => {
      const totalWeight = Object.values(ACTIVATION_EVENTS).reduce(
        (sum, e) => sum + e.weight,
        0,
      );
      expect(totalWeight).toBeCloseTo(1.0, 1);
    });
  });
});

describe("activation-rate-limiting", () => {
  it("rate limiter exists and has checkApiRateLimit", async () => {
    const { getRateLimiter } = await import("@/lib/security/rate-limiter");
    const limiter = getRateLimiter();
    expect(limiter).toBeDefined();
    expect(typeof limiter.checkApiRateLimit).toBe("function");
  });

  it("rate limiter returns success/failure structure", async () => {
    const { getRateLimiter } = await import("@/lib/security/rate-limiter");
    const limiter = getRateLimiter();
    const result = await limiter.checkApiRateLimit("test-key");
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("limit");
    expect(result).toHaveProperty("remaining");
    expect(result).toHaveProperty("reset");
  });
});
