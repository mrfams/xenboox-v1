/**
 * Autonomy Policy — deterministic policy-as-code HITL enforcement (§22.3)
 *
 * The "autonomy slider" for agent actions. A single, auditable policy engine
 * that decides — with 100% deterministic code, never an LLM — whether an
 * action may execute autonomously, must wait for human review, or is blocked.
 *
 * Design principles:
 * - Policy is code: thresholds, risk classes, and deny-lists live here, not in
 *   prompts or model output.
 * - Money movement can NEVER be autonomous (hard deny at every level except
 *   NONE — see LEVELS below).
 * - Higher autonomy only widens the auto-approve band for *safe* write classes;
 *   it never weakens the hard deny rules.
 * - Every decision returns a structured reason so the audit trail explains why.
 *
 * Env configuration (mock values — see .env.example):
 *   XENBOOX_AUTONOMY_LEVEL    suggest | low | standard | full   (default "suggest")
 *   XENBOOX_AUTO_APPROVE_MAX  max amount (in minor units) auto-approvable for
 *                             safe writes at level "full" (default 1_000_000
 *                             i.e. GMD 10,000.00 — mock)
 */

import { logger } from "./logger";

// ─── Enums & Types ─────────────────────────────────────────────────────────

export type AutonomyLevel = "suggest" | "low" | "standard" | "full";

/** Risk classification for a tool/action. */
export type ActionRisk =
  | "read" // safe reads — always allowed
  | "safe_write" // reversible / low-risk writes (journal drafts, tagging)
  | "sensitive_write" // approval-bound writes below hard limits (approvals, expense claims)
  | "money_movement"; // bank transfers, payments, disbursements — NEVER autonomous

export type AutonomyVerdict =
  | { decision: "allow"; reason: string }
  | { decision: "human_review"; reason: string }
  | { decision: "deny"; reason: string };

export interface AutonomyPolicyInput {
  /** Entity (tenant) scope — policy is evaluated per entity. */
  entityId: string;
  /** Agent requesting the action. */
  agentName: string;
  /** Risk class of the action. */
  risk: ActionRisk;
  /** Action label for the audit reason (e.g. tool name). */
  action: string;
  /** Monetary amount in minor units (e.g. cents / bututs) — 0 for non-monetary. */
  amountMinorUnits?: number;
  /** Model confidence 0-1 (policy may raise the bar, never lower it). */
  confidence?: number;
}

// ─── Hard Rules (never configurable down) ──────────────────────────────────

/**
 * Money-movement actions are hard-denied at every autonomy level. No env can
 * weaken this — the constant is the policy.
 */
const MONEY_MOVEMENT_DENY: AutonomyLevel[] = [
  "suggest",
  "low",
  "standard",
  "full",
];

/**
 * Below this confidence, even a "safe_write" is never auto-approved — the
 * autonomy slider widens the band but the floor is fixed.
 */
const MIN_AUTO_APPROVE_CONFIDENCE = 0.85;

/** Level → maximum auto-approvable amount (minor units) for sensitive writes. */
const SENSITIVE_WRITE_AUTO_LIMITS: Record<AutonomyLevel, number> = {
  suggest: 0, // suggest: nothing auto-approves
  low: 250_000, // e.g. GMD 2,500.00
  standard: 1_000_000, // e.g. GMD 10,000.00
  full: 10_000_000, // e.g. GMD 100,000.00 — still capped, never unlimited
};

/** Hard per-action deny-list (regardless of level or amount). */
const HARD_DENY_ACTIONS: string[] = [
  "bank_transfer",
  "make_payment",
  "disburse",
  "pay_salary",
  "move_funds",
  "send_money",
  "schedule_payment_execution",
  "execute_payment",
];

// ─── Level Resolution ──────────────────────────────────────────────────────

const VALID_LEVELS: AutonomyLevel[] = ["suggest", "low", "standard", "full"];

export function resolveAutonomyLevel(): AutonomyLevel {
  const raw = process.env.XENBOOX_AUTONOMY_LEVEL ?? "suggest";
  const level = raw.trim().toLowerCase() as AutonomyLevel;
  return VALID_LEVELS.includes(level) ? level : "suggest";
}

// ─── Policy Evaluation ─────────────────────────────────────────────────────

/**
 * Evaluate a proposed action against the autonomy policy.
 * Purely deterministic — no LLM, no DB, no randomness.
 */
export function evaluateAutonomy(input: AutonomyPolicyInput): AutonomyVerdict {
  const level = resolveAutonomyLevel();
  const actionLower = input.action.toLowerCase();
  const confidence = input.confidence ?? 1.0;

  // 1. Hard deny-list (money movement tools) — policy, not model judgment.
  if (HARD_DENY_ACTIONS.includes(actionLower)) {
    const reason = `Action "${input.action}" is on the money-movement deny-list — HITL required by policy (autonomy=${level})`;
    logger.warn("[autonomy-policy] hard deny", { ...input, level, reason });
    return { decision: "deny", reason };
  }

  // 2. Risk-class deny (belt and suspenders — tools must also be classified).
  if (input.risk === "money_movement") {
    const reason = `Risk class money_movement is never autonomous (autonomy=${level})`;
    logger.warn("[autonomy-policy] money-movement deny", { ...input, level });
    return { decision: "deny", reason };
  }

  // 3. Reads are always allowed (read-only, no state change).
  if (input.risk === "read") {
    return { decision: "allow", reason: "Read-only action — no state change" };
  }

  // 4. Confidence floor — the slider never lowers the bar below 0.85.
  if (confidence < MIN_AUTO_APPROVE_CONFIDENCE) {
    const reason = `Confidence ${(confidence * 100).toFixed(0)}% below the ${Math.round(
      MIN_AUTO_APPROVE_CONFIDENCE * 100,
    )}% auto-approve floor — human review required`;
    return { decision: "human_review", reason };
  }

  // 5. Safe writes: auto-approve at "standard"+" only (suggest/low always review).
  if (input.risk === "safe_write") {
    if (level === "suggest" || level === "low") {
      return {
        decision: "human_review",
        reason: `Safe write at autonomy="${level}" still requires human review (policy: review below standard)`,
      };
    }
    return {
      decision: "allow",
      reason: `Safe write within policy band (autonomy=${level})`,
    };
  }

  // 6. Sensitive writes: amount-bounded auto-approval, never at "suggest".
  if (input.risk === "sensitive_write") {
    const limit = SENSITIVE_WRITE_AUTO_LIMITS[level];
    const amount = input.amountMinorUnits ?? 0;

    if (level === "suggest") {
      return {
        decision: "human_review",
        reason: `Sensitive write at autonomy="suggest" — suggestions first, never auto-approve`,
      };
    }

    if (amount <= 0) {
      return {
        decision: "human_review",
        reason:
          "Sensitive write without a monetary amount cannot be auto-approved",
      };
    }

    if (amount <= limit) {
      return {
        decision: "allow",
        reason: `Sensitive write ${amount} ≤ auto-approve limit ${limit} at autonomy="${level}"`,
      };
    }

    return {
      decision: "human_review",
      reason: `Amount ${amount} exceeds the ${limit} auto-approve limit at autonomy="${level}"`,
    };
  }

  // Unknown risk — fail closed (human review), never allow.
  return {
    decision: "human_review",
    reason: `Unclassified risk "${input.risk}" — fail closed to human review`,
  };
}

/**
 * Autonomy level → human-friendly label (for the admin slider UI).
 */
export function autonomyLevelLabel(level: AutonomyLevel): string {
  switch (level) {
    case "suggest":
      return "Suggestions only — agents propose, humans approve everything";
    case "low":
      return "Low autonomy — auto-approve small safe writes only";
    case "standard":
      return "Standard — auto-approve within policy limits, money movement always HITL";
    case "full":
      return "Full (within policy) — widest auto-approve band, hard deny rules still apply";
  }
}
