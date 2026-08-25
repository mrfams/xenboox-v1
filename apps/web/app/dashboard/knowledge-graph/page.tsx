"use client";

import { useState } from "react";
import {
  Network,
  Sparkles,
  RefreshCw,
  Search,
  ArrowRight,
  Building2,
  FileText,
  Banknote,
  Landmark,
  Users,
  TrendingUp,
  Loader2,
  X,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { useModuleAi } from "@/components/module/module-ai-context";
import { GraphVisualization } from "@/components/knowledge/graph-visualization";

// ─── Knowledge Graph Page ──────────────────────────────────────────────────
//
// Interactive knowledge graph for visualizing entity relationships.
// Shows how companies, invoices, accounts, and transactions are connected.
// Enables AI-powered reasoning over the business graph.

type GraphNode = {
  id: string;
  label: string;
  type: string;
  description: string | null;
  internalId: string;
  size: number;
  metadata: Record<string, unknown> | null;
};

const NODE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  company: Building2,
  invoice: FileText,
  bill: FileText,
  account: Landmark,
  bank_account: Banknote,
  employee: Users,
  vendor: Building2,
  customer: Users,
  transaction: TrendingUp,
  journal_entry: FileText,
  tax: FileText,
  budget: TrendingUp,
  asset: Building2,
  contract: FileText,
};

export default function KnowledgeGraphPage() {
  const { entityId, entityCurrency } = useEntity();
  const { openWithFocus } = useModuleAi();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const {
    data: graphData,
    isLoading: isGraphLoading,
    refetch: refetchGraph,
  } = trpc.knowledgeGraph.getGraph.useQuery(
    { limit: 200 },
    { enabled: !!entityId },
  );

  const { data: stats, isLoading: isStatsLoading } =
    trpc.knowledgeGraph.getStats.useQuery(undefined, {
      enabled: !!entityId,
    });

  const buildGraphMutation = trpc.knowledgeGraph.buildGraph.useMutation({
    onSuccess: () => refetchGraph(),
  });

  const { data: nodeRelationships, isLoading: isRelationshipsLoading } =
    trpc.knowledgeGraph.getNodeRelationships.useQuery(
      { nodeId: selectedNode?.id ?? "", depth: 1 },
      { enabled: !!selectedNode?.id },
    );

  const handleSelectNode = (node: GraphNode) => {
    setSelectedNode(node);
  };

  const handleBuildGraph = () => {
    buildGraphMutation.mutate();
  };

  const askAboutNode = (node: GraphNode) => {
    openWithFocus(
      {
        kind: "Knowledge Graph",
        name: node.label,
        id: node.id,
        fields: [
          { label: "Type", value: node.type.replace(/_/g, " ") },
          { label: "Description", value: node.description ?? "—" },
          { label: "Internal ID", value: node.internalId },
        ],
      },
      `Explain this ${node.type.replace(/_/g, " ")}: ${node.label}. What are its relationships and recent activity?`,
    );
  };

  return (
    <ModulePageShell
      title="Knowledge Graph"
      description="Visualize entity relationships. AI-powered graph reasoning."
      icon={Network}
      aiSuggestions={[
        {
          label: "Show me all invoices related to GTBank",
          prompt: "Show me all invoices related to GTBank",
        },
        {
          label: "What accounts are affected by recent transactions?",
          prompt: "What accounts are affected by recent transactions?",
        },
        {
          label: "Trace the flow of money from sales to bank",
          prompt: "Trace the flow of money from sales to bank",
        },
      ]}
    >
      <div className="space-y-6 p-3 pb-20 sm:p-6 md:pb-6">
        {/* Stats bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {isStatsLoading
                  ? "Loading..."
                  : `${stats?.totalNodes ?? 0} nodes`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">
                {isStatsLoading ? "..." : `${stats?.totalEdges ?? 0} edges`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBuildGraph}
            disabled={buildGraphMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {buildGraphMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {buildGraphMutation.isPending ? "Building..." : "Build Graph"}
          </button>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Graph visualization */}
          <div className="lg:col-span-2">
            <GraphVisualization
              data={graphData}
              onSelectNode={handleSelectNode}
              isLoading={isGraphLoading}
              onBuildGraph={handleBuildGraph}
            />
          </div>

          {/* Node details panel */}
          <div className="space-y-4">
            {selectedNode ? (
              <NodeDetailsPanel
                node={selectedNode}
                relationships={nodeRelationships}
                isLoading={isRelationshipsLoading}
                onAskAbout={askAboutNode}
                onClose={() => setSelectedNode(null)}
                currency={entityCurrency ?? ""}
              />
            ) : (
              <div className="rounded-xl border border-border/50 bg-card p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-3">
                    <Network className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Click an item to explore
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Click any item in the graph to see its details and
                    relationships
                  </p>
                </div>

                {/* Type legend */}
                <div className="mt-6 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Node Types
                  </h4>
                  <div className="space-y-1.5">
                    {Object.entries(stats?.nodeTypes ?? {}).map(
                      ([type, count]) => {
                        const Icon = NODE_ICONS[type] ?? Building2;
                        return (
                          <div
                            key={type}
                            className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-foreground capitalize">
                                {type.replace(/_/g, " ")}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {count}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Edge types */}
                <div className="mt-4 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Relationship Types
                  </h4>
                  <div className="space-y-1.5">
                    {Object.entries(stats?.edgeTypes ?? {}).map(
                      ([type, count]) => (
                        <div
                          key={type}
                          className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent"
                        >
                          <span className="text-xs text-foreground capitalize">
                            {type.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {count}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* AI reasoning */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  AI Graph Reasoning
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Ask questions about entity relationships. The AI uses the graph
                to provide contextual answers.
              </p>
              <button
                type="button"
                onClick={() =>
                  openWithFocus(
                    { kind: "Knowledge Graph", name: "Graph Analysis" },
                    "Analyze my knowledge graph. What are the most connected entities? What patterns do you see?",
                  )
                }
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Analyze Graph with AI
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModulePageShell>
  );
}

// ─── Node Details Panel ────────────────────────────────────────────────────

function NodeDetailsPanel({
  node,
  relationships,
  isLoading,
  onAskAbout,
  onClose,
  currency,
}: {
  node: GraphNode;
  relationships?: {
    node: GraphNode;
    outgoing: Array<{
      id: string;
      targetId: string;
      relationType: string;
      relationLabel: string | null;
      weight: number;
      confidence: number;
    }>;
    incoming: Array<{
      id: string;
      sourceId: string;
      relationType: string;
      relationLabel: string | null;
      weight: number;
      confidence: number;
    }>;
    connectedNodes: Array<{
      id: string;
      nodeType: string;
      label: string;
      description: string | null;
    }>;
  };
  isLoading: boolean;
  onAskAbout: (node: GraphNode) => void;
  onClose: () => void;
  currency: string;
}) {
  const Icon = NODE_ICONS[node.type] ?? Building2;

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {node.label}
            </h3>
            <p className="text-xs text-muted-foreground capitalize">
              {node.type.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Details */}
      <div className="p-4 space-y-4">
        {node.description && (
          <p className="text-xs text-muted-foreground">{node.description}</p>
        )}

        {/* Relationships */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
            Outgoing ({relationships?.outgoing.length ?? 0})
          </h4>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-lg bg-muted/30"
                />
              ))}
            </div>
          ) : relationships?.outgoing.length === 0 ? (
            <p className="text-xs text-muted-foreground/50">
              No outgoing relationships
            </p>
          ) : (
            <div className="space-y-1.5">
              {relationships?.outgoing.map((rel) => {
                const connected = relationships.connectedNodes.find(
                  (n) => n.id === rel.targetId,
                );
                return (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 px-2 py-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      <span className="text-xs text-foreground truncate">
                        {connected?.label ?? rel.targetId.slice(0, 8)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {rel.relationLabel ?? rel.relationType}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
            Incoming ({relationships?.incoming.length ?? 0})
          </h4>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-lg bg-muted/30"
                />
              ))}
            </div>
          ) : relationships?.incoming.length === 0 ? (
            <p className="text-xs text-muted-foreground/50">
              No incoming relationships
            </p>
          ) : (
            <div className="space-y-1.5">
              {relationships?.incoming.map((rel) => {
                const connected = relationships.connectedNodes.find(
                  (n) => n.id === rel.sourceId,
                );
                return (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 px-2 py-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0 rotate-180" />
                      <span className="text-xs text-foreground truncate">
                        {connected?.label ?? rel.sourceId.slice(0, 8)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {rel.relationLabel ?? rel.relationType}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI button */}
        <button
          type="button"
          onClick={() => onAskAbout(node)}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Ask AI about this {node.type.replace(/_/g, " ")}
        </button>
      </div>
    </div>
  );
}
