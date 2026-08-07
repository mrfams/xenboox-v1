import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { conversations, chatMessages } from "@xenboox/db/schema";
import { processChatInput } from "@xenboox/agents";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getRateLimiter } from "@/lib/security/rate-limiter";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { message, conversationId, entityId, files } = body;

  if (!message || !entityId) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get entity info for the pipeline
  const entity = await db.query.entities.findFirst({
    where: (entities: any, { eq }: any) => eq(entities.id, entityId),
    columns: { id: true, name: true, currency: true, organizationId: true },
  });

  if (!entity) {
    return new Response(JSON.stringify({ error: "Entity not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limit: 30 chat messages per minute per user (in-memory fallback when
  // no Upstash Redis is configured — deterministic per-instance)
  const rate = await getRateLimiter().checkChatStreamRateLimit(
    `chat:${userId}`,
  );
  if (!rate.success) {
    return new Response(
      JSON.stringify({
        error:
          "Rate limit exceeded. Please wait a moment before sending another message.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(
            Math.max(1, rate.reset - Math.floor(Date.now() / 1000)),
          ),
          "X-RateLimit-Limit": rate.limit.toString(),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // Create or get conversation
  let convId = conversationId;
  if (!convId) {
    const [conv] = await db
      .insert(conversations)
      .values({
        entityId,
        userId: session.user.id!,
        title: message.slice(0, 80),
      })
      .returning();
    convId = conv.id;
  } // Save user message
  await db
    .insert(chatMessages)
    .values({
      conversationId: convId,
      role: "user",
      content: message,
      status: "completed",
    })
    .returning();

  // Build file context if files were uploaded
  let fileContext = "";
  if (files && Array.isArray(files) && files.length > 0) {
    const fileDescriptions = files
      .map(
        (f: any) =>
          `[Attached: ${f.name || "file"} (${f.type || "unknown"}, doc:${f.documentId || "pending"})]`,
      )
      .join("\n");
    fileContext = `\n\nUser uploaded files:\n${fileDescriptions}`;
  }

  // Insert a pending assistant message row (status: streaming) so the UI can
  // render a typing indicator tied to a real DB row, survive reconnects, and
  // be marked completed/failed when the pipeline finishes.
  const [pendingAssistant] = await db
    .insert(chatMessages)
    .values({
      conversationId: convId,
      role: "assistant",
      content: "",
      status: "streaming",
    })
    .returning();

  // Create streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send conversation ID first
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "conversation", conversationId: convId })}\n\n`,
          ),
        );

        // Emit thinking indicator
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "agent_activity", agent: "CFO Agent", status: "started", action: "Processing your request" })}\n\n`,
          ),
        );

        // Invoke the real CFO pipeline
        const fullMessage = message + fileContext;

        // Stream tool events as they happen
        const toolEvents: Array<{
          type: string;
          toolName?: string;
          args?: Record<string, unknown>;
          success?: boolean;
          data?: unknown;
        }> = [];

        const pipelineResult = await processChatInput({
          userId,
          orgId: entity.organizationId,
          entityId,
          entityName: entity.name,
          currency: entity.currency || "GMD",
          message: fullMessage,
          conversationId: convId,
          channel: "web_chat",
          onToolCall: (toolName, args) => {
            const event = { type: "tool_call", toolName, args };
            toolEvents.push(event);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "tool_call",
                  toolName,
                  args,
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            );
          },
          onToolResult: (toolName, success, data) => {
            const event = { type: "tool_result", toolName, success, data };
            toolEvents.push(event);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "tool_result",
                  toolName,
                  success,
                  data: success ? data : undefined,
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            );
          },
        });

        // Emit agent activity event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "agent_activity",
              agent: "CFO Agent",
              status: "completed",
              action: "Response generated",
              confidence: Math.round(pipelineResult.confidence * 100),
              durationMs: pipelineResult.durationMs,
            })}\n\n`,
          ),
        );

        // Emit delegation events if agents were involved
        if (pipelineResult.agentId && pipelineResult.agentId !== "cfo") {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "delegation",
                from: "CFO Agent",
                to: pipelineResult.agentId,
                reason: `Delegated to ${pipelineResult.agentId} for specialized processing`,
              })}\n\n`,
            ),
          );
        }

        // Emit approval needed if escalation
        if (
          pipelineResult.escalationItems &&
          pipelineResult.escalationItems.length > 0
        ) {
          for (const item of pipelineResult.escalationItems) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "approval_needed",
                  title: item.what || "Approval Required",
                  description:
                    item.why ||
                    item.recommendedAction ||
                    "This action requires your approval",
                  amount: item.amount
                    ? `GMD ${item.amount.toLocaleString()}`
                    : undefined,
                })}\n\n`,
              ),
            );
          }
        }

        // Stream the response text token-by-token for natural feel
        const response = pipelineResult.response;
        const words = response.split(/(\s+)/);
        for (const word of words) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "token", content: word })}\n\n`,
            ),
          );
          // Small delay for natural streaming feel
          await new Promise((resolve) => setTimeout(resolve, 15));
        }

        // Save complete AI response with tool calls and citations
        const toolCallsForMessage = toolEvents
          .filter(
            (
              e,
            ): e is {
              type: "tool_result";
              toolName: string;
              success: boolean;
              args?: Record<string, unknown>;
              data?: unknown;
            } => e.type === "tool_result" && !!e.toolName && !!e.success,
          )
          .map((e) => ({
            toolName: e.toolName,
            args: e.args ?? {},
            success: e.success,
            result: e.data,
          }));

        // Complete the pending assistant message with the real response
        await db
          .update(chatMessages)
          .set({
            content: response,
            status: "completed",
            confidence: pipelineResult.confidence,
            agentModel: `cfo-pipeline-v1 (${pipelineResult.agentId})`,
            toolCalls:
              toolCallsForMessage.length > 0 ? toolCallsForMessage : undefined,
            metadata: JSON.stringify({
              durationMs: pipelineResult.durationMs,
              decision: pipelineResult.decision,
              agentsInvolved: [pipelineResult.agentId],
              toolCallsCount: toolCallsForMessage.length,
            }),
          })
          .where(eq(chatMessages.id, pendingAssistant.id));

        // Emit done event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              messageId: pendingAssistant.id,
              confidence: Math.round(pipelineResult.confidence * 100),
              agentsInvolved: [pipelineResult.agentId],
              durationMs: pipelineResult.durationMs,
            })}\n\n`,
          ),
        );

        controller.close();
      } catch (error) {
        console.error("Streaming error:", error);
        // Mark the pending assistant message as failed so it never shows as
        // completed in history
        await db
          .update(chatMessages)
          .set({
            content:
              error instanceof Error
                ? `⚠️ Request failed: ${error.message}`
                : "⚠️ Request failed",
            status: "failed",
          })
          .where(eq(chatMessages.id, pendingAssistant.id))
          .catch(() => {});

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              code: "PIPELINE_ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to process request",
            })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
