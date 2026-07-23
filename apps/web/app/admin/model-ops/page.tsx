"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@xenboox/ui";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Activity,
  RotateCcw,
  Play,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";

type Assignment = {
  id: string;
  agentName: string;
  taskType: string;
  liveProvider: string;
  liveModelId: string;
  fallbackModelId?: string;
  fallbackProvider?: string;
  trafficSplit?: Record<string, unknown>;
  isActive: boolean;
};

type Model = {
  id: string;
  modelId: string;
  provider: string;
  displayName: string;
  isDeprecated: boolean;
  capabilities?: {
    supportsTools?: boolean;
    supportsVision?: boolean;
    supportsStreaming?: boolean;
    maxContextTokens?: number;
  };
  costPerMillionInputTokens?: number;
  costPerMillionOutputTokens?: number;
};

type Evaluation = {
  id: string;
  gate: string;
  status: string;
  modelId: string;
  agentName: string;
  taskType: string;
  goldenDatasetPassRate?: string;
  canaryMetrics?: {
    requestsCount: number;
    errorRate: number;
    avgLatencyMs: number;
    confidenceScore: number;
  };
};

type CostRow = {
  id: string;
  agentName: string;
  modelId: string;
  provider: string;
  date: string;
  requestsCount: number;
  costUsd: number;
};

export default function ModelOpsPage() {
  const [activeTab, setActiveTab] = useState<
    "assignments" | "registry" | "evaluations" | "cost"
  >("assignments");

  const { data: assignments, isLoading: loadingAssignments } =
    trpc.modelOps.listAssignments.useQuery();
  const { data: models, isLoading: loadingModels } =
    trpc.modelOps.listModels.useQuery();
  const { data: evaluations, isLoading: loadingEvals } =
    trpc.modelOps.listEvaluations.useQuery();
  const { data: costData } = trpc.modelOps.listCostTracking.useQuery({
    limit: 50,
  });

  const triggerGate4 = trpc.modelOps.triggerGate4.useMutation();
  const rollback = trpc.modelOps.rollback.useMutation();

  const [rollbackTarget, setRollbackTarget] = useState<Assignment | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<Assignment | null>(null);

  const confirmRollback = () => {
    if (!rollbackTarget) return;
    rollback.mutate(
      {
        agentName: rollbackTarget.agentName,
        taskType: rollbackTarget.taskType as never,
      },
      {
        onSuccess: () => setRollbackTarget(null),
      },
    );
  };

  const confirmPromote = () => {
    if (!promoteTarget) return;
    triggerGate4.mutate(
      {
        candidateModelId: promoteTarget.liveModelId,
        candidateProvider: promoteTarget.liveProvider as never,
        agentName: promoteTarget.agentName,
        taskType: promoteTarget.taskType as never,
      },
      {
        onSuccess: () => setPromoteTarget(null),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Model Operations
          </h1>
          <p className="text-muted-foreground">
            Manage model assignments, run evaluations, and monitor costs
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 border-b pb-2">
        {(["assignments", "registry", "evaluations", "cost"] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ),
        )}
      </div>

      {/* ─── Assignments Tab ─────────────────────── */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Model Assignments</h2>
            <Badge variant="outline">
              {assignments?.length ?? 0} assignments
            </Badge>
          </div>

          {loadingAssignments ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="grid gap-4">
              {assignments?.map((a) => (
                <Card key={a.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">
                            {a.agentName}
                          </span>
                          <Badge variant="secondary">{a.taskType}</Badge>
                          <Badge variant={a.isActive ? "default" : "secondary"}>
                            {a.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Live:</span>
                            <code className="rounded bg-muted px-1.5 py-0.5">
                              {a.liveProvider}/{a.liveModelId}
                            </code>
                          </div>
                          {a.fallbackModelId && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Fallback:</span>
                              <code className="rounded bg-muted px-1.5 py-0.5">
                                {a.fallbackProvider}/{a.fallbackModelId}
                              </code>
                            </div>
                          )}
                          {a.trafficSplit &&
                            Object.keys(a.trafficSplit).length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  Traffic Split:
                                </span>
                                <span>{JSON.stringify(a.trafficSplit)}</span>
                              </div>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRollbackTarget(a)}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Rollback
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setPromoteTarget(a)}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          Promote
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!assignments || assignments.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No model assignments configured
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Registry Tab ────────────────────────── */}
      {activeTab === "registry" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Model Registry</h2>
            <Badge variant="outline">{models?.length ?? 0} models</Badge>
          </div>

          {loadingModels ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="grid gap-4">
              {models?.map((m) => (
                <Card key={m.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-medium">
                            {m.modelId}
                          </code>
                          <Badge variant="outline">{m.provider}</Badge>
                          {m.isDeprecated && (
                            <Badge variant="secondary">Deprecated</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {m.displayName}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {m.capabilities && (
                            <>
                              <span
                                className={
                                  m.capabilities.supportsTools
                                    ? "text-green-600"
                                    : ""
                                }
                              >
                                {m.capabilities.supportsTools ? "✓" : "○"} Tools
                              </span>
                              <span
                                className={
                                  m.capabilities.supportsVision
                                    ? "text-green-600"
                                    : ""
                                }
                              >
                                {m.capabilities.supportsVision ? "✓" : "○"}{" "}
                                Vision
                              </span>
                              <span
                                className={
                                  m.capabilities.supportsStreaming
                                    ? "text-green-600"
                                    : ""
                                }
                              >
                                {m.capabilities.supportsStreaming ? "✓" : "○"}{" "}
                                Streaming
                              </span>
                              <span>
                                Context:{" "}
                                {(
                                  m.capabilities.maxContextTokens / 1000
                                ).toFixed(0)}
                                K
                              </span>
                            </>
                          )}
                          <span>${m.costPerMillionInputTokens}/M in</span>
                          <span>${m.costPerMillionOutputTokens}/M out</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!models || models.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No models registered
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Evaluations Tab ─────────────────────── */}
      {activeTab === "evaluations" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Evaluation Runs</h2>

          {loadingEvals ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="grid gap-4">
              {evaluations?.map((e) => (
                <Card key={e.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge>{e.gate}</Badge>
                          <Badge
                            variant={
                              e.status === "passed"
                                ? "default"
                                : e.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {e.status}
                          </Badge>
                          <span className="text-sm font-mono">{e.modelId}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {e.agentName} / {e.taskType}
                        </p>
                        {e.goldenDatasetPassRate && (
                          <p className="mt-1 text-sm">
                            Pass rate:{" "}
                            {(
                              parseFloat(e.goldenDatasetPassRate) * 100
                            ).toFixed(1)}
                            %
                          </p>
                        )}
                        {e.canaryMetrics && (
                          <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                            <span>
                              Requests: {e.canaryMetrics.requestsCount}
                            </span>
                            <span>
                              Error rate:{" "}
                              {(e.canaryMetrics.errorRate * 100).toFixed(1)}%
                            </span>
                            <span>
                              Latency: {e.canaryMetrics.avgLatencyMs.toFixed(0)}
                              ms
                            </span>
                            <span>
                              Confidence:{" "}
                              {(e.canaryMetrics.confidenceScore * 100).toFixed(
                                1,
                              )}
                              %
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!evaluations || evaluations.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No evaluation runs yet. Trigger one from the Assignments tab.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Cost Tab ────────────────────────────── */}
      {activeTab === "cost" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Model Cost Tracking</h2>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Agent</th>
                  <th className="px-4 py-2 text-left font-medium">Model</th>
                  <th className="px-4 py-2 text-left font-medium">Provider</th>
                  <th className="px-4 py-2 text-right font-medium">Date</th>
                  <th className="px-4 py-2 text-right font-medium">Requests</th>
                  <th className="px-4 py-2 text-right font-medium">
                    Cost (USD)
                  </th>
                </tr>
              </thead>
              <tbody>
                {costData?.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="px-4 py-2">{c.agentName}</td>
                    <td className="px-4 py-2 font-mono text-xs">{c.modelId}</td>
                    <td className="px-4 py-2">{c.provider}</td>
                    <td className="px-4 py-2 text-right">{c.date}</td>
                    <td className="px-4 py-2 text-right">{c.requestsCount}</td>
                    <td className="px-4 py-2 text-right">${c.costUsd}</td>
                  </tr>
                ))}
                {(!costData || costData.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No cost data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rollback Confirmation */}
      <AlertDialog
        open={!!rollbackTarget}
        onOpenChange={(open) => !open && setRollbackTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback Model</AlertDialogTitle>
            <AlertDialogDescription>
              Rollback <strong>{rollbackTarget?.agentName}</strong> to its
              fallback model? This will switch the active model without
              downtime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRollback}
              disabled={rollback.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {rollback.isPending ? "Rolling back..." : "Rollback"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote Confirmation */}
      <AlertDialog
        open={!!promoteTarget}
        onOpenChange={(open) => !open && setPromoteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote Model</AlertDialogTitle>
            <AlertDialogDescription>
              Promote <strong>{promoteTarget?.agentName}</strong> candidate
              model to production? This will switch the live model.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPromote}
              disabled={triggerGate4.isPending}
            >
              {triggerGate4.isPending ? "Promoting..." : "Promote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
