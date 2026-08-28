"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CreditCard,
  FileText,
  Globe,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  Send,
  TrendingDown,
  Shield,
  Inbox,
  BookOpen,
  Wallet,
  BarChart3,
  Settings,
  MessageSquare,
  PieChart,
  Lock,
  Database,
} from "lucide-react";

import { Button } from "@/components/ui";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";
import {
  Section,
  SectionHeading,
  CheckItem,
} from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";
import { Cta } from "@/components/marketing/cta";
import { Testimonials } from "@/components/marketing/testimonials";

// ── Animated Counter ──────────────────────────────────────────────────────────

function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const duration = 1600;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ── Shared Surface Panel + Tab Bar ────────────────────────────────────────────

function SurfacePanel({
  isActive,
  children,
}: {
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: isActive ? 1 : 0,
        transform: isActive
          ? "translateY(0) scale(1)"
          : "translateY(6px) scale(0.99)",
        transition:
          "opacity 0.35s cubic-bezier(0.32, 0.72, 0, 1), transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        pointerEvents: isActive ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}

function SurfaceTabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: { id: string; label: string; icon: React.ElementType }[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 border-t border-border bg-muted/30 px-4 py-2">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              isActive
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
          </button>
        );
      })}
    </div>
  );
}

function WindowChrome({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-error-clay/70" />
      <span className="h-2.5 w-2.5 rounded-full bg-attention-amber/70" />
      <span className="h-2.5 w-2.5 rounded-full bg-balanced-green/70" />
      <span className="ml-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Bot className="h-3.5 w-3.5 text-primary" />
        {title}
      </span>
    </div>
  );
}

// ── Feature Visual: Automation ────────────────────────────────────────────────

const automationTabs = [
  { id: "command", label: "Command Center", icon: MessageSquare },
  { id: "activity", label: "Activity Hub", icon: Inbox },
  { id: "agents", label: "Agent Monitor", icon: Bot },
];

function AutomationVisual() {
  const [activeTab, setActiveTab] = useState("command");
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(1), 600);
    const t2 = setTimeout(() => setVisible(2), 1800);
    const t3 = setTimeout(() => setVisible(3), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const messages = [
    {
      role: "user" as const,
      text: "Record invoice for Seafood Solutions — GMD 486,000",
    },
    {
      role: "agent" as const,
      text: "Done. Invoice #INV-1042 posted.\n• Revenue: GMD 413,100\n• VAT (15%): GMD 72,900\n• Accounts Receivable: GMD 486,000\nConfidence: 98%",
      agent: "Invoice Agent",
    },
    {
      role: "agent" as const,
      text: "Bank reconciliation ready — 12 transactions totaling GMD 2.1M flagged for your review.",
      agent: "CFO Agent",
    },
  ];

  const activityCards = [
    {
      icon: CreditCard,
      title: "Approve VAT payment",
      detail: "GMD 84,500 · Due Monday",
      tone: "attention-amber",
    },
    {
      icon: FileText,
      title: "Payroll ready to run",
      detail: "34 staff · GMD 1.92M net",
      tone: "primary",
    },
    {
      icon: CheckCircle2,
      title: "Bank reconciliation",
      detail: "12 transactions · GMD 2.1M",
      tone: "balanced-green",
    },
  ];

  const agentRows = [
    { name: "Invoice Agent", status: "Processing", task: "INV-1043", color: "text-balanced-green", dot: "bg-balanced-green" },
    { name: "Payroll Agent", status: "Calculating", task: "Batch #142", color: "text-primary", dot: "bg-primary" },
    { name: "Compliance Agent", status: "Filing", task: "VAT GRA-08", color: "text-attention-amber", dot: "bg-attention-amber" },
    { name: "Treasury Agent", status: "Monitoring", task: "Cash flow", color: "text-balanced-green", dot: "bg-balanced-green" },
    { name: "CFO Agent", status: "Reviewing", task: "Monthly close", color: "text-primary", dot: "bg-primary" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/8">
      <WindowChrome title="Xenboox — Automation" />

      <div className="relative h-[340px] overflow-hidden">
        {/* Command Center */}
        <SurfacePanel isActive={activeTab === "command"}>
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Command Center
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                Live
              </span>
            </div>
            <div className="flex-1 space-y-3">
              {messages.slice(0, visible).map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  style={{
                    opacity: 0,
                    animation: "slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards",
                  }}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.role === "agent" && (
                      <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-primary">
                        <Bot className="h-3 w-3" />
                        {msg.agent}
                      </span>
                    )}
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ))}
              {visible < 3 && visible > 0 && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Type a command...
              </span>
              <Send className="ml-auto h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </SurfacePanel>

        {/* Activity Hub */}
        <SurfacePanel isActive={activeTab === "activity"}>
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Activity Hub
              </span>
              <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[10px] font-semibold text-attention-amber">
                3 need decision
              </span>
            </div>
            <div className="flex-1 space-y-3">
              {activityCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-border/80"
                    style={{
                      opacity: 0,
                      animation: `slide-up 0.4s cubic-bezier(0.32, 0.72, 0, 1) ${i * 0.12}s forwards`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-${card.tone}/10 text-${card.tone}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {card.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {card.detail}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97]">
                        Approve
                      </button>
                      <button className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition-all hover:bg-muted active:scale-[0.97]">
                        Review
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SurfacePanel>

        {/* Agent Monitor */}
        <SurfacePanel isActive={activeTab === "agents"}>
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Agent Monitor
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[10px] font-semibold text-balanced-green">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-balanced-green" />
                5 active
              </span>
            </div>
            <div className="flex-1 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">Agent</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Task</th>
                  </tr>
                </thead>
                <tbody>
                  {agentRows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/60 last:border-0"
                      style={{
                        opacity: 0,
                        animation: `slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) ${i * 0.08}s forwards`,
                      }}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                          <span className="text-xs font-medium text-foreground">
                            {row.name}
                          </span>
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 text-xs font-medium ${row.color}`}>
                        {row.status}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {row.task}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Bot className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-primary">
                  All agents operating within normal parameters
                </span>
              </div>
            </div>
          </div>
        </SurfacePanel>
      </div>

      <SurfaceTabs
        tabs={automationTabs}
        active={activeTab}
        onSelect={setActiveTab}
      />
    </div>
  );
}

// ── Feature Visual: Reporting ─────────────────────────────────────────────────

const reportingTabs = [
  { id: "pulse", label: "Financial Pulse", icon: PieChart },
  { id: "ledger", label: "Ledger", icon: BookOpen },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

function ReportingVisual() {
  const [activeTab, setActiveTab] = useState("pulse");
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowChart(true), 500);
    return () => clearTimeout(t1);
  }, []);

  const metrics = [
    { label: "Revenue", value: "GMD 4.2M", change: "+12%", up: true },
    { label: "Expenses", value: "GMD 2.8M", change: "-3%", up: false },
    { label: "Net Income", value: "GMD 1.4M", change: "+18%", up: true },
  ];

  const ledgerRows = [
    { date: "01 Aug", account: "Cash at bank (GMD)", dr: "486,000", cr: "" },
    { date: "01 Aug", account: "Accounts receivable", dr: "486,000", cr: "" },
    { date: "01 Aug", account: "VAT output (15%)", dr: "", cr: "72,900" },
    { date: "01 Aug", account: "Revenue", dr: "", cr: "413,100" },
    { date: "02 Aug", account: "Bank charges", dr: "1,250", cr: "" },
  ];

  const reportItems = [
    { name: "Profit & Loss — August 2026", status: "Ready", color: "text-balanced-green" },
    { name: "Balance Sheet — As of 31 Aug", status: "Ready", color: "text-balanced-green" },
    { name: "Cash Flow Statement", status: "Ready", color: "text-balanced-green" },
    { name: "VAT Return GRA-2026-08", status: "Filed", color: "text-primary" },
    { name: "Aged Receivables", status: "3 overdue", color: "text-attention-amber" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/8">
      <WindowChrome title="Xenboox — Reporting" />

      <div className="relative h-[340px] overflow-hidden">
        {/* Financial Pulse */}
        <SurfacePanel isActive={activeTab === "pulse"}>
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Financial Pulse
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                August 2026
              </span>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-3">
              {metrics.map((m, i) => (
                <div
                  key={m.label}
                  className="rounded-xl border border-border bg-card p-3"
                  style={{
                    opacity: 0,
                    animation: `slide-up 0.4s cubic-bezier(0.32, 0.72, 0, 1) ${i * 0.1}s forwards`,
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-tight text-foreground tabular-nums">
                    {m.value}
                  </p>
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
                      m.up ? "text-balanced-green" : "text-error-clay"
                    }`}
                  >
                    {m.up ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {m.change}
                  </span>
                </div>
              ))}
            </div>
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-start gap-2">
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-primary">
                    AI Insight
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Revenue is up 12% driven by Seafood Solutions and Atlantic
                    Foods. Expenses decreased 3%.
                  </p>
                </div>
              </div>
            </div>
            {showChart && (
              <div className="flex-1 rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Revenue trend
                </p>
                <svg viewBox="0 0 400 80" className="h-20 w-full" aria-hidden="true">
                  <defs>
                    <linearGradient id="rptGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 65 L40 58 L80 54 L120 44 L160 40 L200 34 L240 30 L280 24 L320 20 L360 14 L400 10"
                    fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{
                      strokeDasharray: 600,
                      strokeDashoffset: showChart ? 0 : 600,
                      transition: "stroke-dashoffset 1.5s ease-out",
                    }}
                  />
                  <path
                    d="M0 65 L40 58 L80 54 L120 44 L160 40 L200 34 L240 30 L280 24 L320 20 L360 14 L400 10 L400 80 L0 80 Z"
                    fill="url(#rptGrad)"
                    style={{ opacity: showChart ? 1 : 0, transition: "opacity 0.8s ease-out 0.8s" }}
                  />
                </svg>
              </div>
            )}
          </div>
        </SurfacePanel>

        {/* Ledger */}
        <SurfacePanel isActive={activeTab === "ledger"}>
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                General Ledger
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                August 2026
              </span>
            </div>
            <div className="flex-1 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">Date</th>
                    <th className="px-3 py-2.5 font-semibold">Account</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Dr</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Cr</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/60 last:border-0"
                      style={{
                        opacity: 0,
                        animation: `slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) ${i * 0.08}s forwards`,
                      }}
                    >
                      <td className="px-3 py-2.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {row.date}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-foreground">
                        {row.account}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[11px] tabular-nums text-foreground">
                        {row.dr || "\u00A0"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[11px] tabular-nums text-foreground">
                        {row.cr || "\u00A0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-balanced-green/20 bg-balanced-green/5 px-4 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                Balance check
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-balanced-green">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Balanced
              </span>
            </div>
          </div>
        </SurfacePanel>

        {/* Reports */}
        <SurfacePanel isActive={activeTab === "reports"}>
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reports
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                All entities
              </span>
            </div>
            <div className="flex-1 space-y-2">
              {reportItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-all hover:shadow-sm"
                  style={{
                    opacity: 0,
                    animation: `slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) ${i * 0.08}s forwards`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {item.name}
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${item.color}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Bot className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">
                  All reports generated on demand — no scheduled runs needed
                </span>
              </div>
            </div>
          </div>
        </SurfacePanel>
      </div>

      <SurfaceTabs
        tabs={reportingTabs}
        active={activeTab}
        onSelect={setActiveTab}
      />
    </div>
  );
}

// ── Feature Visual: Multi-Currency ────────────────────────────────────────────

const currencyTabs = [
  { id: "operations", label: "Operations", icon: Wallet },
  { id: "rates", label: "Exchange Rates", icon: Globe },
  { id: "transactions", label: "Transactions", icon: FileText },
];

function CurrencyVisual() {
  const [activeTab, setActiveTab] = useState("operations");
  const [cashIn, setCashIn] = useState(0);
  const [cashOut, setCashOut] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setCashIn(78), 400);
    const t2 = setTimeout(() => setCashOut(44), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const rates = [
    { currency: "GMD", flag: "\u{1F1EC}\u{1F1F2}", rate: "53.20", change: "+0.8%", pair: "GMD/USD" },
    { currency: "USD", flag: "\u{1F1FA}\u{1F1F8}", rate: "1.00", change: "+0.2%", pair: "USD/USD" },
    { currency: "EUR", flag: "\u{1F1EA}\u{1F1FA}", rate: "0.92", change: "+0.3%", pair: "EUR/USD" },
    { currency: "GBP", flag: "\u{1F1EC}\u{1F1E7}", rate: "0.79", change: "-0.1%", pair: "GBP/USD" },
    { currency: "NGN", flag: "\u{1F1F3}\u{1F1EC}", rate: "1,540", change: "-0.4%", pair: "NGN/USD" },
    { currency: "GHS", flag: "\u{1F1EC}\u{1F1ED}", rate: "14.85", change: "+0.1%", pair: "GHS/USD" },
  ];

  const txRows = [
    { date: "28 Aug", desc: "Seafood Solutions — INV-1042", gmd: "486,000", usd: "9,135", color: "text-balanced-green" },
    { date: "27 Aug", desc: "Atlantic Traders — EUR payment", gmd: "215,000", usd: "4,037", color: "text-balanced-green" },
    { date: "26 Aug", desc: "Cloudflare hosting — USD", gmd: "-42,500", usd: "-799", color: "text-error-clay" },
    { date: "25 Aug", desc: "Kaira Clinics — payroll", gmd: "-1,920,000", usd: "-36,094", color: "text-error-clay" },
    { date: "24 Aug", desc: "SunuFresh Foods — INV-1038", gmd: "312,000", usd: "5,864", color: "text-balanced-green" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/8">
      <WindowChrome title="Xenboox — Multi-Currency" />

      <div className="relative h-[340px] overflow-hidden">
        {/* Operations */}
        <SurfacePanel isActive={activeTab === "operations"}>
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Operations
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                This month
              </span>
            </div>
            <div className="mb-4 space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    Cash In
                  </span>
                  <span className="text-xs font-semibold text-balanced-green tabular-nums">
                    GMD 3.2M
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-balanced-green transition-all duration-1000 ease-out"
                    style={{ width: `${cashIn}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    Cash Out
                  </span>
                  <span className="text-xs font-semibold text-error-clay tabular-nums">
                    GMD 1.8M
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-error-clay transition-all duration-1000 ease-out"
                    style={{ width: `${cashOut}%`, transitionDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Cash Position
                </span>
                <span className="flex items-center gap-0.5 text-[11px] font-semibold text-balanced-green">
                  <TrendingUp className="h-3 w-3" />
                  +18%
                </span>
              </div>
              <p className="mt-1 text-xl font-semibold tracking-tight text-foreground tabular-nums">
                GMD 4,210,000
              </p>
            </div>
          </div>
        </SurfacePanel>

        {/* Exchange Rates */}
        <SurfacePanel isActive={activeTab === "rates"}>
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Live Exchange Rates
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                ECB · Updated hourly
              </span>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
              {rates.map((r, i) => (
                <div
                  key={r.currency}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 transition-all hover:shadow-sm"
                  style={{
                    opacity: 0,
                    animation: `slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) ${i * 0.06}s forwards`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{r.flag}</span>
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {r.currency}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.pair}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold tabular-nums text-foreground">
                      {r.rate}
                    </p>
                    <p
                      className={`text-[10px] font-medium ${
                        r.change.startsWith("+")
                          ? "text-balanced-green"
                          : "text-error-clay"
                      }`}
                    >
                      {r.change}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SurfacePanel>

        {/* Transactions */}
        <SurfacePanel isActive={activeTab === "transactions"}>
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Multi-Currency Transactions
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                Last 5 days
              </span>
            </div>
            <div className="flex-1 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">Date</th>
                    <th className="px-3 py-2.5 font-semibold">Description</th>
                    <th className="px-3 py-2.5 text-right font-semibold">GMD</th>
                    <th className="px-3 py-2.5 text-right font-semibold">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {txRows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/60 last:border-0"
                      style={{
                        opacity: 0,
                        animation: `slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) ${i * 0.08}s forwards`,
                      }}
                    >
                      <td className="px-3 py-2.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {row.date}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground">
                        {row.desc}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-mono text-[11px] tabular-nums ${row.color}`}>
                        {row.gmd}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-mono text-[11px] tabular-nums ${row.color}`}>
                        {row.usd}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SurfacePanel>
      </div>

      <SurfaceTabs
        tabs={currencyTabs}
        active={activeTab}
        onSelect={setActiveTab}
      />
    </div>
  );
}

// ── Feature Visual: Security ──────────────────────────────────────────────────

const securityTabs = [
  { id: "audit", label: "Audit Trail", icon: Shield },
  { id: "access", label: "Access Control", icon: Users },
  { id: "encryption", label: "Encryption", icon: Lock },
];

function SecurityVisual() {
  const [activeTab, setActiveTab] = useState("audit");
  const [visibleRows, setVisibleRows] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setVisibleRows(1), 400),
      setTimeout(() => setVisibleRows(2), 700),
      setTimeout(() => setVisibleRows(3), 1000),
      setTimeout(() => setVisibleRows(4), 1300),
      setTimeout(() => setVisibleRows(5), 1600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const auditRows = [
    { time: "14:32:08", actor: "CFO Agent", action: "Posted journal #JE-2847", hash: "a3f8\u2026c12", color: "text-balanced-green" },
    { time: "14:31:55", actor: "Invoice Agent", action: "Created INV-1042", hash: "7b2e\u2026d49", color: "text-primary" },
    { time: "14:30:22", actor: "You", action: "Approved payroll batch", hash: "e91a\u2026f37", color: "text-foreground" },
    { time: "14:29:10", actor: "Compliance Agent", action: "Filed VAT return GRA-2026-08", hash: "4d6c\u2026a83", color: "text-primary" },
    { time: "14:28:03", actor: "Treasury Agent", action: "Reconciled 12 transactions", hash: "f07b\u2026e51", color: "text-balanced-green" },
  ];

  const accessRows = [
    { role: "Admin", scope: "All entities", permissions: "Full access", users: "2" },
    { role: "CFO", scope: "All entities", permissions: "Read, write, approve", users: "1" },
    { role: "Accountant", scope: "Entity-scoped", permissions: "Read, write", users: "3" },
    { role: "Viewer", scope: "Entity-scoped", permissions: "Read only", users: "5" },
  ];

  const encryptionItems = [
    { label: "Data at rest", status: "AES-256-GCM", icon: Shield },
    { label: "Data in transit", status: "TLS 1.3", icon: Shield },
    { label: "Field-level encryption", status: "PBKDF2 key derivation", icon: Lock },
    { label: "Database", status: "Neon Postgres + RLS", icon: Database },
    { label: "Key management", status: "Per-record key versioning", icon: Settings },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/8">
      <WindowChrome title="Xenboox — Security" />

      <div className="relative h-[340px] overflow-hidden">
        {/* Audit Trail */}
        <SurfacePanel isActive={activeTab === "audit"}>
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Audit Trail
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[10px] font-semibold text-balanced-green">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-balanced-green" />
                Chain verified
              </span>
            </div>
            <div className="flex-1 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">Time</th>
                    <th className="px-3 py-2.5 font-semibold">Actor</th>
                    <th className="px-3 py-2.5 font-semibold">Action</th>
                    <th className="px-3 py-2.5 font-semibold">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.slice(0, visibleRows).map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/60 last:border-0"
                      style={{
                        opacity: 0,
                        animation: `slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) ${i * 0.12}s forwards`,
                      }}
                    >
                      <td className="px-3 py-2.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {row.time}
                      </td>
                      <td className={`px-3 py-2.5 text-xs font-medium ${row.color}`}>
                        {row.actor}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground">
                        {row.action}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground/60">
                        {row.hash}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleRows >= 5 && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-balanced-green/20 bg-balanced-green/5 px-4 py-2.5">
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Shield className="h-3.5 w-3.5 text-balanced-green" />
                  Hash chain integrity
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-balanced-green">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  5/5 verified
                </span>
              </div>
            )}
          </div>
        </SurfacePanel>

        {/* Access Control */}
        <SurfacePanel isActive={activeTab === "access"}>
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Role-Based Access
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                4 roles · 11 users
              </span>
            </div>
            <div className="flex-1 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">Role</th>
                    <th className="px-3 py-2.5 font-semibold">Scope</th>
                    <th className="px-3 py-2.5 font-semibold">Permissions</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Users</th>
                  </tr>
                </thead>
                <tbody>
                  {accessRows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/60 last:border-0"
                      style={{
                        opacity: 0,
                        animation: `slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) ${i * 0.1}s forwards`,
                      }}
                    >
                      <td className="px-3 py-2.5 text-xs font-medium text-foreground">
                        {row.role}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {row.scope}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {row.permissions}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-medium text-foreground">
                        {row.users}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-primary">
                  Entity isolation enforced at database level — RLS policies
                </span>
              </div>
            </div>
          </div>
        </SurfacePanel>

        {/* Encryption */}
        <SurfacePanel isActive={activeTab === "encryption"}>
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Encryption &amp; Protection
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[10px] font-semibold text-balanced-green">
                <CheckCircle2 className="h-3 w-3" />
                All verified
              </span>
            </div>
            <div className="flex-1 space-y-2">
              {encryptionItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-all hover:shadow-sm"
                    style={{
                      opacity: 0,
                      animation: `slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) ${i * 0.08}s forwards`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-balanced-green/10">
                        <Icon className="h-4 w-4 text-balanced-green" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-balanced-green" />
                <span className="text-xs text-muted-foreground">
                  STRIDE threat model · OWASP Top 10 · SOC 2 policies
                </span>
              </div>
            </div>
          </div>
        </SurfacePanel>
      </div>

      <SurfaceTabs
        tabs={securityTabs}
        active={activeTab}
        onSelect={setActiveTab}
      />
    </div>
  );
}

// ── Feature Sections Data ─────────────────────────────────────────────────────

const featureSections = [
  {
    id: "automation",
    eyebrow: "AI Automation",
    title: "Your accounting runs itself",
    description:
      "AI learns your patterns and handles routine work while you focus on strategy.",
    features: [
      "Automated transaction categorization",
      "Smart bank reconciliation",
      "Invoice processing with OCR",
      "Anomaly detection and alerts",
    ],
    Visual: AutomationVisual,
  },
  {
    id: "reporting",
    eyebrow: "Financial Reporting",
    title: "Insights that drive decisions",
    description:
      "Real-time P&L, balance sheet, and cash flow — always up to date.",
    features: [
      "Real-time P&L and Balance Sheet",
      "Cash flow forecasting",
      "Custom report builder",
      "Export to PDF, Excel, CSV",
    ],
    Visual: ReportingVisual,
  },
  {
    id: "multi-currency",
    eyebrow: "Multi-Currency",
    title: "Global business, local expertise",
    description:
      "Handle transactions in any currency with real-time exchange rates.",
    features: [
      "50+ currencies supported",
      "Real-time exchange rates",
      "Automatic conversion",
      "Multi-currency reporting",
    ],
    Visual: CurrencyVisual,
  },
  {
    id: "security",
    eyebrow: "Security",
    title: "Your data, protected",
    description:
      "Enterprise-grade security: encrypted, isolated, and fully auditable.",
    features: [
      "End-to-end encryption",
      "Role-based access control",
      "Complete audit trail",
      "Bank-grade security",
    ],
    Visual: SecurityVisual,
  },
];

const stats = [
  { value: 99.9, suffix: "%", label: "Uptime SLA" },
  { value: 50, suffix: "+", label: "Currencies" },
  { value: 256, suffix: "-bit", label: "Encryption" },
  { value: 24, suffix: "/7", label: "Support" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: "Features" }]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-paper">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(rgba(20, 33, 61, 0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 100% at 50% -10%, rgba(59, 79, 224, 0.12), transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 py-12 sm:py-16 lg:py-24 text-center">
            <FadeInUp delay={0.05}>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Accounting that{" "}
                <span className="text-primary">thinks for itself</span>
              </h1>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Automated reconciliations, intelligent categorization, and
                real-time insights — so you can focus on growing your business.
              </p>
            </FadeInUp>
            <FadeInUp delay={0.15}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="gap-2 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Link href="/register">
                    Start free
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Link href="/pricing">See pricing</Link>
                </Button>
              </div>
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <div className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-6 sm:gap-8 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-foreground">
                      <AnimatedCounter
                        target={stat.value}
                        suffix={stat.suffix}
                      />
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Feature Sections — realistic dashboard visuals with tab switching */}
      {featureSections.map((section, index) => {
        const { Visual } = section;
        return (
          <section
            key={section.id}
            className={`${index % 2 === 0 ? "bg-paper" : "bg-paper-2/60"} py-12 sm:py-16 lg:py-24`}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div
                className={`grid items-center gap-10 lg:gap-16 lg:grid-cols-2 ${
                  index % 2 === 1 ? "lg:grid-flow-dense" : ""
                }`}
              >
                <FadeInUp
                  className={index % 2 === 1 ? "lg:col-start-2" : ""}
                >
                  <div className="flex flex-col items-start gap-4">
                    <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                      {section.title}
                    </h2>
                    <p className="mt-2 text-lg leading-relaxed text-muted-foreground">
                      {section.description}
                    </p>
                    <ul className="mt-4 space-y-3">
                      {section.features.map((feature) => (
                        <CheckItem key={feature}>{feature}</CheckItem>
                      ))}
                    </ul>
                  </div>
                </FadeInUp>

                <FadeInUp
                  delay={0.15}
                  className={index % 2 === 1 ? "lg:col-start-1" : ""}
                >
                  <div className="relative">
                    <div
                      className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/15 via-transparent to-balanced-green/10 blur-xl"
                      aria-hidden="true"
                    />
                    <div className="relative">
                      <Visual />
                    </div>
                  </div>
                </FadeInUp>
              </div>
            </div>
          </section>
        );
      })}

      {/* Bento Grid */}
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Everything included"
            title={
              <>
                Everything you need,{" "}
                <span className="text-primary">nothing you don&apos;t</span>
              </>
            }
            lead="Built for modern finance teams who want powerful tools without the complexity."
          />

          <div className="mt-10 sm:mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: CreditCard, title: "Accounts Payable", description: "Automate bill processing and payments" },
              { icon: TrendingUp, title: "Accounts Receivable", description: "Track invoices and collect payments faster" },
              { icon: FileText, title: "Document AI", description: "Extract data from receipts and invoices" },
              { icon: Globe, title: "Multi-Entity", description: "Manage multiple businesses in one place" },
              { icon: Users, title: "Team Collaboration", description: "Role-based access and approval workflows" },
              { icon: Clock, title: "Real-Time Sync", description: "Updates across all devices instantly" },
            ].map((item) => (
              <FadeInUp key={item.title}>
                <div className="group h-full rounded-2xl border border-border/60 bg-card p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-border/40 hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </Section>

      {/* Testimonials — carousel matching homepage */}
      <Testimonials />

      {/* CTA */}
      <Cta />

      {/* slide-up keyframe for inline animations */}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
