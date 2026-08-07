"use client";

import { useState } from "react";
import {
  Bot,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  X,
  RotateCcw,
  Eye,
  Download,
  ChevronDown,
  ChevronUp,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────

export type TaskStatus =
  | "queued"
  | "running"
  | "paused"
  | "review"
  | "completed"
  | "failed"
  | "cancelled";

export interface AgentTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  progress: number;
  startTime: string;
  elapsedTime?: string;
  agent?: string;
  artifacts?: TaskArtifact[];
  timeline?: TimelineEvent[];
}

export interface TaskArtifact {
  id: string;
  name: string;
  type: "pdf" | "excel" | "csv" | "journal" | "report" | "other";
  url?: string;
}

export interface TimelineEvent {
  id: string;
  time: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

// ─── Status Config ───────────────────────────────────────────────────────

const statusConfig: Record<
  TaskStatus,
  { color: string; bgColor: string; icon: LucideIcon; label: string }
> = {
  queued: {
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: Clock,
    label: "Queued",
  },
  running: {
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    icon: Zap,
    label: "Running",
  },
  paused: {
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    icon: Pause,
    label: "Paused",
  },
  review: {
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    icon: Eye,
    label: "Needs Review",
  },
  completed: {
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    icon: CheckCircle2,
    label: "Completed",
  },
  failed: {
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: AlertTriangle,
    label: "Failed",
  },
  cancelled: {
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: X,
    label: "Cancelled",
  },
};

// ─── Timeline Event Component ────────────────────────────────────────────

function TimelineEventItem({
  event,
  isLast,
}: {
  event: TimelineEvent;
  isLast: boolean;
}) {
  const typeColors: Record<string, string> = {
    info: "bg-blue-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
  };

  return (
    <div className="flex gap-3 relative">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border/50" />
      )}
      {/* Dot */}
      <div
        className={cn(
          "h-[15px] w-[15px] rounded-full shrink-0 mt-0.5 z-10",
          typeColors[event.type],
        )}
      />
      {/* Content */}
      <div className="flex-1 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">
            {event.time}
          </span>
        </div>
        <p className="text-xs text-foreground mt-0.5">{event.message}</p>
      </div>
    </div>
  );
}

// ─── Artifact Card Component ─────────────────────────────────────────────

function ArtifactCard({ artifact }: { artifact: TaskArtifact }) {
  const typeIcons: Record<string, typeof FileText> = {
    pdf: FileText,
    excel: FileText,
    csv: FileText,
    journal: FileText,
    report: FileText,
    other: FileText,
  };

  const typeColors: Record<string, string> = {
    pdf: "bg-red-100 text-red-600",
    excel: "bg-green-100 text-green-600",
    csv: "bg-blue-100 text-blue-600",
    journal: "bg-purple-100 text-purple-600",
    report: "bg-amber-100 text-amber-600",
    other: "bg-gray-100 text-gray-600",
  };

  const Icon = typeIcons[artifact.type] || FileText;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background p-2.5 hover:shadow-sm transition-all">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          typeColors[artifact.type],
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-foreground truncate">
          {artifact.name}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase">
          {artifact.type}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          title="Preview"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Task Card Component ─────────────────────────────────────────────────

interface TaskCardProps {
  task: AgentTask;
  onPause?: (taskId: string) => void;
  onResume?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onRetry?: (taskId: string) => void;
  onReview?: (taskId: string) => void;
  onOpen?: (taskId: string) => void;
}

export function TaskCard({
  task,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onReview,
  onOpen,
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = statusConfig[task.status];
  const StatusIcon = config.icon;

  const isRunning = task.status === "running";
  const isPaused = task.status === "paused";
  const isReview = task.status === "review";
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-all duration-200",
        isReview
          ? "border-amber-200 shadow-sm shadow-amber-100"
          : "border-border/50",
        isRunning && "shadow-sm",
      )}
    >
      {/* Main Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              config.bgColor,
            )}
          >
            <StatusIcon
              className={cn(
                "h-5 w-5",
                config.color,
                isRunning && "animate-pulse",
              )}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                {task.title}
              </p>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-medium",
                  config.bgColor,
                  config.color,
                )}
              >
                {config.label}
              </span>
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {task.description}
              </p>
            )}
            {task.agent && (
              <div className="flex items-center gap-1.5 mt-2">
                <Bot className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {task.agent}
                </span>
              </div>
            )}
          </div>

          {/* Expand Button */}
          {(task.timeline || task.artifacts) && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {(isRunning || isPaused) && (
          <div className="mt-4 space-y-2">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{task.progress}% complete</span>
              {task.elapsedTime && <span>{task.elapsedTime}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border/50 bg-accent/30 p-4 space-y-4">
          {/* Timeline */}
          {task.timeline && task.timeline.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-foreground mb-3">
                Timeline
              </h4>
              <div className="space-y-0">
                {task.timeline.map((event, idx) => (
                  <TimelineEventItem
                    key={event.id}
                    event={event}
                    isLast={idx === task.timeline!.length - 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Artifacts */}
          {task.artifacts && task.artifacts.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-foreground mb-3">
                Generated Artifacts
              </h4>
              <div className="space-y-2">
                {task.artifacts.map((artifact) => (
                  <ArtifactCard key={artifact.id} artifact={artifact} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-border/50 bg-accent/20 px-4 py-3">
        <div className="flex items-center gap-2">
          {isRunning && onPause && (
            <>
              <button
                type="button"
                onClick={() => onPause(task.id)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[10px] font-medium hover:bg-accent transition-colors"
              >
                <Pause className="h-3 w-3" />
                Pause
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(task.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-medium text-red-600 hover:bg-red-100 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
              )}
            </>
          )}

          {isPaused && onResume && (
            <button
              type="button"
              onClick={() => onResume(task.id)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <Play className="h-3 w-3" />
              Resume
            </button>
          )}

          {isReview && onReview && (
            <>
              <button
                type="button"
                onClick={() => onReview(task.id)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-emerald-600 transition-colors"
              >
                <CheckCircle2 className="h-3 w-3" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => onReview(task.id)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[10px] font-medium hover:bg-accent transition-colors"
              >
                <Eye className="h-3 w-3" />
                Review
              </button>
            </>
          )}

          {isCompleted && onOpen && (
            <button
              type="button"
              onClick={() => onOpen(task.id)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[10px] font-medium hover:bg-accent transition-colors"
            >
              <Eye className="h-3 w-3" />
              View Details
            </button>
          )}

          {isFailed && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(task.id)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Timestamp */}
          <span className="text-[10px] text-muted-foreground">
            {task.startTime}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Multiple Tasks Container ────────────────────────────────────────────

interface TaskListProps {
  tasks: AgentTask[];
  onPause?: (taskId: string) => void;
  onResume?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onRetry?: (taskId: string) => void;
  onReview?: (taskId: string) => void;
  onOpen?: (taskId: string) => void;
}

export function TaskList({
  tasks,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onReview,
  onOpen,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border/50">
        <Bot className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-foreground">No active tasks</p>
        <p className="text-xs text-muted-foreground mt-1">
          Assign work to AI agents to get started
        </p>
      </div>
    );
  }

  // Group tasks by status
  const running = tasks.filter(
    (t) => t.status === "running" || t.status === "paused",
  );
  const review = tasks.filter((t) => t.status === "review");
  const completed = tasks.filter((t) => t.status === "completed");
  const other = tasks.filter(
    (t) =>
      !running.includes(t) && !review.includes(t) && !completed.includes(t),
  );

  return (
    <div className="space-y-4">
      {/* Running Tasks */}
      {running.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">Running</h3>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
              {running.length}
            </span>
          </div>
          {running.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPause={onPause}
              onResume={onResume}
              onCancel={onCancel}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}

      {/* Needs Review */}
      {review.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-600" />
            <h3 className="text-xs font-semibold text-foreground">
              Needs Review
            </h3>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-600">
              {review.length}
            </span>
          </div>
          {review.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onReview={onReview}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-semibold text-foreground">Completed</h3>
          </div>
          {completed.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpen} />
          ))}
        </div>
      )}

      {/* Other */}
      {other.length > 0 && (
        <div className="space-y-3">
          {other.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPause={onPause}
              onResume={onResume}
              onCancel={onCancel}
              onRetry={onRetry}
              onReview={onReview}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
