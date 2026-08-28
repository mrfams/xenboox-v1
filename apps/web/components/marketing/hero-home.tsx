"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BookOpen,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Inbox,
  MessageSquare,
  PieChart,
  Play,
  Send,
  Settings,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui";

// ─── Surface Definitions ─────────────────────────────────────────────────────

type Surface = "command" | "activity" | "pulse" | "ledger" | "operations";

const surfaces: {
  id: Surface;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    id: "command",
    label: "Command Center",
    icon: MessageSquare,
    color: "signal-indigo",
  },
  {
    id: "activity",
    label: "Activity Hub",
    icon: Inbox,
    color: "attention-amber",
  },
  {
    id: "pulse",
    label: "Financial Pulse",
    icon: PieChart,
    color: "balanced-green",
  },
  { id: "ledger", label: "Ledger", icon: BookOpen, color: "signal-indigo" },
  {
    id: "operations",
    label: "Operations",
    icon: Wallet,
    color: "balanced-green",
  },
];

// ─── Main Hero Component ─────────────────────────────────────────────────────

export function Hero() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden bg-background"
    >
      {/* Cursor spotlight effect */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-500"
        style={{
          opacity: mousePos.x > 0 ? 1 : 0,
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, hsl(var(--primary) / 0.04), transparent 70%)`,
        }}
        aria-hidden="true"
      />

      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-0 bg-grid opacity-40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 100% at 50% -20%, hsl(var(--primary) / 0.06), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Compact Text Zone ── */}
        <div className="flex flex-col items-center gap-4 pt-10 text-center sm:pt-14 md:pt-16 lg:pt-20">
          {/* Eyebrow */}
          <div className="hero-fade-up flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 shadow-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-balanced-green opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-balanced-green" />
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              19 AI agents running
            </span>
          </div>

          {/* Headline */}
          <h1 className="hero-fade-up max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
            Your entire accounting department, running{" "}
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              autonomously
            </span>
            .
          </h1>

          {/* Subline */}
          <p className="hero-fade-up max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            AI agents handle invoicing, payroll, compliance, and month-end
            close. Every decision confidence-scored, every action audit-trailed.
            You approve what matters.
          </p>

          {/* CTAs */}
          <div className="hero-fade-up flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="gap-2 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Link href="/onboarding">
                Start free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="group gap-2 rounded-full border-border/80 bg-background/50 px-6 text-foreground/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground hover:shadow-md hover:shadow-primary/10 hover:ring-1 hover:ring-primary/20 active:scale-[0.98]"
            >
              <Link href="#demo">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 transition-colors duration-300 group-hover:bg-primary/15">
                  <Play className="h-3 w-3 fill-primary text-primary" aria-hidden="true" />
                </span>
                See it in action
              </Link>
            </Button>
          </div>

          {/* Trust badges */}
          <ul className="hero-fade-up flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {[
              "No credit card required",
              "Human approval on every decision",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Interactive Platform Demo ── */}
        <div className="hero-fade-up mt-8 sm:mt-10 md:mt-12 lg:mt-14">
          <InteractiveDemo mousePos={mousePos} containerRef={containerRef} />
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}

// ─── Interactive Platform Demo ───────────────────────────────────────────────

function InteractiveDemo({
  mousePos,
  containerRef,
}: {
  mousePos: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [activeSurface, setActiveSurface] = React.useState<Surface>("command");
  const [isAutoPlaying, setIsAutoPlaying] = React.useState(true);
  const demoRef = React.useRef<HTMLDivElement>(null);

  // Auto-cycle through surfaces
  React.useEffect(() => {
    if (!isAutoPlaying) return;
    const order: Surface[] = [
      "command",
      "activity",
      "pulse",
      "ledger",
      "operations",
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % order.length;
      setActiveSurface(order[index]);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleSurfaceClick = (surface: Surface) => {
    setActiveSurface(surface);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 20000);
  };

  // Calculate cursor offset relative to the demo
  const demoOffset = React.useMemo(() => {
    if (!demoRef.current || !containerRef.current) return { x: 0, y: 0 };
    const demoRect = demoRef.current.getBoundingClientRect();
    const contRect = containerRef.current.getBoundingClientRect();
    return {
      x: mousePos.x - (demoRect.left - contRect.left),
      y: mousePos.y - (demoRect.top - contRect.top),
    };
  }, [mousePos, containerRef]);

  return (
    <div ref={demoRef} className="relative mx-auto w-full max-w-6xl">
      {/* Glow backdrop — tracks cursor */}
      <div
        className="absolute -inset-12 rounded-[2rem] blur-3xl transition-all duration-700 ease-out"
        style={{
          background: `radial-gradient(500px circle at ${demoOffset.x}px ${demoOffset.y}px, hsl(var(--primary) / 0.12), transparent 70%)`,
        }}
        aria-hidden="true"
      />

      {/* Platform window */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/8 dark:shadow-primary/15">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full bg-error-clay/70"
            aria-hidden="true"
          />
          <span
            className="h-2.5 w-2.5 rounded-full bg-attention-amber/70"
            aria-hidden="true"
          />
          <span
            className="h-2.5 w-2.5 rounded-full bg-balanced-green/70"
            aria-hidden="true"
          />
          <span className="ml-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Xenboox
          </span>

          {/* Agent activity indicator */}
          <AgentActivityBar />

          {/* Live agent count */}
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[10px] font-semibold text-balanced-green">
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-balanced-green"
              aria-hidden="true"
            />
            19 agents active
          </span>
        </div>

        <div className="flex min-h-[400px] sm:min-h-[460px] md:min-h-[520px]">
          {/* ── Sidebar ── */}
          <div className="hidden w-14 flex-col items-center gap-2 border-r border-border bg-muted/20 py-3 sm:flex">
            {surfaces.map((s) => {
              const Icon = s.icon;
              const isActive = activeSurface === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSurfaceClick(s.id)}
                  className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  title={s.label}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  {isActive && (
                    <span className="absolute -left-[7px] h-5 w-[2px] rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
            <div className="mt-auto">
              <button className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Settings className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ── Main Content ── */}
          <div className="relative flex-1 overflow-hidden">
            <SurfacePanel isActive={activeSurface === "command"}>
              <CommandCenter />
            </SurfacePanel>
            <SurfacePanel isActive={activeSurface === "activity"}>
              <ActivityHub />
            </SurfacePanel>
            <SurfacePanel isActive={activeSurface === "pulse"}>
              <FinancialPulse />
            </SurfacePanel>
            <SurfacePanel isActive={activeSurface === "ledger"}>
              <LedgerView />
            </SurfacePanel>
            <SurfacePanel isActive={activeSurface === "operations"}>
              <OperationsView />
            </SurfacePanel>
          </div>
        </div>

        {/* ── Surface Tabs ── */}
        <div className="flex items-center justify-center gap-1 border-t border-border bg-muted/30 px-4 py-2 sm:flex">
          {surfaces.map((s) => {
            const isActive = activeSurface === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleSurfaceClick(s.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Agent Activity Bar ──────────────────────────────────────────────────────

function AgentActivityBar() {
  const [activityIndex, setActivityIndex] = React.useState(0);

  const activities = [
    {
      agent: "CFO Agent",
      action: "Reviewing monthly close",
      color: "text-primary",
    },
    {
      agent: "Invoice Agent",
      action: "Processing INV-1043",
      color: "text-balanced-green",
    },
    {
      agent: "Payroll Agent",
      action: "Calculating deductions",
      color: "text-attention-amber",
    },
    {
      agent: "Compliance Agent",
      action: "Checking VAT filing",
      color: "text-primary",
    },
    {
      agent: "Treasury Agent",
      action: "Monitoring cash flow",
      color: "text-balanced-green",
    },
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % activities.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const current = activities[activityIndex];

  return (
    <div className="ml-3 hidden items-center gap-1.5 md:flex">
      <Sparkles className={`h-3 w-3 ${current.color}`} aria-hidden="true" />
      <span className="text-[10px] text-muted-foreground">
        <span className={`font-semibold ${current.color}`}>
          {current.agent}
        </span>{" "}
        {current.action}
      </span>
      <span className="typing-dots ml-1 inline-flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
      </span>
    </div>
  );
}

// ─── Surface Panel Wrapper ───────────────────────────────────────────────────

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

// ─── Surface: Command Center ─────────────────────────────────────────────────

function CommandCenter() {
  const [visibleMessages, setVisibleMessages] = React.useState(0);
  const [isTyping, setIsTyping] = React.useState(false);

  React.useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setIsTyping(true), 400));
    timers.push(
      setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages(1);
      }, 1800),
    );
    timers.push(setTimeout(() => setIsTyping(true), 2400));
    timers.push(
      setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages(2);
      }, 3800),
    );
    timers.push(setTimeout(() => setIsTyping(true), 4200));
    timers.push(
      setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages(3);
      }, 5400),
    );
    return () => timers.forEach(clearTimeout);
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

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Command Center
        </span>
      </div>

      <div className="flex-1 space-y-3">
        {messages.slice(0, visibleMessages).map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} slide-up`}
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
                  <Bot className="h-3 w-3" aria-hidden="true" />
                  {msg.agent}
                </span>
              )}
              <p className="whitespace-pre-line">{msg.text}</p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start slide-up">
            <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
              <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="typing-dots inline-flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <span className="text-sm text-muted-foreground">Type a command...</span>
        <Send
          className="ml-auto h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

// ─── Surface: Activity Hub ───────────────────────────────────────────────────

function ActivityHub() {
  const [visibleCards, setVisibleCards] = React.useState(0);

  React.useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setVisibleCards(1), 400));
    timers.push(setTimeout(() => setVisibleCards(2), 1200));
    timers.push(setTimeout(() => setVisibleCards(3), 2000));
    return () => timers.forEach(clearTimeout);
  }, []);

  const cards = [
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

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Activity Hub
          </span>
        </div>
        <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[10px] font-semibold text-attention-amber">
          3 need decision
        </span>
      </div>

      <div className="flex-1 space-y-3">
        {cards.slice(0, visibleCards).map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-border/80 slide-up"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-${card.tone}/10 text-${card.tone}`}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {card.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{card.detail}</p>
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
  );
}

// ─── Surface: Financial Pulse ────────────────────────────────────────────────

function FinancialPulse() {
  const [showChart, setShowChart] = React.useState(false);
  const [animatingBars, setAnimatingBars] = React.useState(false);

  React.useEffect(() => {
    const t1 = setTimeout(() => setShowChart(true), 500);
    const t2 = setTimeout(() => setAnimatingBars(true), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const metrics = [
    { label: "Revenue", value: "GMD 4.2M", change: "+12%", up: true },
    { label: "Expenses", value: "GMD 2.8M", change: "-3%", up: false },
    { label: "Net Income", value: "GMD 1.4M", change: "+18%", up: true },
  ];

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <PieChart className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Financial Pulse
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          August 2026
        </span>
      </div>

      {/* Metric cards */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className="rounded-xl border border-border bg-card p-3 slide-up"
            style={{ animationDelay: `${i * 0.1}s` }}
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
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <TrendingDown className="h-3 w-3" aria-hidden="true" />
              )}
              {m.change}
            </span>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 slide-up">
        <div className="flex items-start gap-2">
          <Bot
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-semibold text-primary">AI Insight</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Revenue is up 12% driven by Seafood Solutions and Atlantic Foods.
              Expenses decreased 3% — payroll optimization saved GMD 42,000 this
              month.
            </p>
          </div>
        </div>
      </div>

      {/* Revenue chart */}
      {showChart && (
        <div className="flex-1 rounded-xl border border-border bg-card p-4 slide-up">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Revenue trend
          </p>
          <svg viewBox="0 0 400 100" className="h-24 w-full" aria-hidden="true">
            <defs>
              <linearGradient
                id="revenueGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity="0.3"
                />
                <stop
                  offset="100%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            <path
              d="M0 80 L40 72 L80 68 L120 55 L160 50 L200 42 L240 38 L280 30 L320 25 L360 18 L400 12"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="chart-draw"
            />
            <path
              d="M0 80 L40 72 L80 68 L120 55 L160 50 L200 42 L240 38 L280 30 L320 25 L360 18 L400 12 L400 100 L0 100 Z"
              fill="url(#revenueGrad)"
              className="chart-fill"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Surface: Ledger ─────────────────────────────────────────────────────────

function LedgerView() {
  const [visibleRows, setVisibleRows] = React.useState(0);

  React.useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setVisibleRows(1), 300));
    timers.push(setTimeout(() => setVisibleRows(2), 600));
    timers.push(setTimeout(() => setVisibleRows(3), 900));
    timers.push(setTimeout(() => setVisibleRows(4), 1200));
    timers.push(setTimeout(() => setVisibleRows(5), 1600));
    return () => timers.forEach(clearTimeout);
  }, []);

  const rows = [
    {
      date: "01 Aug",
      account: "Cash at bank (GMD)",
      dr: "486,000",
      cr: "",
      highlight: false,
    },
    {
      date: "01 Aug",
      account: "Accounts receivable",
      dr: "486,000",
      cr: "",
      highlight: false,
    },
    {
      date: "01 Aug",
      account: "VAT output (15%)",
      dr: "",
      cr: "72,900",
      highlight: false,
    },
    {
      date: "01 Aug",
      account: "Revenue",
      dr: "",
      cr: "413,100",
      highlight: false,
    },
    {
      date: "02 Aug",
      account: "Bank charges",
      dr: "1,250",
      cr: "",
      highlight: true,
    },
  ];

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
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
            {rows.slice(0, visibleRows).map((row, i) => (
              <tr
                key={i}
                className={`border-b border-border/60 last:border-0 slide-up ${
                  row.highlight ? "bg-balanced-green/5" : ""
                }`}
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

      {/* Balance check */}
      {visibleRows >= 5 && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-balanced-green/20 bg-balanced-green/5 px-4 py-2.5 slide-up">
          <span className="text-xs font-medium text-muted-foreground">
            Balance check
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-balanced-green">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Balanced
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Surface: Operations ─────────────────────────────────────────────────────

function OperationsView() {
  const [showDetails, setShowDetails] = React.useState(false);
  const [cashInWidth, setCashInWidth] = React.useState(0);
  const [cashOutWidth, setCashOutWidth] = React.useState(0);

  React.useEffect(() => {
    const t1 = setTimeout(() => setCashInWidth(78), 300);
    const t2 = setTimeout(() => setCashOutWidth(44), 500);
    const t3 = setTimeout(() => setShowDetails(true), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Operations
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          This month
        </span>
      </div>

      {/* Cash flow bars */}
      <div className="mb-4 space-y-3">
        <div className="slide-up">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Cash In</span>
            <span className="text-xs font-semibold text-balanced-green tabular-nums">
              GMD 3.2M
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-balanced-green transition-all duration-1000 ease-out"
              style={{ width: `${cashInWidth}%` }}
            />
          </div>
        </div>
        <div className="slide-up">
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
              style={{ width: `${cashOutWidth}%`, transitionDelay: "0.2s" }}
            />
          </div>
        </div>
      </div>

      {/* Cash position */}
      <div className="mb-4 rounded-xl border border-border bg-card p-3 slide-up">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cash Position
          </span>
          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-balanced-green">
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
            +18%
          </span>
        </div>
        <p className="mt-1 text-xl font-semibold tracking-tight text-foreground tabular-nums">
          GMD 4,210,000
        </p>
      </div>

      {/* Upcoming items */}
      {showDetails && (
        <div className="flex-1 space-y-2 slide-up">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-all hover:shadow-sm">
            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">
                Incoming invoices (4)
              </p>
              <p className="text-[10px] text-muted-foreground">
                GMD 1.2M expected
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-all hover:shadow-sm">
            <CreditCard
              className="h-4 w-4 text-attention-amber"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">
                Pending payments (2)
              </p>
              <p className="text-[10px] text-muted-foreground">
                GMD 340,000 due
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-all hover:shadow-sm">
            <BarChart3
              className="h-4 w-4 text-balanced-green"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">
                Next payroll: Aug 31
              </p>
              <p className="text-[10px] text-muted-foreground">
                34 staff · GMD 1.92M
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
