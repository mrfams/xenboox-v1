"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Building2,
  FileText,
  Banknote,
  Landmark,
  Users,
  TrendingUp,
  ArrowRight,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";

// ─── Knowledge Graph Visualization ─────────────────────────────────────────
//
// Interactive force-directed graph visualization for the knowledge graph.
// Uses canvas for performance with 100+ nodes.

type GraphNode = {
  id: string;
  label: string;
  type: string;
  description?: string;
  internalId: string;
  internalTable: string;
  size: number;
  metadata?: Record<string, unknown>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  weight: number;
  confidence: number;
  source_type: string;
};

type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    nodeTypes: Record<string, number>;
    edgeTypes: Record<string, number>;
  };
};

// Node type colors
const NODE_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  company: { bg: "#3b82f6", border: "#2563eb", text: "#ffffff" },
  invoice: { bg: "#10b981", border: "#059669", text: "#ffffff" },
  bill: { bg: "#f59e0b", border: "#d97706", text: "#ffffff" },
  account: { bg: "#8b5cf6", border: "#7c3aed", text: "#ffffff" },
  bank_account: { bg: "#06b6d4", border: "#0891b2", text: "#ffffff" },
  employee: { bg: "#ec4899", border: "#db2777", text: "#ffffff" },
  vendor: { bg: "#f97316", border: "#ea580c", text: "#ffffff" },
  customer: { bg: "#14b8a6", border: "#0d9488", text: "#ffffff" },
  transaction: { bg: "#6366f1", border: "#4f46e5", text: "#ffffff" },
  journal_entry: { bg: "#64748b", border: "#475569", text: "#ffffff" },
  tax: { bg: "#ef4444", border: "#dc2626", text: "#ffffff" },
  budget: { bg: "#84cc16", border: "#65a30d", text: "#ffffff" },
  asset: { bg: "#a855f7", border: "#9333ea", text: "#ffffff" },
  contract: { bg: "#0ea5e9", border: "#0284c7", text: "#ffffff" },
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

export function GraphVisualization({
  data,
  onSelectNode,
  isLoading,
  onBuildGraph,
}: {
  data?: GraphData;
  onSelectNode: (node: GraphNode) => void;
  isLoading: boolean;
  onBuildGraph: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [filter, setFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Force simulation state
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animFrameRef = useRef<number>();

  // Initialize nodes with positions
  useEffect(() => {
    if (!data?.nodes) return;

    const filteredNodes = data.nodes.filter((n) => {
      if (filter.length > 0 && !filter.includes(n.type)) return false;
      if (
        searchQuery &&
        !n.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });

    const filteredEdges = data.edges.filter(
      (e) =>
        filteredNodes.some((n) => n.id === e.source) &&
        filteredNodes.some((n) => n.id === e.target),
    );

    // Initialize positions in a circle
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    nodesRef.current = filteredNodes.map((n, i) => ({
      ...n,
      x: centerX + Math.cos((2 * Math.PI * i) / filteredNodes.length) * radius,
      y: centerY + Math.sin((2 * Math.PI * i) / filteredNodes.length) * radius,
      vx: 0,
      vy: 0,
    }));

    edgesRef.current = filteredEdges;
  }, [data, filter, searchQuery]);

  // Force simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const simulate = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // Apply forces
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[j].x ?? 0) - (nodes[i].x ?? 0);
          const dy = (nodes[j].y ?? 0) - (nodes[i].y ?? 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 1000 / (dist * dist);

          nodes[i].vx = (nodes[i].vx ?? 0) - (dx / dist) * force;
          nodes[i].vy = (nodes[i].vy ?? 0) - (dy / dist) * force;
          nodes[j].vx = (nodes[j].vx ?? 0) + (dx / dist) * force;
          nodes[j].vy = (nodes[j].vy ?? 0) + (dy / dist) * force;
        }
      }

      // Apply edge forces (attraction)
      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;

        const dx = (target.x ?? 0) - (source.x ?? 0);
        const dy = (target.y ?? 0) - (source.y ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 100) * 0.01;

        source.vx = (source.vx ?? 0) + (dx / dist) * force;
        source.vy = (source.vy ?? 0) + (dy / dist) * force;
        target.vx = (target.vx ?? 0) - (dx / dist) * force;
        target.vy = (target.vy ?? 0) - (dy / dist) * force;
      }

      // Center gravity
      for (const node of nodes) {
        node.vx = ((node.vx ?? 0) + (400 - (node.x ?? 0)) * 0.001) * 0.9;
        node.vy = ((node.vy ?? 0) + (300 - (node.y ?? 0)) * 0.001) * 0.9;
        node.x = (node.x ?? 0) + (node.vx ?? 0);
        node.y = (node.y ?? 0) + (node.vy ?? 0);
      }

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Draw edges
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 0.5;
      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;

        ctx.beginPath();
        ctx.moveTo(source.x ?? 0, source.y ?? 0);
        ctx.lineTo(target.x ?? 0, target.y ?? 0);
        ctx.stroke();
      }

      // Draw nodes
      for (const node of nodes) {
        const colors = NODE_COLORS[node.type] ?? NODE_COLORS.company;
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const size = (node.size ?? 15) / 2;

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, size, 0, 2 * Math.PI);
        ctx.fillStyle = colors.bg;
        ctx.fill();

        if (isSelected || isHovered) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          node.label.length > 15 ? node.label.slice(0, 15) + "…" : node.label,
          node.x ?? 0,
          (node.y ?? 0) + size + 12,
        );
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [zoom, pan, selectedNode, hoveredNode]);

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      // Find clicked node
      for (const node of nodesRef.current) {
        const dx = x - (node.x ?? 0);
        const dy = y - (node.y ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (node.size ?? 15) / 2 + 5) {
          setSelectedNode(node);
          onSelectNode(node);
          return;
        }
      }

      setSelectedNode(null);
    },
    [zoom, pan, onSelectNode],
  );

  // Handle canvas mouse move
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      for (const node of nodesRef.current) {
        const dx = x - (node.x ?? 0);
        const dy = y - (node.y ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (node.size ?? 15) / 2 + 5) {
          setHoveredNode(node);
          canvas.style.cursor = "pointer";
          return;
        }
      }

      setHoveredNode(null);
      canvas.style.cursor = "grab";
    },
    [zoom, pan],
  );

  // Handle zoom
  const handleZoom = useCallback((delta: number) => {
    setZoom((z) => Math.max(0.1, Math.min(3, z + delta)));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-border/50 bg-card">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Loading graph...</p>
        </div>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-dashed border-border/50 bg-card">
        <div className="flex flex-col items-center text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No graph data</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Build your knowledge graph to visualize entity relationships
          </p>
          <button
            type="button"
            onClick={onBuildGraph}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Build Graph
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="w-full rounded-xl border border-border/50 bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleZoom(0.2)}
            className="rounded-lg border border-border/50 bg-background p-2 text-foreground hover:bg-accent"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-0.2)}
            className="rounded-lg border border-border/50 bg-background p-2 text-foreground hover:bg-accent"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="rounded-lg border border-border/50 bg-background p-2 text-foreground hover:bg-accent"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onBuildGraph}
            className="rounded-lg border border-border/50 bg-background p-2 text-foreground hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(data.stats.nodeTypes).map(([type, count]) => {
          const colors = NODE_COLORS[type] ?? NODE_COLORS.company;
          const isActive = filter.length === 0 || filter.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setFilter((prev) =>
                  prev.includes(type)
                    ? prev.filter((t) => t !== type)
                    : [...prev, type],
                );
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all",
                isActive ? "border-2" : "border border-border/30 opacity-50",
              )}
              style={{
                backgroundColor: isActive ? colors.bg + "20" : "transparent",
                borderColor: isActive ? colors.border : undefined,
                color: isActive ? colors.border : undefined,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: colors.bg }}
              />
              {type.replace(/_/g, " ")}
              <span className="rounded-full bg-muted/60 px-1 py-0.5 text-[8px]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative h-[500px] rounded-xl border border-border/50 bg-card overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          className="h-full w-full"
        />

        {/* Tooltip */}
        {hoveredNode && !selectedNode && (
          <div className="absolute bottom-4 left-4 rounded-lg border border-border/50 bg-card p-3 shadow-lg">
            <p className="text-sm font-medium text-foreground">
              {hoveredNode.label}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {hoveredNode.type.replace(/_/g, " ")}
            </p>
            {hoveredNode.description && (
              <p className="text-xs text-muted-foreground/70 mt-1">
                {hoveredNode.description}
              </p>
            )}
          </div>
        )}

        {/* Stats overlay */}
        <div className="absolute top-4 right-4 rounded-lg border border-border/50 bg-card/90 p-2 text-[10px] text-muted-foreground">
          {data.stats.totalNodes} nodes · {data.stats.totalEdges} edges
        </div>
      </div>
    </div>
  );
}
