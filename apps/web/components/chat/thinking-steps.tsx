"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThinkingEvent, ToolTrace } from "@/lib/hooks/use-streaming-chat";

// ─── Thought ─────────────────────────────────────────────────────────────────
//
// Claude/ChatGPT pattern: one collapsed line while streaming ("Thinking…"),
// one collapsed line when done ("Thought"). Expanding reveals the model's
// own first-person sentences — never step labels, timings, agent names, or
// tool internals. Those stay in LangFuse + the audit trail.
//
// Legacy events that carry only a label/step (pre-redesign turns) fall back
// to a small generic map so old threads still read sensibly.

const LEGACY_LABELS: Record<string, string> = {
  intent_resolution: "Understanding your request",
  session_load: "Loading your context",
  entity_context: "Gathering your data",
  confidence_gate: "Double-checking before answering",
  tool_selection: "Figuring out the best approach",
  response_generation: "Writing your answer",
  approval_check: "Checking whether you need to weigh in",
  escalation_check: "Checking whether you need to weigh in",
  knowledge_retrieval: "Looking through your records",
  data_validation: "Checking the numbers",
  journal_entry: "Preparing the entry",
  invoice_creation: "Preparing the invoice",
  payment_processing: "Working on the payment",
  reconciliation: "Reconciling",
  report_generation: "Putting the report together",
  input_intake: "Reading your request",
  memory_retrieval: "Recalling our earlier conversation",
};

function thoughtLine(event: ThinkingEvent): string {
  if (event.text && event.text.trim().length > 0) return event.text.trim();
  if (event.label && !/ms$|intake|scoping|dispatch|aggregation|gate|detection|synthesis|logging/i.test(event.label))
    return event.label;
  if (event.step && LEGACY_LABELS[event.step]) return LEGACY_LABELS[event.step];
  return "Thinking it through";
}

export function ConversationThinkingSteps({
  events,
  isStreaming,
}: {
  events: ThinkingEvent[];
  isStreaming: boolean;
}) {
  // Collapsed by default once done — like Claude/ChatGPT. While streaming,
  // expand so the user sees progress live, then settle shut.
  const [isExpanded, setIsExpanded] = useState(isStreaming);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!isStreaming && events.length > 0 && !doneRef.current) {
      doneRef.current = true;
      setIsExpanded(false);
    }
    if (isStreaming) {
      doneRef.current = false;
      setIsExpanded(true);
    }
  }, [isStreaming, events.length]);

  if (events.length === 0 && !isStreaming) return null;

  const lines = events
    .map(thoughtLine)
    .filter((line, i, all) => line.length > 0 && all.indexOf(line) === i)
    .slice(0, 4);

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
          <span className="text-[11px] text-muted-foreground">Thought</span>
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
          {lines.map((line, i) => (
            <div
              key={`${i}`}
              className="flex items-center gap-2 text-[11px]"
            >
              {!isStreaming || i < lines.length - 1 ? (
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
              <span className="text-muted-foreground">{line}</span>
            </div>
          ))}
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

function formatAmount(value: unknown): string {
  const n = Number(value);
  if (value == null || value === "" || Number.isNaN(n)) return "";
  return n.toLocaleString();
}

function getToolArgsSummary(
  toolName: string,
  args?: Record<string, unknown>,
): string {
  if (!args) return "";

  // Human-readable summaries. Never hardcode a currency — amounts render
  // bare; the surrounding answer carries the entity currency.
  switch (toolName) {
    case "create_sales_invoice": {
      const amount = formatAmount(args.amount);
      return `${args.customerName || "Unknown"}${amount ? ` · ${amount}` : " · Amount pending"}`;
    }
    case "create_purchase_invoice": {
      const amount = formatAmount(args.amount);
      return `${args.vendorName || "Unknown"}${amount ? ` · ${amount}` : " · Amount pending"}`;
    }
    case "create_journal_entry": {
      const lines = Array.isArray(args.lines) ? args.lines.length : 0;
      return `${args.description || "Entry"}${lines ? ` · ${lines} lines` : ""}`;
    }
    case "create_customer":
      return typeof args.name === "string" && args.name
        ? args.name
        : "New customer";
    case "create_supplier":
      return typeof args.name === "string" && args.name
        ? args.name
        : "New supplier";
    case "record_bank_transaction": {
      const amount = formatAmount(args.amount);
      return `${args.description || "Transaction"}${amount ? ` · ${amount}` : ""}`;
    }
    case "record_expense": {
      const amount = formatAmount(args.amount);
      return `${args.description || "Expense"}${amount ? ` · ${amount}` : ""}`;
    }
    default:
      return "";
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

        {/* Expanded details — status only. Raw tool names, argument JSON,
            and timings are internal trace data (LangFuse), never user UI. */}
        {isExpanded && (
          <div className="mt-2 space-y-2">
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
          </div>
        )}
      </div>
    </div>
  );
}
