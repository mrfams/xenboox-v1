import crypto from "node:crypto";

import { z } from "zod";
import { eq, and, desc, sql, count, like } from "drizzle-orm";
import {
  opsPrompts,
  opsPromptVersions,
} from "@xenboox/db/schema/ops-prompt-library";

import { router, adminProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";

/** Bump a semver string: 2.3.1 → 2.3.2, 2.3 → 2.3.1, 2 → 2.1. */
function bumpSemver(v: string): string {
  const parts = v.split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join(".");
}

// ─── Prompt Library Router ──────────────────────────────────────────────────

export const promptLibraryRouter = router({
  // ── Get Overview ──────────────────────────────────────────────────────

  getOverview: adminProcedure
    .input(
      z
        .object({
          tab: z.enum(["all", "my", "favorites", "deprecated"]).default("all"),
          search: z.string().optional(),
          agent: z.string().optional(),
          status: z.string().optional(),
          model: z.string().optional(),
          limit: z.number().min(1).max(100).default(10),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const tab = input?.tab ?? "all";
      const search = input?.search;
      const agent = input?.agent;
      const status = input?.status;
      const model = input?.model;
      const limit = input?.limit ?? 10;
      const offset = input?.offset ?? 0;

      // Build conditions
      const conditions = [];
      if (tab === "favorites") conditions.push(eq(opsPrompts.isFavorite, true));
      if (tab === "deprecated")
        conditions.push(eq(opsPrompts.status, "deprecated"));
      if (tab === "my")
        conditions.push(eq(opsPrompts.createdBy, "Famara Touray"));
      if (search) conditions.push(like(opsPrompts.name, `%${search}%`));
      if (agent) conditions.push(eq(opsPrompts.agentName, agent));
      if (status)
        conditions.push(
          eq(opsPrompts.status, status as "active" | "draft" | "deprecated"),
        );
      if (model) conditions.push(eq(opsPrompts.model, model));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      // Count totals
      const totalPrompts = await db
        .select({ count: count() })
        .from(opsPrompts)
        .then((r) => r[0]?.count ?? 0);

      const activeCount = await db
        .select({ count: count() })
        .from(opsPrompts)
        .where(eq(opsPrompts.status, "active"))
        .then((r) => r[0]?.count ?? 0);

      const draftCount = await db
        .select({ count: count() })
        .from(opsPrompts)
        .where(eq(opsPrompts.status, "draft"))
        .then((r) => r[0]?.count ?? 0);

      const deprecatedCount = await db
        .select({ count: count() })
        .from(opsPrompts)
        .where(eq(opsPrompts.status, "deprecated"))
        .then((r) => r[0]?.count ?? 0);

      const avgSuccessRate = await db
        .select({ avg: sql<string>`AVG(${opsPrompts.successRate})` })
        .from(opsPrompts)
        .where(eq(opsPrompts.status, "active"))
        .then((r) => parseFloat(r[0]?.avg ?? "0"));

      const totalUsage = await db
        .select({ total: sql<number>`SUM(${opsPrompts.totalUsage})` })
        .from(opsPrompts)
        .then((r) => r[0]?.total ?? 0);

      // Paginated prompts
      const prompts = await db.query.opsPrompts.findMany({
        where,
        orderBy: [desc(opsPrompts.updatedAt)],
        limit,
        offset,
      });

      const filteredCount = await db
        .select({ count: count() })
        .from(opsPrompts)
        .where(where)
        .then((r) => r[0]?.count ?? 0);

      return {
        summary: {
          totalPrompts,
          activePrompts: activeCount,
          activePercent:
            totalPrompts > 0
              ? ((activeCount / totalPrompts) * 100).toFixed(0)
              : "0",
          draftPrompts: draftCount,
          draftPercent:
            totalPrompts > 0
              ? ((draftCount / totalPrompts) * 100).toFixed(0)
              : "0",
          deprecatedCount,
          deprecatedPercent:
            totalPrompts > 0
              ? ((deprecatedCount / totalPrompts) * 100).toFixed(0)
              : "0",
          avgSuccessRate: avgSuccessRate.toFixed(1),
          totalUsage,
          totalUsageDisplay: totalUsage.toLocaleString(),
        },
        prompts: prompts.map((p) => ({
          id: p.id,
          promptId: p.promptId,
          name: p.name,
          description: p.description,
          agentName: p.agentName,
          model: p.model,
          version: p.version,
          status: p.status,
          successRate: p.successRate,
          totalUsage: p.totalUsage,
          isFavorite: p.isFavorite,
          tags: (p.tags as string[]) ?? [],
          createdBy: p.createdBy,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        total: filteredCount,
        limit,
        offset,
      };
    }),

  // ── Get Prompt Detail ─────────────────────────────────────────────────

  getDetail: adminProcedure
    .input(z.object({ promptId: z.string() }))
    .query(async ({ input }) => {
      const prompt = await db.query.opsPrompts.findFirst({
        where: eq(opsPrompts.promptId, input.promptId),
      });

      if (!prompt) return null;

      const versions = await db.query.opsPromptVersions.findMany({
        where: eq(opsPromptVersions.promptId, input.promptId),
        orderBy: [desc(opsPromptVersions.createdAt)],
      });

      return {
        id: prompt.id,
        promptId: prompt.promptId,
        name: prompt.name,
        description: prompt.description,
        agentName: prompt.agentName,
        model: prompt.model,
        version: prompt.version,
        status: prompt.status,
        successRate: prompt.successRate,
        totalUsage: prompt.totalUsage,
        isFavorite: prompt.isFavorite,
        promptContent: prompt.promptContent,
        tags: (prompt.tags as string[]) ?? [],
        createdBy: prompt.createdBy,
        createdAt: prompt.createdAt,
        updatedAt: prompt.updatedAt,
        versions: versions.map((v) => ({
          version: v.version,
          changelog: v.changelog,
          createdBy: v.createdBy,
          createdAt: v.createdAt,
        })),
      };
    }),

  // ── Create ────────────────────────────────────────────────────────────

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        agentName: z.string().min(1),
        model: z.string().min(1),
        promptContent: z.string().optional(),
        tags: z.array(z.string().max(50)).max(20).optional(),
        status: z.enum(["active", "draft", "deprecated"]).default("draft"),
      }),
    )
    .mutation(async ({ input }) => {
      const promptId = `pr_${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
      const existing = await db
        .select({ count: count() })
        .from(opsPrompts)
        .where(eq(opsPrompts.promptId, promptId))
        .then((r) => r[0]?.count ?? 0);
      if (existing > 0) {
        throw new Error("Generated prompt id collided — retry");
      }
      await db.insert(opsPrompts).values({
        promptId,
        name: input.name,
        description: input.description ?? null,
        agentName: input.agentName,
        model: input.model,
        version: "1.0.0",
        status: input.status,
        promptContent: input.promptContent ?? null,
        tags: input.tags ?? [],
        createdBy: "Famara Touray",
      });
      return { promptId };
    }),

  // ── Update ────────────────────────────────────────────────────────────

  update: adminProcedure
    .input(
      z.object({
        promptId: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        agentName: z.string().min(1).optional(),
        model: z.string().min(1).optional(),
        promptContent: z.string().optional(),
        tags: z.array(z.string().max(50)).max(20).optional(),
        bumpVersion: z.boolean().default(false),
        changelog: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await db.query.opsPrompts.findFirst({
        where: eq(opsPrompts.promptId, input.promptId),
      });
      if (!existing) {
        throw new Error("Prompt not found");
      }

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) patch.name = input.name;
      if (input.description !== undefined)
        patch.description = input.description ?? null;
      if (input.agentName !== undefined) patch.agentName = input.agentName;
      if (input.model !== undefined) patch.model = input.model;
      if (input.promptContent !== undefined)
        patch.promptContent = input.promptContent ?? null;
      if (input.tags !== undefined) patch.tags = input.tags;

      let nextVersion = existing.version;
      if (input.bumpVersion) {
        // Record the current content as a frozen version first.
        await db
          .insert(opsPromptVersions)
          .values({
            promptId: input.promptId,
            version: existing.version,
            promptContent: existing.promptContent ?? "",
            changelog: input.changelog ?? null,
            createdBy: "Famara Touray",
          })
          .onConflictDoNothing();
        nextVersion = bumpSemver(existing.version);
        patch.version = nextVersion;
      }

      await db
        .update(opsPrompts)
        .set(patch)
        .where(eq(opsPrompts.promptId, input.promptId));
      return { ok: true, version: nextVersion };
    }),

  // ── Duplicate ─────────────────────────────────────────────────────────

  duplicate: adminProcedure
    .input(z.object({ promptId: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await db.query.opsPrompts.findFirst({
        where: eq(opsPrompts.promptId, input.promptId),
      });
      if (!existing) throw new Error("Prompt not found");

      const newId = `pr_${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
      await db.insert(opsPrompts).values({
        promptId: newId,
        name: `${existing.name} (copy)`,
        description: existing.description,
        agentName: existing.agentName,
        model: existing.model,
        version: "1.0.0",
        status: "draft",
        successRate: "0",
        totalUsage: 0,
        isFavorite: false,
        promptContent: existing.promptContent,
        tags: (existing.tags as string[]) ?? [],
        createdBy: "Famara Touray",
      });
      return { promptId: newId };
    }),

  // ── Toggle favorite ───────────────────────────────────────────────────

  toggleFavorite: adminProcedure
    .input(z.object({ promptId: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await db.query.opsPrompts.findFirst({
        where: eq(opsPrompts.promptId, input.promptId),
      });
      if (!existing) throw new Error("Prompt not found");
      await db
        .update(opsPrompts)
        .set({ isFavorite: !existing.isFavorite })
        .where(eq(opsPrompts.promptId, input.promptId));
      return { ok: true, isFavorite: !existing.isFavorite };
    }),

  // ── Change status (activate / deprecate / draft) ──────────────────────

  setStatus: adminProcedure
    .input(
      z.object({
        promptId: z.string(),
        status: z.enum(["active", "draft", "deprecated"]),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await db.query.opsPrompts.findFirst({
        where: eq(opsPrompts.promptId, input.promptId),
      });
      if (!existing) throw new Error("Prompt not found");
      await db
        .update(opsPrompts)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(opsPrompts.promptId, input.promptId));
      return { ok: true };
    }),

  // ── Delete ────────────────────────────────────────────────────────────

  remove: adminProcedure
    .input(z.object({ promptId: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await db.query.opsPrompts.findFirst({
        where: eq(opsPrompts.promptId, input.promptId),
      });
      if (!existing) throw new Error("Prompt not found");
      await db
        .delete(opsPrompts)
        .where(eq(opsPrompts.promptId, input.promptId));
      return { ok: true };
    }),

  // ── Seed demo data ────────────────────────────────────────────────────

  seedPromptLibraryData: adminProcedure.mutation(async () => {
    const existing = await db
      .select({ count: count() })
      .from(opsPrompts)
      .then((r) => r[0]?.count ?? 0);

    if (existing > 0) return { seeded: false, reason: "Data exists" };

    const prompts = [
      {
        promptId: "pr_01H7X822Y3A4BC5D6E7F8G9H0",
        name: "Categorize Transaction",
        description:
          "Analyzes a transaction description and determines the most appropriate accounting category based on organization chart of accounts and context.",
        agentName: "Bookkeeping Agent",
        model: "Claude 3.5 Sonnet",
        version: "v2.3.1",
        status: "active" as const,
        successRate: "95.6",
        totalUsage: 18532,
        promptContent:
          "SYSTEM:\nYou are an expert accountant. Your task is to categorize transactions accurately.\n\nGiven the transaction details below, determine the most appropriate category from the provided chart of accounts.\n\nRespond with only the category ID and name.",
        tags: ["categorization", "transactions", "accounting", "bookkeeping"],
        createdBy: "Famara Touray",
      },
      {
        promptId: "pr_02H7X822Y3A4BC5D6E7F8G9H1",
        name: "Extract Invoice Data",
        description:
          "Extract structured data from invoice documents including line items, totals, and vendor information.",
        agentName: "Invoice Processing Agent",
        model: "GPT-4o",
        version: "v1.8.0",
        status: "active" as const,
        successRate: "93.2",
        totalUsage: 24187,
        promptContent:
          "SYSTEM:\nYou are an expert at extracting structured data from invoices.",
        tags: ["extraction", "invoices", "ocr"],
        createdBy: "Famara Touray",
      },
      {
        promptId: "pr_03H7X822Y3A4BC5D6E7F8G9H2",
        name: "Reconcile Transactions",
        description:
          "Match bank transactions with ledger entries for reconciliation.",
        agentName: "Reconciliation Agent",
        model: "Claude 3.5 Sonnet",
        version: "v3.1.4",
        status: "active" as const,
        successRate: "94.8",
        totalUsage: 15671,
        promptContent:
          "SYSTEM:\nYou are an expert at reconciling bank transactions with ledger entries.",
        tags: ["reconciliation", "banking", "matching"],
        createdBy: "Famara Touray",
      },
      {
        promptId: "pr_04H7X822Y3A4BC5D6E7F8G9H3",
        name: "Generate Journal Entry",
        description: "Create journal entry from transaction details.",
        agentName: "Bookkeeping Agent",
        model: "GPT-4o",
        version: "v2.0.2",
        status: "active" as const,
        successRate: "91.7",
        totalUsage: 12943,
        tags: ["journal", "accounting", "entries"],
        createdBy: "Famara Touray",
      },
      {
        promptId: "pr_05H7X822Y3A4BC5D6E7F8G9H4",
        name: "Extract Bank Statement Data",
        description: "Extract transactions from bank statement documents.",
        agentName: "Data Extraction Agent",
        model: "Claude 3.5 Sonnet",
        version: "v1.5.3",
        status: "active" as const,
        successRate: "96.1",
        totalUsage: 21804,
        tags: ["extraction", "banking", "statements"],
        createdBy: "Famara Touray",
      },
      {
        promptId: "pr_06H7X822Y3A4BC5D6E7F8G9H5",
        name: "Tax Category Detection",
        description: "Detect appropriate tax category for transactions.",
        agentName: "Tax Preparation Agent",
        model: "GPT-4o",
        version: "v1.2.0",
        status: "active" as const,
        successRate: "90.3",
        totalUsage: 8712,
        tags: ["tax", "classification"],
        createdBy: "Famara Touray",
      },
      {
        promptId: "pr_07H7X822Y3A4BC5D6E7F8G9H6",
        name: "Vendor Matching",
        description: "Match vendor from name and details.",
        agentName: "AP Automation Agent",
        model: "Claude 3.5 Sonnet",
        version: "v1.1.6",
        status: "draft" as const,
        successRate: "0",
        totalUsage: 0,
        tags: ["vendor", "matching", "ap"],
        createdBy: "Famara Touray",
      },
      {
        promptId: "pr_08H7X822Y3A4BC5D6E7F8G9H7",
        name: "Payroll Deduction Calculation",
        description: "Calculate payroll deductions and taxes.",
        agentName: "Payroll Agent",
        model: "GPT-4o",
        version: "v1.3.2",
        status: "active" as const,
        successRate: "92.5",
        totalUsage: 6392,
        tags: ["payroll", "deductions", "taxes"],
        createdBy: "Famara Touray",
      },
      {
        promptId: "pr_09H7X822Y3A4BC5D6E7F8G9H8",
        name: "Financial Statement Summary",
        description: "Generate summary from financial statements.",
        agentName: "Reporting Agent",
        model: "Claude 3.5 Sonnet",
        version: "v2.0.0",
        status: "deprecated" as const,
        successRate: "0",
        totalUsage: 0,
        tags: ["reporting", "summary"],
        createdBy: "Famara Touray",
      },
      {
        promptId: "pr_10H7X822Y3A4BC5D6E7F8G9H9",
        name: "Cash Flow Classification",
        description:
          "Classify transaction as operating, investing, or financing.",
        agentName: "Cash Flow Agent",
        model: "GPT-4o",
        version: "v1.4.1",
        status: "active" as const,
        successRate: "93.8",
        totalUsage: 9686,
        tags: ["cash-flow", "classification"],
        createdBy: "Famara Touray",
      },
    ];

    for (const p of prompts) {
      const now = new Date();
      const hoursAgo = Math.floor(Math.random() * 120);
      await db.insert(opsPrompts).values({
        ...p,
        isFavorite: Math.random() > 0.7,
        createdAt: new Date(now.getTime() - hoursAgo * 3600000),
        updatedAt: new Date(now.getTime() - hoursAgo * 3600000),
      });
    }

    return { seeded: true };
  }),
});
