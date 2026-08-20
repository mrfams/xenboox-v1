"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/trpc/client";
import { Button } from "@xenboox/ui/button";
import { Badge } from "@xenboox/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@xenboox/ui/dialog";
import { Input } from "@xenboox/ui/input";
import { Label } from "@xenboox/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@xenboox/ui/select";
import { Textarea } from "@xenboox/ui/textarea";
import {
  ArrowRightLeft,
  Clock,
  Play,
  Pause,
  Plus,
  RotateCcw,
  Trash2,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Loader2,
} from "lucide-react";

// ─── Status Badge ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: {
      label: "Active",
      className: "bg-emerald-100 text-emerald-700",
      icon: CheckCircle2,
    },
    paused: {
      label: "Paused",
      className: "bg-amber-100 text-amber-700",
      icon: PauseCircle,
    },
    completed: {
      label: "Completed",
      className: "bg-slate-100 text-slate-600",
      icon: CheckCircle2,
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-100 text-red-600",
      icon: XCircle,
    },
  };

  const c = config[status as keyof typeof config] ?? config.active;
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}
    >
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

// ─── Direction Badge ────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: string }) {
  return direction === "ar" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
      <ArrowRightLeft className="h-3 w-3" />
      Sales Invoice
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
      <ArrowRightLeft className="h-3 w-3 rotate-180" />
      Purchase Invoice
    </span>
  );
}

// ─── Frequency Display ──────────────────────────────────────────────────

function FrequencyDisplay({
  frequency,
  intervalValue,
}: {
  frequency: string;
  intervalValue: number;
}) {
  const labels: Record<string, string> = {
    weekly: "week",
    biweekly: "2 weeks",
    monthly: "month",
    quarterly: "quarter",
    annually: "year",
  };

  const label = labels[frequency] ?? frequency;
  const display =
    intervalValue > 1 ? `Every ${intervalValue} ${label}s` : `Every ${label}`;
  return <span className="text-sm text-slate-600">{display}</span>;
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function RecurringPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [direction, setDirection] = useState<"ar" | "ap">("ar");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Queries
  const utils = api.useUtils();
  const { data: schedules, isLoading } = api.recurring.list.useQuery({
    direction: "all",
    status:
      statusFilter === "all"
        ? "all"
        : (statusFilter as
            "all" | "active" | "paused" | "completed" | "cancelled"),
  });

  const { data: summary } = api.recurring.getSummary.useQuery();

  // Mutations
  const pauseMutation = api.recurring.pause.useMutation({
    onSuccess: () => utils.recurring.list.invalidate(),
  });
  const resumeMutation = api.recurring.resume.useMutation({
    onSuccess: () => utils.recurring.list.invalidate(),
  });
  const cancelMutation = api.recurring.cancel.useMutation({
    onSuccess: () => utils.recurring.list.invalidate(),
  });
  const triggerMutation = api.recurring.triggerRun.useMutation({
    onSuccess: () => {
      utils.recurring.list.invalidate();
      utils.recurring.getSummary.invalidate();
    },
  });

  // Format currency
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GMD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Recurring Invoices & Bills
          </h1>
          <p className="text-sm text-slate-500">
            Automate recurring billing and purchase invoices
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <CreateScheduleForm
              direction={direction}
              onDirectionChange={setDirection}
              onClose={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Active</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {summary.active}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Paused</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {summary.paused}
                  </p>
                </div>
                <PauseCircle className="h-8 w-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Completed</p>
                  <p className="text-2xl font-bold text-slate-600">
                    {summary.completed}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-slate-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {summary.total}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-slate-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Runs */}
      {summary && summary.upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Upcoming Runs (Next 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.upcoming.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {run.templateName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Next run: {run.nextRunDate}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {formatCurrency(parseFloat(run.totalAmount))}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "active", "paused", "completed", "cancelled"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Schedule List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : !schedules || schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Calendar className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900">
                No recurring schedules
              </h3>
              <p className="text-sm text-slate-500">
                Create your first recurring invoice or bill schedule
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                      <FileText className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {schedule.templateName}
                        </p>
                        <DirectionBadge direction={schedule.direction} />
                        <StatusBadge status={schedule.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                        <span>{schedule.partyName}</span>
                        <FrequencyDisplay
                          frequency={schedule.frequency}
                          intervalValue={schedule.intervalValue}
                        />
                        <span>Next: {schedule.nextRunDate}</span>
                        <span>{schedule.totalGenerated} generated</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {formatCurrency(parseFloat(schedule.totalAmount))}
                    </span>
                    <div className="flex gap-1">
                      {schedule.status === "active" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              triggerMutation.mutate({
                                scheduleId: schedule.id,
                              })
                            }
                            disabled={triggerMutation.isPending}
                            title="Run now"
                          >
                            <Play className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              pauseMutation.mutate({
                                scheduleId: schedule.id,
                              })
                            }
                            title="Pause"
                          >
                            <Pause className="h-3.5 w-3.5 text-amber-600" />
                          </Button>
                        </>
                      )}
                      {schedule.status === "paused" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            resumeMutation.mutate({
                              scheduleId: schedule.id,
                            })
                          }
                          title="Resume"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                      )}
                      {(schedule.status === "active" ||
                        schedule.status === "paused") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (
                              confirm(
                                "Cancel this recurring schedule? This cannot be undone.",
                              )
                            ) {
                              cancelMutation.mutate({
                                scheduleId: schedule.id,
                              });
                            }
                          }}
                          title="Cancel"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Create Schedule Form ───────────────────────────────────────────────

function CreateScheduleForm({
  direction,
  onDirectionChange,
  onClose,
}: {
  direction: "ar" | "ap";
  onDirectionChange: (d: "ar" | "ap") => void;
  onClose: () => void;
}) {
  const utils = api.useUtils();

  const [templateName, setTemplateName] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [lines, setLines] = useState<
    Array<{ description: string; quantity: number; unitPrice: number }>
  >([{ description: "", quantity: 1, unitPrice: 0 }]);

  const createMutation = api.recurring.create.useMutation({
    onSuccess: () => {
      utils.recurring.list.invalidate();
      utils.recurring.getSummary.invalidate();
      onClose();
    },
  });

  const addLine = () => {
    setLines([...lines, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, value: string | number) => {
    const updated = [...lines];
    (updated[index] as Record<string, unknown>)[field] = value;
    setLines(updated);
  };

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const handleSubmit = () => {
    if (!templateName || lines.length === 0) return;

    createMutation.mutate({
      direction,
      customerId: direction === "ar" ? undefined : undefined, // Will need to be selected
      supplierId: direction === "ap" ? undefined : undefined,
      templateName,
      templateLines: lines.filter((l) => l.description),
      frequency: frequency as
        "weekly" | "biweekly" | "monthly" | "quarterly" | "annually",
      startDate,
      paymentTerms: "net30",
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Recurring Schedule</DialogTitle>
        <DialogDescription>
          Set up automatic invoice or bill generation on a recurring schedule.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Direction Toggle */}
        <div className="flex gap-2">
          <Button
            variant={direction === "ar" ? "default" : "outline"}
            onClick={() => onDirectionChange("ar")}
          >
            Sales Invoice (AR)
          </Button>
          <Button
            variant={direction === "ap" ? "default" : "outline"}
            onClick={() => onDirectionChange("ap")}
          >
            Purchase Invoice (AP)
          </Button>
        </div>

        {/* Schedule Name */}
        <div className="space-y-2">
          <Label>Schedule Name</Label>
          <Input
            placeholder="e.g., Monthly Retainer - Client ABC"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Line Items</Label>
            <Button variant="ghost" size="sm" onClick={addLine}>
              <Plus className="mr-1 h-3 w-3" />
              Add Line
            </Button>
          </div>
          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) =>
                    updateLine(index, "description", e.target.value)
                  }
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(index, "quantity", Number(e.target.value))
                  }
                  className="w-20"
                />
                <Input
                  type="number"
                  placeholder="Unit Price"
                  value={line.unitPrice}
                  onChange={(e) =>
                    updateLine(index, "unitPrice", Number(e.target.value))
                  }
                  className="w-28"
                />
                {lines.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => removeLine(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end text-sm font-medium text-slate-700">
            Subtotal:{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "GMD",
            }).format(subtotal)}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!templateName || createMutation.isPending}
        >
          {createMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Create Schedule
        </Button>
      </DialogFooter>
    </>
  );
}
