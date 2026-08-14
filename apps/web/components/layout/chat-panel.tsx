"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import Link from "next/link";
import {
  Send,
  Bot,
  User,
  ChevronRight,
  ArrowUpRight,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  PanelRightClose,
} from "lucide-react";

import { Button, Badge } from "@/components/ui";
import { cn, formatCurrency } from "@/lib/utils";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";

// ─── Rich Content Types (Architecture Doc §4 — Structured Inline Results) ────

type TableColumn = {
  key: string;
  label: string;
  format?: "currency" | "number" | "date" | "badge";
};

type TableRow = Record<string, string | number | boolean | null>;

type ActionButton = {
  label: string;
  variant?: "default" | "outline" | "destructive";
  href?: string;
  onClick?: () => void;
};

type StructuredContent =
  | { type: "text"; text: string }
  | {
      type: "table";
      columns: TableColumn[];
      rows: TableRow[];
      caption?: string;
    }
  | {
      type: "metric";
      label: string;
      value: string;
      trend?: "up" | "down" | "neutral";
    }
  | { type: "actions"; buttons: ActionButton[] }
  | {
      type: "approval_request";
      title: string;
      description: string;
      confidence: number;
      onApprove?: () => void;
      onReject?: () => void;
      href?: string;
    };

type Message = {
  id: string;
  role: "agent" | "user";
  content: string | StructuredContent[];
  timestamp: Date;
};

const suggestedPrompts = [
  "What's my cash position?",
  "Any pending approvals?",
  "Summarize this month's P&L",
  "Are there anomalies in my books?",
];

// ─── Structured Content Renderers ──────────────────────────────────────────

function renderBlock(block: StructuredContent, bi: number): ReactNode {
  switch (block.type) {
    case "text":
      return (
        <p key={bi} className="text-sm leading-relaxed">
          {block.text}
        </p>
      );

    case "metric":
      return (
        <div
          key={bi}
          className="flex items-center justify-between rounded-lg border bg-background/50 px-3 py-2.5"
        >
          <span className="text-xs text-muted-foreground">{block.label}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">{block.value}</span>
            {block.trend === "up" && (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            )}
            {block.trend === "down" && (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            )}
          </div>
        </div>
      );

    case "table":
      return (
        <div key={bi} className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  {block.columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className="px-3 py-2 text-left font-medium text-muted-foreground"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b last:border-0 hover:bg-muted/20"
                  >
                    {block.columns.map((col) => (
                      <td key={col.key} className="px-3 py-1.5">
                        {col.format === "currency"
                          ? formatCurrency(Number(row[col.key]) || 0)
                          : col.format === "badge"
                            ? (() => {
                                const val = String(row[col.key] ?? "");
                                const isPositive =
                                  val === "paid" ||
                                  val === "active" ||
                                  val === "healthy";
                                const isWarning =
                                  val === "pending" || val === "partial";
                                return (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px]",
                                      isPositive &&
                                        "text-emerald-600 border-emerald-200",
                                      isWarning &&
                                        "text-amber-600 border-amber-200",
                                      !isPositive &&
                                        !isWarning &&
                                        "text-red-600 border-red-200",
                                    )}
                                  >
                                    {val}
                                  </Badge>
                                );
                              })()
                            : String(row[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.caption && (
            <div className="border-t bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
              {block.caption}
            </div>
          )}
        </div>
      );

    case "actions":
      return (
        <div key={bi} className="flex flex-wrap gap-2">
          {block.buttons.map((btn, ai) =>
            btn.href ? (
              <Link key={ai} href={btn.href}>
                <Button
                  variant={btn.variant ?? "outline"}
                  size="sm"
                  className="text-xs gap-1"
                >
                  {btn.label}
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            ) : (
              <Button
                key={ai}
                variant={btn.variant ?? "outline"}
                size="sm"
                className="text-xs"
                onClick={btn.onClick}
              >
                {btn.label}
              </Button>
            ),
          )}
        </div>
      );

    case "approval_request":
      return (
        <div
          key={bi}
          className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-xs font-semibold">{block.title}</p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                block.confidence >= 0.8
                  ? "text-emerald-600 border-emerald-200"
                  : block.confidence >= 0.5
                    ? "text-amber-600 border-amber-200"
                    : "text-red-600 border-red-200",
              )}
            >
              {Math.round(block.confidence * 100)}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{block.description}</p>
          <div className="flex gap-2">
            {block.onApprove && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={block.onApprove}
              >
                <ThumbsUp className="h-3 w-3" /> Approve
              </Button>
            )}
            {block.onReject && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={block.onReject}
              >
                <ThumbsDown className="h-3 w-3" /> Reject
              </Button>
            )}
            {block.href && (
              <Link href={block.href}>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                  Open <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ─── Chat Panel ─────────────────────────────────────────────────────────────

export function ChatPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { entityId } = useEntity();
  // Live cash position — the welcome card and cash-keyword answers render real
  // data, not demo numbers. Fails silently to a neutral placeholder.
  const { data: cashPosition } = trpc.banking.getCashPosition.useQuery(
    {},
    {
      enabled: !!entityId,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );
  const liveBalance = cashPosition?.currentBalance;
  // Live P&L — replaces the fabricated demo table with real numbers.
  const { data: pnl } = trpc.reports.getPnlOverview.useQuery(undefined, {
    enabled: !!entityId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "agent",
      content: [
        {
          type: "text",
          text: "Hello, I'm your CFO Agent. I can help you understand your financial health, flag anomalies, and answer questions about your books.",
        },
        {
          type: "metric",
          label: "Cash Position",
          // Placeholder until the live query resolves; patched below.
          value: "…",
          trend: "up",
        },
        {
          type: "actions",
          buttons: [
            { label: "View Full Report", href: "/dashboard/reports" },
            { label: "Check Approvals", href: "/dashboard/review-queue" },
          ],
        },
      ],
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Patch the welcome card with the real cash position once loaded.
  useEffect(() => {
    if (liveBalance === undefined) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === "welcome" && Array.isArray(m.content)
          ? {
              ...m,
              content: m.content.map((c) =>
                c.type === "metric" && c.label === "Cash Position"
                  ? { ...c, value: formatCurrency(liveBalance) }
                  : c,
              ),
            }
          : m,
      ),
    );
  }, [liveBalance]);

  function getDemoResponse(query: string): StructuredContent[] {
    const q = query.toLowerCase();

    if (q.includes("cash") || q.includes("position") || q.includes("balance")) {
      // Real data from banking.getCashPosition when available; never invent
      // demo numbers for a user's actual financials.
      const total = liveBalance;
      return [
        {
          type: "text",
          text:
            total !== undefined
              ? "Here's your current cash position:"
              : "Here's where your cash position will appear (live data loading):",
        },
        {
          type: "metric",
          label: "Current Cash Position",
          value: total !== undefined ? formatCurrency(total) : "…",
          trend: "up",
        },
        {
          type: "actions",
          buttons: [
            { label: "View Treasury", href: "/dashboard/treasury" },
            { label: "Reconcile Now", href: "/dashboard/treasury/reconcile" },
          ],
        },
      ];
    }

    if (
      q.includes("approval") ||
      q.includes("pending") ||
      q.includes("review")
    ) {
      return [
        { type: "text", text: "You have 3 items pending your approval:" },
        {
          type: "approval_request",
          title: "Invoice #INV-2024-0891",
          description:
            "Supplier: Basiq Trading · Amount: GMD 45,200 · Due in 14 days",
          confidence: 0.92,
          href: "/dashboard/ap/invoices",
        },
        {
          type: "approval_request",
          title: "Expense Claim — James Camara",
          description: "Travel expenses: GMD 12,800 · 3 receipts attached",
          confidence: 0.78,
          href: "/dashboard/expense/pipeline",
        },
        {
          type: "approval_request",
          title: "Purchase Order #PO-2024-033",
          description: "Office supplies: GMD 8,450 · Department budget OK",
          confidence: 0.95,
          href: "/dashboard/ap/pos",
        },
        {
          type: "actions",
          buttons: [
            { label: "Open Approval Queue", href: "/dashboard/review-queue" },
          ],
        },
      ];
    }

    if (
      q.includes("p&l") ||
      q.includes("profit") ||
      q.includes("loss") ||
      q.includes("summary")
    ) {
      return [
        {
          type: "text",
          text: "Here's your Profit & Loss summary for this month:",
        },
        {
          type: "table",
          columns: [
            { key: "item", label: "Item" },
            { key: "amount", label: "Amount", format: "currency" },
            { key: "vs", label: "vs Budget" },
          ],
          rows: pnl?.current
            ? [
                { item: "Revenue", amount: pnl.current.revenue, vs: "—" },
                {
                  item: "Cost of Goods Sold",
                  amount: pnl.current.cogs,
                  vs: "—",
                },
                {
                  item: "Gross Profit",
                  amount: pnl.current.grossProfit,
                  vs: "—",
                },
                {
                  item: "Operating Expenses",
                  amount: pnl.current.opExpenses,
                  vs: "—",
                },
                { item: "Net Income", amount: pnl.current.netProfit, vs: "—" },
              ]
            : [
                { item: "Revenue", amount: 0, vs: "…" },
                { item: "Net Income", amount: 0, vs: "…" },
              ],
        },
        {
          type: "metric",
          label: "Net Profit Margin",
          value:
            pnl?.current && pnl.current.revenue > 0
              ? `${Math.round((pnl.current.netProfit / pnl.current.revenue) * 100)}%`
              : "…",
          trend: "up",
        },
        {
          type: "actions",
          buttons: [
            { label: "Full P&L Statement", href: "/dashboard/reports" },
            { label: "Budget vs Actual", href: "/dashboard/budget/pipeline" },
          ],
        },
      ];
    }

    if (q.includes("anomaly") || q.includes("flag") || q.includes("unusual")) {
      return [
        { type: "text", text: "I found 2 items that need attention:" },
        {
          type: "approval_request",
          title: "⚠️ Unreconciled Transaction",
          description:
            "MTN MoMo debit GHS 450.00 on Jul 14 has no matching entry in the ledger.",
          confidence: 0.65,
          href: "/dashboard/treasury/reconcile",
        },
        {
          type: "text",
          text: "I've also noticed that your Operating Expenses are 8% above the 3-month average. I can prepare a detailed variance analysis if you'd like.",
        },
        {
          type: "actions",
          buttons: [
            {
              label: "Run Anomaly Scan",
              href: "/dashboard/analytics/pipeline",
            },
            { label: "View Audit Log", href: "/dashboard/audit-log" },
          ],
        },
      ];
    }

    return [
      {
        type: "text",
        text: `I've analyzed your question about "${query}". Based on your current data, here's what I found:`,
      },
      {
        type: "metric",
        label: "Current Cash Position",
        value: liveBalance !== undefined ? formatCurrency(liveBalance) : "…",
        trend: "up",
      },
      {
        type: "metric",
        label: "Pending Approvals",
        value: "3",
        trend: "neutral",
      },
      {
        type: "actions",
        buttons: [
          { label: "Ask Follow-up", onClick: () => {} },
          { label: "Open Dashboard", href: "/dashboard" },
        ],
      },
    ];
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const content = getDemoResponse(trimmed);
      const agentMsg: Message = {
        id: crypto.randomUUID(),
        role: "agent",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsTyping(false);
    }, 1200);
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">CFO Agent</p>
            <p className="text-xs text-muted-foreground">
              Online · Financial analysis
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          title="Close panel"
        >
          <PanelRightClose className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Capacity indicator */}
      <div className="flex items-center gap-2 border-b px-4 py-1.5 flex-shrink-0">
        <div className="flex items-center gap-1 text-[10px] text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>CFO Agent ready</span>
        </div>
        <span className="text-[10px] text-muted-foreground">·</span>
        <span className="text-[10px] text-muted-foreground">
          3 agents available
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "flex-row-reverse" : "flex-row",
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                msg.role === "agent"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {msg.role === "agent" ? (
                <Bot className="h-3.5 w-3.5" />
              ) : (
                <User className="h-3.5 w-3.5" />
              )}
            </div>
            <div
              className={cn(
                "rounded-xl px-3.5 py-2.5 text-sm max-w-[90%] space-y-2",
                msg.role === "agent"
                  ? "bg-muted text-foreground"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {typeof msg.content === "string" ? (
                <p className="text-sm">{msg.content}</p>
              ) : (
                <div className="space-y-3">
                  {msg.content.map((block, idx) => renderBlock(block, idx))}
                </div>
              )}
              <p className="mt-1.5 text-[10px] opacity-50">
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-xl bg-muted px-3.5 py-2.5">
              <div className="flex gap-1">
                <span
                  className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex-shrink-0">
          <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-semibold">
            Suggested
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {prompt}
                <ChevronRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask your CFO Agent anything..."
            className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
