// ─── Session/Context State Management ──────────────────────────────────────
//
// Implements spec Step 11:
//   • Maintains conversation memory within a session (entity in focus,
//     period in focus, last referenced document/transaction)
//   • Expires or resets on entity switch
//   • Feeds back into Step 2 (Intent & Context Resolution) for next turn

import { db } from "@xenboox/db";
import { eq, and, desc } from "drizzle-orm";
import { conversations, chatMessages } from "@xenboox/db/schema/chat";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SessionContext {
  entityId: string;
  entityName: string;
  currency: string;
  periodInFocus: string | null;
  lastDocumentRef: string | null;
  lastTransactionRef: string | null;
  lastAmount: number | null;
  lastAgentId: string | null;
  lastTaskType: string | null;
  lastConfidence: number | null;
  recentTopics: string[];
  turnCount: number;
}

export interface ConversationMemory {
  conversationId: string;
  userId: string;
  entityId: string;
  context: SessionContext;
  messageHistory: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    agentId?: string;
    confidence?: number;
    timestamp: string;
  }>;
  lastUpdated: string;
}

// ─── In-Memory Session Store ───────────────────────────────────────────────
//
// Keeps active session contexts in memory for fast lookups.
// Falls back to DB for cold-start recovery.
// Entries expire after 30 minutes of inactivity.

interface CacheEntry {
  context: ConversationMemory;
  expiresAt: number;
}

const sessionCache = new Map<string, CacheEntry>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_HISTORY_LENGTH = 20; // Keep last 20 messages for context

function getCacheKey(entityId: string, conversationId: string): string {
  return `${entityId}::${conversationId}`;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() > entry.expiresAt;
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Get or create a session context for a conversation.
 * Loads from cache if available, falls back to DB.
 */
export async function getOrCreateSession(
  entityId: string,
  conversationId: string,
  userId: string,
  entityName: string,
  currency: string,
): Promise<ConversationMemory> {
  const cacheKey = getCacheKey(entityId, conversationId);
  const cached = sessionCache.get(cacheKey);

  if (cached && !isExpired(cached)) {
    return cached.context;
  }

  // Try to load from DB
  try {
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.entityId, entityId),
      ),
    });

    const recentMessages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.conversationId, conversationId),
      orderBy: [desc(chatMessages.createdAt)],
      limit: MAX_HISTORY_LENGTH,
    });

    const memory: ConversationMemory = {
      conversationId,
      userId,
      entityId,
      context: {
        entityId,
        entityName,
        currency,
        periodInFocus: extractPeriodFromMessages(recentMessages),
        lastDocumentRef: null,
        lastTransactionRef: null,
        lastAmount: null,
        lastAgentId: extractLastAgentId(recentMessages),
        lastTaskType: extractLastTaskType(recentMessages),
        lastConfidence: extractLastConfidence(recentMessages),
        recentTopics: extractTopics(recentMessages),
        turnCount: conversation?.messageCount ?? recentMessages.length,
      },
      messageHistory: recentMessages
        .reverse() // chronological order
        .map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content ?? "",
          agentId: (m.metadata as Record<string, unknown>)?.agentId as
            string | undefined,
          confidence: m.confidence ?? undefined,
          timestamp: m.createdAt?.toISOString() ?? new Date().toISOString(),
        })),
      lastUpdated: new Date().toISOString(),
    };

    // Cache it
    sessionCache.set(cacheKey, {
      context: memory,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return memory;
  } catch {
    // DB unavailable — create fresh context
    const memory: ConversationMemory = {
      conversationId,
      userId,
      entityId,
      context: createFreshContext(entityId, entityName, currency),
      messageHistory: [],
      lastUpdated: new Date().toISOString(),
    };

    sessionCache.set(cacheKey, {
      context: memory,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return memory;
  }
}

/**
 * Update the session context after a turn.
 */
export function updateSessionAfterTurn(
  session: ConversationMemory,
  update: Partial<SessionContext> & {
    role: "user" | "assistant";
    content: string;
    agentId?: string;
    confidence?: number;
  },
): ConversationMemory {
  // Update context fields
  if (update.periodInFocus !== undefined)
    session.context.periodInFocus = update.periodInFocus;
  if (update.lastDocumentRef !== undefined)
    session.context.lastDocumentRef = update.lastDocumentRef;
  if (update.lastTransactionRef !== undefined)
    session.context.lastTransactionRef = update.lastTransactionRef;
  if (update.lastAmount !== undefined)
    session.context.lastAmount = update.lastAmount;
  if (update.agentId !== undefined)
    session.context.lastAgentId = update.agentId;
  if (update.lastTaskType !== undefined)
    session.context.lastTaskType = update.lastTaskType;
  if (update.confidence !== undefined)
    session.context.lastConfidence = update.confidence;

  // Add to message history
  session.messageHistory.push({
    role: update.role,
    content: update.content,
    agentId: update.agentId,
    confidence: update.confidence,
    timestamp: new Date().toISOString(),
  });

  // Trim history
  if (session.messageHistory.length > MAX_HISTORY_LENGTH) {
    session.messageHistory = session.messageHistory.slice(-MAX_HISTORY_LENGTH);
  }

  session.context.turnCount++;
  session.lastUpdated = new Date().toISOString();

  // Update cache
  const cacheKey = getCacheKey(session.entityId, session.conversationId);
  sessionCache.set(cacheKey, {
    context: session,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  return session;
}

/**
 * Resolve ambiguous references against session history.
 * Returns the resolved context value or null if unresolvable.
 */
export function resolveAmbiguousReference(
  session: ConversationMemory,
  reference: string,
): string | number | null {
  const lower = reference.toLowerCase();

  // "last month" → resolve against session's periodInFocus
  if (/last month|previous month/i.test(lower)) {
    if (session.context.periodInFocus) {
      return shiftPeriod(session.context.periodInFocus, -1);
    }
    return null;
  }

  // "this month" / "current period"
  if (/this month|current period/i.test(lower)) {
    return session.context.periodInFocus ?? getCurrentPeriod();
  }

  // "that invoice" / "the invoice" / "that document"
  if (/that invoice|the invoice|that document|the document/i.test(lower)) {
    return session.context.lastDocumentRef;
  }

  // "that transaction" / "the transaction"
  if (/that transaction|the transaction/i.test(lower)) {
    return session.context.lastTransactionRef;
  }

  return null;
}

/**
 * Reset session context (on entity switch or explicit request).
 */
export function resetSession(session: ConversationMemory): ConversationMemory {
  session.context = createFreshContext(
    session.entityId,
    session.context.entityName,
    session.context.currency,
  );
  session.lastUpdated = new Date().toISOString();
  session.context.turnCount = 0;

  const cacheKey = getCacheKey(session.entityId, session.conversationId);
  sessionCache.delete(cacheKey);

  return session;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createFreshContext(
  entityId: string,
  entityName: string,
  currency: string,
): SessionContext {
  return {
    entityId,
    entityName,
    currency,
    periodInFocus: getCurrentPeriod(),
    lastDocumentRef: null,
    lastTransactionRef: null,
    lastAmount: null,
    lastAgentId: null,
    lastTaskType: null,
    lastConfidence: null,
    recentTopics: [],
    turnCount: 0,
  };
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftPeriod(period: string, delta: number): string {
  const [yearStr, monthStr] = period.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  month += delta;
  if (month < 1) {
    month += 12;
    year -= 1;
  } else if (month > 12) {
    month -= 12;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function extractPeriodFromMessages(
  messages: Array<{ content: string | null }>,
): string | null {
  for (const msg of messages) {
    const match = msg.content?.match(/(\d{4}-\d{2})/);
    if (match) return match[1];
  }
  return getCurrentPeriod();
}

function extractLastAgentId(
  messages: Array<{ metadata: unknown }>,
): string | null {
  for (const msg of messages) {
    const meta = msg.metadata as Record<string, unknown> | null;
    if (meta?.agentId) return meta.agentId as string;
  }
  return null;
}

function extractLastTaskType(
  messages: Array<{ metadata: unknown }>,
): string | null {
  for (const msg of messages) {
    const meta = msg.metadata as Record<string, unknown> | null;
    if (meta?.taskType) return meta.taskType as string;
  }
  return null;
}

function extractLastConfidence(
  messages: Array<{ confidence: number | null }>,
): number | null {
  for (const msg of messages) {
    if (msg.confidence != null) return msg.confidence;
  }
  return null;
}

function extractTopics(messages: Array<{ content: string | null }>): string[] {
  const topics: string[] = [];
  const topicKeywords = [
    "close",
    "payroll",
    "tax",
    "budget",
    "reconciliation",
    "invoice",
    "cash",
    "report",
    "asset",
    "inventory",
  ];
  for (const msg of messages) {
    const content = msg.content?.toLowerCase() ?? "";
    for (const keyword of topicKeywords) {
      if (content.includes(keyword) && !topics.includes(keyword)) {
        topics.push(keyword);
      }
    }
  }
  return topics;
}
