/**
 * Tool Registry — Central registry of all available tools.
 *
 * Every tool is registered once. Agents access tools through grants
 * (checked by the tool executor). The registry provides:
 * - Lookup by name
 * - Lookup by agent (via grants)
 * - Schema export for callModel tool definitions
 * - Validation that all tools are properly defined
 *
 * This replaces the dead `core/tools.ts` LangChain tools.
 */

import { z } from "zod";
import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import { toolGrants } from "@xenboox/db/schema/tool-grants";
import type {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  ToolGrant,
} from "./tool-contract";
import { DEFAULT_AGENT_TOOL_CONFIGS } from "./tool-contract";
import {
  validateDoubleEntry as validateDoubleEntryRule,
  type JournalLine,
} from "./accounting-rules";

// ─── Tool Implementations ──────────────────────────────────────────────────

/**
 * validate_double_entry — Validate journal entry lines balance.
 * READ-ONLY: does not write to DB, just validates math.
 */
const validateDoubleEntryTool: ToolDefinition = {
  name: "validate_double_entry",
  description:
    "Validate that journal entry lines balance (debits == credits) and follow double-entry rules. Returns balanced status, totals, and any errors.",
  inputSchema: z.object({
    lines: z.array(
      z.object({
        accountId: z.string().describe("Account ID"),
        debit: z.string().describe("Debit amount as string"),
        credit: z.string().describe("Credit amount as string"),
      }),
    ),
  }),
  execute: async (input) => {
    const result = validateDoubleEntryRule(
      input.lines.map((l: JournalLine) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
      })),
    );

    return {
      success: true,
      data: {
        balanced: result.balanced,
        totalDebit: result.totalDebit,
        totalCredit: result.totalCredit,
        difference: result.difference,
        lineCount: result.lineCount,
        errors: result.errors,
      },
      confidence: result.balanced ? 1.0 : 0.0,
      requiresValidation: false,
    };
  },
  readOnly: true,
  writes: false,
  idempotencyKey: false,
  category: "validation",
};

/**
 * get_account_balance — Get the current balance of a specific account.
 * READ-ONLY: queries GL for posted entries.
 */
const getAccountBalanceTool: ToolDefinition = {
  name: "get_account_balance",
  description:
    "Get the current balance of a specific account by its code. Returns account details and computed balance from posted journal entries.",
  inputSchema: z.object({
    accountCode: z.string().describe("Chart of accounts code (e.g., '1010')"),
  }),
  execute: async (input, ctx) => {
    const { chartOfAccounts, journalEntries, journalEntryLines } =
      await import("@xenboox/db/schema/accounting");

    const account = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.entityId, ctx.entityId),
        eq(chartOfAccounts.code, input.accountCode),
      ),
    });

    if (!account) {
      return {
        success: false,
        error: `Account ${input.accountCode} not found`,
        confidence: 0,
      };
    }

    const entries = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.entityId, ctx.entityId),
        eq(journalEntries.status, "posted"),
      ),
    });

    let balance = 0;
    for (const entry of entries) {
      const lines = await db.query.journalEntryLines.findMany({
        where: eq(journalEntryLines.journalEntryId, entry.id),
      });
      for (const line of lines) {
        if (line.accountId === account.id) {
          balance += Number(line.debit) - Number(line.credit);
        }
      }
    }

    return {
      success: true,
      data: {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        balance,
      },
      confidence: 1.0,
    };
  },
  readOnly: true,
  writes: false,
  idempotencyKey: false,
  category: "read",
};

/**
 * get_journal_entry_lines — Get the lines of a specific journal entry.
 * READ-ONLY
 */
const getJournalEntryLinesTool: ToolDefinition = {
  name: "get_journal_entry_lines",
  description:
    "Get the lines (debits and credits) of a specific journal entry. Returns entry metadata and all line items.",
  inputSchema: z.object({
    entryId: z.string().uuid().describe("Journal entry ID"),
  }),
  execute: async (input, ctx) => {
    const { journalEntries, journalEntryLines } =
      await import("@xenboox/db/schema/accounting");

    const entry = await db.query.journalEntries.findFirst({
      where: and(
        eq(journalEntries.id, input.entryId),
        eq(journalEntries.entityId, ctx.entityId),
      ),
    });

    if (!entry) {
      return {
        success: false,
        error: "Journal entry not found",
        confidence: 0,
      };
    }

    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.journalEntryId, input.entryId),
    });

    return {
      success: true,
      data: {
        entry: {
          id: entry.id,
          entryNumber: entry.entryNumber,
          description: entry.description,
          status: entry.status,
          date: entry.date,
        },
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        })),
      },
      confidence: 1.0,
    };
  },
  readOnly: true,
  writes: false,
  idempotencyKey: false,
  category: "read",
};

/**
 * get_recent_journal_entries — Get recent journal entries.
 * READ-ONLY
 */
const getRecentJournalEntriesTool: ToolDefinition = {
  name: "get_recent_journal_entries",
  description:
    "Get recent journal entries for an entity. Returns entry metadata (no lines). Useful for summarizing recent activity.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max entries to return (default 20)"),
  }),
  execute: async (input, ctx) => {
    const { journalEntries } = await import("@xenboox/db/schema/accounting");

    const entries = await db.query.journalEntries.findMany({
      where: eq(journalEntries.entityId, ctx.entityId),
      orderBy: [journalEntries.createdAt],
      limit: input.limit ?? 20,
    });

    return {
      success: true,
      data: {
        entries: entries.map((e) => ({
          id: e.id,
          entryNumber: e.entryNumber,
          description: e.description,
          status: e.status,
          date: e.date,
          reference: e.reference,
        })),
      },
      confidence: 1.0,
    };
  },
  readOnly: true,
  writes: false,
  idempotencyKey: false,
  category: "read",
};

/**
 * get_account_by_code — Look up a chart of accounts entry by code.
 * READ-ONLY
 */
const getAccountByCodeTool: ToolDefinition = {
  name: "get_account_by_code",
  description:
    "Look up a chart of accounts entry by its code. Returns account details (id, code, name, type, subtype).",
  inputSchema: z.object({
    code: z.string().describe("Account code to look up"),
  }),
  execute: async (input, ctx) => {
    const { chartOfAccounts } = await import("@xenboox/db/schema/accounting");

    const account = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.entityId, ctx.entityId),
        eq(chartOfAccounts.code, input.code),
      ),
    });

    if (!account) {
      return {
        success: false,
        error: `Account ${input.code} not found`,
        confidence: 0,
      };
    }

    return {
      success: true,
      data: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        parentId: account.parentId,
        isActive: account.isActive,
      },
      confidence: 1.0,
    };
  },
  readOnly: true,
  writes: false,
  idempotencyKey: false,
  category: "read",
};

/**
 * start_batch_ingestion — Start a batch document ingestion job.
 * WRITE: creates document records and begins processing pipeline.
 * Returns batch ID for progress tracking.
 */
const startBatchIngestionTool: ToolDefinition = {
  name: "start_batch_ingestion",
  description:
    "Start processing one or more documents through the ingestion pipeline. Use this when the user wants to upload, process, or ingest documents. Returns a batch ID for tracking progress.",
  inputSchema: z.object({
    documents: z
      .array(
        z.object({
          fileName: z.string().describe("Name of the document file"),
          content: z.string().describe("Text content of the document"),
          mimeType: z
            .string()
            .default("text/plain")
            .describe("MIME type of the document"),
          category: z
            .string()
            .optional()
            .describe("Document category (e.g., invoice, receipt, policy)"),
        }),
      )
      .min(1)
      .max(50)
      .describe("Array of documents to process"),
    autoProcess: z
      .boolean()
      .default(true)
      .describe("Whether to start processing immediately"),
  }),
  execute: async (input, ctx) => {
    try {
      // Dynamic import to avoid circular dependencies
      const { db } = await import("@xenboox/db");
      const { documents, auditLog } = await import("@xenboox/db/schema");
      const { processDocumentForRAG } =
        await import("@xenboox/ingestion/engine/embeddings");

      const batchId = crypto.randomUUID();
      const results: Array<{
        documentId: string;
        fileName: string;
        status: string;
        chunksCreated?: number;
      }> = [];

      // Process each document
      for (const doc of input.documents) {
        const documentId = crypto.randomUUID();

        try {
          // Create document record
          await db.insert(documents).values({
            id: documentId,
            entityId: ctx.entityId,
            name: doc.fileName,
            type: doc.mimeType,
            status: "processed",
            ocrText: doc.content,
            metadata: {
              batchId,
              category: doc.category,
              processedBy: "ai-agent",
            },
          });

          // Process for RAG (chunk + embed)
          const ragResult = await processDocumentForRAG(
            documentId,
            ctx.entityId,
            doc.content,
            {
              sourceType: "uploaded_document",
              title: doc.fileName,
              category: doc.category,
            },
          );

          // Log audit entry
          await db.insert(auditLog).values({
            entityId: ctx.entityId,
            action: "batch.document_processed",
            entityType: "document",
            entityIdRef: documentId,
            newValues: {
              batchId,
              fileName: doc.fileName,
              chunksCreated: ragResult.chunksCreated,
              embeddingsGenerated: ragResult.embeddingsGenerated,
            },
          });

          results.push({
            documentId,
            fileName: doc.fileName,
            status: "completed",
            chunksCreated: ragResult.chunksCreated,
          });
        } catch (error) {
          results.push({
            documentId,
            fileName: doc.fileName,
            status: "failed",
          });
        }
      }

      const completedCount = results.filter(
        (r) => r.status === "completed",
      ).length;
      const failedCount = results.filter((r) => r.status === "failed").length;

      return {
        success: true,
        data: {
          batchId,
          totalDocuments: input.documents.length,
          completedDocuments: completedCount,
          failedDocuments: failedCount,
          documents: results,
          message:
            failedCount > 0
              ? `Processed ${completedCount} of ${input.documents.length} documents. ${failedCount} failed.`
              : `Successfully processed ${completedCount} document${completedCount !== 1 ? "s" : ""}.`,
        },
        confidence: completedCount / input.documents.length,
      };
    } catch (error) {
      return {
        success: false,
        error: `Batch ingestion failed: ${error instanceof Error ? error.message : String(error)}`,
        confidence: 0,
      };
    }
  },
  readOnly: false,
  writes: true,
  idempotencyKey: true,
  category: "write",
};

/**
 * search_knowledge — Search the knowledge base using semantic search.
 * READ-ONLY: queries document chunks with vector similarity + keyword matching.
 * Returns relevant chunks with citations for audit trail.
 */
const searchKnowledgeBaseTool: ToolDefinition = {
  name: "search_knowledge",
  description:
    "Search the company's knowledge base for relevant information. Use this when the user asks about policies, procedures, contracts, reports, or any document-based information. Returns relevant text chunks with source citations.",
  inputSchema: z.object({
    query: z.string().describe("Search query to find relevant knowledge"),
    topK: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Max results to return (default 5)"),
    sourceType: z
      .enum(["knowledge_document", "uploaded_document", "journal_entry"])
      .optional()
      .describe("Filter by source type"),
  }),
  execute: async (input, ctx) => {
    try {
      // Dynamic import to avoid circular dependencies
      const { retrieve, formatStructuredCitations } =
        await import("@xenboox/ingestion/engine/retrieval");

      const result = await retrieve(input.query, {
        entityId: ctx.entityId,
        agentName: "cfo-agent",
        topK: input.topK ?? 5,
        minScore: 0.3,
        sourceType: input.sourceType,
        method: "hybrid",
      });

      return {
        success: true,
        data: {
          chunks: result.chunks.map((chunk) => ({
            content: chunk.content,
            sourceType: chunk.sourceType,
            score: chunk.score,
            method: chunk.method,
          })),
          totalChunks: result.totalChunks,
          citations: formatStructuredCitations(result.chunks),
          method: result.method,
          durationMs: result.durationMs,
        },
        confidence: result.chunks.length > 0 ? 0.9 : 0.5,
      };
    } catch (error) {
      return {
        success: false,
        error: `Knowledge base search failed: ${error instanceof Error ? error.message : String(error)}`,
        confidence: 0,
      };
    }
  },
  readOnly: true,
  writes: false,
  idempotencyKey: false,
  category: "rag",
};

/**
 * query_knowledge_graph — Query entity relationships from the knowledge graph.
 * READ-ONLY: traverses graph to find connected entities.
 * Returns nodes, edges, and relationship paths for AI reasoning.
 */
const queryKnowledgeGraphTool: ToolDefinition = {
  name: "query_knowledge_graph",
  description:
    "Query the company's knowledge graph to find relationships between entities. Use this when the user asks about connections between companies, invoices, accounts, transactions, or any entity relationships. Returns connected nodes and relationship paths.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Natural language query about entity relationships"),
    nodeType: z
      .string()
      .optional()
      .describe("Filter by node type (e.g., invoice, account, bank_account)"),
    limit: z.number().int().min(1).max(50).optional().describe("Max results"),
  }),
  execute: async (input, ctx) => {
    try {
      const { db } = await import("@xenboox/db");
      const { kgNodes, kgEdges } = await import("@xenboox/db/schema");
      const { eq, and, sql, desc, inArray } = await import("drizzle-orm");

      // Search for relevant nodes
      const searchPattern = `%${input.query}%`;
      const where = input.nodeType
        ? and(
            eq(kgNodes.entityId, ctx.entityId),
            sql`${kgNodes.label} ILIKE ${searchPattern}`,
            eq(kgNodes.nodeType, input.nodeType),
          )
        : and(
            eq(kgNodes.entityId, ctx.entityId),
            sql`${kgNodes.label} ILIKE ${searchPattern}`,
          );

      const nodes = await db
        .select({
          id: kgNodes.id,
          nodeType: kgNodes.nodeType,
          label: kgNodes.label,
          description: kgNodes.description,
          internalId: kgNodes.internalId,
          relationshipCount: kgNodes.relationshipCount,
        })
        .from(kgNodes)
        .where(where)
        .orderBy(desc(kgNodes.relationshipCount))
        .limit(input.limit ?? 10);

      if (nodes.length === 0) {
        return {
          success: true,
          data: { nodes: [], edges: [], message: "No matching entities found" },
          confidence: 0.3,
        };
      }

      // Get relationships for found nodes
      const nodeIds = nodes.map((n) => n.id);
      const edges = await db
        .select({
          sourceId: kgEdges.sourceId,
          targetId: kgEdges.targetId,
          relationType: kgEdges.relationType,
          relationLabel: kgEdges.relationLabel,
          weight: kgEdges.weight,
        })
        .from(kgEdges)
        .where(and(eq(kgEdges.entityId, ctx.entityId)))
        .limit(50);

      // Filter edges to only those involving our nodes
      const relevantEdges = edges.filter(
        (e) => nodeIds.includes(e.sourceId) || nodeIds.includes(e.targetId),
      );

      // Get connected node IDs
      const connectedIds = [
        ...relevantEdges.map((e) => e.sourceId),
        ...relevantEdges.map((e) => e.targetId),
      ].filter((id) => !nodeIds.includes(id));

      // Get connected node details
      const connectedNodes =
        connectedIds.length > 0
          ? await db
              .select({
                id: kgNodes.id,
                nodeType: kgNodes.nodeType,
                label: kgNodes.label,
              })
              .from(kgNodes)
              .where(
                and(
                  eq(kgNodes.entityId, ctx.entityId),
                  inArray(kgNodes.id, [...new Set(connectedIds)]),
                ),
              )
          : [];

      return {
        success: true,
        data: {
          queryNodes: nodes.map((n) => ({
            id: n.id,
            type: n.nodeType,
            label: n.label,
            description: n.description,
            connections: n.relationshipCount,
          })),
          relationships: relevantEdges.map((e) => ({
            from: e.sourceId,
            to: e.targetId,
            type: e.relationType,
            label: e.relationLabel,
            weight: parseFloat(e.weight ?? "1"),
          })),
          connectedEntities: connectedNodes.map((n) => ({
            id: n.id,
            type: n.nodeType,
            label: n.label,
          })),
          totalFound: nodes.length,
          totalRelationships: relevantEdges.length,
        },
        confidence: nodes.length > 0 ? 0.85 : 0.3,
      };
    } catch (error) {
      return {
        success: false,
        error: `Knowledge graph query failed: ${error instanceof Error ? error.message : String(error)}`,
        confidence: 0,
      };
    }
  },
  readOnly: true,
  writes: false,
  idempotencyKey: false,
  category: "rag",
};

/**
 * create_tax_rule — Create a tax rule for any country.
 * WRITE: inserts into jurisdiction_tax_rules table.
 * The user says "add 15% VAT for Nigeria" and the agent creates it.
 */
const createTaxRuleTool: ToolDefinition = {
  name: "create_tax_rule",
  description:
    "Create a tax rule for a specific country. Use this when the user wants to add, create, or set up a tax (VAT, sales tax, PAYE, withholding, corporate, social security, etc.). Supports any country via 2-letter ISO code. The rule starts as 'active' immediately.",
  inputSchema: z.object({
    country: z
      .string()
      .length(2)
      .toUpperCase()
      .describe("ISO 3166-1 alpha-2 country code (e.g. 'NG', 'US', 'GB')"),
    ruleType: z
      .enum([
        "vat", "sales_tax", "paye", "withholding", "corporate",
        "social_security", "excise", "property", "capital_gains",
        "customs", "digital_services", "payroll_tax", "wealth",
        "environmental", "health", "unemployment", "tourist",
        "stamp_duty", "gift", "inheritance", "license_fee", "other",
      ])
      .describe("Type of tax rule"),
    name: z.string().min(2).max(120).describe("Name of the tax (e.g. 'NG VAT 7.5%')"),
    rate: z.number().min(0).max(1).describe("Tax rate as decimal (e.g. 0.075 for 7.5%)"),
    appliesTo: z
      .enum(["sales", "purchases", "payroll", "income", "other"])
      .default("sales")
      .describe("What this tax applies to"),
    description: z.string().max(500).optional().describe("Description of the tax rule"),
    effectiveFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Effective from date (YYYY-MM-DD). Defaults to today."),
  }),
  execute: async (input, ctx) => {
    try {
      const { jurisdictionTaxRules } = await import("@xenboox/db/schema/tax-compliance");
      const { and: drizzleAnd, eq: drizzleEq, desc: drizzleDesc } = await import("drizzle-orm");

      // Check for existing active rule with same identity
      const existing = await db.query.jurisdictionTaxRules.findFirst({
        where: drizzleAnd(
          drizzleEq(jurisdictionTaxRules.entityId, ctx.entityId),
          drizzleEq(jurisdictionTaxRules.country, input.country),
          drizzleEq(jurisdictionTaxRules.ruleType, input.ruleType),
          drizzleEq(jurisdictionTaxRules.name, input.name),
          drizzleEq(jurisdictionTaxRules.status, "active"),
        ),
        orderBy: [drizzleDesc(jurisdictionTaxRules.version)],
      });

      if (existing) {
        return {
          success: false,
          error: `A tax rule named "${input.name}" already exists for ${input.country} (v${existing.version}). Edit the existing rule or use a different name.`,
          confidence: 0.9,
        };
      }

      // Determine version (continue sequence if previously superseded)
      const latest = await db.query.jurisdictionTaxRules.findFirst({
        where: drizzleAnd(
          drizzleEq(jurisdictionTaxRules.entityId, ctx.entityId),
          drizzleEq(jurisdictionTaxRules.country, input.country),
          drizzleEq(jurisdictionTaxRules.ruleType, input.ruleType),
          drizzleEq(jurisdictionTaxRules.name, input.name),
        ),
        orderBy: [drizzleDesc(jurisdictionTaxRules.version)],
      });
      const version = latest ? latest.version + 1 : 1;

      const today = new Date().toISOString().slice(0, 10);

      const [rule] = await db
        .insert(jurisdictionTaxRules)
        .values({
          entityId: ctx.entityId,
          country: input.country,
          ruleType: input.ruleType,
          version,
          name: input.name,
          description: input.description ?? null,
          appliesTo: input.appliesTo,
          rateOrBands: { type: "rate", rate: input.rate },
          effectiveFrom: input.effectiveFrom ?? today,
          effectiveTo: null,
          status: "active",
          proposedBy: ctx.actorId ?? null,
          approvedBy: ctx.actorId ?? null,
          approvedAt: new Date(),
          notes: `Created by AI agent`,
        })
        .returning();

      return {
        success: true,
        data: {
          ruleId: rule.id,
          country: input.country,
          ruleType: input.ruleType,
          name: input.name,
          rate: `${(input.rate * 100).toFixed(1)}%`,
          appliesTo: input.appliesTo,
          effectiveFrom: input.effectiveFrom ?? today,
          version,
          status: "active",
        },
        confidence: 1.0,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create tax rule: ${error instanceof Error ? error.message : String(error)}`,
        confidence: 0,
      };
    }
  },
  readOnly: false,
  writes: true,
  idempotencyKey: false,
  category: "write",
};

/**
 * install_tax_presets — Install a country's preset tax pack.
 * WRITE: inserts multiple rules from the preset catalog.
 * The user says "install Nigerian taxes" and the agent installs VAT, PAYE, WHT, corporate.
 */
const installTaxPresetsTool: ToolDefinition = {
  name: "install_tax_presets",
  description:
    "Install a country's preset tax rules. Use this when the user wants to set up taxes for a new country using pre-built statutory rates. Supported countries: GM (Gambia), SN (Senegal), US (United States), NG (Nigeria), KE (Kenya), GH (Ghana), GB (United Kingdom), ZA (South Africa). Each country has VAT, PAYE, withholding, corporate, and social security presets.",
  inputSchema: z.object({
    country: z
      .string()
      .length(2)
      .toUpperCase()
      .describe("ISO 3166-1 alpha-2 country code"),
  }),
  execute: async (input, ctx) => {
    try {
      const { getTaxPresetsForCountry } = await import("./tax-presets");
      const { installPresetsForEntity } = await import("@/server/lib/tax-install");

      const catalog = getTaxPresetsForCountry(input.country);
      if (catalog.length === 0) {
        return {
          success: false,
          error: `No preset tax rules available for ${input.country}. You can create custom rules with the create_tax_rule tool.`,
          confidence: 0.9,
        };
      }

      const { installed, skipped, installedNames } = await installPresetsForEntity({
        entityId: ctx.entityId,
        country: input.country,
        presets: catalog,
        actorId: ctx.actorId ?? "ai-agent",
      });

      return {
        success: true,
        data: {
          country: input.country,
          totalPresets: catalog.length,
          installed,
          skipped,
          installedNames,
          message:
            skipped > 0
              ? `Installed ${installed} tax rules for ${input.country}. ${skipped} were already configured.`
              : `Installed ${installed} tax rules for ${input.country}.`,
        },
        confidence: installed > 0 ? 1.0 : 0.5,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to install tax presets: ${error instanceof Error ? error.message : String(error)}`,
        confidence: 0,
      };
    }
  },
  readOnly: false,
  writes: true,
  idempotencyKey: true,
  category: "write",
};

// ─── Registry ──────────────────────────────────────────────────────────────

/**
 * All registered tools. Add new tools here.
 */
const REGISTERED_TOOLS: ToolDefinition[] = [
  validateDoubleEntryTool,
  getAccountBalanceTool,
  getJournalEntryLinesTool,
  getRecentJournalEntriesTool,
  getAccountByCodeTool,
  searchKnowledgeBaseTool,
  startBatchIngestionTool,
  queryKnowledgeGraphTool,
  createTaxRuleTool,
  installTaxPresetsTool,
];

/**
 * Map for O(1) lookup by name.
 */
const TOOL_MAP: Map<string, ToolDefinition> = new Map(
  REGISTERED_TOOLS.map((t) => [t.name, t]),
);

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Get a tool definition by name.
 */
export function getTool(name: string): ToolDefinition | undefined {
  return TOOL_MAP.get(name);
}

/**
 * Get all registered tools.
 */
export function getAllTools(): ToolDefinition[] {
  return [...REGISTERED_TOOLS];
}

/**
 * Get tools by category.
 */
export function getToolsByCategory(
  category: ToolDefinition["category"],
): ToolDefinition[] {
  return REGISTERED_TOOLS.filter((t) => t.category === category);
}

/**
 * Get read-only tools (safe for any agent).
 */
export function getReadOnlyTools(): ToolDefinition[] {
  return REGISTERED_TOOLS.filter((t) => t.readOnly);
}

/**
 * Get write tools (require explicit grant).
 */
export function getWriteTools(): ToolDefinition[] {
  return REGISTERED_TOOLS.filter((t) => t.writes);
}

/**
 * Convert a ToolDefinition to the format expected by callModel's tools param.
 * Used when building the tool list for an agent's LLM call.
 */
export function toolToCallModelFormat(tool: ToolDefinition): {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
} {
  // Convert zod schema to JSON Schema for callModel
  const zodShape = (tool.inputSchema as z.ZodObject<z.ZodRawShape>).shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, schema] of Object.entries(zodShape)) {
    const isOptional = schema instanceof z.ZodOptional;
    const innerSchema = isOptional ? schema.unwrap() : schema;

    properties[key] = {
      type:
        innerSchema instanceof z.ZodString
          ? "string"
          : innerSchema instanceof z.ZodNumber
            ? "number"
            : innerSchema instanceof z.ZodBoolean
              ? "boolean"
              : "string",
      description: (schema as any)._def?.description ?? key,
    };

    if (!isOptional) {
      required.push(key);
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties,
      required,
    },
  };
}

/**
 * Get all tools as callModel format, for a specific agent.
 * Filters by the agent's default grants.
 */
export function getToolsForAgent(agentName: string): Array<{
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}> {
  const config =
    DEFAULT_AGENT_TOOL_CONFIGS[agentName] ??
    DEFAULT_AGENT_TOOL_CONFIGS._default;

  return config.allowedTools
    .map((name) => TOOL_MAP.get(name))
    .filter(Boolean)
    .map((tool) => toolToCallModelFormat(tool!));
}

/**
 * Check if a tool exists in the registry.
 */
export function toolExists(name: string): boolean {
  return TOOL_MAP.has(name);
}

/**
 * Get registry stats for monitoring.
 */
export function getRegistryStats(): {
  totalTools: number;
  readOnly: number;
  writeTools: number;
  validationTools: number;
  reportingTools: number;
  ragTools: number;
} {
  const tools = [...REGISTERED_TOOLS];
  return {
    totalTools: tools.length,
    readOnly: tools.filter((t) => t.readOnly).length,
    writeTools: tools.filter((t) => t.writes).length,
    validationTools: tools.filter((t) => t.category === "validation").length,
    reportingTools: tools.filter((t) => t.category === "reporting").length,
    ragTools: tools.filter((t) => t.category === "rag").length,
  };
}
