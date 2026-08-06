/**
 * Tool Executor — Enforces grants and executes tools.
 *
 * The tool executor is the single entry point for all tool calls.
 * It:
 * 1. Checks the grant table (default deny)
 * 2. Validates input against the zod schema
 * 3. Executes the tool with entity-scoped context
 * 4. Logs to audit trail and LangFuse
 * 5. Returns structured results
 *
 * Design:
 * - Non-blocking: catches and warns on failure (never crashes the agent)
 * - Entity-scoped: every execution carries entityId
 * - Audit-logged: every call is traced
 * - Grant-enforced: default deny, explicit allow only
 */

import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import { toolGrants, auditLog, agentActivity } from "@xenboox/db/schema";
import { getTool, getRegistryStats } from "./tool-registry";
import type {
  ToolExecutionContext,
  ToolResult,
  ToolCallResult,
} from "./tool-contract";
import { DEFAULT_AGENT_TOOL_CONFIGS } from "./tool-contract";

// ─── Grant Checking ────────────────────────────────────────────────────────

/**
 * Check if an agent has a grant to use a specific tool.
 * Checks entity-level grants first, then falls back to default config.
 */
export async function checkGrant(
  entityId: string,
  agentName: string,
  toolName: string,
): Promise<{ allowed: boolean; grantFound: boolean }> {
  // 1. Check entity-level grants in DB
  const entityGrant = await db.query.toolGrants.findFirst({
    where: and(
      eq(toolGrants.entityId, entityId),
      eq(toolGrants.agentName, agentName),
      eq(toolGrants.toolName, toolName),
      eq(toolGrants.isActive, true),
    ),
  });

  if (entityGrant) {
    return { allowed: true, grantFound: true };
  }

  // 2. Fall back to default agent config
  const config =
    DEFAULT_AGENT_TOOL_CONFIGS[agentName] ??
    DEFAULT_AGENT_TOOL_CONFIGS._default;

  if (config.allowedTools.includes(toolName)) {
    return { allowed: true, grantFound: false };
  }

  // 3. Default deny
  return { allowed: false, grantFound: false };
}

/**
 * Get all grants for an agent (for debugging/admin UI).
 */
export async function getAgentGrants(
  entityId: string,
  agentName: string,
): Promise<
  Array<{
    toolName: string;
    action: string;
    isActive: boolean;
    grantedBy: string;
  }>
> {
  const grants = await db.query.toolGrants.findMany({
    where: and(
      eq(toolGrants.entityId, entityId),
      eq(toolGrants.agentName, agentName),
      eq(toolGrants.isActive, true),
    ),
  });

  return grants.map((g) => ({
    toolName: g.toolName,
    action: g.action,
    isActive: g.isActive,
    grantedBy: g.grantedBy,
  }));
}

// ─── Tool Execution ────────────────────────────────────────────────────────

/**
 * Execute a single tool call with grant enforcement and audit logging.
 *
 * @param toolName - Name of the tool to execute
 * @param args - Arguments to pass to the tool
 * @param ctx - Execution context (entityId, agentName, userId, traceId)
 * @returns ToolCallResult with success/failure, data, and audit metadata
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolExecutionContext,
): Promise<ToolCallResult> {
  const startTime = Date.now();

  // 1. Look up tool in registry
  const tool = getTool(toolName);
  if (!tool) {
    return {
      toolName,
      args,
      result: {
        success: false,
        error: `Tool "${toolName}" not found in registry`,
        confidence: 0,
      },
      durationMs: Date.now() - startTime,
      grantFound: false,
      allowed: false,
    };
  }

  // 2. Check grant
  const { allowed, grantFound } = await checkGrant(
    ctx.entityId,
    ctx.agentName,
    toolName,
  );

  if (!allowed) {
    // Log the denied attempt
    await logDeniedToolCall(ctx, toolName, args);

    return {
      toolName,
      args,
      result: {
        success: false,
        error: `Access denied: agent "${ctx.agentName}" does not have a grant for tool "${toolName}"`,
        confidence: 0,
      },
      durationMs: Date.now() - startTime,
      grantFound,
      allowed: false,
    };
  }

  // 3. Validate input with zod schema
  let validatedInput: unknown;
  try {
    validatedInput = tool.inputSchema.parse(args);
  } catch (error) {
    return {
      toolName,
      args,
      result: {
        success: false,
        error: `Input validation failed: ${error instanceof Error ? error.message : String(error)}`,
        confidence: 0,
      },
      durationMs: Date.now() - startTime,
      grantFound,
      allowed: true,
    };
  }

  // 4. Execute the tool
  let result: ToolResult;
  try {
    result = await tool.execute(validatedInput, ctx);
  } catch (error) {
    result = {
      success: false,
      error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
      confidence: 0,
    };
  }

  const durationMs = Date.now() - startTime;

  // 5. Log to audit trail
  await logToolExecution(ctx, toolName, args, result, durationMs);

  return {
    toolName,
    args,
    result,
    durationMs,
    grantFound,
    allowed: true,
  };
}

/**
 * Execute multiple tool calls in sequence (for the agent execution loop).
 * Stops on first failure if stopOnError is true.
 */
export async function executeToolCalls(
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>,
  ctx: ToolExecutionContext,
  stopOnError = false,
): Promise<ToolCallResult[]> {
  const results: ToolCallResult[] = [];

  for (const tc of toolCalls) {
    const result = await executeTool(tc.name, tc.arguments, ctx);
    results.push(result);

    if (stopOnError && !result.result.success) {
      break;
    }
  }

  return results;
}

// ─── Audit Logging ─────────────────────────────────────────────────────────

async function logToolExecution(
  ctx: ToolExecutionContext,
  toolName: string,
  args: Record<string, unknown>,
  result: ToolResult,
  durationMs: number,
): Promise<void> {
  try {
    // Audit log
    await db.insert(auditLog).values({
      entityId: ctx.entityId,
      userId: ctx.userId,
      action: `tool.${toolName}.${result.success ? "success" : "failure"}`,
      entityType: "tool_execution",
      entityIdRef: ctx.traceId,
      newValues: {
        toolName,
        agentName: ctx.agentName,
        args,
        success: result.success,
        error: result.error,
        confidence: result.confidence,
        durationMs,
      },
      confidence: result.confidence ? String(result.confidence) : undefined,
    });

    // Agent activity
    await db.insert(agentActivity).values({
      entityId: ctx.entityId,
      agentName: ctx.agentName,
      action: `tool_${toolName}`,
      input: args,
      output: (result.data as Record<string, unknown>) ?? {
        error: result.error,
      },
      confidence: result.confidence ? String(result.confidence) : undefined,
      durationMs,
      status: result.success ? "success" : "failed",
      errorMessage: result.error,
    });
  } catch {
    // Non-blocking: don't crash the agent if audit logging fails
    console.warn(`[tool-executor] Failed to log tool execution: ${toolName}`);
  }
}

async function logDeniedToolCall(
  ctx: ToolExecutionContext,
  toolName: string,
  args: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      entityId: ctx.entityId,
      userId: ctx.userId,
      action: `tool.${toolName}.denied`,
      entityType: "tool_execution",
      newValues: {
        toolName,
        agentName: ctx.agentName,
        args,
        reason: "grant_denied",
      },
    });
  } catch {
    console.warn(`[tool-executor] Failed to log denied tool call: ${toolName}`);
  }
}

// ─── Helper: Build tool list for callModel ─────────────────────────────────

/**
 * Get the tools an agent can use, in the format expected by callModel.
 * Used by the agent runtime to build the tool list for each LLM call.
 */
export function getAgentToolsForCallModel(agentName: string): Array<{
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}> {
  const { getTool, getAllTools } = require("./tool-registry");
  const config =
    DEFAULT_AGENT_TOOL_CONFIGS[agentName] ??
    DEFAULT_AGENT_TOOL_CONFIGS._default;

  return config.allowedTools
    .map((name: string) => getTool(name))
    .filter(Boolean)
    .map((tool: any) => {
      // Convert zod schema to JSON Schema for callModel
      const zodShape = (tool.inputSchema as any).shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, schema] of Object.entries(zodShape)) {
        const isOptional = (schema as any)._def?.typeName === "ZodOptional";
        const innerSchema = isOptional
          ? (schema as any)._def.innerType
          : schema;

        properties[key] = {
          type:
            innerSchema._def?.typeName === "ZodString"
              ? "string"
              : innerSchema._def?.typeName === "ZodNumber"
                ? "number"
                : innerSchema._def?.typeName === "ZodBoolean"
                  ? "boolean"
                  : "string",
          description: (schema as any)._def?.description ?? key,
        };

        if (!isOptional) {
          required.push(key);
        }
      }

      return {
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: "object",
          properties,
          required,
        },
      };
    });
}
