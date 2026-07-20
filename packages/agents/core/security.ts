import { db, userEntityAccess } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import type { TaskType } from "./models/types";

// ─── Agent Tier Definitions ─────────────────────

export type AgentTierLevel = "strategic" | "management" | "worker" | "platform";

const AGENT_TIER_MAP: Record<string, AgentTierLevel> = {
  cfo: "strategic",
  controller: "management",
  treasury: "management",
  payroll_manager: "management",
  compliance: "management",
  ledger: "worker",
  ap: "worker",
  ar: "worker",
  asset: "worker",
  inventory: "worker",
  reconciliation: "worker",
  cash: "worker",
  mobile_money: "worker",
  payroll_worker: "worker",
  reporting: "platform",
  document: "platform",
  budget: "platform",
  analytics: "platform",
};

/** Task types that require strategic (tier1) models */
const STRATEGIC_TASKS: TaskType[] = [
  "strategic_planning",
  "financial_analysis",
  "executive_summary",
  "risk_assessment",
];

/** Task types that require management (tier2) models */
const MANAGEMENT_TASKS: TaskType[] = [
  "approval_decision",
  "cash_flow_forecast",
  "compliance_check",
  "reconciliation_review",
];

/** Task types that can use worker (tier3) models */
const WORKER_TASKS: TaskType[] = [
  "invoice_matching",
  "payment_scheduling",
  "journal_posting",
  "cash_reconciliation",
  "tax_calculation",
  "filing_preparation",
  "report_generation",
  "payroll_calculation",
];

/** Task types that can use platform models */
const PLATFORM_TASKS: TaskType[] = [
  "ocr_field_extraction",
  "document_classification",
  "structured_extraction",
  "budget_variance_analysis",
  "anomaly_detection",
];

/** Generic task types anyone can use */
const GENERIC_TASKS: TaskType[] = [
  "chat_response",
  "summarization",
  "translation",
];

// ─── ENTITY-SCOPING GUARD ───────────────────────

export interface EntityAccessCheck {
  hasAccess: boolean;
  role?: string;
  reason?: string;
}

/**
 * Verify that a user (or the system acting on behalf of a user) has access
 * to a specific entity. Fails fast if no entityId is provided.
 */
export async function checkEntityAccess(
  userId: string,
  entityId: string,
): Promise<EntityAccessCheck> {
  if (!entityId) {
    return { hasAccess: false, reason: "entityId is required" };
  }

  const access = await db.query.userEntityAccess.findFirst({
    where: and(
      eq(userEntityAccess.userId, userId),
      eq(userEntityAccess.entityId, entityId),
    ),
  });

  if (!access) {
    return {
      hasAccess: false,
      reason: `User ${userId} does not have access to entity ${entityId}`,
    };
  }

  return { hasAccess: true, role: access.role };
}

/**
 * Validate that an agent name is recognized and has a tier assigned.
 */
export function getAgentTier(agentName: string): AgentTierLevel {
  const tier = AGENT_TIER_MAP[agentName];
  if (!tier) {
    throw new Error(
      `Unknown agent: ${agentName}. Cannot determine security tier.`,
    );
  }
  return tier;
}

/**
 * Check if an agent is allowed to use a specific model task type.
 * Enforces tier-based model access:
 *   - Worker agents cannot use strategic or management models
 *   - Platform agents can only use platform/generic models
 *   - Management agents can use management, worker, and generic models
 *   - Strategic agents (CFO) can use any model
 */
export function isTaskTypeAllowedForAgent(
  agentName: string,
  taskType: TaskType | string,
): { allowed: boolean; reason?: string } {
  const tier = getAgentTier(agentName);
  const tt = taskType as TaskType;

  // Generic tasks are always allowed
  if (GENERIC_TASKS.includes(tt)) {
    return { allowed: true };
  }

  switch (tier) {
    case "strategic":
      // CFO can do anything
      return { allowed: true };

    case "management":
      if (STRATEGIC_TASKS.includes(tt)) {
        return {
          allowed: false,
          reason: `Management agent ${agentName} cannot use strategic task ${taskType}`,
        };
      }
      return { allowed: true };

    case "worker":
      if (STRATEGIC_TASKS.includes(tt) || MANAGEMENT_TASKS.includes(tt)) {
        return {
          allowed: false,
          reason: `Worker agent ${agentName} cannot use strategic or management task ${taskType}`,
        };
      }
      if (!WORKER_TASKS.includes(tt) && !GENERIC_TASKS.includes(tt)) {
        return {
          allowed: false,
          reason: `Worker agent ${agentName} cannot use platform task ${taskType}`,
        };
      }
      return { allowed: true };

    case "platform":
      if (!PLATFORM_TASKS.includes(tt) && !GENERIC_TASKS.includes(tt)) {
        return {
          allowed: false,
          reason: `Platform agent ${agentName} can only use platform/generic tasks, not ${taskType}`,
        };
      }
      return { allowed: true };

    default:
      return { allowed: false, reason: `Unknown agent tier: ${tier}` };
  }
}

// ─── CREDENTIAL VAULT ───────────────────────────

type CredentialType =
  | "anthropic"
  | "openai"
  | "aws"
  | "google"
  | "fireworks"
  | "together"
  | "deepinfra"
  | "openrouter";

export interface CredentialEntry {
  type: CredentialType;
  keyName: string;
  available: boolean;
}

/**
 * Credential Vault — provides information about available service credentials
 * to agents without exposing raw secret values.
 *
 * Agents should NEVER access process.env directly. They use this vault
 * which tells them what's available, but the actual SDK clients are
 * constructed by the ProviderAdapter layer, not by agent code.
 */
export class CredentialVault {
  private credentials: CredentialEntry[] = [];

  constructor() {
    this.scan();
  }

  private scan(): void {
    this.credentials = [
      {
        type: "anthropic",
        keyName: "ANTHROPIC_API_KEY",
        available: !!process.env.ANTHROPIC_API_KEY,
      },
      {
        type: "openai",
        keyName: "OPENAI_API_KEY",
        available: !!process.env.OPENAI_API_KEY,
      },
      {
        type: "aws",
        keyName: "AWS_ACCESS_KEY_ID",
        available: !!process.env.AWS_ACCESS_KEY_ID,
      },
      {
        type: "google",
        keyName: "GOOGLE_AI_API_KEY",
        available: !!process.env.GOOGLE_AI_API_KEY,
      },
      {
        type: "fireworks",
        keyName: "FIREWORKS_API_KEY",
        available: !!process.env.FIREWORKS_API_KEY,
      },
      {
        type: "together",
        keyName: "TOGETHER_API_KEY",
        available: !!process.env.TOGETHER_API_KEY,
      },
      {
        type: "deepinfra",
        keyName: "DEEPINFRA_API_KEY",
        available: !!process.env.DEEPINFRA_API_KEY,
      },
      {
        type: "openrouter",
        keyName: "OPENROUTER_API_KEY",
        available: !!process.env.OPENROUTER_API_KEY,
      },
    ];
  }

  /** Check if a credential type is available (boolean only — no raw values) */
  hasCredential(type: CredentialType): boolean {
    return this.credentials.find((c) => c.type === type)?.available ?? false;
  }

  /** List all available credential types */
  getAvailableCredentials(): CredentialType[] {
    return this.credentials.filter((c) => c.available).map((c) => c.type);
  }

  /** List all credential types (including unavailable) */
  getAllCredentials(): CredentialEntry[] {
    return [...this.credentials];
  }
}

let credentialVault: CredentialVault | null = null;

export function getCredentialVault(): CredentialVault {
  if (!credentialVault) {
    credentialVault = new CredentialVault();
  }
  return credentialVault;
}
