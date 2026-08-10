import { ReactNode } from "react";

import type { PageContextPayload } from "@/lib/chat/page-context";

export type TabItem = {
  key: string;
  label: string;
  count?: number;
  onClick?: () => void;
};

export type SummaryCardItem = {
  label: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
};

export type ModulePageShellProps = {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconBgClassName?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  tabs?: readonly TabItem[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  summaryCards?: readonly SummaryCardItem[];
  filters?: ReactNode;
  children: ReactNode;
  pagination?: ReactNode;
  bottomCharts?: ReactNode;
  defaultCollapsed?: {
    tabs?: boolean;
    summaryCards?: boolean;
    filters?: boolean;
  };
  noOuterWrapper?: boolean;
  /**
   * Optional page snapshot for the AI copilot — the agent answers about the
   * data actually in view (page, tab, filters, visible KPIs, record count).
   * When omitted, the shell derives a safe baseline from title/tab/KPIs.
   */
  aiContext?: Partial<PageContextPayload>;
  /** Override the copilot's suggestion chips. */
  aiSuggestions?: Array<{ label: string; prompt: string }>;
  /** Hide the page AI copilot entirely (e.g. sensitive admin surfaces). */
  disableAiCopilot?: boolean;
};
