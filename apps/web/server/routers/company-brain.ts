import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  knowledgeSources,
  knowledgeDocuments,
  knowledgeConversations,
  knowledgePopularQuestions,
  knowledgeConnections,
  knowledgeNodes,
  knowledgeActivity,
  knowledgeTopTopics,
} from "@xenboox/db/schema";
import { db } from "@xenboox/db";

import { router, adminProcedure } from "@/lib/trpc/server";

export const companyBrainRouter = router({
  // Get dashboard overview with KPIs
  getOverview: adminProcedure
    .input(
      z.object({
        days: z.number().default(7),
      }),
    )
    .query(async ({ input }: { input: { days: number } }) => {
      const { days } = input;

      // Get source count
      const [sourcesResult] = await db
        .select({ count: count() })
        .from(knowledgeSources);

      // Get document count
      const [docsResult] = await db
        .select({ count: count() })
        .from(knowledgeDocuments);

      // Get conversations in last 7 days
      const sevenDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const [conversationsResult] = await db
        .select({ count: count() })
        .from(knowledgeConversations)
        .where(sql`${knowledgeConversations.createdAt} >= ${sevenDaysAgo}`);

      // Get answers generated (conversations with answers)
      const [answersResult] = await db
        .select({ count: count() })
        .from(knowledgeConversations)
        .where(
          and(
            sql`${knowledgeConversations.createdAt} >= ${sevenDaysAgo}`,
            sql`${knowledgeConversations.answer} IS NOT NULL`,
          ),
        );

      // Get connections count
      const [connectionsResult] = await db
        .select({ count: count() })
        .from(knowledgeConnections);

      // Get average confidence
      const [confidenceResult] = await db
        .select({
          avg: sql<number>`coalesce(avg(${knowledgeConversations.confidence}), 0)`,
        })
        .from(knowledgeConversations)
        .where(sql`${knowledgeConversations.createdAt} >= ${sevenDaysAgo}`);

      return {
        kpis: {
          knowledgeSources: sourcesResult?.count ?? 0,
          sourcesDelta: 3,
          documents: docsResult?.count ?? 0,
          documentsDelta: 1248,
          conversations: conversationsResult?.count ?? 0,
          conversationsDelta: 18,
          answersGenerated: answersResult?.count ?? 0,
          answersDelta: 22,
          knowledgeConnections: connectionsResult?.count ?? 0,
          connectionsDelta: 9,
          avgConfidence: confidenceResult?.avg
            ? Math.round(confidenceResult.avg)
            : 92,
          confidenceDelta: 4,
        },
      };
    }),

  // Get knowledge sources
  getSources: adminProcedure.query(async () => {
    const sources = await db
      .select()
      .from(knowledgeSources)
      .orderBy(desc(knowledgeSources.documentCount));

    return sources.map((s: any) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      status: s.status,
      documentCount: s.documentCount,
      lastSyncedAt: s.lastSyncedAt,
    }));
  }),

  // Get popular questions
  getPopularQuestions: adminProcedure.query(async () => {
    const questions = await db
      .select()
      .from(knowledgePopularQuestions)
      .orderBy(desc(knowledgePopularQuestions.askCount))
      .limit(5);

    return questions.map((q: any) => ({
      id: q.id,
      question: q.question,
      category: q.category,
      askCount: q.askCount,
    }));
  }),

  // Get recent activity
  getActivity: adminProcedure
    .input(z.object({ limit: z.number().default(6) }))
    .query(async ({ input }: { input: { limit: number } }) => {
      const { limit } = input;

      const activity = await db
        .select()
        .from(knowledgeActivity)
        .orderBy(desc(knowledgeActivity.createdAt))
        .limit(limit);

      return activity.map((a: any) => ({
        id: a.id,
        activityType: a.activityType,
        title: a.title,
        source: a.source,
        createdAt: a.createdAt,
      }));
    }),

  // Get top connected topics
  getTopTopics: adminProcedure.query(async () => {
    const topics = await db
      .select()
      .from(knowledgeTopTopics)
      .orderBy(desc(knowledgeTopTopics.connectionCount))
      .limit(5);

    return topics.map((t: any) => ({
      id: t.id,
      topic: t.topic,
      connectionCount: t.connectionCount,
      category: t.category,
    }));
  }),

  // Get knowledge graph nodes
  getGraphNodes: adminProcedure.query(async () => {
    const nodes = await db
      .select()
      .from(knowledgeNodes)
      .orderBy(knowledgeNodes.name);

    return nodes.map((n: any) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      category: n.category,
      connectionCount: n.connectionCount,
      x: n.x ? parseFloat(n.x) : null,
      y: n.y ? parseFloat(n.y) : null,
    }));
  }),

  // Get knowledge graph edges
  getGraphEdges: adminProcedure.query(async () => {
    const edges = await db.select().from(knowledgeConnections);

    return edges.map((e: any) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      relationship: e.relationship,
      weight: e.weight,
    }));
  }),

  // Seed demo data
  seedDemoData: adminProcedure.mutation(async () => {
    // Clear existing data
    await db.delete(knowledgeTopTopics);
    await db.delete(knowledgeActivity);
    await db.delete(knowledgeNodes);
    await db.delete(knowledgeConnections);
    await db.delete(knowledgePopularQuestions);
    await db.delete(knowledgeConversations);
    await db.delete(knowledgeDocuments);
    await db.delete(knowledgeSources);

    const now = new Date();

    // Seed knowledge sources
    const sourcesData = [
      {
        name: "Notion",
        type: "notion" as const,
        status: "active" as const,
        documentCount: 2384,
        lastSyncedAt: new Date(now.getTime() - 5 * 60 * 1000),
      },
      {
        name: "Confluence",
        type: "confluence" as const,
        status: "active" as const,
        documentCount: 1742,
        lastSyncedAt: new Date(now.getTime() - 12 * 60 * 1000),
      },
      {
        name: "Google Drive",
        type: "google_drive" as const,
        status: "active" as const,
        documentCount: 6821,
        lastSyncedAt: new Date(now.getTime() - 18 * 60 * 1000),
      },
      {
        name: "Slack",
        type: "slack" as const,
        status: "active" as const,
        documentCount: 12540,
        lastSyncedAt: new Date(now.getTime() - 2 * 60 * 1000),
      },
      {
        name: "GitHub",
        type: "github" as const,
        status: "active" as const,
        documentCount: 1155,
        lastSyncedAt: new Date(now.getTime() - 30 * 60 * 1000),
      },
      {
        name: "Gmail",
        type: "gmail" as const,
        status: "active" as const,
        documentCount: 24118,
        lastSyncedAt: new Date(now.getTime() - 6 * 60 * 1000),
      },
    ];
    await db.insert(knowledgeSources).values(sourcesData);

    // Seed popular questions
    const questionsData = [
      {
        question: "What is our refund policy for failed transactions?",
        category: "Support",
        askCount: 142,
      },
      {
        question: "How does our invoice reconciliation workflow work?",
        category: "Finance",
        askCount: 98,
      },
      {
        question: "What are the steps to deploy a new agent?",
        category: "Engineering",
        askCount: 67,
      },
      {
        question: "Where can I find the brand guidelines?",
        category: "Design",
        askCount: 55,
      },
      {
        question: "How do we onboard a new enterprise customer?",
        category: "Sales",
        askCount: 48,
      },
    ];
    await db.insert(knowledgePopularQuestions).values(questionsData);

    // Seed recent activity
    const activityData = [
      {
        activityType: "document_indexed",
        title: "Product Roadmap Q2 2025.pdf",
        source: "Google Drive",
      },
      {
        activityType: "message_indexed",
        title: "#engineering - new-agent-arch",
        source: "Slack",
      },
      {
        activityType: "page_updated",
        title: "Agent Deployment Guide",
        source: "Confluence",
      },
      {
        activityType: "email_indexed",
        title: "Re: Enterprise Onboarding Flow",
        source: "Gmail",
      },
      {
        activityType: "repo_indexed",
        title: "xenboox/agent-orchestrator",
        source: "GitHub",
      },
      {
        activityType: "page_indexed",
        title: "Company OKRs 2025",
        source: "Notion",
      },
    ];
    await db.insert(knowledgeActivity).values(activityData);

    // Seed top topics
    const topicsData = [
      {
        topic: "Invoice Reconciliation",
        connectionCount: 1248,
        category: "Finance",
      },
      {
        topic: "Agent Workflows",
        connectionCount: 1102,
        category: "Engineering",
      },
      { topic: "Customer Onboarding", connectionCount: 896, category: "Sales" },
      { topic: "Refund Policy", connectionCount: 754, category: "Support" },
      { topic: "Bank Feeds", connectionCount: 642, category: "Finance" },
    ];
    await db.insert(knowledgeTopTopics).values(topicsData);

    // Seed graph nodes
    const nodesData = [
      {
        name: "Xenboox",
        type: "central",
        category: "core",
        connectionCount: 15,
        x: "200",
        y: "300",
      },
      {
        name: "Customers",
        type: "category",
        category: "customers",
        connectionCount: 8,
        x: "80",
        y: "200",
      },
      {
        name: "Finance",
        type: "category",
        category: "finance",
        connectionCount: 10,
        x: "300",
        y: "200",
      },
      {
        name: "Operations",
        type: "category",
        category: "operations",
        connectionCount: 7,
        x: "100",
        y: "400",
      },
      {
        name: "Engineering",
        type: "category",
        category: "engineering",
        connectionCount: 9,
        x: "350",
        y: "400",
      },
      {
        name: "Product",
        type: "category",
        category: "product",
        connectionCount: 6,
        x: "250",
        y: "450",
      },
      {
        name: "Invoicing",
        type: "topic",
        category: "finance",
        connectionCount: 4,
        x: "350",
        y: "150",
      },
      {
        name: "Reconciliation",
        type: "topic",
        category: "finance",
        connectionCount: 5,
        x: "400",
        y: "250",
      },
      {
        name: "Reports",
        type: "topic",
        category: "finance",
        connectionCount: 3,
        x: "380",
        y: "300",
      },
      {
        name: "Taxes",
        type: "topic",
        category: "finance",
        connectionCount: 3,
        x: "280",
        y: "150",
      },
      {
        name: "Onboarding",
        type: "topic",
        category: "customers",
        connectionCount: 4,
        x: "100",
        y: "120",
      },
      {
        name: "Support",
        type: "topic",
        category: "customers",
        connectionCount: 3,
        x: "150",
        y: "150",
      },
      {
        name: "Contracts",
        type: "topic",
        category: "customers",
        connectionCount: 2,
        x: "50",
        y: "250",
      },
      {
        name: "Feedback",
        type: "topic",
        category: "customers",
        connectionCount: 2,
        x: "120",
        y: "300",
      },
      {
        name: "Agents",
        type: "topic",
        category: "engineering",
        connectionCount: 5,
        x: "420",
        y: "380",
      },
      {
        name: "Workflows",
        type: "topic",
        category: "engineering",
        connectionCount: 4,
        x: "400",
        y: "420",
      },
      {
        name: "API",
        type: "topic",
        category: "engineering",
        connectionCount: 3,
        x: "380",
        y: "460",
      },
      {
        name: "Infrastructure",
        type: "topic",
        category: "engineering",
        connectionCount: 3,
        x: "420",
        y: "480",
      },
      {
        name: "Policies",
        type: "topic",
        category: "operations",
        connectionCount: 3,
        x: "60",
        y: "380",
      },
      {
        name: "Processes",
        type: "topic",
        category: "operations",
        connectionCount: 2,
        x: "80",
        y: "450",
      },
      {
        name: "Legal",
        type: "topic",
        category: "operations",
        connectionCount: 2,
        x: "120",
        y: "480",
      },
      {
        name: "HR",
        type: "topic",
        category: "operations",
        connectionCount: 2,
        x: "50",
        y: "350",
      },
      {
        name: "Roadmap",
        type: "topic",
        category: "product",
        connectionCount: 3,
        x: "200",
        y: "480",
      },
      {
        name: "Features",
        type: "topic",
        category: "product",
        connectionCount: 2,
        x: "280",
        y: "500",
      },
      {
        name: "Research",
        type: "topic",
        category: "product",
        connectionCount: 2,
        x: "320",
        y: "480",
      },
    ];
    await db.insert(knowledgeNodes).values(nodesData);

    // Seed graph edges
    const edgesData = [
      {
        sourceNodeId: "Xenboox",
        targetNodeId: "Customers",
        relationship: "serves",
        weight: 8,
      },
      {
        sourceNodeId: "Xenboox",
        targetNodeId: "Finance",
        relationship: "manages",
        weight: 10,
      },
      {
        sourceNodeId: "Xenboox",
        targetNodeId: "Operations",
        relationship: "supports",
        weight: 7,
      },
      {
        sourceNodeId: "Xenboox",
        targetNodeId: "Engineering",
        relationship: "builds",
        weight: 9,
      },
      {
        sourceNodeId: "Xenboox",
        targetNodeId: "Product",
        relationship: "creates",
        weight: 6,
      },
      {
        sourceNodeId: "Finance",
        targetNodeId: "Invoicing",
        relationship: "includes",
        weight: 4,
      },
      {
        sourceNodeId: "Finance",
        targetNodeId: "Reconciliation",
        relationship: "includes",
        weight: 5,
      },
      {
        sourceNodeId: "Finance",
        targetNodeId: "Reports",
        relationship: "includes",
        weight: 3,
      },
      {
        sourceNodeId: "Finance",
        targetNodeId: "Taxes",
        relationship: "includes",
        weight: 3,
      },
      {
        sourceNodeId: "Customers",
        targetNodeId: "Onboarding",
        relationship: "process",
        weight: 4,
      },
      {
        sourceNodeId: "Customers",
        targetNodeId: "Support",
        relationship: "provides",
        weight: 3,
      },
      {
        sourceNodeId: "Customers",
        targetNodeId: "Contracts",
        relationship: "manages",
        weight: 2,
      },
      {
        sourceNodeId: "Customers",
        targetNodeId: "Feedback",
        relationship: "collects",
        weight: 2,
      },
      {
        sourceNodeId: "Engineering",
        targetNodeId: "Agents",
        relationship: "builds",
        weight: 5,
      },
      {
        sourceNodeId: "Engineering",
        targetNodeId: "Workflows",
        relationship: "creates",
        weight: 4,
      },
      {
        sourceNodeId: "Engineering",
        targetNodeId: "API",
        relationship: "exposes",
        weight: 3,
      },
      {
        sourceNodeId: "Engineering",
        targetNodeId: "Infrastructure",
        relationship: "runs",
        weight: 3,
      },
      {
        sourceNodeId: "Operations",
        targetNodeId: "Policies",
        relationship: "defines",
        weight: 3,
      },
      {
        sourceNodeId: "Operations",
        targetNodeId: "Processes",
        relationship: "documents",
        weight: 2,
      },
      {
        sourceNodeId: "Operations",
        targetNodeId: "Legal",
        relationship: "complies",
        weight: 2,
      },
      {
        sourceNodeId: "Operations",
        targetNodeId: "HR",
        relationship: "manages",
        weight: 2,
      },
      {
        sourceNodeId: "Product",
        targetNodeId: "Roadmap",
        relationship: "plans",
        weight: 3,
      },
      {
        sourceNodeId: "Product",
        targetNodeId: "Features",
        relationship: "defines",
        weight: 2,
      },
      {
        sourceNodeId: "Product",
        targetNodeId: "Research",
        relationship: "conducts",
        weight: 2,
      },
    ];
    await db.insert(knowledgeConnections).values(edgesData);

    // Seed some conversations
    const conversationsData = Array.from({ length: 20 }, (_, i) => ({
      question: `Sample question ${i + 1} about company knowledge`,
      answer: `This is a sample answer generated by the Company Brain for question ${i + 1}.`,
      confidence: (0.7 + Math.random() * 0.3).toFixed(2),
      sourcesUsed: ["Notion", "Confluence"],
      helpful: Math.random() > 0.3,
    }));
    await db.insert(knowledgeConversations).values(conversationsData);

    return { success: true };
  }),
});
