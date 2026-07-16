import { eq, and, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { conversations, chatMessages } from "@xenboox/db/schema/chat"
import { userEntityAccess } from "@xenboox/db/schema/organization"
import {
  orchestrate,
  classifyUserMessage,
} from "@xenboox/agents/core/orchestrator"
import { streamLLM } from "@xenboox/agents/core/llm/agent-llm"
import { auth } from "@/lib/auth"
import { CFO_SYSTEM_PROMPT } from "@xenboox/agents/core/prompts"
import { langfuse } from "@xenboox/agents/core/langfuse"
import { getEnrichedEntityContext, enrichPrompt } from "@/lib/entity-context-enrichment"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type SSEEvent = {
  event:
    | "message_start"
    | "token_delta"
    | "message_delta"
    | "message_stop"
    | "agent_activity"
    | "error"
  data: Record<string, unknown>
}

function sendEvent(controller: ReadableStreamDefaultController, event: SSEEvent) {
  controller.enqueue(
    new TextEncoder().encode(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`)
  )
}

/**
 * Stream chat responses token-by-token using the CFO agent's LLM directly.
 * For non-chat tasks, falls back to the orchestrator (non-streaming).
 */
async function handleChatStreaming(params: {
  controller: ReadableStreamDefaultController
  message: string
  entityId: string
  entityName: string
  history: Array<{ role: string; content: string }>
  conversationId: string
  taskType: string
  startTime: number
}) {
  const { controller, message, entityId, entityName, history, conversationId, taskType, startTime } = params

  // Fetch enriched entity context from database
  const entityCtx = await getEnrichedEntityContext(entityId)

  // Create LangFuse trace for this chat turn
  const trace = await langfuse.trace({
    name: "chat-stream",
    metadata: {
      conversationId,
      entityId,
      taskType,
      userId: "session",
      currency: entityCtx.currency,
      currentPeriod: entityCtx.currentPeriod,
    },
  })

  // For chat/question, stream directly from the CFO agent's LLM
  if (taskType === "chat" || taskType === "question") {
    sendEvent(controller, {
      event: "agent_activity",
      data: {
        agentId: "cfo",
        tier: "tier1",
        action: "streaming",
        detail: "Generating response...",
      },
    })

    // Build messages array from conversation history
    const langchainMessages = history.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }))

    // Add the current user message
    langchainMessages.push({ role: "user", content: message })

    // Enrich prompt with real entity context from database
    const prompt = enrichPrompt(CFO_SYSTEM_PROMPT, entityCtx)

    const streamGen = streamLLM({
      tier: "strategic",
      systemPrompt: prompt,
      messages: langchainMessages,
      entityId,
      agentId: "cfo",
      traceId: trace.id,
    })

    let fullContent = ""
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let usage: any

    try {
      // Manual iteration to capture the return value (LLMCallResult)
      let done = false
      let next = streamGen.next()
      while (!done) {
        const result = await next
        done = result.done === true
        if (!done) {
          const token = result.value as string
          fullContent += token
          sendEvent(controller, {
            event: "token_delta",
            data: { token, content: fullContent },
          })
          next = streamGen.next()
        } else {
          usage = result.value
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await trace.update({ metadata: { error: msg } })
      throw error
    }

    const latencyMs = Date.now() - startTime

    await trace.update({
      output: { content: fullContent },
      metadata: {
        latencyMs,
        tokenCount: fullContent.length,
      },
    })

    // Persist assistant message
    const [assistantMsg] = await db.insert(chatMessages).values({
      conversationId,
      role: "assistant",
      content: fullContent,
      status: "completed",
      confidence: 0.85,
      agentModel: usage?.model ?? "claude-sonnet-4.6",
      latencyMs,
      tokenCount: usage?.usage.outputTokens,
      metadata: {
        agentId: "cfo",
        tier: "tier1",
        taskType,
        provider: usage?.provider,
        costCents: usage?.costCents,
      },
    }).returning()

    // Update conversation
    await db.update(conversations)
      .set({
        lastMessageAt: new Date(),
        messageCount: (await getMessageCount(conversationId)) + 2,
      })
      .where(eq(conversations.id, conversationId))

    sendEvent(controller, {
      event: "message_delta",
      data: {
        messageId: assistantMsg.id,
        content: fullContent,
        confidence: 0.85,
        agentId: "cfo",
        tier: "tier1",
        latencyMs,
        tokenCount: usage?.usage.outputTokens,
      },
    })

    sendEvent(controller, {
      event: "message_stop",
      data: { messageId: assistantMsg.id },
    })

    return
  }

  // ── Non-chat tasks: use orchestrator (non-streaming) ──────────────────
  sendEvent(controller, {
    event: "agent_activity",
    data: {
      agentId: "orchestrator",
      action: "classifying",
      detail: `Routing to ${taskType} handler`,
    },
  })

  const result = await orchestrate({
    taskType: taskType as Parameters<typeof orchestrate>[0]["taskType"],
    entityId,
    entityName: entityCtx.entityName,
    currency: entityCtx.currency,
    input: {
      description: message,
      conversationHistory: history,
    },
  })

  sendEvent(controller, {
    event: "agent_activity",
    data: {
      agentId: result.agentId,
      tier: result.tier,
      action: "completed",
      confidence: result.confidence,
      durationMs: result.duration,
    },
  })

  const responseContent = result.humanResponse ?? result.reasoning
  const latencyMs = Date.now() - startTime

  await trace.update({
    output: { content: responseContent },
    metadata: {
      agentId: result.agentId,
      confidence: result.confidence,
      latencyMs,
    },
  })

  const [assistantMsg] = await db.insert(chatMessages).values({
    conversationId,
    role: "assistant",
    content: responseContent,
    status: "completed",
    confidence: result.confidence,
    agentModel: "claude-sonnet-4.6",
    latencyMs,
    metadata: {
      agentId: result.agentId,
      tier: result.tier,
      taskType,
      errors: result.errors,
    },
  }).returning()

  await db.update(conversations)
    .set({
      lastMessageAt: new Date(),
      messageCount: (await getMessageCount(conversationId)) + 2,
    })
    .where(eq(conversations.id, conversationId))

  sendEvent(controller, {
    event: "message_delta",
    data: {
      messageId: assistantMsg.id,
      content: responseContent,
      confidence: result.confidence,
      agentId: result.agentId,
      tier: result.tier,
      latencyMs,
      errors: result.errors,
    },
  })

  sendEvent(controller, {
    event: "message_stop",
    data: { messageId: assistantMsg.id },
  })
}

async function getMessageCount(conversationId: string): Promise<number> {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    columns: { messageCount: true },
  })
  return conv?.messageCount ?? 0
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const entityId = req.headers.get("x-entity-id")
  if (!entityId) {
    return Response.json({ error: "Missing entity context" }, { status: 400 })
  }

  // Verify user has access to this entity
  const entityAccess = await db.query.userEntityAccess.findFirst({
    where: and(
      eq(userEntityAccess.userId, session.user.id),
      eq(userEntityAccess.entityId, entityId),
    ),
  })
  if (!entityAccess) {
    return Response.json({ error: "Access denied to this entity" }, { status: 403 })
  }

  const body = await req.json()
  const { conversationId, message } = body as {
    conversationId: string
    message: string
  }

  if (!conversationId || !message?.trim()) {
    return Response.json({ error: "conversationId and message required" }, { status: 400 })
  }

  // Verify conversation belongs to this entity
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      eq(conversations.entityId, entityId),
    ),
  })

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 })
  }

  // Persist user message
  await db.insert(chatMessages).values({
    conversationId,
    role: "user",
    content: message.trim(),
    status: "completed",
  })

  // Update conversation
  await db.update(conversations)
    .set({
      lastMessageAt: new Date(),
      updatedAt: new Date(),
      messageCount: (conversation.messageCount ?? 0) + 1,
      title: conversation.title ?? message.trim().slice(0, 80),
    })
    .where(eq(conversations.id, conversationId))

  // Load recent history for context
  const history = await db.query.chatMessages.findMany({
    where: eq(chatMessages.conversationId, conversationId),
    orderBy: [asc(chatMessages.createdAt)],
    limit: 50,
  })

  const taskType = classifyUserMessage(message)

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now()

      sendEvent(controller, {
        event: "message_start",
        data: {
          conversationId,
          taskType,
          timestamp: new Date().toISOString(),
        },
      })

      try {
        await handleChatStreaming({
          controller,
          message: message.trim(),
          entityId,
          entityName: conversation.title ?? "Organization",
          history: history.map((m) => ({
            role: m.role,
            content: m.content ?? "",
          })),
          conversationId,
          taskType,
          startTime,
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)

        sendEvent(controller, {
          event: "error",
          data: { error: errorMsg },
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
