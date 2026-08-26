"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Wrench,
  Zap,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThinkingEvent, ToolTrace } from "@/lib/hooks/use-streaming-chat";

// ─── Thinking Steps ────────────────────────────────────────────────────────
//
// Shows animated step-by-step progress when AI is processing.
// Inspired by Devin, Cursor, and Claude's thinking visualization.
//
// Maps pipeline step IDs to human-readable labels:
//   intent_resolution → "Understanding your request"
//   session_load → "Loading your financial context"
//   confidence_gate → "Evaluating response confidence"
//   etc.

const STEP_LABELS: Record<string, string> = {
  intent_resolution: "Understanding your request",
  session_load: "Loading your financial context",
  entity_context: "Gathering entity data",
  confidence_gate: "Evaluating confidence",
  tool_selection: "Selecting the right tools",
  response_generation: "Generating response",
  approval_check: "Checking if approval is needed",
  escalation_check: "Evaluating escalation needs",
  knowledge_retrieval: "Searching knowledge base",
  data_validation: "Validating financial data",
  journal_entry: "Building journal entry",
  invoice_creation: "Creating invoice",
  payment_processing: "Processing payment",
  reconciliation: "Running reconciliation",
  report_generation: "Generating report",
  default: "Processing...",
};

function getStepLabel(event: ThinkingEvent): string {
  if (event.label) return event.label;
  if (event.step && STEP_LABELS[event.step]) return STEP_LABELS[event.step];
  if (event.step)
    return event.step
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  return STEP_LABELS.default;
}

export function ConversationThinkingSteps({
  events,
  isStreaming,
}: {
  events: ThinkingEvent[];
  isStreaming: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const completedCount = events.filter(
    (e) => e.durationMs !== undefined,
  ).length;

  // Track elapsed time while streaming
  useEffect(() => {
    if (!isStreaming) return;
    startRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Auto-collapse after streaming completes
  useEffect(() => {
    if (!isStreaming && events.length > 0) {
      const timer = setTimeout(() => setIsExpanded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, events.length]);

  if (events.length === 0 && !isStreaming) return null;

  // Deduplicate events by step ID (keep the latest)
  const uniqueEvents = Array.from(
    new Map(events.map((e) => [e.step || e.label, e])).values(),
  );

  const totalDuration = uniqueEvents.reduce(
    (sum, e) => sum + (e.durationMs || 0),
    0,
  );

  // Plain text style like ChatGPT/Claude — no card, no border, right above response
  const totalSec =
    totalDuration > 0
      ? (totalDuration / 1000).toFixed(1)
      : elapsed > 0
        ? (elapsed / 1000).toFixed(1)
        : null;

  return (
    <div className="w-full py-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-left"
        aria-expanded={isExpanded}
      >
        {isStreaming ? (
          <>
            <Loader2
              className="h-3 w-3 text-muted-foreground animate-spin shrink-0"
              aria-hidden="true"
            />
            <span className="text-[11px] text-muted-foreground">Thinking…</span>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Thought for {totalSec ?? "—"}s
          </span>
        )}
        {isExpanded ? (
          <ChevronUp
            className="h-3 w-3 text-muted-foreground/60"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="h-3 w-3 text-muted-foreground/60"
            aria-hidden="true"
          />
        )}
      </button>

      {isExpanded && (
        <div className="mt-1.5 space-y-1 pl-1">
          {uniqueEvents.map((event, i) => {
            const isComplete = event.durationMs !== undefined;
            const label = getStepLabel(event);
            return (
              <div
                key={`${event.step || i}`}
                className="flex items-center gap-2 text-[11px]"
              >
                {isComplete ? (
                  <CheckCircle2
                    className="h-3 w-3 text-muted-foreground/50 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Loader2
                    className="h-3 w-3 text-muted-foreground animate-spin shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span className="text-muted-foreground">{label}</span>
                {event.durationMs !== undefined && (
                  <span className="text-[10px] text-muted-foreground/40">
                    {event.durationMs}ms
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tool Call Trace ───────────────────────────────────────────────────────
//
// Shows what tools the AI is calling and their results.
// Inspired by Claude's tool use visualization.
//
// Maps tool names to human-readable labels:
//   create_sales_invoice → "Create Sales Invoice"
//   create_journal_entry → "Create Journal Entry"
//   etc.

const TOOL_LABELS: Record<string, string> = {
  create_sales_invoice: "Create Sales Invoice",
  create_purchase_invoice: "Create Purchase Invoice",
  create_journal_entry: "Create Journal Entry",
  create_customer: "Create Customer",
  create_supplier: "Create Supplier",
  record_bank_transaction: "Record Bank Transaction",
  record_expense: "Record Expense",
  approve_document: "Approve Document",
  reject_document: "Reject Document",
  reconcile_bank_transaction: "Reconcile Bank Transaction",
  get_account_balance: "Get Account Balance",
  get_trial_balance: "Get Trial Balance",
  search_transactions: "Search Transactions",
  get_cash_position: "Get Cash Position",
  list_invoices: "List Invoices",
  list_journal_entries: "List Journal Entries",
  default: "Tool Call",
};

function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] || TOOL_LABELS.default;
}

function getToolArgsSummary(
  toolName: string,
  args?: Record<string, unknown>,
): string {
  if (!args) return "";

  // Build a human-readable summary based on the tool
  switch (toolName) {
    case "create_sales_invoice":
      return `${args.customerName || "Unknown"} · ${args.amount ? `GMD ${Number(args.amount).toLocaleString()}` : "Amount pending"}`;
    case "create_purchase_invoice":
      return `${args.vendorName || "Unknown"} · ${args.amount ? `GMD ${Number(args.amount).toLocaleString()}` : "Amount pending"}`;
    case "create_journal_entry":
      return `${args.description || "Entry"} · ${args.lines ? `${args.lines.length} lines` : ""}`;
    case "create_customer":
      return args.name || "New customer";
    case "create_supplier":
      return args.name || "New supplier";
    case "record_bank_transaction":
      return `${args.description || "Transaction"} · ${args.amount ? `GMD ${Number(args.amount).toLocaleString()}` : ""}`;
    case "record_expense":
      return `${args.description || "Expense"} · ${args.amount ? `GMD ${Number(args.amount).toLocaleString()}` : ""}`;
    default:
      // Generic: show first few args
      const entries = Object.entries(args).slice(0, 2);
      return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
  }
}

export function ToolCallTraceCard({ trace }: { trace: ToolTrace }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const label = getToolLabel(trace.toolName);
  const summary = getToolArgsSummary(trace.toolName, trace.args);

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
        <Wrench className="h-4 w-4 text-amber-500/70" />
      </div>
      <div className="max-w-[85%] rounded-2xl border border-amber-500/10 bg-amber-500/[0.02] px-4 py-3">
        {/* Header */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2">
            {trace.status === "running" && (
              <Loader2
                className="h-3.5 w-3.5 text-amber-500 animate-spin"
                aria-hidden="true"
              />
            )}
            {trace.status === "success" && (
              <CheckCircle2
                className="h-3.5 w-3.5 text-emerald-500"
                aria-hidden="true"
              />
            )}
            {trace.status === "failed" && (
              <AlertTriangle
                className="h-3.5 w-3.5 text-red-500"
                aria-hidden="true"
              />
            )}
            <span className="text-xs font-medium text-foreground">{label}</span>
            {summary && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                {summary}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-2 space-y-2">
            {/* Tool name */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-muted-foreground">Tool:</span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                {trace.toolName}
              </code>
            </div>

            {/* Args */}
            {trace.args && Object.keys(trace.args).length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">
                  Arguments:
                </p>
                <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono rounded bg-muted/50 p-2">
                  {JSON.stringify(trace.args, null, 2)}
                </pre>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium",
                  trace.status === "running" &&
                    "bg-amber-500/10 text-amber-500",
                  trace.status === "success" &&
                    "bg-emerald-500/10 text-emerald-500",
                  trace.status === "failed" && "bg-red-500/10 text-red-500",
                )}
              >
                {trace.status === "running" && (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                )}
                {trace.status === "success" && (
                  <CheckCircle2 className="h-2.5 w-2.5" />
                )}
                {trace.status === "failed" && (
                  <AlertTriangle className="h-2.5 w-2.5" />
                )}
                {trace.status}
              </span>
            </div>

            {/* Duration */}
            {trace.durationMs !== undefined && (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-muted-foreground">Duration:</span>
                <span className="text-foreground">{trace.durationMs}ms</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
