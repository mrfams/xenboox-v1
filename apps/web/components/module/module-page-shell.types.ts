import { ReactNode } from "react";

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
};
