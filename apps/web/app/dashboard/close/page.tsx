"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Clock,
  Sparkles,
  Settings,
  Calendar,
  RefreshCw,
  Send,
  Shield,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  overview,
}: {
  overview: {
    overallProgress: number;
    completedTasks: number;
    totalTasks: number;
    closeStatus: string;
    estimatedCloseDate: string;
    daysRemaining: number;
    autoCompleted: number;
    autoCompletedPercent: number;
    adjustmentsDetected: number;
    risksAndBlockers: number;
    isOnTrack: boolean;
  };
}) {
  return (
    <div className="grid grid-cols-5 gap-4">
      {/* Overall Progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg className="h-16 w-16" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#6366f1"
                strokeWidth="8"
                strokeDasharray={`${overview.overallProgress * 2.512} 251.2`}
                transform="rotate(-90 50 50)"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-slate-900">
                {overview.overallProgress}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              Overall Progress
            </p>
            <p className="text-xs text-slate-500">Tasks Completed</p>
            <p className="text-sm font-medium text-slate-700">
              {overview.completedTasks} / {overview.totalTasks}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-slate-500">On Track</span>
              <span
                className={cn(
                  "text-xs font-medium",
                  overview.isOnTrack ? "text-emerald-600" : "text-red-600",
                )}
              >
                {overview.isOnTrack ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Close Status */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-slate-500">Close Status</p>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              overview.closeStatus === "On Track"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-600",
            )}
          >
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {overview.closeStatus}
          </span>
        </div>
        <p className="text-xs text-slate-500">Estimated Close Date</p>
        <p className="text-sm font-medium text-slate-900">
          {new Date(overview.estimatedCloseDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {overview.daysRemaining} days remaining
        </p>
      </div>

      {/* Auto-Completed by AI */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-slate-500">Auto-Completed by AI</p>
          <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">
          {overview.autoCompleted}
        </p>
        <p className="text-xs text-slate-400">
          {overview.autoCompletedPercent}% of tasks
        </p>
        <p className="text-xs text-emerald-600 mt-1">↑ 6 vs last month</p>
      </div>

      {/* Adjustments Detected */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-slate-500">Adjustments Detected</p>
          <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">
          {overview.adjustmentsDetected}
        </p>
        <p className="text-xs text-slate-400">Requires review</p>
        <p className="text-xs text-red-600 mt-1">↑ 2 vs last month</p>
      </div>

      {/* Risks & Blockers */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-slate-500">Risks & Blockers</p>
          <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
            <Shield className="h-4 w-4 text-red-600" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">
          {overview.risksAndBlockers}
        </p>
        <p className="text-xs text-slate-400">Needs attention</p>
        <p className="text-xs text-emerald-600 mt-1">↓ 1 vs last month</p>
      </div>
    </div>
  );
}

// ─── Close Checklist ───────────────────────────────────────────────────────

function CloseChecklist({
  checklist,
}: {
  checklist: {
    period: string;
    phases: Array<{
      id: string;
      name: string;
      order: number;
      tasks?: Array<{
        id: string;
        name: string;
        owner: string;
        ownerInitials: string;
        ownerColor: string;
        status: string;
        confidence: number | null;
        dueDate: string;
      }>;
      taskCount?: number;
      isExpanded?: boolean;
    }>;
    totalTasks: number;
    completedTasks: number;
  };
}) {
  const [expandedPhases, setExpandedPhases] = useState<string[]>(["pre-close"]);

  const utils = trpc.useUtils();
  const updateStatus = trpc.closeCenter.updateTaskStatus.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    },
    onError: () => toast.error("Failed to update task"),
    onSettled: () => {
      utils.closeCenter.getChecklist.invalidate({ period: checklist.period });
      utils.closeCenter.getOverview.invalidate({ period: checklist.period });
    },
  });

  const changeTaskStatus = (taskId: string, status: string) => {
    // Optimistic update
    utils.closeCenter.getChecklist.setData(
      { period: checklist.period },
      (old) => {
        if (!old) return old;
        return {
          ...old,
          completedTasks:
            status === "completed"
              ? old.completedTasks + 1
              : Math.max(0, old.completedTasks - 1),
          phases: old.phases.map((p) =>
            p.tasks
              ? {
                  ...p,
                  tasks: p.tasks.map((t) =>
                    t.id === taskId ? { ...t, status } : t,
                  ),
                }
              : p,
          ),
        };
      },
    );
    updateStatus.mutate({
      id: taskId,
      status: status as
        | "pending"
        | "in_progress"
        | "in_review"
        | "completed"
        | "blocked"
        | "skipped",
    });
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) =>
      prev.includes(phaseId)
        ? prev.filter((id) => id !== phaseId)
        : [...prev, phaseId],
    );
  };

  const statusIcons: Record<
    string,
    { icon: typeof CheckCircle2; color: string; bg: string }
  > = {
    completed: {
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    in_review: { icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
    in_progress: {
      icon: RefreshCw,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    blocked: {
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-100",
    },
    skipped: { icon: Clock, color: "text-slate-400", bg: "bg-slate-100" },
    pending: { icon: RefreshCw, color: "text-slate-400", bg: "bg-slate-100" },
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-900">
            Close Checklist
          </h3>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {checklist.totalTasks} Tasks
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select className="text-xs text-slate-500 border border-slate-200 rounded px-2 py-1">
            <option>All Tasks</option>
          </select>
          <select className="text-xs text-slate-500 border border-slate-200 rounded px-2 py-1">
            <option>Group by: Phase</option>
          </select>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 text-xs font-medium text-slate-500 border-b border-slate-200">
        <div className="col-span-5">Task</div>
        <div className="col-span-2">Owner / Agent</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-1">Confidence</div>
        <div className="col-span-1">Due Date</div>
        <div className="col-span-2"></div>
      </div>

      {/* Phases */}
      <div className="divide-y divide-slate-100">
        {checklist.phases.map((phase) => (
          <div key={phase.id}>
            {/* Phase Header */}
            <button
              onClick={() => togglePhase(phase.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedPhases.includes(phase.id) ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
                <span className="text-sm font-medium text-slate-900">
                  {phase.order}. {phase.name}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                {phase.tasks
                  ? `${phase.tasks.length} tasks`
                  : `${phase.taskCount} tasks`}
              </span>
            </button>

            {/* Tasks */}
            {expandedPhases.includes(phase.id) && phase.tasks && (
              <div className="divide-y divide-slate-100">
                {phase.tasks.map((task) => {
                  const statusConfig =
                    statusIcons[task.status] || statusIcons.pending;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={task.id}
                      className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-50"
                    >
                      <div className="col-span-5 flex items-center gap-3">
                        <StatusIcon
                          className={cn("h-4 w-4", statusConfig.color)}
                        />
                        <span className="text-sm text-slate-700">
                          {task.name}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <div
                          className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                            task.ownerColor,
                          )}
                        >
                          {task.ownerInitials}
                        </div>
                        <span className="text-xs text-slate-600">
                          {task.owner}
                        </span>
                      </div>
                      <div className="col-span-1">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            task.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : task.status === "in_review"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {task.status === "completed"
                            ? "Completed"
                            : task.status === "in_review"
                              ? "In Review"
                              : task.status === "in_progress"
                                ? "In Progress"
                                : task.status === "blocked"
                                  ? "Blocked"
                                  : task.status === "skipped"
                                    ? "Skipped"
                                    : "Pending"}
                        </span>
                      </div>
                      <div className="col-span-1 text-sm text-slate-600">
                        {task.confidence ? `${task.confidence}%` : "—"}
                      </div>
                      <div className="col-span-1 text-xs text-slate-500">
                        {task.dueDate}
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <select
                          value={task.status}
                          onChange={(e) =>
                            changeTaskStatus(task.id, e.target.value)
                          }
                          disabled={updateStatus.isPending}
                          title="Update task status"
                          className="text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="in_review">In Review</option>
                          <option value="completed">Completed</option>
                          <option value="blocked">Blocked</option>
                          <option value="skipped">Skipped</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* View full checklist */}
      <div className="p-4 border-t border-slate-200">
        <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          View full checklist →
        </button>
      </div>
    </div>
  );
}

// ─── AI Close Assistant ────────────────────────────────────────────────────

function AiCloseAssistant({
  recommendations,
}: {
  recommendations: {
    isOnTrack: boolean;
    estimatedCloseDate: string;
    risksCount: number;
    recommendations: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      actionLabel: string;
    }>;
  };
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Bot className="h-3 w-3 text-white" />
          </div>
          <h3 className="text-sm font-medium text-slate-900">
            AI Close Assistant
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Status message */}
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900">
                You&apos;re on track to close on{" "}
                {new Date(
                  recommendations.estimatedCloseDate,
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                I&apos;ve analyzed your progress and identified{" "}
                {recommendations.risksCount} risks that could delay your close.
              </p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-3">
            Top Recommendations
          </h4>
          <div className="space-y-3">
            {recommendations.recommendations.map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  "rounded-lg border p-3",
                  rec.type === "warning"
                    ? "border-amber-200 bg-amber-50"
                    : "border-blue-200 bg-blue-50",
                )}
              >
                <div className="flex items-start gap-2">
                  {rec.type === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {rec.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {rec.description}
                    </p>
                    <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-2">
                      {rec.actionLabel} →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Run analysis button */}
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
          <Sparkles className="h-4 w-4" />
          Run AI pre-close analysis
        </button>
      </div>
    </div>
  );
}

// ─── Bottom Row ────────────────────────────────────────────────────────────

function BottomRow({
  trend,
  timeSaved,
  history,
}: {
  trend: Array<{
    date: string;
    thisMonth: number;
    lastMonth: number;
  }>;
  timeSaved: {
    totalHours: number;
    totalHoursFormatted: string;
    changeVsLastMonth: number;
    breakdown: Array<{
      task: string;
      hours: number;
    }>;
  };
  history: Array<{
    period: string;
    closedDate: string;
    onTime: boolean;
  }>;
}) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Task Completion Trend */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h4 className="text-sm font-medium text-slate-900 mb-4">
          Task Completion Trend
        </h4>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-500" />
            <span className="text-xs text-slate-500">This Month</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500">Last Month</span>
          </div>
        </div>

        {/* Simple line chart */}
        <div className="h-32 flex items-end gap-2">
          {trend.map((d, _i) => {
            const __maxValue = 100;
            return (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className="w-full flex items-end gap-1"
                  style={{ height: "80px" }}
                >
                  <div
                    className="flex-1 bg-slate-200 rounded-t"
                    style={{ height: `${d.lastMonth}%` }}
                  />
                  <div
                    className="flex-1 bg-indigo-500 rounded-t"
                    style={{ height: `${d.thisMonth}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">{d.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Saved by AI */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-900">
            Time Saved by AI
          </h4>
          <select className="text-xs text-slate-500 border border-slate-200 rounded px-2 py-1">
            <option>This Month</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          {/* Donut Chart */}
          <div className="relative">
            <svg className="h-24 w-24" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="12"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#6366f1"
                strokeWidth="12"
                strokeDasharray="251.2"
                strokeDashoffset="100"
                transform="rotate(-90 50 50)"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#10b981"
                strokeWidth="12"
                strokeDasharray="251.2"
                strokeDashoffset="200"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">
                  {timeSaved.totalHours}
                </p>
                <p className="text-[10px] text-slate-500">Total Hours</p>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex-1 space-y-2">
            {timeSaved.breakdown.slice(0, 4).map((item) => (
              <div
                key={item.task}
                className="flex items-center justify-between"
              >
                <span className="text-xs text-slate-600 truncate max-w-[120px]">
                  {item.task}
                </span>
                <span className="text-xs text-slate-500">{item.hours} hrs</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-slate-500">vs last month</span>
          <span className="text-xs font-medium text-emerald-600">
            ↑ {timeSaved.changeVsLastMonth}%
          </span>
        </div>
      </div>

      {/* Close History */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-900">Close History</h4>
          <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
            View all →
          </button>
        </div>
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.period}
              className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {item.period}
                </p>
                <p className="text-xs text-slate-500">
                  Closed on {item.closedDate}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                100%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AI Copilot Panel ──────────────────────────────────────────────────────

function AiCopilotPanel({
  overview,
  insights,
}: {
  overview: {
    overallProgress: number;
    completedTasks: number;
    totalTasks: number;
    estimatedCloseDate: string;
    risksAndBlockers: number;
    isOnTrack: boolean;
  };
  insights: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
  }>;
}) {
  const [message, setMessage] = useState("");

  const quickActions = [
    "What are the open tasks?",
    "Show me reconciliation status",
    "Why is this task delayed?",
  ];

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Xenboox AI Copilot</h3>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                Beta
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Greeting */}
        <div className="rounded-xl bg-indigo-50 p-3">
          <p className="text-sm text-slate-700">
            What&apos;s the status of our month-end close?
          </p>
        </div>

        {/* AI Response */}
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Bot className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-medium text-slate-600">
              Xenboox AI
            </span>
            <span className="text-xs text-slate-400">10:30 AM</span>
          </div>
          <p className="text-sm text-slate-700 mb-3">
            Here&apos;s the current status for May 2025:
          </p>

          {/* Status summary */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Overall Progress</span>
              <span className="font-medium text-slate-900">
                {overview.overallProgress}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${overview.overallProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Tasks Completed</span>
              <span className="font-medium text-slate-900">
                {overview.completedTasks} / {overview.totalTasks}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Estimated Close Date</span>
              <span className="font-medium text-slate-900">
                {new Date(overview.estimatedCloseDate).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Risks & Blockers</span>
              <span className="font-medium text-slate-900">
                {overview.risksAndBlockers}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">On Track</span>
              <span
                className={cn(
                  "font-medium",
                  overview.isOnTrack ? "text-emerald-600" : "text-red-600",
                )}
              >
                {overview.isOnTrack ? "Yes" : "No"}
              </span>
            </div>
          </div>

          <button className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700">
            View close checklist →
          </button>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          {quickActions.map((action, i) => (
            <button
              key={i}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200 transition-colors"
            >
              <Bot className="h-4 w-4 text-slate-400" />
              {action}
            </button>
          ))}
        </div>

        {/* AI Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-900">AI Insights</h4>
            <span className="text-xs text-slate-400">Generated 5 min ago</span>
          </div>
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  "rounded-lg border p-3",
                  insight.type === "success"
                    ? "border-emerald-200 bg-emerald-50"
                    : insight.type === "warning"
                      ? "border-amber-200 bg-amber-50"
                      : "border-blue-200 bg-blue-50",
                )}
              >
                <div className="flex items-start gap-2">
                  {insight.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                  ) : insight.type === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {insight.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700">
            View all insights →
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask anything about the close..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function CloseCenterPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [activeTab, setActiveTab] = useState("Overview");

  // Real periods from the entity's fiscal calendar
  const { data: periods } = trpc.closeCenter.listPeriods.useQuery();

  // Fetch overview
  const { data: overview } = trpc.closeCenter.getOverview.useQuery({
    period: selectedPeriod || undefined,
  });

  // Fetch checklist
  const { data: checklist } = trpc.closeCenter.getChecklist.useQuery({
    period: selectedPeriod || undefined,
  });

  // Fetch AI recommendations
  const { data: recommendations } =
    trpc.closeCenter.getAiRecommendations.useQuery({
      period: selectedPeriod || undefined,
    });

  // Fetch time saved
  const { data: timeSaved } = trpc.closeCenter.getTimeSaved.useQuery({
    period: selectedPeriod || undefined,
  });

  // Fetch close history
  const { data: history } = trpc.closeCenter.getCloseHistory.useQuery();

  // Fetch AI insights
  const { data: insights } = trpc.closeCenter.getAiInsights.useQuery({
    period: selectedPeriod || undefined,
  });

  // Fetch task completion trend
  const { data: trend } = trpc.closeCenter.getTaskCompletionTrend.useQuery();

  // Set default period
  if (!selectedPeriod && overview) {
    setSelectedPeriod(overview.period);
  }

  const tabs = [
    "Overview",
    "Checklist",
    "Reconciliations",
    "Journal Entries",
    "Reviews",
    "Reports",
    "Audit Trail",
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <span className="text-2xl">✨</span>
                Month-End Close Center
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                AI orchestrated. Accurate. Always on time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedPeriod || (periods?.[0]?.value ?? "")}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {(periods ?? []).map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                      {p.status === "closed" ? " (Closed)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  activeTab === tab
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        {overview && (
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <SummaryCards overview={overview} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeTab === "Overview" && (
            <>
              {/* Checklist and AI Assistant */}
              <div className="grid grid-cols-2 gap-6">
                {checklist && <CloseChecklist checklist={checklist} />}
                {recommendations && (
                  <AiCloseAssistant recommendations={recommendations} />
                )}
              </div>

              {/* Bottom Row */}
              {trend && timeSaved && history && (
                <BottomRow
                  trend={trend}
                  timeSaved={timeSaved}
                  history={history}
                />
              )}
            </>
          )}

          {activeTab === "Checklist" && checklist && (
            <CloseChecklist checklist={checklist} />
          )}

          {activeTab === "Reconciliations" && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-xl border border-slate-200 bg-white p-8">
                <RefreshCw className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">
                  Reconciliations
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Bank and account reconciliations for this period will appear
                  here once initiated.
                </p>
              </div>
            </div>
          )}

          {activeTab === "Journal Entries" && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-xl border border-slate-200 bg-white p-8">
                <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">
                  Journal Entries
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Adjusting and closing journal entries will be generated and
                  reviewed here.
                </p>
              </div>
            </div>
          )}

          {activeTab === "Reviews" && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-xl border border-slate-200 bg-white p-8">
                <Shield className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">Reviews</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Compliance and accuracy reviews for the close period will
                  appear here.
                </p>
              </div>
            </div>
          )}

          {activeTab === "Reports" && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-xl border border-slate-200 bg-white p-8">
                <CheckCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">
                  Close Reports
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Period-end reports and variance analyses will be generated
                  here.
                </p>
              </div>
            </div>
          )}

          {activeTab === "Audit Trail" && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-xl border border-slate-200 bg-white p-8">
                <Clock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">
                  Audit Trail
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Complete audit log of all close activities and agent actions
                  will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/*
        AI Copilot Panel - DISABLED
        <div className="w-[340px]">
          <AiCopilotPanel
            overview={
              overview ?? {
                overallProgress: 0,
                completedTasks: 0,
                totalTasks: 40,
                estimatedCloseDate: "",
                risksAndBlockers: 0,
                isOnTrack: true,
              }
            }
            insights={insights ?? []}
          />
        </div>
      */}
    </div>
  );
}
