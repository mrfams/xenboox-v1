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
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  Badge,
} from "@/components/ui";
import {
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Shield,
  Gavel,
  FileSearch,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RunTaxComplianceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  currentPeriod: string;
}

type PipelineRunStatus =
  "idle" | "running" | "completed" | "failed" | "escalated";

// ─── Component ──────────────────────────────────────────────────────────────

export function RunTaxComplianceDialog({
  open,
  onOpenChange,
  onComplete,
  currentPeriod,
}: RunTaxComplianceDialogProps) {
  const utils = trpc.useUtils();
  const [period, setPeriod] = useState(currentPeriod);
  const [triggerSource, setTriggerSource] = useState<
    "manual" | "scheduled" | "agent"
  >("manual");
  const [includeCorporateTax, setIncludeCorporateTax] = useState(false);
  const [simulateRules, setSimulateRules] = useState(false);
  const [runStatus, setRunStatus] = useState<PipelineRunStatus>("idle");
  const [runResult, setRunResult] = useState<{
    success: boolean;
    status: string;
    overallConfidence: number;
    escalated: boolean;
    vatNetPosition: number;
    withholdingTotal: number;
    payeTotal: number;
    regulatoryRisks: number;
    stepsCompleted: number;
    totalSteps: number;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const runMutation = trpc.taxCompliance.runPipeline.useMutation({
    onSuccess: (data) => {
      setRunResult({
        success: data.success,
        status: data.status,
        overallConfidence: data.overallConfidence,
        escalated: data.escalated,
        vatNetPosition: data.vatNetPosition,
        withholdingTotal: data.withholdingTotal,
        payeTotal: data.payeTotal,
        regulatoryRisks: data.regulatoryRisks,
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
      utils.taxCompliance.getStatus.invalidate();
      utils.taxCompliance.listVatCalculations.invalidate();
      utils.taxCompliance.listWithholdingRecords.invalidate();
      utils.taxCompliance.listFilingDeadlines.invalidate();
      if (data.success) onComplete();
    },
    onError: () => {
      setRunStatus("failed");
      setRunResult({
        success: false,
        status: "failed",
        overallConfidence: 0,
        escalated: false,
        vatNetPosition: 0,
        withholdingTotal: 0,
        payeTotal: 0,
        regulatoryRisks: 0,
        stepsCompleted: 0,
        totalSteps: 11,
        errors: ["Pipeline execution failed"],
        warnings: [],
      });
    },
  });

  const handleRun = useCallback(() => {
    setRunStatus("running");
    runMutation.mutate({
      period,
      triggerSource,
      includeCorporateTax,
      simulateRules,
    });
  }, [period, triggerSource, includeCorporateTax, simulateRules, runMutation]);

  const resetForm = useCallback(() => {
    setPeriod(currentPeriod);
    setTriggerSource("manual");
    setIncludeCorporateTax(false);
    setSimulateRules(false);
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
              Run Tax Compliance Pipeline
            </DialogTitle>
            <DialogDescription>
              Start an autonomous tax & compliance pipeline for the selected
              period. VAT, withholding, PAYE filing prep, and compliance review
              — all 11 steps.
            </DialogDescription>
          </DialogHeader>

          {runStatus === "idle" ? (
            <>
              {/* ── Period & Configuration ──────────────────────────── */}
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="period">Tax Period</Label>
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
                    <Label htmlFor="trigger">Trigger Source</Label>
                    <Select
                      value={triggerSource}
                      onValueChange={(v) =>
                        setTriggerSource(v as typeof triggerSource)
                      }
                    >
                      <SelectTrigger id="trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual (User)</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="agent">Agent-Initiated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Toggle options */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 p-3">
                    <input
                      type="checkbox"
                      id="includeCorporateTax"
                      checked={includeCorporateTax}
                      onChange={(e) => setIncludeCorporateTax(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label
                      htmlFor="includeCorporateTax"
                      className="text-xs text-purple-700 dark:text-purple-400 cursor-pointer"
                    >
                      Include corporate tax package assembly (annual)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                    <input
                      type="checkbox"
                      id="simulateRules"
                      checked={simulateRules}
                      onChange={(e) => setSimulateRules(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label
                      htmlFor="simulateRules"
                      className="text-xs text-amber-700 dark:text-amber-400 cursor-pointer"
                    >
                      Simulate tax rule updates (proposes changes for review —
                      not auto-applied)
                    </Label>
                  </div>
                </div>
              </div>

              {/* ── Policy Reminders ────────────────────────────────── */}
              <div className="space-y-2 border-t pt-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Compliance Guardrails
                </h4>
                <div className="grid gap-2">
                  <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/10 p-2.5">
                    <Gavel className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium text-red-600 dark:text-red-400">
                        Always-Escalate:
                      </span>{" "}
                      Regulatory risk always surfaces to CFO + human — never
                      auto-resolved
                    </p>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/10 p-2.5">
                    <FileSearch className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        No Auto-Apply:
                      </span>{" "}
                      Rule changes require explicit human sign-off before
                      activation
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Pipeline Steps Preview ──────────────────────────── */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">
                  Pipeline Steps (11 total)
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {[
                    "Rules",
                    "VAT",
                    "WHT",
                    "PAYE",
                    "CorpTax",
                    "Review",
                    "Export",
                    "Deadlines",
                    "Risk",
                    "Updates",
                    "Summary",
                  ].map((step, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1.5"
                    >
                      <div
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          i < 2 ? "bg-emerald-500" : "bg-muted-foreground/30",
                        )}
                      />
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
                  Run Tax Compliance Pipeline
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
                        Running Tax Compliance Pipeline
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Processing {period} through all 11 steps...
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
                        Tax Compliance Complete
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {period} — {runResult.stepsCompleted}/
                        {runResult.totalSteps} steps completed successfully
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          VAT Position
                        </p>
                        <p className="text-xl font-bold">
                          {formatCurrency(runResult.vatNetPosition)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          WHT Total
                        </p>
                        <p className="text-xl font-bold">
                          {formatCurrency(runResult.withholdingTotal)}
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
                          Compliance
                        </p>
                        <p className="text-xl font-bold capitalize">
                          {runResult.status}
                        </p>
                      </div>
                    </div>
                    {runResult.escalated && (
                      <Badge variant="destructive" className="mt-2">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Escalated — {runResult.regulatoryRisks} risk(s)
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
                        Regulatory Risk Detected
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pipeline completed but {runResult.regulatoryRisks}{" "}
                        risk(s) escalated to CFO + human
                      </p>
                    </div>
                    {runResult.warnings.length > 0 && (
                      <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4 max-w-sm w-full">
                        <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-2">
                          Escalation Details
                        </p>
                        <ul className="space-y-1">
                          {runResult.warnings.map((w, i) => (
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
                      <p className="text-lg font-semibold">Pipeline Failed</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The tax compliance pipeline encountered errors
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
