"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Skeleton,
} from "@xenboox/ui";
import {
  Search,
  Plus,
  Download,
  Share2,
  BookOpen,
  FileText,
  MessageSquare,
  Brain,
  Link2,
  Target,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ExternalLink,
  Send,
  Paperclip,
  Database,
  MessageCircle,
  GitBranch,
  Mail,
  File,
  Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── KPI Card Component ─────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  iconColor,
  iconBg,
}: {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
}) {
  const isPositive = delta !== undefined && delta >= 0;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg ${iconBg}`}>
            <div className={iconColor}>{icon}</div>
          </div>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {delta !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive ? (
              <ArrowUp className="h-3 w-3 text-emerald-500" />
            ) : (
              <ArrowDown className="h-3 w-3 text-red-500" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                isPositive ? "text-emerald-500" : "text-red-500",
              )}
            >
              {isPositive ? "↑" : "↓"} {Math.abs(delta)}
              {deltaLabel?.includes("%") ? "%" : ""}
            </span>
            <span className="text-xs text-muted-foreground">{deltaLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Source Icon Component ──────────────────────────────────────────────────

function SourceIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    notion: <Database className="h-4 w-4" />,
    confluence: <BookOpen className="h-4 w-4" />,
    google_drive: <FileText className="h-4 w-4" />,
    slack: <MessageCircle className="h-4 w-4" />,
    github: <GitBranch className="h-4 w-4" />,
    gmail: <Mail className="h-4 w-4" />,
  };

  return icons[type] || <File className="h-4 w-4" />;
}

// ─── Activity Icon Component ────────────────────────────────────────────────

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<
    string,
    { icon: React.ReactNode; color: string; bg: string }
  > = {
    document_indexed: {
      icon: <FileText className="h-4 w-4" />,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    message_indexed: {
      icon: <MessageCircle className="h-4 w-4" />,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    page_updated: {
      icon: <BookOpen className="h-4 w-4" />,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    email_indexed: {
      icon: <Mail className="h-4 w-4" />,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    repo_indexed: {
      icon: <GitBranch className="h-4 w-4" />,
      color: "text-violet-600",
      bg: "bg-violet-100",
    },
    page_indexed: {
      icon: <Database className="h-4 w-4" />,
      color: "text-cyan-600",
      bg: "bg-cyan-100",
    },
  };

  const { icon, color, bg } = icons[type] || {
    icon: <File className="h-4 w-4" />,
    color: "text-gray-600",
    bg: "bg-gray-100",
  };

  return (
    <div className={`p-2 rounded-lg ${bg}`}>
      <div className={color}>{icon}</div>
    </div>
  );
}

// ─── Donut Chart Component ──────────────────────────────────────────────────

function DonutChart({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: {
    name: string;
    value: number;
    percentage: number;
    color: string;
  }[];
  centerValue: string;
  centerLabel: string;
}) {
  const radius = 50;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercentage = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <svg width={120} height={120}>
          {segments.map((segment, i) => {
            const segmentLength = (segment.percentage / 100) * circumference;
            const dashOffset = -(accumulatedPercentage / 100) * circumference;
            accumulatedPercentage += segment.percentage;

            return (
              <circle
                key={i}
                cx={60}
                cy={60}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 60 60)"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold">{centerValue}</span>
          <span className="text-[10px] text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-muted-foreground">{segment.name}</span>
            <span className="font-medium">
              {segment.value.toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              ({segment.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Horizontal Bar Chart Component ─────────────────────────────────────────

function HorizontalBarChart({
  items,
}: {
  items: { name: string; value: number; maxValue: number }[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm">{item.name}</span>
            <span className="text-sm font-medium">
              {item.value.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${(item.value / item.maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Knowledge Graph Component ──────────────────────────────────────────────

function KnowledgeGraph({ nodes, edges }: { nodes: any[]; edges: any[] }) {
  const categoryColors: Record<string, string> = {
    customers: "#3b82f6",
    finance: "#8b5cf6",
    engineering: "#f59e0b",
    operations: "#10b981",
    product: "#06b6d4",
    core: "#6366f1",
  };

  return (
    <div className="relative">
      <svg width="100%" height="300" viewBox="0 0 500 300">
        {/* Edges */}
        {edges.map((edge, i) => {
          const source = nodes.find((n) => n.name === edge.source);
          const target = nodes.find((n) => n.name === edge.target);
          if (!source || !target) return null;
          return (
            <line
              key={i}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => (
          <g key={i}>
            <circle
              cx={node.x}
              cy={node.y}
              r={
                node.type === "central"
                  ? 25
                  : node.type === "category"
                    ? 18
                    : 12
              }
              fill={categoryColors[node.category] || "#6366f1"}
              opacity={0.9}
            />
            <text
              x={node.x}
              y={
                node.y +
                (node.type === "central"
                  ? 35
                  : node.type === "category"
                    ? 28
                    : 22)
              }
              textAnchor="middle"
              className="text-[9px] fill-muted-foreground"
            >
              {node.name}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {Object.entries(categoryColors)
          .filter(([key]) => key !== "core")
          .map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground capitalize">
                {key}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function CompanyBrainPage() {
  const [query, setQuery] = useState("");

  // Fetch data
  const { data: overview, isLoading: overviewLoading } =
    trpc.companyBrain.getOverview.useQuery({ days: 7 });
  const { data: sources } = trpc.companyBrain.getSources.useQuery();
  const { data: popularQuestions } =
    trpc.companyBrain.getPopularQuestions.useQuery();
  const { data: activity } = trpc.companyBrain.getActivity.useQuery({
    limit: 6,
  });
  const { data: topTopics } = trpc.companyBrain.getTopTopics.useQuery();
  const { data: graphNodes } = trpc.companyBrain.getGraphNodes.useQuery();
  const { data: graphEdges } = trpc.companyBrain.getGraphEdges.useQuery();

  // Seed demo data mutation
  const seedMutation = trpc.companyBrain.seedDemoData.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const confidenceSegments = useMemo(() => {
    const high = overview?.kpis?.avgConfidence
      ? Math.round(overview.kpis.avgConfidence * 34.2)
      : 3148;
    const medium = 231;
    const low = 42;
    const total = high + medium + low;
    return [
      {
        name: "High (90-100%)",
        value: high,
        percentage: Math.round((high / total) * 100),
        color: "#10b981",
      },
      {
        name: "Medium (70-89%)",
        value: medium,
        percentage: Math.round((medium / total) * 100),
        color: "#f59e0b",
      },
      {
        name: "Low (<70%)",
        value: low,
        percentage: Math.round((low / total) * 100),
        color: "#ef4444",
      },
    ];
  }, [overview?.kpis]);

  const maxTopicValue = Math.max(
    ...(topTopics?.map((t: any) => t.connectionCount) ?? [1]),
  );

  if (overviewLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">12</span>
            <h1 className="text-2xl font-bold tracking-tight">Company Brain</h1>
            <Badge
              variant="secondary"
              className="bg-purple-100 text-purple-700"
            >
              Beta
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Your organization&apos;s collective knowledge. Ask anything, connect
            everything.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ask anything about your company..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
              className="pl-9 w-[300px]"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Source
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-1" />
            Graph View
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button
            onClick={() => seedMutation.mutate()}
            variant="outline"
            size="sm"
          >
            Seed Data
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-4">
        <KpiCard
          label="Knowledge Sources"
          value={overview?.kpis?.knowledgeSources ?? 0}
          delta={overview?.kpis?.sourcesDelta}
          deltaLabel="vs last 7 days"
          icon={<Database className="h-4 w-4" />}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
        />
        <KpiCard
          label="Documents"
          value={overview?.kpis?.documents ?? 0}
          delta={overview?.kpis?.documentsDelta}
          deltaLabel="vs last 7 days"
          icon={<FileText className="h-4 w-4" />}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <KpiCard
          label="Conversations (7d)"
          value={overview?.kpis?.conversations ?? 0}
          delta={overview?.kpis?.conversationsDelta}
          deltaLabel="vs last 7 days"
          icon={<MessageSquare className="h-4 w-4" />}
          iconColor="text-violet-600"
          iconBg="bg-violet-100"
        />
        <KpiCard
          label="Answers Generated"
          value={overview?.kpis?.answersGenerated ?? 0}
          delta={overview?.kpis?.answersDelta}
          deltaLabel="vs last 7 days"
          icon={<Brain className="h-4 w-4" />}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
        />
        <KpiCard
          label="Knowledge Connections"
          value={overview?.kpis?.knowledgeConnections ?? 0}
          delta={overview?.kpis?.connectionsDelta}
          deltaLabel="vs last 7 days"
          icon={<Link2 className="h-4 w-4" />}
          iconColor="text-cyan-600"
          iconBg="bg-cyan-100"
        />
        <KpiCard
          label="Avg. Answer Confidence"
          value={`${overview?.kpis?.avgConfidence ?? 0}%`}
          delta={overview?.kpis?.confidenceDelta}
          deltaLabel="vs last 7 days"
          icon={<Target className="h-4 w-4" />}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Ask the Company Brain */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Ask the Company Brain
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Get answers from across your docs, conversations, data and
              systems.
            </p>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <textarea
                placeholder="e.g., What are our onboarding steps for enterprise customers?"
                className="w-full h-24 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button className="absolute right-3 bottom-3 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <select className="px-3 py-1.5 border rounded-md text-xs">
                <option>All Sources</option>
                <option>Company Data</option>
                <option>Policies</option>
              </select>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-muted"
              >
                Company Data
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-muted"
              >
                Policies
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-muted"
              >
                Engineering
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-muted"
              >
                Product
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-muted"
              >
                Finance
              </Badge>
              <button className="p-1.5 border rounded-lg hover:bg-muted">
                <Paperclip className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Sources */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              Knowledge Sources
            </CardTitle>
            <button className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
              View all sources <ChevronRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sources?.slice(0, 6).map((source: any) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-muted rounded">
                      <SourceIcon type={source.type} />
                    </div>
                    <span className="text-sm font-medium">{source.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {source.documentCount.toLocaleString()} docs
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Synced{" "}
                      {source.lastSyncedAt
                        ? `${Math.floor((Date.now() - new Date(source.lastSyncedAt).getTime()) / 60000)}m ago`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 mt-4">
              <Plus className="h-3 w-3" /> Add Source
            </button>
          </CardContent>
        </Card>

        {/* Popular Questions */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              Popular Questions
            </CardTitle>
            <button className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {popularQuestions?.map((q: any, i: number) => (
                <div key={q.id} className="flex items-start gap-3">
                  <span className="text-lg font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{q.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {q.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Asked {q.askCount} times
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Knowledge Graph */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              Knowledge Graph
            </CardTitle>
            <button className="text-xs text-purple-600 hover:text-purple-700">
              Full Graph
            </button>
          </CardHeader>
          <CardContent>
            <KnowledgeGraph nodes={graphNodes ?? []} edges={graphEdges ?? []} />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">
              Recent Activity
            </CardTitle>
            <button className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
              View all activity <ChevronRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activity?.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3">
                  <ActivityIcon type={a.activityType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {a.activityType
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.title}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {a.createdAt
                      ? `${Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 60000)}m ago`
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Top Connected Topics */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">
                Top Connected Topics
              </CardTitle>
              <button className="text-xs text-purple-600 hover:text-purple-700">
                View all
              </button>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart
                items={
                  topTopics?.map((t: any) => ({
                    name: t.topic,
                    value: t.connectionCount,
                    maxValue: maxTopicValue,
                  })) ?? []
                }
              />
            </CardContent>
          </Card>

          {/* AI Answer Performance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">
                AI Answer Performance (7d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart
                segments={confidenceSegments}
                centerValue={`${overview?.kpis?.avgConfidence ?? 92}%`}
                centerLabel="High Confidence"
              />
              <button className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 mt-4">
                View performance analytics <ExternalLink className="h-3 w-3" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Suggested for you */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Suggested for you
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                title: "Create onboarding playbook",
                description: "Compile steps and docs for new customers",
                icon: <BookOpen className="h-5 w-5 text-emerald-600" />,
                bg: "bg-emerald-100",
              },
              {
                title: "Summarize recent changes",
                description: "What changed in docs this week?",
                icon: <FileText className="h-5 w-5 text-red-600" />,
                bg: "bg-red-100",
              },
              {
                title: "Find policy exceptions",
                description: "Search for all exception approvals",
                icon: <Search className="h-5 w-5 text-amber-600" />,
                bg: "bg-amber-100",
              },
              {
                title: "Generate team report",
                description: "Knowledge usage by team",
                icon: <Target className="h-5 w-5 text-violet-600" />,
                bg: "bg-violet-100",
              },
            ].map((suggestion, i) => (
              <button
                key={i}
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted text-left"
              >
                <div className={`p-2 rounded-lg ${suggestion.bg}`}>
                  {suggestion.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{suggestion.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
