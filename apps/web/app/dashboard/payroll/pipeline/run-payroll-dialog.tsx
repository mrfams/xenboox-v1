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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  PlayCircle,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  FileText,
  UserPlus,
  UserX,
  DollarSign,
  Percent,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExceptionItem {
  id: string;
  type:
    "new_starter" | "leaver" | "salary_change" | "bonus" | "allowance_change";
  employeeId?: string;
  employeeNumber?: string;
  effectiveDate: string;
  details: Record<string, unknown>;
}

interface RunPayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  currentPeriod: string;
}

type PayrollRunStatus =
  "idle" | "running" | "completed" | "failed" | "awaiting_approval";

// ─── Component ──────────────────────────────────────────────────────────────

export function RunPayrollDialog({
  open,
  onOpenChange,
  onComplete,
  currentPeriod,
}: RunPayrollDialogProps) {
  const utils = trpc.useUtils();
  const [period, setPeriod] = useState(currentPeriod);
  const [triggerSource, setTriggerSource] = useState<
    "manual" | "scheduled" | "agent"
  >("manual");
  const [skipValidation, setSkipValidation] = useState(false);
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [runStatus, setRunStatus] = useState<PayrollRunStatus>("idle");
  const [runResult, setRunResult] = useState<{
    employeeCount: number;
    totalGrossPay: string;
    totalNetPay: string;
    journalPosted: boolean;
    escalated: boolean;
    payslipCount: number;
    confidence: number;
    errors: string[];
  } | null>(null);

  const runMutation = trpc.payroll.runPayrollPipeline.useMutation({
    onSuccess: (data) => {
      setRunResult({
        employeeCount: data.employeeCount,
        totalGrossPay: String(data.totalGrossPay),
        totalNetPay: String(data.totalNetPay),
        journalPosted: data.journalPosted,
        escalated: data.escalated,
        payslipCount: data.payslipCount,
        confidence: data.overallConfidence,
        errors: data.errors,
      });
      setRunStatus(
        data.escalated
          ? "awaiting_approval"
          : data.success
            ? "completed"
            : "failed",
      );
      utils.payroll.listPayrollRuns.invalidate();
      utils.payroll.listEmployees.invalidate();
      if (data.success) onComplete();
    },
    onError: () => {
      setRunStatus("failed");
      setRunResult({
        employeeCount: 0,
        totalGrossPay: "0",
        totalNetPay: "0",
        journalPosted: false,
        escalated: false,
        payslipCount: 0,
        confidence: 0,
        errors: ["Pipeline execution failed"],
      });
    },
  });

  const handleRun = useCallback(() => {
    setRunStatus("running");
    runMutation.mutate({
      period,
      triggerSource,
      skipValidation,
      exceptions: exceptions.map((exc) => ({
        type: exc.type,
        employeeId: exc.employeeId,
        employeeNumber: exc.employeeNumber,
        effectiveDate: exc.effectiveDate,
        details: exc.details,
        applied: false,
      })),
    });
  }, [period, triggerSource, skipValidation, exceptions, runMutation]);

  const addException = useCallback((type: ExceptionItem["type"]) => {
    const newExc: ExceptionItem = {
      id: crypto.randomUUID(),
      type,
      effectiveDate: new Date().toISOString().split("T")[0]!,
      details: {},
    };
    setExceptions((prev) => [...prev, newExc]);
  }, []);

  const updateException = useCallback(
    (id: string, updates: Partial<ExceptionItem>) => {
      setExceptions((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      );
    },
    [],
  );

  const removeException = useCallback((id: string) => {
    setExceptions((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const resetForm = useCallback(() => {
    setPeriod(currentPeriod);
    setTriggerSource("manual");
    setSkipValidation(false);
    setExceptions([]);
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
              <PlayCircle className="h-5 w-5 text-primary" />
              Run Payroll
            </DialogTitle>
            <DialogDescription>
              Start an autonomous payroll pipeline for the selected period.
              Salary data is role-scoped — only authorized roles can view.
            </DialogDescription>
          </DialogHeader>

          {runStatus === "idle" ? (
            <>
              {/* ── Period & Configuration ──────────────────────────── */}
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="period">Payroll Period</Label>
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

                <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                  <input
                    type="checkbox"
                    id="skipValidation"
                    checked={skipValidation}
                    onChange={(e) => setSkipValidation(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label
                    htmlFor="skipValidation"
                    className="text-xs text-amber-700 dark:text-amber-400 cursor-pointer"
                  >
                    Skip confidence gate validation (force-run without review —
                    use cautiously)
                  </Label>
                </div>
              </div>

              {/* ── Exception Intake ────────────────────────────────── */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">Exception Intake</h4>
                    <p className="text-xs text-muted-foreground">
                      Apply changes BEFORE calculation — never patched after the
                      fact
                    </p>
                  </div>
                </div>

                {/* Exception type quick-add buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      type: "salary_change" as const,
                      label: "Salary Change",
                      icon: DollarSign,
                    },
                    {
                      type: "bonus" as const,
                      label: "Add Bonus",
                      icon: Percent,
                    },
                    {
                      type: "new_starter" as const,
                      label: "New Starter",
                      icon: UserPlus,
                    },
                    { type: "leaver" as const, label: "Leaver", icon: UserX },
                    {
                      type: "allowance_change" as const,
                      label: "Allowance",
                      icon: FileText,
                    },
                  ].map(({ type, label, icon: Icon }) => (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      onClick={() => addException(type)}
                      className="gap-1.5 text-xs h-8"
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </Button>
                  ))}
                </div>

                {/* Exception list */}
                {exceptions.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No exceptions added
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      New starters will be included in the next period
                      automatically
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {exceptions.map((exc) => (
                      <div
                        key={exc.id}
                        className="flex items-start gap-2 rounded-lg border p-3"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase"
                            >
                              {exc.type.replace("_", " ")}
                            </Badge>
                            <Input
                              placeholder={
                                exc.type === "new_starter"
                                  ? "Employee name"
                                  : "Employee ID"
                              }
                              value={exc.employeeNumber ?? ""}
                              onChange={(e) =>
                                updateException(exc.id, {
                                  employeeNumber: e.target.value,
                                })
                              }
                              className="h-7 text-xs flex-1"
                            />
                          </div>

                          {exc.type === "salary_change" && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="New salary amount"
                                type="number"
                                onChange={(e) =>
                                  updateException(exc.id, {
                                    details: {
                                      ...exc.details,
                                      newSalary: e.target.value,
                                    },
                                  })
                                }
                                className="h-7 text-xs"
                              />
                            </div>
                          )}

                          {exc.type === "bonus" && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Bonus amount"
                                type="number"
                                onChange={(e) =>
                                  updateException(exc.id, {
                                    details: {
                                      ...exc.details,
                                      amount: e.target.value,
                                    },
                                  })
                                }
                                className="h-7 text-xs"
                              />
                            </div>
                          )}

                          {exc.type === "allowance_change" && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Allowance name"
                                onChange={(e) =>
                                  updateException(exc.id, {
                                    details: {
                                      ...exc.details,
                                      allowanceName: e.target.value,
                                    },
                                  })
                                }
                                className="h-7 text-xs flex-1"
                              />
                              <Input
                                placeholder="Amount"
                                type="number"
                                onChange={(e) =>
                                  updateException(exc.id, {
                                    details: {
                                      ...exc.details,
                                      allowanceAmount: e.target.value,
                                    },
                                  })
                                }
                                className="h-7 text-xs w-28"
                              />
                            </div>
                          )}

                          {exc.type === "leaver" && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Termination date"
                                type="date"
                                onChange={(e) =>
                                  updateException(exc.id, {
                                    effectiveDate: e.target.value,
                                    details: {
                                      ...exc.details,
                                      terminationDate: e.target.value,
                                    },
                                  })
                                }
                                className="h-7 text-xs"
                              />
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-500"
                          onClick={() => removeException(exc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Pipeline Steps Preview ──────────────────────────── */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">
                  Pipeline Steps (12 total)
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {[
                    "Staff Data",
                    "Trigger",
                    "Exceptions",
                    "Gross Pay",
                    "Deductions",
                    "Contractors",
                    "Conf. Gate",
                    "Posting",
                    "Payslips",
                    "Compliance",
                    "Annual Docs",
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
                  Run Payroll Pipeline
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
                        Running Payroll Pipeline
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Processing {period} payroll through all 12 steps...
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
                      <p className="text-lg font-semibold">Payroll Completed</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {period} — All steps executed successfully
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          Employees
                        </p>
                        <p className="text-xl font-bold">
                          {runResult.employeeCount}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">Net Pay</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(Number(runResult.totalNetPay))}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          Confidence
                        </p>
                        <p className="text-xl font-bold">
                          {Math.round(runResult.confidence * 100)}%
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          Payslips
                        </p>
                        <p className="text-xl font-bold">
                          {runResult.payslipCount}
                        </p>
                      </div>
                    </div>
                    {runResult.journalPosted && (
                      <Badge
                        variant="default"
                        className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Journal Posted
                      </Badge>
                    )}
                  </>
                )}

                {runStatus === "awaiting_approval" && runResult && (
                  <>
                    <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3">
                      <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        Awaiting Human Approval
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Payroll calculated but flagged for review — journal
                        posting deferred
                      </p>
                    </div>
                    <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-4 max-w-sm w-full">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                        Review Required
                      </p>
                      {runResult.errors.length > 0 && (
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
                      )}
                    </div>
                  </>
                )}

                {runStatus === "failed" && (
                  <>
                    <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
                      <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">Payroll Failed</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The pipeline encountered errors
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
                {(runStatus === "failed" ||
                  runStatus === "awaiting_approval") && (
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
