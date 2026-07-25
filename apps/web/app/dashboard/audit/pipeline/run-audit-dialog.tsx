"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Button,
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Badge,
} from "@/components/ui";
import {
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Shield,
  BarChart3,
  Fingerprint,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RunAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  currentPeriod: string;
}

type AuditRunStatus = "idle" | "running" | "completed" | "failed" | "escalated";

const AGENT_OPTIONS = [
  { id: "controller", label: "Controller" },
  { id: "treasury", label: "Treasury" },
  { id: "payroll_manager", label: "Payroll Manager" },
  { id: "compliance", label: "Compliance" },
  { id: "ledger", label: "Ledger" },
  { id: "ap", label: "AP" },
  { id: "ar", label: "AR" },
  { id: "asset", label: "Fixed Assets" },
  { id: "inventory", label: "Inventory" },
  { id: "reconciliation", label: "Reconciliation" },
  { id: "cash", label: "Cash" },
  { id: "mobile_money", label: "Mobile Money" },
  { id: "payroll_worker", label: "Payroll Worker" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function RunAuditDialog({
  open,
  onOpenChange,
  onComplete,
  currentPeriod,
}: RunAuditDialogProps) {
  const utils = trpc.useUtils();
  const [period, setPeriod] = useState(currentPeriod);
  const [sampleSize, setSampleSize] = useState(25);
  const [onDemandPackage, setOnDemandPackage] = useState(false);
  const [generatePortal, setGeneratePortal] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [runStatus, setRunStatus] = useState<AuditRunStatus>("idle");
  const [runResult, setRunResult] = useState<{
    samplesCollected: number;
    discrepanciesFound: number;
    anomaliesDetected: number;
    anomaliesEscalated: number;
    overallConfidence: number;
    escalated: boolean;
    stepsCompleted: number;
    totalSteps: number;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const runMutation = trpc.auditPipeline.runPipeline.useMutation({
    onSuccess: (data) => {
      setRunResult({
        samplesCollected: data.samplesCollected,
        discrepanciesFound: data.samplesWithDiscrepancies,
        anomaliesDetected: data.anomaliesDetected,
        anomaliesEscalated: data.anomaliesEscalated,
        overallConfidence: data.overallConfidence,
        escalated: data.escalated,
        stepsCompleted: data.stepsCompleted,
        totalSteps: data.totalSteps,
        errors: data.errors,
        warnings: data.warnings,
      });
      if (data.escalated) {
        setRunStatus("escalated");
      } else if (data.success) {
        setRunStatus("completed");
      } else {
        setRunStatus("failed");
      }
      utils.auditPipeline.getStatus.invalidate();
      utils.auditPipeline.listSamples.invalidate();
      utils.auditPipeline.listDriftScores.invalidate();
      if (data.success) onComplete();
    },
    onError: () => {
      setRunStatus("failed");
      setRunResult({
        samplesCollected: 0,
        discrepanciesFound: 0,
        anomaliesDetected: 0,
        anomaliesEscalated: 0,
        overallConfidence: 0,
        escalated: false,
        stepsCompleted: 0,
        totalSteps: 10,
        errors: ["Pipeline execution failed"],
        warnings: [],
      });
    },
  });

  const handleRun = useCallback(() => {
    setRunStatus("running");
    runMutation.mutate({
      period,
      sampleSize,
      agentsToCheck: selectedAgents.length > 0 ? selectedAgents : undefined,
      onDemandPackage,
      generatePortalSessions: generatePortal,
    });
  }, [
    period,
    sampleSize,
    selectedAgents,
    onDemandPackage,
    generatePortal,
    runMutation,
  ]);

  const toggleAgent = useCallback((agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((a) => a !== agentId)
        : [...prev, agentId],
    );
  }, []);

  const resetForm = useCallback(() => {
    setPeriod(currentPeriod);
    setSampleSize(25);
    setOnDemandPackage(false);
    setGeneratePortal(false);
    setSelectedAgents([]);
    setRunStatus("idle");
    setRunResult(null);
  }, [currentPeriod]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(resetForm, 300);
  }, [onOpenChange, resetForm]);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Run Audit Cycle
            </DialogTitle>
            <DialogDescription>
              Trigger a continuous independent audit cycle. Samples transactions
              across agents, recompute independently, detect anomalies, and log
              meta audit trail.
            </DialogDescription>
          </DialogHeader>

          {runStatus === "idle" ? (
            <>
              {/* ── Configuration ──────────────────────────────────────── */}
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="period">Audit Period</Label>
                    <Input
                      id="period"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      placeholder="YYYY-MM"
                      pattern="^\d{4}-\d{2}$"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Format: YYYY-MM (e.g., {currentPeriod})
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sampleSize">Sample Size</Label>
                    <Input
                      id="sampleSize"
                      type="number"
                      min={5}
                      max={200}
                      value={sampleSize}
                      onChange={(e) => setSampleSize(Number(e.target.value))}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      5–200 samples per cycle
                    </p>
                  </div>
                </div>

                {/* Toggle options */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-3">
                    <input
                      type="checkbox"
                      id="onDemandPackage"
                      checked={onDemandPackage}
                      onChange={(e) => setOnDemandPackage(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label
                      htmlFor="onDemandPackage"
                      className="text-xs text-blue-700 dark:text-blue-400 cursor-pointer"
                    >
                      Generate audit package (supporting schedules, vouchers,
                      comparisons)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 p-3">
                    <input
                      type="checkbox"
                      id="generatePortal"
                      checked={generatePortal}
                      onChange={(e) => setGeneratePortal(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label
                      htmlFor="generatePortal"
                      className="text-xs text-purple-700 dark:text-purple-400 cursor-pointer"
                    >
                      Generate external auditor portal session (read-only,
                      period-locked)
                    </Label>
                  </div>
                </div>

                {/* Agent Selection */}
                <div className="space-y-2 border-t pt-4">
                  <h4 className="text-sm font-semibold">Agents to Check</h4>
                  <p className="text-xs text-muted-foreground">
                    Select agents for this audit cycle. Leave empty to check all
                    agents.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {AGENT_OPTIONS.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => toggleAgent(agent.id)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-medium border transition-colors",
                          selectedAgents.includes(agent.id)
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-card text-muted-foreground border-border hover:border-primary/30",
                        )}
                      >
                        {agent.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Guardrail Reminders ───────────────────────────────── */}
              <div className="space-y-2 border-t pt-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Audit Guarantees
                </h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-950/10 p-2.5">
                    <Fingerprint className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        Independent
                      </span>{" "}
                      recomputation, not a re-run
                    </p>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-purple-100 bg-purple-50/30 dark:border-purple-900/30 dark:bg-purple-950/10 p-2.5">
                    <Eye className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        Read-only
                      </span>{" "}
                      portal, period-locked
                    </p>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/10 p-2.5">
                    <BarChart3 className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        Drift detection
                      </span>{" "}
                      — below 0.7 escalates
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Pipeline Preview ──────────────────────────────────── */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">
                  Pipeline Steps (10 — Continuous)
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    "Sampling",
                    "Golden Dataset",
                    "Recomputation",
                    "Anomaly Detection",
                    "Regression Gate",
                    "Confidence Gate",
                    "Package",
                    "Portal",
                    "Query Flow",
                    "Meta Audit",
                  ].map((step, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1.5"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-muted-foreground truncate">
                        {i + 1}. {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleRun} className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Run Audit Cycle
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {/* ── Run Status Display ──────────────────────────────── */}
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                {runStatus === "running" && (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        Running Audit Cycle
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Sampling {sampleSize} transactions across agents...
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="animate-pulse">
                        <Clock className="h-3 w-3 mr-1" />
                        In Progress
                      </Badge>
                    </div>
                  </>
                )}

                {runStatus === "completed" && runResult && (
                  <>
                    <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-3">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        Audit Cycle Complete
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {runResult.stepsCompleted}/{runResult.totalSteps} steps
                        — all systems nominal
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">Samples</p>
                        <p className="text-xl font-bold">
                          {runResult.samplesCollected}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          Discrepancies
                        </p>
                        <p className="text-xl font-bold">
                          {runResult.discrepanciesFound}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          Confidence
                        </p>
                        <p className="text-xl font-bold">
                          {Math.round(runResult.overallConfidence * 100)}%
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          Anomalies
                        </p>
                        <p className="text-xl font-bold">
                          {runResult.anomaliesDetected}
                        </p>
                      </div>
                    </div>
                    {runResult.discrepanciesFound > 0 && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {runResult.discrepanciesFound} discrepancy(ies) found
                      </Badge>
                    )}
                  </>
                )}

                {runStatus === "escalated" && runResult && (
                  <>
                    <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
                      <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        Anomalies Detected
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {runResult.anomaliesEscalated} issue(s) escalated —
                        confidence gate triggered
                      </p>
                    </div>
                    {runResult.warnings.length > 0 && (
                      <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4 max-w-sm w-full">
                        <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-2">
                          Escalation Details
                        </p>
                        <ul className="space-y-1">
                          {runResult.warnings.slice(0, 3).map((w, i) => (
                            <li
                              key={i}
                              className="text-xs text-muted-foreground flex items-start gap-1"
                            >
                              <span>•</span> {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {runStatus === "failed" && (
                  <>
                    <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
                      <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        Audit Cycle Failed
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The audit pipeline encountered errors
                      </p>
                    </div>
                    {runResult?.errors && runResult.errors.length > 0 && (
                      <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4 max-w-sm w-full">
                        <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-2">
                          Errors:
                        </p>
                        <ul className="space-y-1">
                          {runResult.errors.map((err, i) => (
                            <li
                              key={i}
                              className="text-xs text-muted-foreground flex items-start gap-1"
                            >
                              <span>•</span> {err}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant={runStatus === "completed" ? "default" : "outline"}
                  onClick={handleClose}
                >
                  {runStatus === "completed" ? "Done" : "Close"}
                </Button>
                {(runStatus === "failed" || runStatus === "escalated") && (
                  <Button variant="outline" onClick={resetForm}>
                    Try Again
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
