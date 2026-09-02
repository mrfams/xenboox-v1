/**
 * Agent-level Sentry helper.
 *
 * Reports agent failures to Sentry with full context: agent name, tier,
 * confidence, entity, task type. This ensures agent errors are visible
 * in production dashboards alongside tRPC and frontend errors.
 *
 * §4.7 — Every agent action must be observable.
 */

// Dynamic import to avoid bundling @sentry/nextjs in agent package
// (agents run in Node.js, not browser). The SDK works the same way
// server-side — init() in sentry.server.config.ts handles it.
let sentryModule: typeof import("@sentry/nextjs") | null = null;

async function getSentry() {
  if (!sentryModule) {
    try {
      sentryModule = await import("@sentry/nextjs");
    } catch {
      // Sentry not available — graceful degradation
      return null;
    }
  }
  return sentryModule;
}

export type AgentErrorContext = {
  /** Agent identifier (e.g. "cfo_agent", "ledger_agent") */
  agentId: string;
  /** Agent display name */
  agentName?: string;
  /** Agent tier (1, 2, 3, or "platform") */
  tier?: string;
  /** Confidence score at time of error */
  confidence?: number;
  /** Entity ID */
  entityId: string;
  /** Task type that was being processed */
  taskType?: string;
  /** What the agent was trying to do */
  action?: string;
};

/**
 * Report an agent error to Sentry with full context.
 *
 * @param error - The caught error
 * @param context - Agent-specific context for debugging
 */
export async function reportAgentError(
  error: unknown,
  context: AgentErrorContext,
): Promise<void> {
  const Sentry = await getSentry();
  if (!Sentry) return;

  Sentry.withScope((scope) => {
    // Tags for filtering in Sentry dashboard
    scope.setTag("agentId", context.agentId);
    scope.setTag("tier", context.tier ?? "unknown");
    scope.setTag("entityId", context.entityId);
    scope.setTag("errorSource", "agent");

    // Extra context for debugging
    scope.setExtra("agentName", context.agentName ?? context.agentId);
    scope.setExtra("taskType", context.taskType);
    scope.setExtra("confidence", context.confidence);
    scope.setExtra("action", context.action);

    // Walk cause chain
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
 * Add a breadcrumb for agent activity tracking.
 *
 * @param message - What happened
 * @param agentId - Which agent
 * @param entityId - Which entity
 */
export async function addAgentBreadcrumb(
  message: string,
  agentId: string,
  entityId: string,
): Promise<void> {
  const Sentry = await getSentry();
  if (!Sentry) return;

  Sentry.addBreadcrumb({
    category: "agent",
    message,
    level: "info",
    data: { agentId, entityId },
  });
}
