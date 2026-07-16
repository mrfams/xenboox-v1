// @ts-nocheck

import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, asc, lte, ilike, or, ne } from "drizzle-orm"
import { router, protectedProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import { conversations, chatMessages, chatAttachments, chatMessageReactions, conversationShares } from "@xenboox/db/schema/chat"
import { users } from "@xenboox/db/schema/auth"
import { orchestrate, classifyUserMessage } from "@xenboox/agents/core/orchestrator"
import { getEnrichedEntityContext, enrichPrompt } from "@/lib/entity-context-enrichment"
import { CFO_SYSTEM_PROMPT } from "@xenboox/agents/core/prompts"

export const chatRouter = router({
  /**
   * Create a new conversation.
   */
  createConversation: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await db.insert(conversations).values({
        entityId: ctx.entityId!,
        userId: ctx.session!.user!.id!,
        title: input.title ?? null,
      }).returning()

      return conversation[0]
    }),

  /**
   * List conversations for the current entity.
   */
  listConversations: protectedProcedure
    .query(async ({ ctx }) => {
      return db.query.conversations.findMany({
        where: and(
          eq(conversations.entityId, ctx.entityId!),
          eq(conversations.status, "active"),
        ),
        orderBy: [desc(conversations.lastMessageAt)],
        limit: 50,
      })
    }),

  /**
   * Get conversations as a tree structure (parent → children).
   */
  getConversationTree: protectedProcedure
    .query(async ({ ctx }) => {
      // Fetch all active conversations for this entity
      const allConversations = await db.query.conversations.findMany({
        where: and(
          eq(conversations.entityId, ctx.entityId!),
          eq(conversations.status, "active"),
        ),
        orderBy: [desc(conversations.lastMessageAt)],
        limit: 100,
      })

      // Build a map of conversationId → children
      const childrenMap = new Map<string, typeof allConversations>()
      const roots: typeof allConversations = []

      for (const conv of allConversations) {
        if (conv.forkedFromConversationId) {
          const siblings = childrenMap.get(conv.forkedFromConversationId) ?? []
          siblings.push(conv)
          childrenMap.set(conv.forkedFromConversationId, siblings)
        } else {
          roots.push(conv)
        }
      }

      // Recursive function to build tree nodes
      type TreeNode = {
        conversation: typeof allConversations[0]
        children: TreeNode[]
      }

      const buildTree = (convs: typeof allConversations): TreeNode[] => {
        return convs.map((conv) => ({
          conversation: conv,
          children: buildTree(childrenMap.get(conv.id) ?? []),
        }))
      }

      return buildTree(roots)
    }),

  /**
   * Search conversations by title or message content.
   */
  searchConversations: protectedProcedure
    .input(z.object({
      query: z.string().min(1).max(200),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const searchTerm = `%${input.query}%`

      // Search by conversation title
      const titleMatches = await db.query.conversations.findMany({
        where: and(
          eq(conversations.entityId, ctx.entityId!),
          eq(conversations.status, "active"),
          ilike(conversations.title, searchTerm),
        ),
        limit: input.limit,
        orderBy: [desc(conversations.lastMessageAt)],
      })

      // Search by message content
      const messageMatches = await db.query.chatMessages.findMany({
        where: and(
          ilike(chatMessages.content, searchTerm),
          eq(chatMessages.role, "user"), // Only search user messages
        ),
        limit: input.limit,
        orderBy: [desc(chatMessages.createdAt)],
      })

      // Get unique conversation IDs from message matches
      const messageConvIds = [...new Set(messageMatches.map((m) => m.conversationId))]

      // Fetch those conversations
      const convFromMessages = messageConvIds.length > 0
        ? await db.query.conversations.findMany({
            where: and(
              eq(conversations.entityId, ctx.entityId!),
              eq(conversations.status, "active"),
            ),
          })
        : []

      // Merge results (title matches first, then message matches)
      const allConvIds = new Set<string>()
      const results: Array<{
        conversation: typeof titleMatches[0]
        matchType: "title" | "message"
        snippet?: string
      }> = []

      for (const conv of titleMatches) {
        if (!allConvIds.has(conv.id)) {
          allConvIds.add(conv.id)
          results.push({ conversation: conv, matchType: "title" })
        }
      }

      for (const msg of messageMatches) {
        if (!allConvIds.has(msg.conversationId)) {
          allConvIds.add(msg.conversationId)
          const conv = convFromMessages.find((c) => c.id === msg.conversationId)
          if (conv) {
            // Create a snippet around the match
            const content = msg.content ?? ""
            const queryLower = input.query.toLowerCase()
            const contentLower = content.toLowerCase()
            const matchIndex = contentLower.indexOf(queryLower)
            const start = Math.max(0, matchIndex - 40)
            const end = Math.min(content.length, matchIndex + input.query.length + 40)
            const snippet = (start > 0 ? "..." : "") + content.slice(start, end) + (end < content.length ? "..." : "")

            results.push({
              conversation: conv,
              matchType: "message",
              snippet,
            })
          }
        }
      }

      return results.slice(0, input.limit)
    }),

  /**
   * Get messages for a conversation.
   */
  getMessages: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify conversation belongs to this entity
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" })
      }

      return db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, input.conversationId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        limit: 200,
      })
    }),

  /**
   * Send a message and get a non-streaming response.
   * For streaming, use /api/chat/stream instead.
   */
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      message: z.string().min(1).max(10000),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now()

      // Verify conversation belongs to this entity
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" })
      }

      // Persist user message
      await db.insert(chatMessages).values({
        conversationId: input.conversationId,
        role: "user",
        content: input.message,
        status: "completed",
      })

      // Update conversation timestamp
      await db.update(conversations)
        .set({
          lastMessageAt: new Date(),
          updatedAt: new Date(),
          messageCount: (conversation.messageCount ?? 0) + 1,
          title: conversation.title ?? input.message.slice(0, 80),
        })
        .where(eq(conversations.id, input.conversationId))

      // Load conversation history for context
      const history = await db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, input.conversationId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        limit: 50,
      })

      // Fetch enriched entity context from database
      const entityCtx = await getEnrichedEntityContext(ctx.entityId!)

      // Classify and route to agent
      const taskType = classifyUserMessage(input.message)
      const result = await orchestrate({
        taskType,
        entityId: ctx.entityId!,
        entityName: entityCtx.entityName,
        currency: entityCtx.currency,
        input: {
          description: input.message,
          conversationHistory: history.map((m) => ({
            role: m.role,
            content: m.content ?? "",
          })),
        },
      })

      const responseContent = result.humanResponse ?? result.reasoning
      const latencyMs = Date.now() - startTime

      // Persist assistant message
      const assistantMessage = await db.insert(chatMessages).values({
        conversationId: input.conversationId,
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

      // Update conversation timestamp again
      await db.update(conversations)
        .set({
          lastMessageAt: new Date(),
          messageCount: (conversation.messageCount ?? 0) + 2,
        })
        .where(eq(conversations.id, input.conversationId))

      return {
        messageId: assistantMessage[0].id,
        content: responseContent,
        confidence: result.confidence,
        agentId: result.agentId,
        latencyMs,
        errors: result.errors,
      }
    }),

  /**
   * Fork a conversation at a specific message.
   * Creates a new conversation with messages up to and including the fork point.
   */
  forkConversation: protectedProcedure
    .input(z.object({
      sourceConversationId: z.string().uuid(),
      forkAtMessageId: z.string().uuid(),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify source conversation belongs to this entity
      const sourceConversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.sourceConversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!sourceConversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source conversation not found" })
      }

      // Find the fork point message
      const forkPointMessage = await db.query.chatMessages.findFirst({
        where: and(
          eq(chatMessages.id, input.forkAtMessageId),
          eq(chatMessages.conversationId, input.sourceConversationId),
        ),
      })

      if (!forkPointMessage) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Fork point message not found" })
      }

      // Get all messages up to and including the fork point
      const messagesToFork = await db.query.chatMessages.findMany({
        where: and(
          eq(chatMessages.conversationId, input.sourceConversationId),
          lte(chatMessages.createdAt, forkPointMessage.createdAt),
        ),
        orderBy: [asc(chatMessages.createdAt)],
      })

      // Create the new forked conversation
      const [newConversation] = await db.insert(conversations).values({
        entityId: ctx.entityId!,
        userId: ctx.session!.user!.id!,
        title: input.title ?? `${sourceConversation.title ?? "Conversation"} (branch)`,
        forkedFromConversationId: input.sourceConversationId,
        forkedFromMessageId: input.forkAtMessageId,
        messageCount: messagesToFork.length,
        lastMessageAt: messagesToFork[messagesToFork.length - 1]?.createdAt ?? new Date(),
      }).returning()

      // Copy messages to the new conversation
      if (messagesToFork.length > 0) {
        await db.insert(chatMessages).values(
          messagesToFork.map((msg) => ({
            conversationId: newConversation.id,
            role: msg.role,
            content: msg.content,
            status: msg.status,
            parentMessageId: msg.parentMessageId,
            confidence: msg.confidence,
            agentModel: msg.agentModel,
            tokenCount: msg.tokenCount,
            latencyMs: msg.latencyMs,
            hasAttachments: msg.hasAttachments,
            metadata: msg.metadata,
          }))
        )

        // Copy attachments for forked messages
        const forkedMessageIds = messagesToFork.map((m) => m.id)
        const attachmentsToCopy = await db.query.chatAttachments.findMany({
          where: eq(chatAttachments.conversationId, input.sourceConversationId),
        })

        const relevantAttachments = attachmentsToCopy.filter(
          (a) => a.messageId && forkedMessageIds.includes(a.messageId)
        )

        if (relevantAttachments.length > 0) {
          // Map old message IDs to new message IDs
          const messageIdMap = new Map<string, string>()
          const newMessages = await db.query.chatMessages.findMany({
            where: eq(chatMessages.conversationId, newConversation.id),
            orderBy: [asc(chatMessages.createdAt)],
          })

          // Since we copied messages in order, we can map by position
          for (let i = 0; i < messagesToFork.length; i++) {
            if (newMessages[i]) {
              messageIdMap.set(messagesToFork[i].id, newMessages[i].id)
            }
          }

          await db.insert(chatAttachments).values(
            relevantAttachments.map((att) => ({
              conversationId: newConversation.id,
              messageId: att.messageId ? (messageIdMap.get(att.messageId) ?? att.messageId) : null,
              documentId: att.documentId,
              attachmentType: att.attachmentType,
              fileName: att.fileName,
              mimeType: att.mimeType,
              fileSize: att.fileSize,
              r2Key: att.r2Key,
              r2Bucket: att.r2Bucket,
              ocrText: att.ocrText,
              ocrConfidence: att.ocrConfidence,
              status: att.status,
              metadata: att.metadata,
            }))
          )
        }
      }

      return newConversation
    }),

  // ── Message Management ──

  /**
   * Update a message's content.
   */
  updateMessage: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      messageId: z.string().uuid(),
      content: z.string().min(1).max(10000),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify conversation belongs to this entity
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" })
      }

      // Verify message belongs to this conversation
      const message = await db.query.chatMessages.findFirst({
        where: and(
          eq(chatMessages.id, input.messageId),
          eq(chatMessages.conversationId, input.conversationId),
        ),
      })

      if (!message) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" })
      }

      // Only allow updating user messages
      if (message.role !== "user") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Can only edit user messages" })
      }

      const [updated] = await db.update(chatMessages)
        .set({
          content: input.content,
          updatedAt: new Date(),
        })
        .where(eq(chatMessages.id, input.messageId))
        .returning()

      return updated
    }),

  /**
   * Delete a message.
   */
  deleteMessage: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      messageId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify conversation belongs to this entity
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" })
      }

      // Verify message belongs to this conversation
      const message = await db.query.chatMessages.findFirst({
        where: and(
          eq(chatMessages.id, input.messageId),
          eq(chatMessages.conversationId, input.conversationId),
        ),
      })

      if (!message) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" })
      }

      // Delete the message
      const [deleted] = await db.delete(chatMessages)
        .where(eq(chatMessages.id, input.messageId))
        .returning()

      // Update conversation message count
      await db.update(conversations)
        .set({
          messageCount: Math.max(0, (conversation.messageCount ?? 1) - 1),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, input.conversationId))

      return deleted
    }),

  // ── Export ──

  /**
   * Export a conversation as JSON or Markdown.
   */
  exportConversation: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      format: z.enum(["json", "markdown"]).default("markdown"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify conversation belongs to this entity
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" })
      }

      // Get all messages
      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, input.conversationId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      })

      // Get attachments
      const attachments = await db.query.chatAttachments.findMany({
        where: eq(chatAttachments.conversationId, input.conversationId),
      })

      if (input.format === "json") {
        return {
          conversation: {
            id: conversation.id,
            title: conversation.title,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            messageCount: conversation.messageCount,
          },
          messages: messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            confidence: msg.confidence,
            agentModel: msg.agentModel,
            latencyMs: msg.latencyMs,
            createdAt: msg.createdAt,
            metadata: msg.metadata,
          })),
          attachments: attachments.map((att) => ({
            id: att.id,
            fileName: att.fileName,
            mimeType: att.mimeType,
            fileSize: att.fileSize,
            createdAt: att.createdAt,
          })),
        }
      }

      // Markdown format
      const lines: string[] = []
      lines.push(`# ${conversation.title ?? "Conversation"}`)
      lines.push("")
      lines.push(`**Created:** ${conversation.createdAt?.toLocaleString()}`)
      lines.push(`**Messages:** ${conversation.messageCount}`)
      lines.push("")
      lines.push("---")
      lines.push("")

      for (const msg of messages) {
        const roleLabel = msg.role === "user" ? "**You**" : `**Assistant**`
        const timestamp = msg.createdAt?.toLocaleString() ?? ""
        
        lines.push(`${roleLabel} _${timestamp}_`)
        lines.push("")
        lines.push(msg.content ?? "")
        lines.push("")

        if (msg.confidence != null) {
          lines.push(`_Confidence: ${(msg.confidence * 100).toFixed(0)}%_`)
          lines.push("")
        }

        lines.push("---")
        lines.push("")
      }

      return { markdown: lines.join("\n") }
    }),

  // ── Analytics ──

  /**
   * Get analytics for a conversation.
   */
  getConversationAnalytics: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify conversation belongs to this entity
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" })
      }

      // Get all messages
      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, input.conversationId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      })

      // Get attachments
      const attachments = await db.query.chatAttachments.findMany({
        where: eq(chatAttachments.conversationId, input.conversationId),
      })

      // Calculate analytics
      const userMessages = messages.filter((m) => m.role === "user")
      const assistantMessages = messages.filter((m) => m.role === "assistant")

      // Agent usage breakdown
      const agentUsage: Record<string, number> = {}
      for (const msg of assistantMessages) {
        const metadata = msg.metadata as Record<string, unknown> | null
        const agentId = metadata?.agentId as string ?? "unknown"
        agentUsage[agentId] = (agentUsage[agentId] ?? 0) + 1
      }

      // Average confidence
      const confidences = assistantMessages
        .map((m) => m.confidence)
        .filter((c): c is number => c != null)
      const avgConfidence = confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : null

      // Average latency
      const latencies = assistantMessages
        .map((m) => m.latencyMs)
        .filter((l): l is number => l != null)
      const avgLatency = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : null

      // Total tokens (if available)
      const totalTokens = assistantMessages.reduce((sum, m) => sum + (m.tokenCount ?? 0), 0)

      // Duration
      const firstMessage = messages[0]?.createdAt
      const lastMessage = messages[messages.length - 1]?.createdAt
      const durationMs = firstMessage && lastMessage
        ? new Date(lastMessage).getTime() - new Date(firstMessage).getTime()
        : null

      return {
        conversationId: input.conversationId,
        title: conversation.title,
        totalMessages: messages.length,
        userMessages: userMessages.length,
        assistantMessages: assistantMessages.length,
        agentUsage,
        avgConfidence,
        avgLatency,
        totalTokens,
        durationMs,
        attachmentCount: attachments.length,
        createdAt: conversation.createdAt,
        lastMessageAt: conversation.lastMessageAt,
      }
    }),

  // ── Reactions ──

  /**
   * Add or toggle a reaction on a message.
   */
  toggleReaction: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      messageId: z.string().uuid(),
      emoji: z.string().min(1).max(10),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify conversation belongs to this entity
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" })
      }

      const userId = ctx.session!.user!.id!

      // Check if reaction already exists
      const existing = await db.query.chatMessageReactions.findFirst({
        where: and(
          eq(chatMessageReactions.messageId, input.messageId),
          eq(chatMessageReactions.userId, userId),
          eq(chatMessageReactions.emoji, input.emoji),
        ),
      })

      if (existing) {
        // Remove reaction (toggle off)
        await db.delete(chatMessageReactions)
          .where(eq(chatMessageReactions.id, existing.id))
        return { action: "removed" }
      }

      // Add reaction (toggle on)
      await db.insert(chatMessageReactions).values({
        messageId: input.messageId,
        userId,
        emoji: input.emoji,
      })
      return { action: "added" }
    }),

  /**
   * Get reactions for a message.
   */
  getReactions: protectedProcedure
    .input(z.object({
      messageId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      return db.query.chatMessageReactions.findMany({
        where: eq(chatMessageReactions.messageId, input.messageId),
      })
    }),

  // ── Sharing ──

  /**
   * Share a conversation with another user.
   */
  shareConversation: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      email: z.string().email(),
      permission: z.enum(["read", "write"]).default("read"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify conversation belongs to this entity
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" })
      }

      // Find user by email
      const targetUser = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      })

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found with that email" })
      }

      // Don't share with yourself
      if (targetUser.id === ctx.session!.user!.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot share with yourself" })
      }

      // Check if already shared
      const existingShare = await db.query.conversationShares.findFirst({
        where: and(
          eq(conversationShares.conversationId, input.conversationId),
          eq(conversationShares.sharedWithUserId, targetUser.id),
        ),
      })

      if (existingShare) {
        // Update permission
        const [updated] = await db.update(conversationShares)
          .set({ permission: input.permission })
          .where(eq(conversationShares.id, existingShare.id))
          .returning()
        return updated
      }

      // Create share
      const [share] = await db.insert(conversationShares).values({
        conversationId: input.conversationId,
        sharedByUserId: ctx.session!.user!.id!,
        sharedWithUserId: targetUser.id,
        permission: input.permission,
      }).returning()

      return share
    }),

  /**
   * Get shares for a conversation.
   */
  getConversationShares: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify conversation belongs to this entity
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" })
      }

      const shares = await db.query.conversationShares.findMany({
        where: eq(conversationShares.conversationId, input.conversationId),
      })

      // Fetch user emails for shares
      const shareUserIds = [...new Set([
        ...shares.map((s) => s.sharedByUserId),
        ...shares.filter((s) => s.sharedWithUserId).map((s) => s.sharedWithUserId!),
      ])]

      const shareUsers = shareUserIds.length > 0
        ? await db.query.users.findMany({
            where: or(
              ...shareUserIds.map((id) => eq(users.id, id))
            ),
          })
        : []

      const userMap = new Map(shareUsers.map((u) => [u.id, u]))

      return shares.map((share) => ({
        ...share,
        sharedByUser: userMap.get(share.sharedByUserId),
        sharedWithUser: share.sharedWithUserId ? userMap.get(share.sharedWithUserId) : null,
      }))
    }),

  /**
   * Remove a share.
   */
  removeShare: protectedProcedure
    .input(z.object({
      shareId: z.string().uuid(),
      conversationId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify conversation belongs to this entity
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" })
      }

      const [deleted] = await db.delete(conversationShares)
        .where(eq(conversationShares.id, input.shareId))
        .returning()

      return deleted
    }),

  // ── Attachments ──

  /**
   * Add an attachment to a message.
   */
  addAttachment: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      messageId: z.string().uuid().optional(),
      documentId: z.string().uuid().optional(),
      attachmentType: z.enum(["document", "image", "file"]).default("document"),
      fileName: z.string().min(1),
      mimeType: z.string().optional(),
      fileSize: z.number().int().min(0).optional(),
      r2Key: z.string().optional(),
      r2Bucket: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify conversation belongs to this entity
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" })
      }

      const [attachment] = await db.insert(chatAttachments).values({
        conversationId: input.conversationId,
        messageId: input.messageId ?? null,
        documentId: input.documentId ?? null,
        attachmentType: input.attachmentType,
        fileName: input.fileName,
        mimeType: input.mimeType ?? null,
        fileSize: input.fileSize ?? null,
        r2Key: input.r2Key ?? null,
        r2Bucket: input.r2Bucket ?? null,
      }).returning()

      // Update message has_attachments flag if messageId provided
      if (input.messageId) {
        await db.update(chatMessages)
          .set({ hasAttachments: 1 })
          .where(eq(chatMessages.id, input.messageId))
      }

      return attachment
    }),

  /**
   * Get attachments for a message or conversation.
   */
  getAttachments: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      messageId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify conversation belongs to this entity
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" })
      }

      if (input.messageId) {
        return db.query.chatAttachments.findMany({
          where: eq(chatAttachments.messageId, input.messageId),
          orderBy: (attachments, { asc }) => [asc(attachments.createdAt)],
        })
      }

      return db.query.chatAttachments.findMany({
        where: eq(chatAttachments.conversationId, input.conversationId),
        orderBy: (attachments, { asc }) => [asc(attachments.createdAt)],
      })
    }),

  /**
   * Remove an attachment.
   */
  removeAttachment: protectedProcedure
    .input(z.object({
      attachmentId: z.string().uuid(),
      conversationId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify conversation belongs to this entity
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.entityId, ctx.entityId!),
        ),
      })

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" })
      }

      const [deleted] = await db.delete(chatAttachments)
        .where(eq(chatAttachments.id, input.attachmentId))
        .returning()

      return deleted
    }),
})
