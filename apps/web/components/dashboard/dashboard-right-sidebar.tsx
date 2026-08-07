"use client";

import {
  Calendar,
  FileText,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

import { cn } from "@/lib/utils";

type DashboardRightSidebarProps = {
  className?: string;
};

// ─── Upcoming & Deadlines ──────────────────────────────────────────────────

function UpcomingDeadlines() {
  const deadlines = [
    {
      id: "1",
      label: "Payroll Payment",
      date: "Jul 31, 2025",
      tag: "In 3 days",
      tagColor: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      id: "2",
      label: "VAT Return Due",
      date: "Aug 15, 2025",
      tag: "In 18 days",
      tagColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      id: "3",
      label: "Management Report",
      date: "Aug 20, 2025",
      tag: "In 23 days",
      tagColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      id: "4",
      label: "Tax Payment",
      date: "Aug 31, 2025",
      tag: "In 34 days",
      tagColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Upcoming & Deadlines
        </h3>
        <button
          type="button"
          className="flex items-center gap-0.5 text-[11px] font-medium text-[#6366F1] hover:text-[#6366F1]/80"
        >
          View calendar <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-2">
        {deadlines.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-2.5 hover:shadow-sm transition-all"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6366F1]/10">
              <Calendar className="h-4 w-4 text-[#6366F1]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {d.label}
              </p>
              <p className="text-[10px] text-muted-foreground">{d.date}</p>
            </div>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[9px] font-medium whitespace-nowrap",
                d.tagColor,
              )}
            >
              {d.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recent Documents ──────────────────────────────────────────────────────

function RecentDocuments() {
  const docs = [
    {
      id: "1",
      name: "GTBank Statement - July 2025.pdf",
      time: "2 min ago",
      icon: FileText,
      color: "text-red-500",
    },
    {
      id: "2",
      name: "Invoice INV-1001 - Acme Corp.pdf",
      time: "12 min ago",
      icon: FileText,
      color: "text-[#6366F1]",
    },
    {
      id: "3",
      name: "Payroll July 2025.xlsx",
      time: "32 min ago",
      icon: FileText,
      color: "text-emerald-500",
    },
    {
      id: "4",
      name: "VAT Return - July 2025.pdf",
      time: "1 hr ago",
      icon: FileText,
      color: "text-red-500",
    },
    {
      id: "5",
      name: "Management Report - June 2025.pdf",
      time: "2 hrs ago",
      icon: FileText,
      color: "text-[#6366F1]",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Recent Documents
        </h3>
        <button
          type="button"
          className="flex items-center gap-0.5 text-[11px] font-medium text-[#6366F1] hover:text-[#6366F1]/80"
        >
          View all <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-1.5">
        {docs.map((doc) => {
          const Icon = doc.icon;
          return (
            <div
              key={doc.id}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 cursor-pointer transition-colors"
            >
              <Icon className={cn("h-4 w-4 shrink-0", doc.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{doc.name}</p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {doc.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Recent Conversations ──────────────────────────────────────────────────

function RecentConversations() {
  const conversations = [
    { id: "1", text: "Explain cash position", time: "Just now" },
    { id: "2", text: "Why did expenses increase?", time: "1 hr ago" },
    { id: "3", text: "Show unpaid invoices", time: "3 hrs ago" },
    { id: "4", text: "Forecast next month cash flow", time: "Yesterday" },
    { id: "5", text: "Close June books", time: "2 days ago" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Recent Conversations
        </h3>
        <button
          type="button"
          className="flex items-center gap-0.5 text-[11px] font-medium text-[#6366F1] hover:text-[#6366F1]/80"
        >
          View all <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-1.5">
        {conversations.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 cursor-pointer transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate">{c.text}</p>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {c.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Suggested Actions ─────────────────────────────────────────────────────

function SuggestedActions() {
  const actions = [
    { id: "1", text: "Follow up 2 overdue invoices", icon: ExternalLink },
    { id: "2", text: "Reconcile 2 bank accounts", icon: ExternalLink },
    { id: "3", text: "Review 1 suspicious transaction", icon: ExternalLink },
    { id: "4", text: "Approve payroll draft", icon: ExternalLink },
    { id: "5", text: "Connect Paystack account", icon: ExternalLink },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Suggested Actions
      </h3>
      <div className="space-y-1.5">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 text-left transition-colors group"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#6366F1] shrink-0" />
            <span className="flex-1 text-xs text-foreground truncate">
              {a.text}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────

export function DashboardRightSidebar({
  className,
}: DashboardRightSidebarProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <UpcomingDeadlines />
      <RecentDocuments />
      <RecentConversations />
      <SuggestedActions />
    </div>
  );
}
