import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations, chatMessages } from "@xenboox/db/schema";
import { eq, and } from "drizzle-orm";
import { processChatInput } from "@xenboox/agents";

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
        const pipelineResult = await processChatInput({
          userId,
          orgId: entity.organizationId,
          entityId,
          entityName: entity.name,
          currency: entity.currency || "GMD",
          message: fullMessage,
          conversationId: convId,
          channel: "web_chat",
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

        // Save complete AI response
        const [assistantMessage] = await db
          .insert(chatMessages)
          .values({
            conversationId: convId,
            role: "assistant",
            content: response,
            status: "completed",
            confidence: pipelineResult.confidence,
            agentModel: `cfo-pipeline-v1 (${pipelineResult.agentId})`,
            metadata: JSON.stringify({
              durationMs: pipelineResult.durationMs,
              decision: pipelineResult.decision,
              agentsInvolved: [pipelineResult.agentId],
            }),
          })
          .returning();

        // Emit done event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              messageId: assistantMessage.id,
              confidence: Math.round(pipelineResult.confidence * 100),
              agentsInvolved: [pipelineResult.agentId],
              durationMs: pipelineResult.durationMs,
            })}\n\n`,
          ),
        );

        controller.close();
      } catch (error) {
        console.error("Streaming error:", error);
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
