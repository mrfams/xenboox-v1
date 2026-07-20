import { db } from "@xenboox/db";
import { auditLog, securityAuditLog } from "@xenboox/db/schema";
import { TRPCError } from "@trpc/server";

type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "approve"
  | "reject"
  | "submit"
  | "review"
  | "login"
  | "logout"
  | "password_reset"
  | "mfa_enable"
  | "mfa_disable"
  | "export"
  | "import"
  | "download"
  | "invite"
  | "revoke"
  | "role_change"
  | "agent_action"
  | "agent_escalation"
  | "model_switch";

type SecurityEventType =
  | "access"
  | "modification"
  | "encryption"
  | "decryption"
  | "permission_change"
  | "role_change"
  | "entity_access_change"
  | "api_key_created"
  | "api_key_revoked"
  | "failed_login"
  | "account_locked"
  | "account_unlocked"
  | "tos_acceptance"
  | "tos_rejection";

export interface CreateAuditEntryParams {
  entityId: string;
  userId: string;
  action: AuditAction | string;
  entityType: string;
  entityIdRef?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  confidence?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateSecurityAuditEntryParams {
  entityId: string;
  eventType: SecurityEventType | string;
  userId?: string;
  resourceType: string;
  resourceId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  failureReason?: string;
}

export async function createAuditEntry(
  params: CreateAuditEntryParams,
): Promise<void> {
  await db.insert(auditLog).values({
    entityId: params.entityId,
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityIdRef: params.entityIdRef,
    oldValues: params.oldValues ?? undefined,
    newValues: params.newValues ?? undefined,
    confidence: params.confidence ? String(params.confidence) : undefined,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

export async function createSecurityAuditEntry(
  params: CreateSecurityAuditEntryParams,
): Promise<void> {
  await db.insert(securityAuditLog).values({
    entityId: params.entityId,
    eventType: params.eventType,
    userId: params.userId,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    oldValue: params.oldValue ?? undefined,
    newValue: params.newValue ?? undefined,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: params.success ?? true,
    failureReason: params.failureReason,
  });
}

/**
 * Wraps a tRPC mutation to automatically capture IP + user agent for audit entries.
 * Use this when you need to thread request metadata into audit logging without
 * manually extracting headers in every handler.
 *
 * Usage:
 *   auditMiddleware(async ({ ctx, next, audit }) => {
 *     const result = await next({ ctx })
 *     await audit("update", "invoice", invoiceId, oldValues, newValues)
 *     return result
 *   })
 */
export function auditMiddleware(
  handler: (opts: {
    ctx: {
      entityId: string;
      session: { user: { id: string } };
      headers?: Record<string, string>;
    };
    next: <T>(opts: { ctx: unknown }) => Promise<T>;
    audit: (
      action: AuditAction | string,
      entityType: string,
      entityIdRef?: string,
      oldValues?: Record<string, unknown> | null,
      newValues?: Record<string, unknown> | null,
      confidence?: number,
    ) => Promise<void>;
    securityAudit: (
      eventType: SecurityEventType | string,
      resourceType: string,
      resourceId: string,
      oldValue?: Record<string, unknown> | null,
      newValue?: Record<string, unknown> | null,
      success?: boolean,
      failureReason?: string,
    ) => Promise<void>;
  }) => Promise<unknown>,
) {
  return async (opts: {
    ctx: {
      entityId: string;
      session: { user?: { id?: string } };
      headers?: Record<string, string>;
    };
    next: <T>(opts: { ctx: unknown }) => Promise<T>;
  }) => {
    const ipAddress =
      opts.ctx.headers?.["x-forwarded-for"] ?? opts.ctx.headers?.["x-real-ip"];
    const userAgent = opts.ctx.headers?.["user-agent"];
    const userId = opts.ctx.session?.user?.id ?? "unknown";
    const entityId = opts.ctx.entityId;

    const audit = async (
      action: string,
      entityType: string,
      entityIdRef?: string,
      oldValues?: Record<string, unknown> | null,
      newValues?: Record<string, unknown> | null,
      confidence?: number,
    ) => {
      await createAuditEntry({
        entityId,
        userId,
        action,
        entityType,
        entityIdRef,
        oldValues,
        newValues,
        confidence,
        ipAddress,
        userAgent,
      });
    };

    const securityAudit = async (
      eventType: string,
      resourceType: string,
      resourceId: string,
      oldValue?: Record<string, unknown> | null,
      newValue?: Record<string, unknown> | null,
      success?: boolean,
      failureReason?: string,
    ) => {
      await createSecurityAuditEntry({
        entityId,
        eventType,
        userId,
        resourceType,
        resourceId,
        oldValue,
        newValue,
        ipAddress,
        userAgent,
        success,
        failureReason,
      });
    };

    return handler({
      ctx: opts.ctx as never,
      next: opts.next as never,
      audit,
      securityAudit,
    });
  };
}
