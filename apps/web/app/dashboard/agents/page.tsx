"use client";

import { useState } from "react";
import {
  Bot,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Eye,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { AgentTimeline } from "@/components/workspace/agent-timeline";

const agentTabs = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "running", label: "Running", icon: Play },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
  { id: "failed", label: "Failed", icon: AlertTriangle },
];

export default function AgentsPage() {
  const { entityId } = useEntity();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch agent stats
  const { data: agentApprovals } = trpc.ingestion.listAgentApprovals.useQuery(
    { limit: 50 },
    { refetchInterval: 30000 },
  );

  const { data: stats } = trpc.ingestion.getStats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const pendingApprovals = agentApprovals?.items ?? [];
  const processingCount = stats?.processing ?? 0;
  const completedCount = stats?.autoPosted ?? 0;
  const failedCount = stats?.failed ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Agents
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor your AI agents — their status, history, and performance.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Play className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {processingCount}
              </p>
              <p className="text-xs text-muted-foreground">Running</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {pendingApprovals.length}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {completedCount}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {failedCount}
              </p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50">
        {agentTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground",
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Live Agent Timeline */}
            <AgentTimeline
              entityId={entityId || "default"}
              maxEntries={20}
              showStats={true}
              showHeader={true}
              className="w-full"
            />
          </>
        )}

        {/* Running Tab */}
        {activeTab === "running" && (
          <div className="space-y-3">
            {processingCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border/50">
                <Play className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  No agents running
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All agents are idle. They'll activate when work is available.
                </p>
              </div>
            ) : (
              <>
                {Array.from({ length: processingCount }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/50 bg-card p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                        <Bot className="h-5 w-5 text-blue-600 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          Agent Processing
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Working on task...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="h-8 w-8 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-accent transition-colors">
                          <Pause className="h-4 w-4" />
                        </button>
                        <button className="h-8 w-8 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-accent transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Completed Tab */}
        {activeTab === "completed" && (
          <div className="space-y-3">
            {completedCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border/50">
                <CheckCircle2 className="h-12 w-12 text-emerald-500/30 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  No completed tasks yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed agent tasks will appear here.
                </p>
              </div>
            ) : (
              <>
                {Array.from({ length: Math.min(completedCount, 5) }).map(
                  (_, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border/50 bg-card p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            Task Completed
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Agent successfully completed the task
                          </p>
                        </div>
                        <button className="h-8 px-3 rounded-lg border border-border bg-background flex items-center gap-1 text-xs font-medium hover:bg-accent transition-colors">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </>
            )}
          </div>
        )}

        {/* Failed Tab */}
        {activeTab === "failed" && (
          <div className="space-y-3">
            {failedCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border/50">
                <CheckCircle2 className="h-12 w-12 text-emerald-500/30 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  No failed tasks
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All agent tasks are running smoothly.
                </p>
              </div>
            ) : (
              <>
                {Array.from({ length: failedCount }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-red-200 bg-red-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">
                          Task Failed
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          Agent encountered an error during execution
                        </p>
                      </div>
                      <button className="h-8 px-3 rounded-lg border border-red-200 bg-white flex items-center gap-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Retry
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
