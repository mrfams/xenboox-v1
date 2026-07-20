import { z } from "zod";

export type AgentTier = "tier1" | "tier2" | "tier3" | "platform";

export const EscalationType = z.enum(["notify", "flag", "block", "none"]);
export type EscalationType = z.infer<typeof EscalationType>;

export const ConfidenceSignalSchema = z.object({
  signal: z.enum([
    "precedent_match",
    "data_completeness",
    "rule_conflicts",
    "model_self_assessment",
    "extraction_quality",
    "amount_exactness",
    "date_proximity",
    "reference_similarity",
    "timing_difference_classification",
    "categorization_plausibility",
    "close_readiness",
    "retirement_match",
    "po_match",
    "payment_match",
    "donor_attribution",
    "instruction_interpretation",
    "custom_report_interpretation",
    "narrative_grounding",
    "treasury_position",
    "cash_flow_projection",
    "reconciliation_level",
    "classification_confidence",
  ]),
  value: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
});
export type ConfidenceSignal = z.infer<typeof ConfidenceSignalSchema>;

export const CompositeConfidenceSchema = z.object({
  overall: z.number().min(0).max(1),
  signals: z.array(ConfidenceSignalSchema),
  dominant: z.string(),
  calibrationBias: z.number().optional(),
});
export type CompositeConfidence = z.infer<typeof CompositeConfidenceSchema>;

export interface EscalationDecision {
  action: "proceed" | "flag" | "hold" | "escalate_immediate";
  target: string | null;
  type: EscalationType;
  reason: string;
  blocksExecution: boolean;
}

export interface EscalationConfig {
  autoProceedThreshold: number;
  flagThreshold: number;
  holdThreshold: number;
  hardOverrideMaterialAmount?: number;
  entityCurrency?: string;
}

export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  autoProceedThreshold: 0.9,
  flagThreshold: 0.75,
  holdThreshold: 0.5,
};

const ESCALATION_THRESHOLDS: Record<AgentTier, EscalationConfig> = {
  tier1: { autoProceedThreshold: 0.85, flagThreshold: 0.7, holdThreshold: 0.5 },
  tier2: { autoProceedThreshold: 0.9, flagThreshold: 0.75, holdThreshold: 0.5 },
  tier3: { autoProceedThreshold: 0.9, flagThreshold: 0.75, holdThreshold: 0.5 },
  platform: {
    autoProceedThreshold: 0.85,
    flagThreshold: 0.7,
    holdThreshold: 0.5,
  },
};

export function computeCompositeConfidence(
  signals: Omit<ConfidenceSignal, "weight">[],
  weights?: Record<string, number>,
): CompositeConfidence {
  const finalSignals: ConfidenceSignal[] = signals.map((s) => ({
    ...s,
    weight: weights?.[s.signal] ?? 0.5,
  }));

  const totalWeight = finalSignals.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) {
    return { overall: 0, signals: finalSignals, dominant: "none" };
  }

  const weighted = finalSignals.reduce((sum, s) => sum + s.value * s.weight, 0);
  const overall = Math.round((weighted / totalWeight) * 100) / 100;

  const dominant = finalSignals.reduce((best, s) =>
    s.value < best.value ? s : best,
  ).signal;

  return {
    overall: Math.min(1, Math.max(0, overall)),
    signals: finalSignals,
    dominant,
  };
}

export function computePrecedentMatch(
  historicalPatterns: Array<{ input: string; output: string }>,
  currentInput: string,
): number {
  if (historicalPatterns.length === 0) return 0.5;
  const matches = historicalPatterns.filter(
    (p) => similarity(p.input, currentInput) > 0.8,
  );
  return matches.length > 0 ? Math.min(0.95, 0.7 + matches.length * 0.05) : 0.4;
}

export function computeDataCompleteness(
  fields: Record<string, unknown>,
  requiredFields: string[],
): number {
  if (requiredFields.length === 0) return 1;
  const present = requiredFields.filter(
    (f) => fields[f] !== undefined && fields[f] !== null && fields[f] !== "",
  ).length;
  return present / requiredFields.length;
}

export function computeAmountExactness(
  expected: number,
  actual: number,
): number {
  if (expected === 0 && actual === 0) return 1;
  if (expected === 0) return 0;
  const ratio = Math.abs(actual / expected);
  if (Math.abs(ratio - 1) <= 0.001) return 1;
  if (Math.abs(ratio - 1) <= 0.01) return 0.95;
  if (Math.abs(ratio - 1) <= 0.05) return 0.85;
  if (Math.abs(ratio - 1) <= 0.1) return 0.7;
  return 0.3;
}

export function computeDateProximity(
  date1: string,
  date2: string,
  maxDays: number = 3,
): number {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);

  if (diffDays === 0) return 1;
  if (diffDays <= 1) return 0.95;
  if (diffDays <= maxDays) return Math.max(0.5, 1 - diffDays / (maxDays * 2));
  return 0.2;
}

export function computeReferenceSimilarity(ref1: string, ref2: string): number {
  return similarity(ref1.toLowerCase().trim(), ref2.toLowerCase().trim());
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.substring(i, i + 2);
    bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
  }
  let intersectionSize = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2);
    const count = bigrams.get(bigram) ?? 0;
    if (count > 0) {
      bigrams.set(bigram, count - 1);
      intersectionSize++;
    }
  }
  const unionSize = a.length + b.length - 2;
  return unionSize > 0 ? (2 * intersectionSize) / unionSize : 0;
}

export function makeEscalationDecision(
  confidence: number,
  tier: AgentTier,
  config?: Partial<EscalationConfig>,
): EscalationDecision {
  const cfg = { ...ESCALATION_THRESHOLDS[tier], ...config };

  if (confidence < 0.5) {
    return {
      action: "escalate_immediate",
      target: getEscalationTarget(tier, true),
      type: "block",
      reason: `Confidence ${confidence.toFixed(2)} below immediate escalation threshold (0.5)`,
      blocksExecution: true,
    };
  }
  if (confidence < cfg.holdThreshold) {
    return {
      action: "hold",
      target: getEscalationTarget(tier, false),
      type: "block",
      reason: `Confidence ${confidence.toFixed(2)} below hold threshold (${cfg.holdThreshold})`,
      blocksExecution: true,
    };
  }
  if (confidence < cfg.flagThreshold) {
    return {
      action: "flag",
      target: getEscalationTarget(tier, false),
      type: "flag",
      reason: `Confidence ${confidence.toFixed(2)} below flag threshold (${cfg.flagThreshold})`,
      blocksExecution: false,
    };
  }
  if (confidence < cfg.autoProceedThreshold) {
    return {
      action: "flag",
      target: getEscalationTarget(tier, false),
      type: "notify",
      reason: `Confidence ${confidence.toFixed(2)} below auto-proceed threshold (${cfg.autoProceedThreshold})`,
      blocksExecution: false,
    };
  }
  return {
    action: "proceed",
    target: null,
    type: "none",
    reason: "Confidence above auto-proceed threshold",
    blocksExecution: false,
  };
}

function getEscalationTarget(tier: AgentTier, immediate: boolean): string {
  if (immediate) {
    return tier === "tier3"
      ? "controller-agent"
      : tier === "tier2"
        ? "cfo-agent"
        : "human";
  }
  switch (tier) {
    case "tier3":
      return "controller-agent";
    case "tier2":
      return "cfo-agent";
    case "tier1":
      return "human";
    case "platform":
      return "cfo-agent";
  }
}

export function checkMaterialAmountOverride(
  amount: number,
  currency: string,
  materialThreshold: number,
): { triggered: boolean; reason: string } {
  if (amount >= materialThreshold) {
    return {
      triggered: true,
      reason: `Amount ${currency} ${amount.toFixed(2)} exceeds material threshold ${currency} ${materialThreshold.toFixed(2)} — mandatory human approval required`,
    };
  }
  return { triggered: false, reason: "" };
}

export function detectConflictingOutputs(
  outputs: Array<{
    agentId: string;
    confidence: number;
    result: unknown;
  }>,
): {
  hasConflict: boolean;
  conflictingAgents: string[];
  description: string;
} {
  if (outputs.length < 2) {
    return { hasConflict: false, conflictingAgents: [], description: "" };
  }

  const conflictingAgents: string[] = [];
  for (let i = 0; i < outputs.length; i++) {
    for (let j = i + 1; j < outputs.length; j++) {
      const a = JSON.stringify(outputs[i].result);
      const b = JSON.stringify(outputs[j].result);
      if (a !== b) {
        conflictingAgents.push(outputs[i].agentId, outputs[j].agentId);
      }
    }
  }

  const unique = [...new Set(conflictingAgents)];
  return {
    hasConflict: unique.length > 0,
    conflictingAgents: unique,
    description:
      unique.length > 0
        ? `Conflicting outputs between: ${unique.join(", ")}`
        : "",
  };
}

export function computeCalibrationScore(
  predictions: Array<{ stated: number; correct: boolean }>,
): number {
  if (predictions.length < 5) return 0.5;
  const buckets = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  let totalError = 0;
  let bucketCount = 0;

  for (let i = 0; i < buckets.length - 1; i++) {
    const lower = buckets[i];
    const upper = buckets[i + 1];
    const inBucket = predictions.filter(
      (p) => p.stated >= lower && p.stated < upper,
    );
    if (inBucket.length < 2) continue;

    const accuracy = inBucket.filter((p) => p.correct).length / inBucket.length;
    const midPoint = (lower + upper) / 2;
    totalError += Math.abs(accuracy - midPoint);
    bucketCount++;
  }

  const calibrationError = bucketCount > 0 ? totalError / bucketCount : 0.5;
  return Math.max(0, 1 - calibrationError);
}
