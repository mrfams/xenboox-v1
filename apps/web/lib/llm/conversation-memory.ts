/**
 * Conversation Memory System
 *
 * Manages short-term and long-term memory for AI conversations.
 * - Short-term: Active conversation context (last N messages)
 * - Long-term: Persistent memory across sessions
 */

import { eq, and, desc, gte } from "drizzle-orm";
import { chatMessages, conversations } from "@xenboox/db/schema";

import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  /** Importance score for long-term memory (0-1) */
  importance?: number;
  /** Tags for categorization */
  tags?: string[];
}

export interface ConversationContext {
  /** Recent messages for short-term memory */
  recentMessages: MemoryEntry[];
  /** Key facts extracted from conversation */
  facts: string[];
  /** Current topic/focus */
  currentTopic?: string;
  /** Entity-specific context */
  entityContext?: Record<string, unknown>;
}

export interface MemoryConfig {
  /** Maximum number of messages in short-term memory */
  shortTermLimit: number;
  /** Minimum importance score for long-term memory */
  longTermThreshold: number;
  /** Maximum age (in hours) for short-term memory */
  shortTermMaxAge: number;
}

// ─── Default Configuration ──────────────────────────────────────────────

const DEFAULT_CONFIG: MemoryConfig = {
  shortTermLimit: 20,
  longTermThreshold: 0.7,
  shortTermMaxAge: 24 * 7, // 7 days
};

// ─── Memory Manager ─────────────────────────────────────────────────────

export class ConversationMemory {
  private config: MemoryConfig;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get short-term memory for a conversation
   */
  async getShortTermMemory(
    conversationId: string,
    entityId: string,
  ): Promise<MemoryEntry[]> {
    const cutoffDate = new Date(
      Date.now() - this.config.shortTermMaxAge * 60 * 60 * 1000,
    );

    const messages = await db
      .select({
        id: chatMessages.id,
        role: chatMessages.role,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          gte(chatMessages.createdAt, cutoffDate),
        ),
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(this.config.shortTermLimit);

    return messages.reverse().map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      content: msg.content || "",
      timestamp: msg.createdAt || new Date(),
    }));
  }

  /**
   * Get conversation context with memory
   */
  async getConversationContext(
    conversationId: string,
    entityId: string,
  ): Promise<ConversationContext> {
    const recentMessages = await this.getShortTermMemory(
      conversationId,
      entityId,
    );

    // Extract facts from recent messages
    const facts = this.extractFacts(recentMessages);

    // Determine current topic
    const currentTopic = this.detectTopic(recentMessages);

    return {
      recentMessages,
      facts,
      currentTopic,
    };
  }

  /**
   * Add a message to memory
   */
  async addMessage(
    conversationId: string,
    entityId: string,
    message: MemoryEntry,
  ): Promise<void> {
    // Save to database
    await db.insert(chatMessages).values({
      conversationId,
      role: message.role,
      content: message.content,
      status: "completed",
    });

    // Update conversation timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }

  /**
   * Extract key facts from messages
   */
  private extractFacts(messages: MemoryEntry[]): string[] {
    const facts: string[] = [];

    for (const msg of messages) {
      if (msg.role === "assistant") {
        // Look for factual statements
        const factualPatterns = [
          /(?:your|the)\s+(?:balance|total|amount)\s+(?:is|was)\s+[\d,.]+/gi,
          /(?:found|detected|identified)\s+\d+\s+\w+/gi,
          /(?:successfully|completed|created)\s+\w+/gi,
        ];

        for (const pattern of factualPatterns) {
          const matches = msg.content.match(pattern);
          if (matches) {
            facts.push(...matches.slice(0, 3));
          }
        }
      }
    }

    // Deduplicate and limit
    return [...new Set(facts)].slice(0, 10);
  }

  /**
   * Detect the current topic from messages
   */
  private detectTopic(messages: MemoryEntry[]): string | undefined {
    if (messages.length === 0) return undefined;

    const recentUserMessages = messages
      .filter((m) => m.role === "user")
      .slice(-3);

    if (recentUserMessages.length === 0) return undefined;

    const topics: Record<string, string[]> = {
      banking: ["bank", "account", "balance", "transaction", "statement"],
      invoicing: ["invoice", "bill", "payment", "vendor", "supplier"],
      payroll: ["payroll", "salary", "employee", "deduction"],
      reporting: ["report", "statement", "financial", "profit", "loss"],
      reconciliation: ["reconcile", "match", "discrepancy", "bank"],
      expenses: ["expense", "cost", "spending", "budget"],
    };

    const combinedText = recentUserMessages
      .map((m) => m.content.toLowerCase())
      .join(" ");

    for (const [topic, keywords] of Object.entries(topics)) {
      if (keywords.some((kw) => combinedText.includes(kw))) {
        return topic;
      }
    }

    return undefined;
  }

  /**
   * Build context prompt for LLM
   */
  buildContextPrompt(context: ConversationContext): string {
    const parts: string[] = [];

    // Add recent conversation history
    if (context.recentMessages.length > 0) {
      parts.push("Recent conversation:");
      for (const msg of context.recentMessages.slice(-10)) {
        parts.push(`${msg.role}: ${msg.content.slice(0, 200)}`);
      }
    }

    // Add extracted facts
    if (context.facts.length > 0) {
      parts.push("\nKey facts from conversation:");
      for (const fact of context.facts) {
        parts.push(`- ${fact}`);
      }
    }

    // Add current topic
    if (context.currentTopic) {
      parts.push(`\nCurrent topic: ${context.currentTopic}`);
    }

    return parts.join("\n");
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────

let memoryInstance: ConversationMemory | null = null;

/**
 * Get or create the conversation memory instance
 */
export function getConversationMemory(
  config?: Partial<MemoryConfig>,
): ConversationMemory {
  if (!memoryInstance) {
    memoryInstance = new ConversationMemory(config);
  }
  return memoryInstance;
}
