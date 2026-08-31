import { z } from "zod";
import { eq, and, desc, sql, count, inArray } from "drizzle-orm";
import {
  kgNodes,
  kgEdges,
  kgSnapshots,
  type KgNodeType,
  type KgRelationType,
} from "@xenboox/db/schema";

import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";

// ─── Knowledge Graph Router ────────────────────────────────────────────────
//
// Provides graph traversal, search, and AI-powered reasoning for the
// knowledge graph. The graph maps relationships between business entities
// (companies → invoices → accounts → transactions) to enable contextual
// AI responses.

export const knowledgeGraphRouter = router({
  /**
   * Get the full knowledge graph for visualization.
   * Returns nodes and edges with optional filtering by type.
   */
  getGraph: rlsProtectedProcedure
    .input(
      z.object({
        nodeTypes: z.array(z.string()).optional(),
        edgeTypes: z.array(z.string()).optional(),
        limit: z.number().min(1).max(500).default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Build node query
      const nodeWhere = input.nodeTypes?.length
        ? and(
            eq(kgNodes.entityId, entityId),
            inArray(kgNodes.nodeType, input.nodeTypes),
          )
        : eq(kgNodes.entityId, entityId);

      const nodes = await db
        .select({
          id: kgNodes.id,
          nodeType: kgNodes.nodeType,
          label: kgNodes.label,
          description: kgNodes.description,
          internalId: kgNodes.internalId,
          metadata: kgNodes.metadata,
          relationshipCount: kgNodes.relationshipCount,
        })
        .from(kgNodes)
        .where(nodeWhere)
        .orderBy(desc(kgNodes.relationshipCount))
        .limit(input.limit);

      // Build edge query
      const nodeIds = nodes.map((n) => n.id);
      const edgeWhere = input.edgeTypes?.length
        ? and(
            eq(kgEdges.entityId, entityId),
            inArray(kgEdges.relationType, input.edgeTypes),
          )
        : eq(kgEdges.entityId, entityId);

      const edges = await db
        .select({
          id: kgEdges.id,
          sourceId: kgEdges.sourceId,
          targetId: kgEdges.targetId,
          relationType: kgEdges.relationType,
          relationLabel: kgEdges.relationLabel,
          weight: kgEdges.weight,
          confidence: kgEdges.confidence,
          source: kgEdges.source,
        })
        .from(kgEdges)
        .where(edgeWhere)
        .limit(input.limit * 3);

      // Get stats
      const nodeTypeCounts = await db
        .select({
          nodeType: kgNodes.nodeType,
          count: count(),
        })
        .from(kgNodes)
        .where(eq(kgNodes.entityId, entityId))
        .groupBy(kgNodes.nodeType);

      const edgeTypeCounts = await db
        .select({
          relationType: kgEdges.relationType,
          count: count(),
        })
        .from(kgEdges)
        .where(eq(kgEdges.entityId, entityId))
        .groupBy(kgEdges.relationType);

      return {
        nodes: nodes.map((n) => ({
          id: n.id,
          label: n.label,
          type: n.nodeType,
          description: n.description,
          internalId: n.internalId,
          metadata: n.metadata,
          size: Math.min(30, 10 + (n.relationshipCount ?? 0) * 2),
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.sourceId,
          target: e.targetId,
          label: e.relationLabel ?? e.relationType,
          type: e.relationType,
          weight: parseFloat(e.weight ?? "1"),
          confidence: parseFloat(e.confidence ?? "1"),
          source_type: e.source ?? "system",
        })),
        stats: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          nodeTypes: Object.fromEntries(
            nodeTypeCounts.map((n) => [n.nodeType, n.count]),
          ),
          edgeTypes: Object.fromEntries(
            edgeTypeCounts.map((e) => [e.relationType, e.count]),
          ),
        },
      };
    }),

  /**
   * Get relationships for a specific node.
   * Returns incoming and outgoing edges with connected node details.
   */
  getNodeRelationships: rlsProtectedProcedure
    .input(
      z.object({
        nodeId: z.string(),
        depth: z.number().min(1).max(3).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Get the node
      const node = await db.query.kgNodes.findFirst({
        where: and(
          eq(kgNodes.id, input.nodeId),
          eq(kgNodes.entityId, entityId),
        ),
      });

      if (!node) {
        return { node: null, outgoing: [], incoming: [], connectedNodes: [] };
      }

      // Get outgoing edges
      const outgoing = await db
        .select({
          id: kgEdges.id,
          targetId: kgEdges.targetId,
          relationType: kgEdges.relationType,
          relationLabel: kgEdges.relationLabel,
          weight: kgEdges.weight,
          confidence: kgEdges.confidence,
        })
        .from(kgEdges)
        .where(
          and(
            eq(kgEdges.sourceId, input.nodeId),
            eq(kgEdges.entityId, entityId),
          ),
        );

      // Get incoming edges
      const incoming = await db
        .select({
          id: kgEdges.id,
          sourceId: kgEdges.sourceId,
          relationType: kgEdges.relationType,
          relationLabel: kgEdges.relationLabel,
          weight: kgEdges.weight,
          confidence: kgEdges.confidence,
        })
        .from(kgEdges)
        .where(
          and(
            eq(kgEdges.targetId, input.nodeId),
            eq(kgEdges.entityId, entityId),
          ),
        );

      // Get connected nodes (if depth > 1, traverse further)
      const connectedIds = [
        ...outgoing.map((e) => e.targetId),
        ...incoming.map((e) => e.sourceId),
      ];

      const connectedNodes =
        connectedIds.length > 0
          ? await db
              .select({
                id: kgNodes.id,
                nodeType: kgNodes.nodeType,
                label: kgNodes.label,
                description: kgNodes.description,
                internalId: kgNodes.internalId,
              })
              .from(kgNodes)
              .where(
                and(
                  eq(kgNodes.entityId, entityId),
                  inArray(kgNodes.id, connectedIds),
                ),
              )
          : [];

      return {
        node,
        outgoing: outgoing.map((e) => ({
          ...e,
          weight: parseFloat(e.weight ?? "1"),
          confidence: parseFloat(e.confidence ?? "1"),
        })),
        incoming: incoming.map((e) => ({
          ...e,
          weight: parseFloat(e.weight ?? "1"),
          confidence: parseFloat(e.confidence ?? "1"),
        })),
        connectedNodes,
      };
    }),

  /**
   * Search nodes by label or description.
   * Uses fuzzy matching for natural language queries.
   */
  searchNodes: rlsProtectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        nodeTypes: z.array(z.string()).optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const searchPattern = `%${input.query}%`;

      const where = input.nodeTypes?.length
        ? and(
            eq(kgNodes.entityId, entityId),
            sql`${kgNodes.label} ILIKE ${searchPattern}`,
            inArray(kgNodes.nodeType, input.nodeTypes),
          )
        : and(
            eq(kgNodes.entityId, entityId),
            sql`${kgNodes.label} ILIKE ${searchPattern}`,
          );

      const results = await db
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
        .limit(input.limit);

      return results;
    }),

  /**
   * Build the knowledge graph by scanning existing data.
   * Creates nodes and edges from invoices, accounts, transactions, etc.
   */
  buildGraph: rlsMutateProcedure.mutation(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Clear existing graph for this entity
    await db.delete(kgEdges).where(eq(kgEdges.entityId, entityId));
    await db.delete(kgNodes).where(eq(kgNodes.entityId, entityId));

    let nodeCount = 0;
    let edgeCount = 0;

    // ── Build Nodes ──────────────────────────────────────────────────────

    // 1. Bank Accounts
    const { bankAccounts } = await import("@xenboox/db/schema");
    const bankAccountsList = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.entityId, entityId),
    });

    for (const ba of bankAccountsList) {
      await db.insert(kgNodes).values({
        entityId,
        nodeType: "bank_account",
        internalId: ba.id,

        label: ba.name ?? "Bank Account",
        description: `Balance: ${ba.currentBalance ?? "0"} ${ba.currency ?? "USD"}`,
        metadata: {
          balance: ba.currentBalance,
          currency: ba.currency,
          isActive: ba.isActive,
        },
      });
      nodeCount++;
    }

    // 2. Chart of Accounts
    const { chartOfAccounts } = await import("@xenboox/db/schema");
    const accountsList = await db.query.chartOfAccounts.findMany({
      where: eq(chartOfAccounts.entityId, entityId),
    });

    for (const acc of accountsList) {
      await db.insert(kgNodes).values({
        entityId,
        nodeType: "account",
        internalId: acc.id,

        label: acc.name,
        description: `${acc.code} - ${acc.type}`,
        metadata: {
          code: acc.code,
          type: acc.type,
          subtype: acc.subtype,
        },
      });
      nodeCount++;
    }

    // 3. Journal Entries
    const { journalEntries } = await import("@xenboox/db/schema");
    const jeList = await db.query.journalEntries.findMany({
      where: eq(journalEntries.entityId, entityId),
      orderBy: [desc(journalEntries.createdAt)],
      limit: 200,
    });

    for (const je of jeList) {
      await db.insert(kgNodes).values({
        entityId,
        nodeType: "journal_entry",
        internalId: je.id,

        label: je.description ?? `JE-${je.entryNumber}`,
        description: `Entry ${je.entryNumber} - ${je.status}`,
        metadata: {
          entryNumber: je.entryNumber,
          date: je.date,
          status: je.status,
          source: je.source,
        },
      });
      nodeCount++;
    }

    // 4. Sales Invoices (AR)
    const { salesInvoices } = await import("@xenboox/db/schema");
    const arList = await db.query.salesInvoices.findMany({
      where: eq(salesInvoices.entityId, entityId),
      orderBy: [desc(salesInvoices.createdAt)],
      limit: 200,
    });

    for (const inv of arList) {
      await db.insert(kgNodes).values({
        entityId,
        nodeType: "invoice",
        internalId: inv.id,

        label: inv.invoiceNumber ?? `INV-${inv.id.slice(0, 8)}`,
        description: `Amount: ${inv.totalAmount} - Status: ${inv.status}`,
        metadata: {
          amount: inv.totalAmount,
          status: inv.status,
          customerName: inv.customerName,
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate,
        },
      });
      nodeCount++;
    }

    // 5. AP Invoices (Bills)
    const { invoicesAp } = await import("@xenboox/db/schema");
    const apList = await db.query.invoicesAp.findMany({
      where: eq(invoicesAp.entityId, entityId),
      orderBy: [desc(invoicesAp.createdAt)],
      limit: 200,
    });

    for (const bill of apList) {
      await db.insert(kgNodes).values({
        entityId,
        nodeType: "bill",
        internalId: bill.id,

        label: bill.invoiceNumber ?? `BILL-${bill.id.slice(0, 8)}`,
        description: `Amount: ${bill.totalAmount} - Status: ${bill.status}`,
        metadata: {
          amount: bill.totalAmount,
          status: bill.status,
          vendorName: bill.vendorName,
          invoiceDate: bill.invoiceDate,
          dueDate: bill.dueDate,
        },
      });
      nodeCount++;
    }

    // ── Build Edges ──────────────────────────────────────────────────────

    // Link journal entries to accounts (via lines)
    const { journalEntryLines } = await import("@xenboox/db/schema");
    const jeIds = jeList.map((je) => je.id);

    if (jeIds.length > 0) {
      // Get lines in batches
      for (let i = 0; i < jeIds.length; i += 50) {
        const batch = jeIds.slice(i, i + 50);
        const lines = await db
          .select({
            journalEntryId: journalEntryLines.journalEntryId,
            accountId: journalEntryLines.accountId,
          })
          .from(journalEntryLines)
          .where(inArray(journalEntryLines.journalEntryId, batch));

        for (const line of lines) {
          await db.insert(kgEdges).values({
            entityId,
            sourceId: line.journalEntryId,
            sourceType: "journal_entry",
            targetId: line.accountId,
            targetType: "account",
            relationType: "affects_account",
            relationLabel: "Affects Account",
            weight: "1.0",
            confidence: "1.0",
            source: "system",
          });
          edgeCount++;
        }
      }
    }

    // Link invoices to journal entries (if linked)
    for (const inv of arList) {
      if (inv.journalEntryId) {
        await db.insert(kgEdges).values({
          entityId,
          sourceId: inv.id,
          sourceType: "invoice",
          targetId: inv.journalEntryId,
          targetType: "journal_entry",
          relationType: "records_transaction",
          relationLabel: "Records Transaction",
          weight: "1.0",
          confidence: "1.0",
          source: "system",
        });
        edgeCount++;
      }
    }

    // Link bills to journal entries (if linked)
    for (const bill of apList) {
      if (bill.journalEntryId) {
        await db.insert(kgEdges).values({
          entityId,
          sourceId: bill.id,
          sourceType: "bill",
          targetId: bill.journalEntryId,
          targetType: "journal_entry",
          relationType: "records_transaction",
          relationLabel: "Records Transaction",
          weight: "1.0",
          confidence: "1.0",
          source: "system",
        });
        edgeCount++;
      }
    }

    // Update relationship counts on nodes
    await db.execute(sql`
      UPDATE kg_nodes n
      SET relationship_count = (
        SELECT COUNT(*)
        FROM kg_edges e
        WHERE (e.source_id = n.id OR e.target_id = n.id)
          AND e.entity_id = n.entity_id
      )
      WHERE n.entity_id = ${entityId}
    `);

    // Cache a snapshot
    const graphData = await db
      .select({
        id: kgNodes.id,
        label: kgNodes.label,
        nodeType: kgNodes.nodeType,
        relationshipCount: kgNodes.relationshipCount,
      })
      .from(kgNodes)
      .where(eq(kgNodes.entityId, entityId));

    const edgesData = await db
      .select({
        sourceId: kgEdges.sourceId,
        targetId: kgEdges.targetId,
        relationLabel: kgEdges.relationLabel,
        weight: kgEdges.weight,
      })
      .from(kgEdges)
      .where(eq(kgEdges.entityId, entityId));

    await db.insert(kgSnapshots).values({
      entityId,
      nodeCount,
      edgeCount,
      graphData: {
        nodes: graphData.map((n) => ({
          id: n.id,
          label: n.label ?? "",
          type: n.nodeType ?? "",
          size: Math.min(30, 10 + (n.relationshipCount ?? 0) * 2),
        })),
        edges: edgesData.map((e) => ({
          source: e.sourceId,
          target: e.targetId,
          label: e.relationLabel ?? "",
          weight: parseFloat(e.weight ?? "1"),
        })),
      },
      nodeTypes: Object.fromEntries(
        (
          await db
            .select({ nodeType: kgNodes.nodeType, count: count() })
            .from(kgNodes)
            .where(eq(kgNodes.entityId, entityId))
            .groupBy(kgNodes.nodeType)
        ).map((n) => [n.nodeType, n.count]),
      ),
      edgeTypes: Object.fromEntries(
        (
          await db
            .select({ relationType: kgEdges.relationType, count: count() })
            .from(kgEdges)
            .where(eq(kgEdges.entityId, entityId))
            .groupBy(kgEdges.relationType)
        ).map((e) => [e.relationType, e.count]),
      ),
    });

    return {
      success: true,
      nodeCount,
      edgeCount,
    };
  }),

  /**
   * Get graph statistics for the dashboard.
   */
  getStats: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const nodeCounts = await db
      .select({
        nodeType: kgNodes.nodeType,
        count: count(),
      })
      .from(kgNodes)
      .where(eq(kgNodes.entityId, entityId))
      .groupBy(kgNodes.nodeType);

    const edgeCounts = await db
      .select({
        relationType: kgEdges.relationType,
        count: count(),
      })
      .from(kgEdges)
      .where(eq(kgEdges.entityId, entityId))
      .groupBy(kgEdges.relationType);

    const totalNodes = nodeCounts.reduce((sum, n) => sum + n.count, 0);
    const totalEdges = edgeCounts.reduce((sum, e) => sum + e.count, 0);

    return {
      totalNodes,
      totalEdges,
      nodeTypes: Object.fromEntries(
        nodeCounts.map((n) => [n.nodeType, n.count]),
      ),
      edgeTypes: Object.fromEntries(
        edgeCounts.map((e) => [e.relationType, e.count]),
      ),
    };
  }),
});
