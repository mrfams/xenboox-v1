import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  featureFlags,
  featureFlagAuditLog,
  featureFlagRolloutHistory,
} from "@xenboox/db/schema";
import { db } from "@xenboox/db";

import { router, adminProcedure } from "@/lib/trpc/server";

export const featureFlagsRouter = router({
  // Get dashboard overview with KPIs
  getOverview: adminProcedure
    .input(
      z.object({
        days: z.number().default(7),
      }),
    )
    .query(async ({ input }: { input: { days: number } }) => {
      const { days } = input;

      // Get flag counts by status
      const [totalFlagsResult] = await db
        .select({ count: count() })
        .from(featureFlags);

      const [enabledFlagsResult] = await db
        .select({ count: count() })
        .from(featureFlags)
        .where(eq(featureFlags.status, "on"));

      const [disabledFlagsResult] = await db
        .select({ count: count() })
        .from(featureFlags)
        .where(eq(featureFlags.status, "off"));

      const [scheduledFlagsResult] = await db
        .select({ count: count() })
        .from(featureFlags)
        .where(eq(featureFlags.status, "scheduled"));

      const [experimentsResult] = await db
        .select({ count: count() })
        .from(featureFlags)
        .where(eq(featureFlags.type, "experiment"));

      // Get audit events in last 7 days
      const sevenDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const [auditEventsResult] = await db
        .select({ count: count() })
        .from(featureFlagAuditLog)
        .where(sql`${featureFlagAuditLog.createdAt} >= ${sevenDaysAgo}`);

      const total = totalFlagsResult?.count ?? 0;
      const enabled = enabledFlagsResult?.count ?? 0;
      const disabled = disabledFlagsResult?.count ?? 0;

      return {
        kpis: {
          totalFlags: total,
          totalFlagsDelta: 4,
          enabledFlags: enabled,
          enabledPercent: total > 0 ? Math.round((enabled / total) * 100) : 0,
          disabledFlags: disabled,
          disabledPercent: total > 0 ? Math.round((disabled / total) * 100) : 0,
          scheduledFlags: scheduledFlagsResult?.count ?? 0,
          scheduledDelta: 1,
          experiments: experimentsResult?.count ?? 0,
          experimentsDelta: 1,
          auditEvents: auditEventsResult?.count ?? 0,
          auditEventsDelta: 18,
        },
      };
    }),

  // Get flags list
  getFlags: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tab: z
          .enum(["all", "release", "experiment", "ops", "internal"])
          .default("all"),
        status: z.string().optional(),
        type: z.string().optional(),
        environment: z.string().optional(),
        owner: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
      }),
    )
    .query(async ({ input }: { input: any }) => {
      const { search, tab, status, type, environment, owner, page, pageSize } =
        input;
      const offset = (page - 1) * pageSize;

      // Build conditions
      const conditions: any[] = [];

      if (tab !== "all") {
        conditions.push(eq(featureFlags.type, tab as any));
      }
      if (status) {
        conditions.push(eq(featureFlags.status, status as any));
      }
      if (type) {
        conditions.push(eq(featureFlags.type, type as any));
      }
      if (search) {
        conditions.push(
          sql`(${featureFlags.name} ILIKE ${`%${search}%`} OR ${featureFlags.key} ILIKE ${`%${search}%`})`,
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(featureFlags)
        .where(where);

      const total = totalResult?.count ?? 0;

      // Get flags
      const flags = await db
        .select()
        .from(featureFlags)
        .where(where)
        .orderBy(desc(featureFlags.updatedAt))
        .limit(pageSize)
        .offset(offset);

      return {
        flags: flags.map((f: any) => ({
          id: f.id,
          name: f.name,
          key: f.key,
          description: f.description,
          type: f.type,
          status: f.status,
          environments: f.environments,
          rolloutPercent: f.rolloutPercent,
          targetingRules: f.targetingRules,
          ownerName: f.ownerName,
          ownerAvatar: f.ownerAvatar,
          tags: f.tags,
          scheduledAt: f.scheduledAt,
          totalEvaluations: f.totalEvaluations,
          trueEvaluations: f.trueEvaluations,
          falseEvaluations: f.falseEvaluations,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get flag detail
  getFlagDetail: adminProcedure
    .input(z.object({ flagId: z.string() }))
    .query(async ({ input }: { input: { flagId: string } }) => {
      const { flagId } = input;

      const [flag] = await db
        .select()
        .from(featureFlags)
        .where(eq(featureFlags.id, flagId))
        .limit(1);

      if (!flag) {
        throw new Error("Feature flag not found");
      }

      // Get audit log
      const auditLog = await db
        .select()
        .from(featureFlagAuditLog)
        .where(eq(featureFlagAuditLog.flagId, flagId))
        .orderBy(desc(featureFlagAuditLog.createdAt))
        .limit(20);

      // Get rollout history
      const rolloutHistory = await db
        .select()
        .from(featureFlagRolloutHistory)
        .where(eq(featureFlagRolloutHistory.flagId, flagId))
        .orderBy(featureFlagRolloutHistory.createdAt);

      return {
        flag: {
          id: flag.id,
          name: flag.name,
          key: flag.key,
          description: flag.description,
          type: flag.type,
          status: flag.status,
          environments: flag.environments,
          rolloutPercent: flag.rolloutPercent,
          targetingRules: flag.targetingRules,
          ownerName: flag.ownerName,
          ownerAvatar: flag.ownerAvatar,
          tags: flag.tags,
          scheduledAt: flag.scheduledAt,
          remoteConfig: flag.remoteConfig,
          totalEvaluations: flag.totalEvaluations,
          trueEvaluations: flag.trueEvaluations,
          falseEvaluations: flag.falseEvaluations,
          createdAt: flag.createdAt,
          updatedAt: flag.updatedAt,
        },
        auditLog: auditLog.map((a: any) => ({
          id: a.id,
          action: a.action,
          performedBy: a.performedBy,
          field: a.field,
          oldValue: a.oldValue,
          newValue: a.newValue,
          createdAt: a.createdAt,
        })),
        rolloutHistory: rolloutHistory.map((r: any) => ({
          id: r.id,
          rolloutPercent: r.rolloutPercent,
          changedBy: r.changedBy,
          createdAt: r.createdAt,
        })),
      };
    }),

  // Seed demo data
  seedDemoData: adminProcedure.mutation(async () => {
    // Clear existing data
    await db.delete(featureFlagRolloutHistory);
    await db.delete(featureFlagAuditLog);
    await db.delete(featureFlags);

    const now = new Date();

    // Seed flags
    const flagsData = [
      {
        name: "Next-gen reconciliation agent",
        key: "ai.reconciliation.v2",
        description:
          "Enable next-generation reconciliation agent with improved accuracy and performance.",
        type: "release" as const,
        status: "on" as const,
        environments: ["prod", "stg", "dev"],
        rolloutPercent: 75,
        ownerName: "F. Touray",
        ownerAvatar: null,
        tags: ["ai", "reconciliation", "agent"],
        totalEvaluations: 1480000,
        trueEvaluations: 1110000,
        falseEvaluations: 370000,
      },
      {
        name: "ML extraction for invoices",
        key: "smart.invoice.extraction",
        description: "Smart invoice extraction using ML models.",
        type: "release" as const,
        status: "on" as const,
        environments: ["prod", "stg", "dev"],
        rolloutPercent: 100,
        ownerName: "A. Jallow",
        ownerAvatar: null,
        tags: ["ai", "invoices"],
        totalEvaluations: 890000,
        trueEvaluations: 890000,
        falseEvaluations: 0,
      },
      {
        name: "New bank feed connectors",
        key: "bank.feeds.beta",
        description: "New bank feed connectors for improved data ingestion.",
        type: "experiment" as const,
        status: "on" as const,
        environments: ["prod", "stg"],
        rolloutPercent: 50,
        ownerName: "M. Njie",
        ownerAvatar: null,
        tags: ["banking", "beta"],
        totalEvaluations: 245000,
        trueEvaluations: 122500,
        falseEvaluations: 122500,
      },
      {
        name: "Enable multi-entity orgs",
        key: "multi.entity.support",
        description: "Enable multi-entity organization support.",
        type: "release" as const,
        status: "off" as const,
        environments: ["stg", "dev"],
        rolloutPercent: 0,
        ownerName: "F. Touray",
        ownerAvatar: null,
        tags: ["enterprise", "multi-entity"],
        totalEvaluations: 0,
        trueEvaluations: 0,
        falseEvaluations: 0,
      },
      {
        name: "AI suggested journal entries",
        key: "ai.journal.suggestions",
        description: "AI-suggested journal entries for faster bookkeeping.",
        type: "release" as const,
        status: "on" as const,
        environments: ["prod", "stg", "dev"],
        rolloutPercent: 25,
        ownerName: "A. Jallow",
        ownerAvatar: null,
        tags: ["ai", "accounting"],
        totalEvaluations: 567000,
        trueEvaluations: 141750,
        falseEvaluations: 425250,
      },
      {
        name: "Advanced financial reports",
        key: "advanced.reporting",
        description: "Advanced financial reporting with custom templates.",
        type: "release" as const,
        status: "scheduled" as const,
        environments: ["prod"],
        rolloutPercent: 100,
        scheduledAt: new Date(now.getTime() + 14 * 60 * 60 * 1000),
        ownerName: "M. Njie",
        ownerAvatar: null,
        tags: ["reporting"],
        totalEvaluations: 0,
        trueEvaluations: 0,
        falseEvaluations: 0,
      },
      {
        name: "Automated tax compliance",
        key: "tax.compliance.checker",
        description: "Automated tax compliance checking for all jurisdictions.",
        type: "release" as const,
        status: "on" as const,
        environments: ["prod", "stg"],
        rolloutPercent: 80,
        ownerName: "F. Touray",
        ownerAvatar: null,
        tags: ["tax", "compliance"],
        totalEvaluations: 345000,
        trueEvaluations: 276000,
        falseEvaluations: 69000,
      },
      {
        name: "Improved receipt matching",
        key: "receipt.matching.v2",
        description: "Enhanced receipt matching with ML models.",
        type: "experiment" as const,
        status: "on" as const,
        environments: ["stg", "dev"],
        rolloutPercent: 30,
        ownerName: "A. Jallow",
        ownerAvatar: null,
        tags: ["ai", "receipts"],
        totalEvaluations: 178000,
        trueEvaluations: 53400,
        falseEvaluations: 124600,
      },
      {
        name: "Legacy data importer",
        key: "legacy.importer",
        description: "Import data from legacy accounting systems.",
        type: "ops" as const,
        status: "off" as const,
        environments: ["prod", "stg", "dev"],
        rolloutPercent: 0,
        ownerName: "M. Njie",
        ownerAvatar: null,
        tags: ["migration", "legacy"],
        totalEvaluations: 0,
        trueEvaluations: 0,
        falseEvaluations: 0,
      },
      {
        name: "Next-gen dashboard UI",
        key: "new.ui.dashboard",
        description: "Next-generation dashboard UI with improved performance.",
        type: "release" as const,
        status: "on" as const,
        environments: ["prod"],
        rolloutPercent: 10,
        ownerName: "F. Touray",
        ownerAvatar: null,
        tags: ["ui", "dashboard"],
        totalEvaluations: 45000,
        trueEvaluations: 4500,
        falseEvaluations: 40500,
      },
    ];

    const insertedFlags = await db
      .insert(featureFlags)
      .values(flagsData)
      .returning();

    // Seed audit log
    if (insertedFlags.length > 0) {
      await db.insert(featureFlagAuditLog).values([
        {
          flagId: insertedFlags[0].id,
          action: "created",
          performedBy: "F. Touray",
          metadata: {},
        },
        {
          flagId: insertedFlags[0].id,
          action: "enabled",
          performedBy: "F. Touray",
          metadata: {},
        },
        {
          flagId: insertedFlags[0].id,
          action: "rollout_updated",
          performedBy: "F. Touray",
          field: "rolloutPercent",
          oldValue: "50",
          newValue: "75",
          metadata: {},
        },
      ]);

      // Seed rollout history
      await db.insert(featureFlagRolloutHistory).values([
        {
          flagId: insertedFlags[0].id,
          rolloutPercent: 10,
          changedBy: "F. Touray",
        },
        {
          flagId: insertedFlags[0].id,
          rolloutPercent: 25,
          changedBy: "F. Touray",
        },
        {
          flagId: insertedFlags[0].id,
          rolloutPercent: 50,
          changedBy: "F. Touray",
        },
        {
          flagId: insertedFlags[0].id,
          rolloutPercent: 75,
          changedBy: "F. Touray",
        },
      ]);
    }

    return { success: true, count: flagsData.length };
  }),
});
