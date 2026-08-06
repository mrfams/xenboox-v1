"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@xenboox/ui";
import { trpc } from "@/lib/trpc/client";
import { useState, useCallback } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Activity,
  RotateCcw,
  Play,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

type Assignment = {
  id: string;
  agentName: string;
  taskType: string;
  liveProvider: string;
  liveModelId: string;
  fallbackModelId: string | null;
  fallbackProvider: string | null;
  trafficSplit: Record<string, number> | null;
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

// ─── Form Types ───────────────────────────────────────────────────────────

type AssignmentFormData = {
  agentName: string;
  taskType: string;
  liveModelId: string;
  liveProvider: string;
  fallbackModelId: string;
  fallbackProvider: string;
};

type ModelFormData = {
  modelId: string;
  displayName: string;
  provider: string;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  maxContextTokens: number;
  maxOutputTokens: number;
  costPerMillionInputTokens: string;
  costPerMillionOutputTokens: string;
};

// ─── Constants ────────────────────────────────────────────────────────────

const PROVIDERS = [
  "anthropic",
  "bedrock",
  "vertex",
  "openai",
  "fireworks",
  "together",
  "deepinfra",
  "openrouter",
] as const;

const TASK_TYPES = [
  "strategic_planning",
  "financial_analysis",
  "executive_summary",
  "risk_assessment",
  "approval_decision",
  "cash_flow_forecast",
  "payroll_calculation",
  "compliance_check",
  "reconciliation_review",
  "invoice_matching",
  "payment_scheduling",
  "journal_posting",
  "cash_reconciliation",
  "tax_calculation",
  "filing_preparation",
  "report_generation",
  "ocr_field_extraction",
  "document_classification",
  "structured_extraction",
  "budget_variance_analysis",
  "anomaly_detection",
  "chat_response",
  "summarization",
  "translation",
] as const;

const AGENT_NAMES = [
  "cfo",
  "controller",
  "treasury",
  "payroll_manager",
  "compliance",
  "ledger",
  "ap",
  "ar",
  "asset",
  "inventory",
  "reconciliation",
  "cash",
  "mobile_money",
  "payroll_worker",
  "reporting",
  "document",
  "budget",
  "analytics",
] as const;

const DEFAULT_ASSIGNMENT_FORM: AssignmentFormData = {
  agentName: "",
  taskType: "",
  liveModelId: "",
  liveProvider: "anthropic",
  fallbackModelId: "",
  fallbackProvider: "",
};

const DEFAULT_MODEL_FORM: ModelFormData = {
  modelId: "",
  displayName: "",
  provider: "anthropic",
  supportsTools: true,
  supportsVision: false,
  supportsStreaming: true,
  maxContextTokens: 200000,
  maxOutputTokens: 4096,
  costPerMillionInputTokens: "3",
  costPerMillionOutputTokens: "15",
};

// ─── Main Component ───────────────────────────────────────────────────────

export default function ModelOpsPage() {
  const [activeTab, setActiveTab] = useState<
    "assignments" | "registry" | "evaluations" | "cost"
  >("assignments");

  // ─── Queries ──────────────────────────────────────────────────────
  const { data: assignments, isLoading: loadingAssignments } =
    trpc.modelOps.listAssignments.useQuery();
  const { data: models, isLoading: loadingModels } =
    trpc.modelOps.listModels.useQuery();
  const { data: evaluations, isLoading: loadingEvals } =
    trpc.modelOps.listEvaluations.useQuery();
  const { data: costData } = trpc.modelOps.listCostTracking.useQuery({
    limit: 50,
  });

  // ─── Mutations ────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const createAssignment = trpc.modelOps.createAssignment.useMutation({
    onSuccess: () => {
      utils.modelOps.listAssignments.invalidate();
      setAssignDialogOpen(false);
      setAssignForm({ ...DEFAULT_ASSIGNMENT_FORM });
    },
  });
  const updateAssignment = trpc.modelOps.updateAssignment.useMutation({
    onSuccess: () => {
      utils.modelOps.listAssignments.invalidate();
      setEditAssignDialogOpen(false);
      setEditingAssignment(null);
    },
  });
  const registerModel = trpc.modelOps.registerModel.useMutation({
    onSuccess: () => {
      utils.modelOps.listModels.invalidate();
      setModelDialogOpen(false);
      setModelForm({ ...DEFAULT_MODEL_FORM });
    },
  });
  const updateModel = trpc.modelOps.updateModel.useMutation({
    onSuccess: () => {
      utils.modelOps.listModels.invalidate();
      setEditModelDialogOpen(false);
      setEditingModel(null);
    },
  });
  const triggerGate4 = trpc.modelOps.triggerGate4.useMutation();
  const rollback = trpc.modelOps.rollback.useMutation();

  // ─── Dialog State ─────────────────────────────────────────────────
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editAssignDialogOpen, setEditAssignDialogOpen] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editModelDialogOpen, setEditModelDialogOpen] = useState(false);

  const [assignForm, setAssignForm] = useState<AssignmentFormData>(
    DEFAULT_ASSIGNMENT_FORM,
  );
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(
    null,
  );
  const [modelForm, setModelForm] = useState<ModelFormData>(DEFAULT_MODEL_FORM);
  const [editingModel, setEditingModel] = useState<Model | null>(null);

  const [rollbackTarget, setRollbackTarget] = useState<Assignment | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<Assignment | null>(null);
  const [deleteAssignTarget, setDeleteAssignTarget] =
    useState<Assignment | null>(null);

  // ─── Handlers ─────────────────────────────────────────────────────

  const handleCreateAssignment = useCallback(() => {
    createAssignment.mutate({
      agentName: assignForm.agentName,
      taskType: assignForm.taskType as never,
      liveModelId: assignForm.liveModelId,
      liveProvider: assignForm.liveProvider as never,
      fallbackModelId: assignForm.fallbackModelId || null,
      fallbackProvider: assignForm.fallbackProvider
        ? (assignForm.fallbackProvider as never)
        : null,
    });
  }, [assignForm, createAssignment]);

  const handleEditAssignment = useCallback(() => {
    if (!editingAssignment) return;
    updateAssignment.mutate({
      id: editingAssignment.id,
      liveModelId: assignForm.liveModelId || undefined,
      liveProvider: assignForm.liveProvider
        ? (assignForm.liveProvider as never)
        : undefined,
      fallbackModelId: assignForm.fallbackModelId || null,
      fallbackProvider: assignForm.fallbackProvider
        ? (assignForm.fallbackProvider as never)
        : null,
    });
  }, [editingAssignment, assignForm, updateAssignment]);

  const handleRegisterModel = useCallback(() => {
    registerModel.mutate({
      modelId: modelForm.modelId,
      displayName: modelForm.displayName,
      provider: modelForm.provider as never,
      capabilities: {
        supportsTools: modelForm.supportsTools,
        supportsVision: modelForm.supportsVision,
        supportsStreaming: modelForm.supportsStreaming,
        maxContextTokens: modelForm.maxContextTokens,
        maxOutputTokens: modelForm.maxOutputTokens,
      },
      costPerMillionInputTokens: modelForm.costPerMillionInputTokens,
      costPerMillionOutputTokens: modelForm.costPerMillionOutputTokens,
    });
  }, [modelForm, registerModel]);

  const handleEditModel = useCallback(() => {
    if (!editingModel) return;
    updateModel.mutate({
      id: editingModel.id,
      displayName: modelForm.displayName || undefined,
      capabilities: {
        supportsTools: modelForm.supportsTools,
        supportsVision: modelForm.supportsVision,
        supportsStreaming: modelForm.supportsStreaming,
        maxContextTokens: modelForm.maxContextTokens,
        maxOutputTokens: modelForm.maxOutputTokens,
      },
      costPerMillionInputTokens: modelForm.costPerMillionInputTokens,
      costPerMillionOutputTokens: modelForm.costPerMillionOutputTokens,
    });
  }, [editingModel, modelForm, updateModel]);

  const confirmRollback = () => {
    if (!rollbackTarget) return;
    rollback.mutate(
      {
        agentName: rollbackTarget.agentName,
        taskType: rollbackTarget.taskType as never,
      },
      { onSuccess: () => setRollbackTarget(null) },
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
      { onSuccess: () => setPromoteTarget(null) },
    );
  };

  const openEditAssignment = (a: Assignment) => {
    setEditingAssignment(a);
    setAssignForm({
      agentName: a.agentName,
      taskType: a.taskType,
      liveModelId: a.liveModelId,
      liveProvider: a.liveProvider,
      fallbackModelId: a.fallbackModelId ?? "",
      fallbackProvider: a.fallbackProvider ?? "",
    });
    setEditAssignDialogOpen(true);
  };

  const openEditModel = (m: Model) => {
    setEditingModel(m);
    setModelForm({
      modelId: m.modelId,
      displayName: m.displayName,
      provider: m.provider,
      supportsTools: m.capabilities?.supportsTools ?? true,
      supportsVision: m.capabilities?.supportsVision ?? false,
      supportsStreaming: m.capabilities?.supportsStreaming ?? true,
      maxContextTokens: m.capabilities?.maxContextTokens ?? 200000,
      maxOutputTokens: 4096,
      costPerMillionInputTokens: String(m.costPerMillionInputTokens ?? "3"),
      costPerMillionOutputTokens: String(m.costPerMillionOutputTokens ?? "15"),
    });
    setEditModelDialogOpen(true);
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Model Operations
          </h1>
          <p className="text-muted-foreground">
            Manage model assignments, register models, run evaluations, and
            monitor costs
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
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {assignments?.length ?? 0} assignments
              </Badge>
              <Button
                size="sm"
                onClick={() => {
                  setAssignForm({ ...DEFAULT_ASSIGNMENT_FORM });
                  setAssignDialogOpen(true);
                }}
              >
                <Plus className="mr-1 h-3 w-3" />
                Create Assignment
              </Button>
            </div>
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
                          onClick={() => openEditAssignment(a)}
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
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
            <div className="flex items-center gap-2">
              <Badge variant="outline">{models?.length ?? 0} models</Badge>
              <Button
                size="sm"
                onClick={() => {
                  setModelForm({ ...DEFAULT_MODEL_FORM });
                  setModelDialogOpen(true);
                }}
              >
                <Plus className="mr-1 h-3 w-3" />
                Register Model
              </Button>
            </div>
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
                                  (m.capabilities.maxContextTokens ?? 0) / 1000
                                ).toFixed(0)}
                                K
                              </span>
                            </>
                          )}
                          <span>${m.costPerMillionInputTokens}/M in</span>
                          <span>${m.costPerMillionOutputTokens}/M out</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModel(m)}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
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

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* ─── Create Assignment Dialog ──────────────────────────────── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Model Assignment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Agent Name</Label>
                <select
                  id="agentName"
                  value={assignForm.agentName}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, agentName: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select agent...</option>
                  {AGENT_NAMES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskType">Task Type</Label>
                <select
                  id="taskType"
                  value={assignForm.taskType}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, taskType: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select task type...</option>
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="liveProvider">Live Provider</Label>
                <select
                  id="liveProvider"
                  value={assignForm.liveProvider}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      liveProvider: e.target.value,
                    })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="liveModelId">Live Model ID</Label>
                <Input
                  id="liveModelId"
                  value={assignForm.liveModelId}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      liveModelId: e.target.value,
                    })
                  }
                  placeholder="e.g. claude-sonnet-4-6"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fallbackProvider">
                  Fallback Provider{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <select
                  id="fallbackProvider"
                  value={assignForm.fallbackProvider}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      fallbackProvider: e.target.value,
                    })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">None</option>
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fallbackModelId">
                  Fallback Model ID{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="fallbackModelId"
                  value={assignForm.fallbackModelId}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      fallbackModelId: e.target.value,
                    })
                  }
                  placeholder="e.g. claude-haiku-4-5"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAssignment}
              disabled={
                !assignForm.agentName ||
                !assignForm.taskType ||
                !assignForm.liveModelId ||
                createAssignment.isPending
              }
            >
              {createAssignment.isPending ? "Creating..." : "Create Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Assignment Dialog ────────────────────────────────── */}
      <Dialog
        open={editAssignDialogOpen}
        onOpenChange={setEditAssignDialogOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit Assignment — {editingAssignment?.agentName} /{" "}
              {editingAssignment?.taskType}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Live Provider</Label>
                <select
                  value={assignForm.liveProvider}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      liveProvider: e.target.value,
                    })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Live Model ID</Label>
                <Input
                  value={assignForm.liveModelId}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      liveModelId: e.target.value,
                    })
                  }
                  placeholder="e.g. claude-sonnet-4-6"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Fallback Provider{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <select
                  value={assignForm.fallbackProvider}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      fallbackProvider: e.target.value,
                    })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">None</option>
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>
                  Fallback Model ID{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  value={assignForm.fallbackModelId}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      fallbackModelId: e.target.value,
                    })
                  }
                  placeholder="e.g. claude-haiku-4-5"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditAssignment}
              disabled={!assignForm.liveModelId || updateAssignment.isPending}
            >
              {updateAssignment.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Register Model Dialog ─────────────────────────────────── */}
      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register New Model</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modelId">Model ID</Label>
                <Input
                  id="modelId"
                  value={modelForm.modelId}
                  onChange={(e) =>
                    setModelForm({ ...modelForm, modelId: e.target.value })
                  }
                  placeholder="e.g. claude-sonnet-4-6"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={modelForm.displayName}
                  onChange={(e) =>
                    setModelForm({ ...modelForm, displayName: e.target.value })
                  }
                  placeholder="e.g. Claude Sonnet 4.6"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <select
                id="provider"
                value={modelForm.provider}
                onChange={(e) =>
                  setModelForm({ ...modelForm, provider: e.target.value })
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={modelForm.supportsTools}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      supportsTools: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                Supports Tools
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={modelForm.supportsVision}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      supportsVision: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                Supports Vision
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={modelForm.supportsStreaming}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      supportsStreaming: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                Supports Streaming
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Context Tokens</Label>
                <Input
                  type="number"
                  value={modelForm.maxContextTokens}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      maxContextTokens: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Output Tokens</Label>
                <Input
                  type="number"
                  value={modelForm.maxOutputTokens}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      maxOutputTokens: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost per 1M Input Tokens ($)</Label>
                <Input
                  value={modelForm.costPerMillionInputTokens}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      costPerMillionInputTokens: e.target.value,
                    })
                  }
                  placeholder="e.g. 3"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost per 1M Output Tokens ($)</Label>
                <Input
                  value={modelForm.costPerMillionOutputTokens}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      costPerMillionOutputTokens: e.target.value,
                    })
                  }
                  placeholder="e.g. 15"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRegisterModel}
              disabled={
                !modelForm.modelId ||
                !modelForm.displayName ||
                registerModel.isPending
              }
            >
              {registerModel.isPending ? "Registering..." : "Register Model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Model Dialog ─────────────────────────────────────── */}
      <Dialog open={editModelDialogOpen} onOpenChange={setEditModelDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Model — {editingModel?.modelId}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={modelForm.displayName}
                onChange={(e) =>
                  setModelForm({ ...modelForm, displayName: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={modelForm.supportsTools}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      supportsTools: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                Tools
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={modelForm.supportsVision}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      supportsVision: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                Vision
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={modelForm.supportsStreaming}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      supportsStreaming: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                Streaming
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Context Tokens</Label>
                <Input
                  type="number"
                  value={modelForm.maxContextTokens}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      maxContextTokens: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Output Tokens</Label>
                <Input
                  type="number"
                  value={modelForm.maxOutputTokens}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      maxOutputTokens: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost per 1M Input Tokens ($)</Label>
                <Input
                  value={modelForm.costPerMillionInputTokens}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      costPerMillionInputTokens: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cost per 1M Output Tokens ($)</Label>
                <Input
                  value={modelForm.costPerMillionOutputTokens}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      costPerMillionOutputTokens: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModelDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditModel} disabled={updateModel.isPending}>
              {updateModel.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Rollback Confirmation ─────────────────────────────────── */}
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

      {/* ─── Promote Confirmation ──────────────────────────────────── */}
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
