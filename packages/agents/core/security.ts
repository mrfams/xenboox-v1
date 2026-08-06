import { db, userEntityAccess } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import { getAgentTier, isTaskTypeAllowedForAgent } from "@xenboox/models";

// ─── Agent Tier Definitions ─────────────────────

export type { AgentTierLevel } from "@xenboox/models";
export { getAgentTier, isTaskTypeAllowedForAgent };

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
