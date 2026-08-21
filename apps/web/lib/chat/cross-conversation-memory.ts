/**
 * Cross-Conversation Memory — Remember context from OTHER conversations.
 *
 * When a user asks "What was that invoice we discussed last week?", the AI
 * needs to search across ALL past conversations, not just the current one.
 *
 * Features:
 * - Store conversation summaries with metadata
 * - Retrieve relevant past conversations by semantic similarity
 * - Include past context in AI prompts
 * - Entity-scoped: never leak data across entities
 */

import { db } from "@xenboox/db";
import { eq, and, desc, sql, ilike } from "drizzle-orm";
import { conversations, chatMessages } from "@xenboox/db/schema/chat";

// ─── Types ────────────────────────────────────────────────────────────────

export interface ConversationSummary {
  id: string;
  entityId: string;
  userId: string;
  title: string;
  summary: string;
  topics: string[];
  keyEntities: string[];
  messageCount: number;
  createdAt: Date;
  lastMessageAt: Date;
}

export interface RelevantConversation {
  conversation: ConversationSummary;
  relevanceScore: number;
  matchedTopics: string[];
  excerpt: string;
}

// ─── In-Memory Cache ──────────────────────────────────────────────────────

const summaryCache = new Map<string, ConversationSummary[]>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

// ─── Topic Extraction ─────────────────────────────────────────────────────

const TOPIC_KEYWORDS = [
  "invoice",
  "payroll",
  "tax",
  "budget",
  "reconciliation",
  "cash",
  "report",
  "asset",
  "inventory",
  "expense",
  "revenue",
  "profit",
  "loss",
  "balance",
  "payment",
  "vendor",
  "customer",
  "employee",
  "bank",
  "account",
  "journal",
  "entry",
  "close",
  "audit",
  "compliance",
  "depreciation",
  "loan",
  "equity",
  "dividend",
];

const ENTITY_PATTERNS = [
  // Company names (common patterns)
  /\b([A-Z][a-z]+ (?:Ltd|Inc|Corp|LLC|Co))\b/g,
  // Bank names
  /\b(GTBank|Trust Bank|Central Bank|Ecobash|QCell)\b/gi,
  // People names (simple heuristic)
  /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g,
];

// ─── Core Functions ───────────────────────────────────────────────────────

/**
 * Get conversation summaries for an entity.
 * Returns recent conversations with their summaries.
 */
export async function getConversationSummaries(
  entityId: string,
  limit = 50,
): Promise<ConversationSummary[]> {
  const cacheKey = `summaries:${entityId}`;
  const cached = summaryCache.get(cacheKey);
  const timestamp = cacheTimestamps.get(cacheKey);

  if (cached && timestamp && Date.now() - timestamp < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const rows = await db.query.conversations.findMany({
      where: eq(conversations.entityId, entityId),
      orderBy: [desc(conversations.lastMessageAt)],
      limit,
    });

    const summaries: ConversationSummary[] = rows.map((row) => ({
      id: row.id,
      entityId: row.entityId,
      userId: row.userId ?? "",
      title: row.title ?? "Untitled",
      summary: row.summary ?? "",
      topics: extractTopicsFromText(`${row.title} ${row.summary}`),
      keyEntities: extractEntitiesFromText(`${row.title} ${row.summary}`),
      messageCount: row.messageCount ?? 0,
      createdAt: row.createdAt ?? new Date(),
      lastMessageAt: row.lastMessageAt ?? row.createdAt ?? new Date(),
    }));

    summaryCache.set(cacheKey, summaries);
    cacheTimestamps.set(cacheKey, Date.now());

    return summaries;
  } catch {
    return [];
  }
}

/**
 * Search for relevant past conversations based on a query.
 * Uses keyword matching and topic overlap for relevance scoring.
 */
export async function searchRelevantConversations(
  entityId: string,
  query: string,
  limit = 5,
): Promise<RelevantConversation[]> {
  const summaries = await getConversationSummaries(entityId);
  const queryTopics = extractTopicsFromText(query);
  const queryEntities = extractEntitiesFromText(query);
  const queryLower = query.toLowerCase();

  const scored = summaries
    .map((summary) => {
      let score = 0;
      const matchedTopics: string[] = [];

      // Topic overlap scoring
      for (const topic of queryTopics) {
        if (summary.topics.includes(topic)) {
          score += 0.3;
          matchedTopics.push(topic);
        }
      }

      // Entity overlap scoring
      for (const entity of queryEntities) {
        if (
          summary.keyEntities.some(
            (e) => e.toLowerCase() === entity.toLowerCase(),
          )
        ) {
          score += 0.4;
          matchedTopics.push(entity);
        }
      }

      // Title/summary keyword matching
      const summaryText = `${summary.title} ${summary.summary}`.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 3);
      for (const word of queryWords) {
        if (summaryText.includes(word)) {
          score += 0.1;
        }
      }

      // Recency boost (more recent = higher score)
      const daysSinceLastMessage = Math.max(
        1,
        (Date.now() - summary.lastMessageAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const recencyBoost = Math.max(0, 0.2 - daysSinceLastMessage * 0.01);
      score += recencyBoost;

      // Message count boost (more messages = more detailed context)
      if (summary.messageCount > 5) {
        score += 0.1;
      }

      return {
        conversation: summary,
        relevanceScore: Math.min(1, score),
        matchedTopics: [...new Set(matchedTopics)],
        excerpt: summary.summary || summary.title,
      };
    })
    .filter((r) => r.relevanceScore > 0.2)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  return scored;
}

/**
 * Build a context block from relevant past conversations.
 * This gets injected into the AI's prompt.
 */
export async function buildMemoryContextBlock(
  entityId: string,
  currentMessage: string,
  currentConversationId?: string,
): Promise<string> {
  const relevant = await searchRelevantConversations(
    entityId,
    currentMessage,
    3,
  );

  // Filter out the current conversation
  const filtered = relevant.filter(
    (r) => r.conversation.id !== currentConversationId,
  );

  if (filtered.length === 0) {
    return "";
  }

  const lines: string[] = [
    "## Past Conversations (for context)",
    "",
    "The user has discussed these topics in previous conversations:",
    "",
  ];

  for (const item of filtered) {
    const date = item.conversation.lastMessageAt.toLocaleDateString();
    lines.push(`### ${item.conversation.title} (${date})`);
    lines.push(`Topics: ${item.matchedTopics.join(", ")}`);
    lines.push(`Summary: ${item.excerpt}`);
    lines.push("");
  }

  lines.push(
    "Use this context to provide more relevant and informed responses. ",
  );
  lines.push(
    "Reference past conversations when appropriate (e.g., 'As we discussed last week...').",
  );

  return lines.join("\n");
}

/**
 * Get a specific conversation's recent messages for context.
 */
export async function getConversationExcerpt(
  conversationId: string,
  entityId: string,
  maxMessages = 10,
): Promise<Array<{ role: string; content: string }>> {
  try {
    // Verify the conversation belongs to this entity
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.entityId, entityId),
      ),
    });

    if (!conversation) {
      return [];
    }

    const messages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.conversationId, conversationId),
      orderBy: [desc(chatMessages.createdAt)],
      limit: maxMessages,
    });

    return messages.reverse().map((m) => ({
      role: m.role,
      content: m.content ?? "",
    }));
  } catch {
    return [];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function extractTopicsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  return TOPIC_KEYWORDS.filter((topic) => lower.includes(topic));
}

function extractEntitiesFromText(text: string): string[] {
  const entities: string[] = [];

  for (const pattern of ENTITY_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const entity = match[1] || match[0];
      if (!entities.includes(entity)) {
        entities.push(entity);
      }
    }
  }

  return entities;
}

/**
 * Clear the summary cache (for testing or after updates).
 */
export function clearSummaryCache(entityId?: string): void {
  if (entityId) {
    summaryCache.delete(`summaries:${entityId}`);
    cacheTimestamps.delete(`summaries:${entityId}`);
  } else {
    summaryCache.clear();
    cacheTimestamps.clear();
  }
}
