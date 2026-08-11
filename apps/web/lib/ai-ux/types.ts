// ─── AI-native UX — simulation types ────────────────────────────────────────
//
// The agentic experience in Xenboox is modelled as declarative, scripted
// "traces": a sequence of steps played back by <SimulationOverlay> so the
// product can demonstrate its agent-workforce UX before live LLM agents are
// wired in. Every trace follows the same three-tier communication model used
// by the real agents (docs/AGENTIC_FLOW.md): CFO → department heads → workers
// → Ledger Agent (single posting point).
//
// To add a new simulated workflow: define its steps here, then register it in
// lib/explore/ai-ux-catalog.ts with a "Run simulation" button.

export type AgentTier = 1 | 2 | 3;

export type AgentId =
  | "cfo"
  | "controller"
  | "treasury"
  | "ar"
  | "ap"
  | "payroll"
  | "ledger"
  | "reporting"
  | "document"
  | "cash"
  | "compliance"
  | "reconciliation";

export type AgentSpec = {
  id: AgentId;
  name: string;
  title: string;
  tier: AgentTier;
  /** Tailwind gradient classes for the avatar chip. */
  avatar: string;
  /** Tailwind accent (icon + name) color. */
  accent: string;
};

export const AGENTS: Record<AgentId, AgentSpec> = {
  cfo: {
    id: "cfo",
    name: "CFO Agent",
    title: "Strategic oversight",
    tier: 1,
    avatar: "from-indigo-500 to-violet-500",
    accent: "text-indigo-600",
  },
  controller: {
    id: "controller",
    name: "Controller Agent",
    title: "Close orchestration",
    tier: 2,
    avatar: "from-sky-500 to-blue-600",
    accent: "text-sky-600",
  },
  treasury: {
    id: "treasury",
    name: "Treasury Agent",
    title: "Cash & payments",
    tier: 2,
    avatar: "from-teal-500 to-emerald-600",
    accent: "text-teal-600",
  },
  ar: {
    id: "ar",
    name: "AR Agent",
    title: "Receivables",
    tier: 3,
    avatar: "from-emerald-500 to-teal-600",
    accent: "text-emerald-600",
  },
  ap: {
    id: "ap",
    name: "AP Agent",
    title: "Payables",
    tier: 3,
    avatar: "from-amber-500 to-orange-600",
    accent: "text-amber-600",
  },
  payroll: {
    id: "payroll",
    name: "Payroll Agent",
    title: "Compensation",
    tier: 3,
    avatar: "from-fuchsia-500 to-pink-600",
    accent: "text-fuchsia-600",
  },
  ledger: {
    id: "ledger",
    name: "Ledger Agent",
    title: "Posting — single point of entry",
    tier: 3,
    avatar: "from-violet-500 to-purple-600",
    accent: "text-violet-600",
  },
  reporting: {
    id: "reporting",
    name: "Reporting Agent",
    title: "Statements & narratives",
    tier: 2,
    avatar: "from-blue-500 to-indigo-600",
    accent: "text-blue-600",
  },
  document: {
    id: "document",
    name: "Document Agent",
    title: "Capture & extraction",
    tier: 3,
    avatar: "from-rose-500 to-red-500",
    accent: "text-rose-600",
  },
  cash: {
    id: "cash",
    name: "Cash Agent",
    title: "Cash transactions",
    tier: 3,
    avatar: "from-cyan-500 to-sky-600",
    accent: "text-cyan-600",
  },
  compliance: {
    id: "compliance",
    name: "Compliance Agent",
    title: "Rules & verification",
    tier: 2,
    avatar: "from-emerald-600 to-green-700",
    accent: "text-emerald-600",
  },
  reconciliation: {
    id: "reconciliation",
    name: "Reconciliation Agent",
    title: "Bank line matching",
    tier: 3,
    avatar: "from-slate-500 to-slate-700",
    accent: "text-slate-600",
  },
};

// ─── Steps ──────────────────────────────────────────────────────────────────

export type AiUxStep =
  | {
      kind: "think";
      agent: AgentId;
      text: string;
      /** Total time (ms) this step occupies the feed. */
      ms: number;
    }
  | {
      kind: "act";
      agent: AgentId;
      text: string;
      ms: number;
    }
  | {
      kind: "tool";
      agent: AgentId;
      tool: string;
      detail: string;
      ms: number;
    }
  | {
      kind: "approval";
      agent: AgentId;
      text: string;
      ms: number;
      /** 0–100 confidence of the action awaiting approval. */
      confidence: number;
    }
  | {
      kind: "complete";
      agent: AgentId;
      text: string;
    };

// ─── Trace ──────────────────────────────────────────────────────────────────

export type AiUxTrace = {
  id: string;
  title: string;
  tagline: string;
  /** Where this workflow lives in the product. */
  module: string;
  /** Human label for the simulated run (e.g. "~40s run"). */
  durationLabel: string;
  /** Participating agents, in order of first appearance. */
  agents: AgentId[];
  steps: AiUxStep[];
};

export type TraceId = AiUxTrace["id"];
