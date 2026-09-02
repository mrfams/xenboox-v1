import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";

/**
 * Report an error to Sentry with context.
 *
 * Adds breadcrumbs, tags, and context so errors are attributable
 * to specific users, entities, and surfaces in production.
 *
 * §4.7 — Every server-side error must reach Sentry for observability.
 */
export function reportToSentry(
  error: unknown,
  context?: {
    /** User ID for attribution */
    userId?: string;
    /** Entity ID for scoping */
    entityId?: string;
    /** Surface or feature name */
    surface?: string;
    /** What the user was trying to do */
    action?: string;
    /** Extra metadata */
    extra?: Record<string, unknown>;
  },
): void {
  // Don't report expected TRPCErrors (NOT_FOUND, BAD_REQUEST, etc.)
  if (error instanceof TRPCError) {
    const code = error.code;
    // Only report unexpected TRPCErrors (500s)
    if (code !== "INTERNAL_SERVER_ERROR") {
      return;
    }
  }

  Sentry.withScope((scope) => {
    if (context?.userId) {
      scope.setTag("userId", context.userId);
    }
    if (context?.entityId) {
      scope.setTag("entityId", context.entityId);
    }
    if (context?.surface) {
      scope.setTag("surface", context.surface);
    }
    if (context?.action) {
      scope.setTag("action", context.action);
    }
    if (context?.extra) {
      for (const [key, value] of Object.entries(context.extra)) {
        scope.setExtra(key, value);
      }
    }

    // Walk the cause chain for nested errors
    const causeChain: string[] = [];
    let cause: unknown =
      error instanceof Error ? (error as any).cause : undefined;
    for (let i = 0; i < 4 && cause !== undefined && cause !== null; i++) {
      causeChain.push(
        typeof cause === "object" && "message" in cause
          ? String((cause as { message: unknown }).message)
          : String(cause),
      );
      cause =
        typeof cause === "object" && "cause" in cause
          ? (cause as { cause?: unknown }).cause
          : undefined;
    }
    if (causeChain.length > 0) {
      scope.setExtra("causeChain", causeChain);
    }

    Sentry.captureException(error);
  });
}

/**
 * Handle errors in mutation try/catch blocks.
 *
 * Re-throws TRPCError instances unchanged (e.g. NOT_FOUND, BAD_REQUEST).
 * Wraps unexpected errors in a generic 500 error.
 * Reports unexpected errors to Sentry.
 *
 * Usage:
 *   try { ... } catch (error) {
 *     handleMutationError(error, "Failed to create invoice");
 *   }
 */
export function handleMutationError(
  error: unknown,
  message: string,
  context?: {
    userId?: string;
    entityId?: string;
    surface?: string;
    action?: string;
  },
): never {
  // Re-throw expected TRPCErrors (NOT_FOUND, BAD_REQUEST, etc.) unchanged
  if (error instanceof TRPCError && error.code !== "INTERNAL_SERVER_ERROR") {
    throw error;
  }

  // Report unexpected errors (including INTERNAL_SERVER_ERROR) to Sentry
  reportToSentry(error, {
    userId: context?.userId,
    entityId: context?.entityId,
    surface: context?.surface,
    action: context?.action ?? message,
  });

  // If it's already an INTERNAL_SERVER_ERROR TRPCError, re-throw it
  if (error instanceof TRPCError) {
    throw error;
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message,
    // Preserve the original error so the errorFormatter's causeMessage
    // logging can surface the real failure instead of hiding it.
    cause: error,
  });
}

/**
 * Capture a message to Sentry (non-error events).
 *
 * Use for operational events that aren't errors but should be tracked:
 * - Agent escalation
 * - Unusual access patterns
 * - Business logic warnings
 */
export function captureSentryMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: {
    userId?: string;
    entityId?: string;
    extra?: Record<string, unknown>;
  },
): void {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (context?.userId) scope.setTag("userId", context.userId);
    if (context?.entityId) scope.setTag("entityId", context.entityId);
    if (context?.extra) {
      for (const [key, value] of Object.entries(context.extra)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureMessage(message, level);
  });
}
