import {
  pgTable,
  uuid,
  text,
  jsonb,
  index,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";

// ─── ANALYTICS EVENTS ─────────────────────────────────────────────────────
//
// Tracks activation events for measuring user onboarding success.
// Every event is entity-scoped and includes metadata for analysis.

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    event: text("event").notNull(),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("analytics_events_entity").on(t.entityId),
    index("analytics_events_user").on(t.userId),
    index("analytics_events_event").on(t.event),
    index("analytics_events_entity_event").on(t.entityId, t.event),
  ],
);

export const analyticsEventsRelations = relations(
  analyticsEvents,
  ({ one }) => ({
    entity: one(entities, {
      fields: [analyticsEvents.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── ACTIVATION EVENTS ────────────────────────────────────────────────────
//
// Pre-defined activation events with weights for scoring.

export const ACTIVATION_EVENTS = {
  signup: { weight: 0.10, description: "User created account" },
  setup_business: { weight: 0.15, description: "User entered business info" },
  create_invoice: { weight: 0.30, description: "User created first invoice" },
  see_narrative: { weight: 0.15, description: "User saw AI narrative" },
  import_bank: { weight: 0.20, description: "User imported bank transactions" },
  invite_team: { weight: 0.10, description: "User invited team member" },
} as const;

export type ActivationEvent = keyof typeof ACTIVATION_EVENTS;

// ─── HELPER: Calculate Activation Score ────────────────────────────────────

export function calculateActivationScore(
  completedEvents: string[],
): number {
  let score = 0;
  for (const event of completedEvents) {
    const config = ACTIVATION_EVENTS[event as ActivationEvent];
    if (config) {
      score += config.weight;
    }
  }
  return Math.min(1, score);
}

// ─── HELPER: Get Activation Status ─────────────────────────────────────────

export function getActivationStatus(score: number): {
  level: string;
  label: string;
  color: string;
} {
  if (score >= 1) return { level: "complete", label: "Fully Activated", color: "green" };
  if (score >= 0.75) return { level: "nearly", label: "Nearly There", color: "blue" };
  if (score >= 0.5) return { level: "progress", label: "Almost There", color: "yellow" };
  if (score >= 0.25) return { level: "started", label: "Getting Started", color: "orange" };
  return { level: "new", label: "Not Started", color: "gray" };
}

// ─── HELPER: Get Next Step ─────────────────────────────────────────────────

export function getNextStep(completedEvents: string[]): {
  event: ActivationEvent;
  description: string;
  weight: number;
} | null {
  // Priority order: most impactful first
  const priorityOrder: ActivationEvent[] = [
    "create_invoice",
    "import_bank",
    "see_narrative",
    "setup_business",
    "invite_team",
  ];

  for (const event of priorityOrder) {
    if (!completedEvents.includes(event)) {
      const config = ACTIVATION_EVENTS[event];
      return {
        event,
        description: config.description,
        weight: config.weight,
      };
    }
  }

  return null; // All events completed
}

// ─── NARRATIVE HISTORY ─────────────────────────────────────────────────────
//
// Stores AI-generated financial narratives for historical reference.
// Users can see how narratives change over time.

export const narrativeHistory = pgTable(
  "narrative_history",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    narrativeType: text("narrative_type").notNull(), // 'dashboard', 'pnl', 'balance_sheet', 'cash_flow', 'invoice', 'budget_variance'
    periodId: text("period_id"), // nullable for dashboard/invoice narratives
    summary: text("summary").notNull(),
    highlights: jsonb("highlights").default([]).$type<string[]>(),
    concerns: jsonb("concerns").default([]).$type<string[]>(),
    action: text("action"),
    confidence: real("confidence").default(0.8),
    poweredBy: text("powered_by").default("llm"), // 'llm' or 'fallback'
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("narrative_history_entity").on(t.entityId),
    index("narrative_history_type").on(t.narrativeType),
    index("narrative_history_entity_type").on(t.entityId, t.narrativeType),
    index("narrative_history_entity_period").on(t.entityId, t.periodId),
  ],
);

export const narrativeHistoryRelations = relations(
  narrativeHistory,
  ({ one }) => ({
    entity: one(entities, {
      fields: [narrativeHistory.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── HELPER: Save Narrative to History ─────────────────────────────────────

export async function saveNarrativeHistory(
  db: any,
  params: {
    entityId: string;
    narrativeType: string;
    periodId?: string;
    summary: string;
    highlights: string[];
    concerns: string[];
    action?: string;
    confidence: number;
    poweredBy: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(narrativeHistory).values({
    entityId: params.entityId,
    narrativeType: params.narrativeType,
    periodId: params.periodId ?? null,
    summary: params.summary,
    highlights: params.highlights,
    concerns: params.concerns,
    action: params.action ?? null,
    confidence: params.confidence,
    poweredBy: params.poweredBy,
    metadata: params.metadata ?? {},
  });
}

// ─── HELPER: Get Narrative History ──────────────────────────────────────────

export async function getNarrativeHistory(
  db: any,
  params: {
    entityId: string;
    narrativeType?: string;
    limit?: number;
  },
): Promise<Array<typeof narrativeHistory.$inferSelect>> {
  const { entityId, narrativeType, limit = 10 } = params;

  const conditions = [narrativeHistory.entityId];
  if (narrativeType) {
    conditions.push(narrativeHistory.narrativeType);
  }

  return db.query.narrativeHistory.findMany({
    where: (t: any, { and, eq }: any) => {
      const clauses = [eq(t.entityId, entityId)];
      if (narrativeType) {
        clauses.push(eq(t.narrativeType, narrativeType));
      }
      return and(...clauses);
    },
    orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    limit,
  });
}
