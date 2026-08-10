import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { conversations, chatMessages } from "@xenboox/db/schema";
import { processChatInput } from "@xenboox/agents";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getRateLimiter } from "@/lib/security/rate-limiter";
import { generateConversationTitle } from "@/lib/chat/conversation-title";
import { generateConversationSummary } from "@/lib/chat/conversation-summary";
import { generateChatArtifacts } from "@/lib/chat/artifact-service";

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

  // One-line snippet for the /chat panel, derived from this message. Computed
  // once and reused by the create insert and the exchange update below.
  const summary = generateConversationSummary(message) ?? undefined;

  // Create or get conversation. New conversations get a short, readable name
  // derived from the first message (not the raw 80-char fragment) plus the
  // summary.
  let convId = conversationId;
  if (!convId) {
    const [conv] = await db
      .insert(conversations)
      .values({
        entityId,
        userId: session.user.id!,
        title: generateConversationTitle(message),
        summary,
      })
      .returning();
    convId = conv.id;
  }

  // Save user message
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

  // Keep the conversation panel accurate. The stream route is also used by
  // the dashboard inline chat, so a conversation started (or continued) here
  // must surface in /dashboard/chat with a real timestamp and message count
  // — otherwise it sinks to the bottom of the panel with "0 messages".
  const [convRow] = await db
    .select({
      title: conversations.title,
    })
    .from(conversations)
    .where(eq(conversations.id, convId))
    .limit(1);

  // The name shown to the client (and persisted above). Follow-ups keep the
  // existing title; a conversation created without one falls back to a
  // generated name from this message.
  const conversationTitle =
    convRow?.title ?? generateConversationTitle(message);

  // Bump the message count with an atomic SQL increment rather than a
  // read-modify-write: two tabs streaming to the same thread concurrently
  // could otherwise both read the same count and lose an increment.
  // The summary is refreshed from the latest user message so the /chat
  // panel shows where the thread is now.
  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      messageCount: sql`coalesce(${conversations.messageCount}, 0) + 2`,
      summary,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, convId));

  // Create streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Tracks a client disconnect (user exits the dashboard chat / navigates
      // away). We stop streaming to the closed connection immediately, but
      // still let the pipeline finish so the conversation is saved whole for
      // later use in /dashboard/chat.
      let aborted = req.signal.aborted;
      const onAbort = () => {
        aborted = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", onAbort, { once: true });

      const enqueue = (payload: unknown) => {
        if (aborted) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        } catch {
          // connection already closed — ignore
        }
      };

      try {
        // Send conversation ID first (with its name for immediate display)
        enqueue({
          type: "conversation",
          conversationId: convId,
          title: conversationTitle,
        });

        // Emit thinking indicator
        enqueue({
          type: "agent_activity",
          agent: "CFO Agent",
          status: "started",
          action: "Processing your request",
        });

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
            enqueue({
              type: "tool_call",
              toolName,
              args,
              timestamp: new Date().toISOString(),
            });
          },
          onToolResult: (toolName, success, data) => {
            const event = { type: "tool_result", toolName, success, data };
            toolEvents.push(event);
            enqueue({
              type: "tool_result",
              toolName,
              success,
              data: success ? data : undefined,
              timestamp: new Date().toISOString(),
            });
          },
        });

        // If the user asked for a document/file, generate it from real ledger
        // data while the response streams. The resulting artifact is presented
        // in the conversation as a clickable card (ChatGPT/Claude style).
        // Gated on the pipeline actually accepting the request — a rejected
        // or refused turn must not produce a file from the same data.
        const artifactsPromise =
          pipelineResult.decision === "rejected"
            ? Promise.resolve([])
            : generateChatArtifacts({
                entityId,
                entityName: entity.name,
                currency: entity.currency || "GMD",
                userId,
                message,
              });

        // Emit agent activity event
        enqueue({
          type: "agent_activity",
          agent: "CFO Agent",
          status: "completed",
          action: "Response generated",
          confidence: Math.round(pipelineResult.confidence * 100),
          durationMs: pipelineResult.durationMs,
        });

        // Emit delegation events if agents were involved
        if (pipelineResult.agentId && pipelineResult.agentId !== "cfo") {
          enqueue({
            type: "delegation",
            from: "CFO Agent",
            to: pipelineResult.agentId,
            reason: `Delegated to ${pipelineResult.agentId} for specialized processing`,
          });
        }

        // Emit approval needed if escalation
        if (
          pipelineResult.escalationItems &&
          pipelineResult.escalationItems.length > 0
        ) {
          for (const item of pipelineResult.escalationItems) {
            enqueue({
              type: "approval_needed",
              title: item.what || "Approval Required",
              description:
                item.why ||
                item.recommendedAction ||
                "This action requires your approval",
              amount: item.amount
                ? `GMD ${item.amount.toLocaleString()}`
                : undefined,
            });
          }
        }

        // Stream the response text token-by-token for natural feel
        const response = pipelineResult.response;
        const words = response.split(/(\s+)/);
        for (const word of words) {
          if (aborted) break;
          enqueue({ type: "token", content: word });
          // Small delay for natural streaming feel
          await new Promise((resolve) => setTimeout(resolve, 15));
        }

        // Present generated documents in the conversation once the text is out.
        const artifacts = await artifactsPromise;
        for (const artifact of artifacts) {
          enqueue({
            type: "document_created",
            artifactId: artifact.artifactId,
            name: artifact.name,
            docType: artifact.docType,
            mimeType: artifact.mimeType,
            sizeBytes: artifact.sizeBytes,
          });
        }

        // Save complete AI response with tool calls and citations — even when
        // the client left mid-stream, so the conversation is fully usable
        // later in /dashboard/chat.
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
            metadata: {
              durationMs: pipelineResult.durationMs,
              decision: pipelineResult.decision,
              agentsInvolved: [pipelineResult.agentId],
              toolCallsCount: toolCallsForMessage.length,
              // Persist generated documents so they reappear when the
              // conversation is reopened from history.
              artifacts,
            },
          })
          .where(eq(chatMessages.id, pendingAssistant.id));

        // Emit done event
        enqueue({
          type: "done",
          messageId: pendingAssistant.id,
          confidence: Math.round(pipelineResult.confidence * 100),
          agentsInvolved: [pipelineResult.agentId],
          durationMs: pipelineResult.durationMs,
        });

        try {
          controller.close();
        } catch {
          // already closed by the abort handler
        }
      } catch (error) {
        console.error("Streaming error:", error);
        if (aborted) {
          // The user left before the pipeline finished — mark the pending
          // message as cancelled instead of a scary "failed".
          await db
            .update(chatMessages)
            .set({
              content:
                "⏹️ Response cancelled — you exited this conversation before Xenboox finished.",
              status: "cancelled",
            })
            .where(eq(chatMessages.id, pendingAssistant.id))
            .catch(() => {});
        } else {
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

          enqueue({
            type: "error",
            code: "PIPELINE_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to process request",
          });
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      } finally {
        req.signal.removeEventListener("abort", onAbort);
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
