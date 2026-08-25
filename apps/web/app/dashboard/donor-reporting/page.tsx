"use client";

import { useState } from "react";
import {
  HandCoins,
  TrendingUp,
  TrendingDown,
  FileText,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Plus,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { useModuleAi } from "@/components/module/module-ai-context";
import { Button } from "@/components/ui";

// ─── Donor & Grant Reporting ────────────────────────────────────────────────
//
// AI-native donor reporting for NGOs and development organizations.
// Tracks donor-funded projects, budget vs actual, and generates
// reports in required formats (USAID, EU, World Bank, AfDB).

// ─── Stats Overview ────────────────────────────────────────────────────────

function DonorStats() {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = trpc.donorGrant.getStats.useQuery(undefined, { enabled: !!entityId });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
        <AlertTriangle
          className="h-5 w-5 text-destructive mx-auto mb-2"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-foreground">
          Unable to load donor stats
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const items = [
    {
      label: "Active Projects",
      value: String(stats?.active ?? 0),
      icon: Building2,
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
    },
    {
      label: "Total Grants",
      value: formatCurrency(stats?.totalGrantAmount ?? 0),
      icon: HandCoins,
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    },
    {
      label: "Disbursed",
      value: formatCurrency(stats?.totalDisbursed ?? 0),
      icon: ArrowUpRight,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
    },
    {
      label: "Remaining",
      value: formatCurrency(stats?.totalRemaining ?? 0),
      icon: ArrowDownRight,
      color: "text-purple-500 dark:text-purple-400",
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border/50 bg-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md",
                item.bg,
              )}
            >
              <item.icon className={cn("h-3.5 w-3.5", item.color)} />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground/70">
              {item.label}
            </p>
          </div>
          <p className="text-lg font-bold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Project Cards ─────────────────────────────────────────────────────────

function ProjectCards() {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

  const {
    data: projects,
    isLoading,
    isError,
    refetch,
  } = trpc.donorGrant.listProjects.useQuery(
    { status: "active" },
    { enabled: !!entityId },
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Donor Projects
        </h3>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
          <AlertTriangle
            className="h-5 w-5 text-destructive mx-auto mb-2"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">
            Unable to load projects
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Donor Projects
          </h3>
          {projects && projects.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-500">
              {projects.length} active
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            openWithFocus(
              {
                kind: "Donor Projects",
                name: "Donor Projects",
                fields: [
                  {
                    label: "Active",
                    value: String(projects?.length ?? 0),
                  },
                ],
              },
              "Show me all donor projects. Which ones need attention?",
            )
          }
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Ask AI
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
          <HandCoins
            className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground mb-2">
            No donor projects yet
          </p>
          <p className="text-xs text-muted-foreground/70 mb-3">
            Set up your first donor-funded project to start tracking grants
          </p>
          <button
            type="button"
            onClick={() =>
              openWithFocus(
                { kind: "Donor Projects", name: "Create Project" },
                "Help me create my first donor project. I need to set up a grant from a donor.",
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Create with AI
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const grantAmount = Number(project.grantAmount);
            const disbursed = Number(project.amountDisbursed);
            const remaining = Number(project.amountRemaining);
            const currency = project.currency ?? "USD";
            const percentUsed =
              grantAmount > 0 ? (disbursed / grantAmount) * 100 : 0;
            const isLow = percentUsed > 80;

            return (
              <button
                key={project.id}
                type="button"
                onClick={() =>
                  openWithFocus(
                    {
                      kind: "Donor Project",
                      name: project.projectName,
                      id: project.id,
                      fields: [
                        {
                          label: "Donor",
                          value: project.donor?.name ?? "Unknown",
                        },
                        {
                          label: "Grant Amount",
                          value: formatCurrency(grantAmount, currency),
                        },
                        {
                          label: "Disbursed",
                          value: formatCurrency(disbursed, currency),
                        },
                        {
                          label: "Remaining",
                          value: formatCurrency(remaining, currency),
                        },
                        {
                          label: "Reporting",
                          value: project.reportingFormat.toUpperCase(),
                        },
                      ],
                    },
                    `Show me the budget vs actual for ${project.projectName}. Any variances I should know about?`,
                  )
                }
                className="w-full text-left rounded-lg border border-border/50 bg-background/50 p-4 transition-all hover:border-border/80 hover:shadow-sm group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {project.projectName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {project.donor?.name ?? "Unknown donor"} ·{" "}
                      {project.reportingFormat.toUpperCase()} format ·{" "}
                      {project.reportingCadence}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {project.status === "active" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {project.status}
                    </span>
                  </div>
                </div>

                {/* Budget Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">
                      {formatCurrency(disbursed, currency)} disbursed
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(remaining, currency)} remaining
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isLow ? "bg-amber-500" : "bg-emerald-500",
                      )}
                      style={{ width: `${Math.min(percentUsed, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">
                      {formatCurrency(grantAmount, currency)} total grant
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        isLow ? "text-amber-500" : "text-muted-foreground",
                      )}
                    >
                      {percentUsed.toFixed(0)}% used
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Recent Reports ────────────────────────────────────────────────────────

function RecentReports() {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data: projects } = trpc.donorGrant.listProjects.useQuery(
    { status: "active" },
    { enabled: !!entityId },
  );

  // Get report snapshots from the first project (if any)
  const firstProjectId = projects?.[0]?.id;
  const { data: snapshots } = trpc.donorGrant.listReportSnapshots.useQuery(
    { projectId: firstProjectId ?? "" },
    { enabled: !!firstProjectId },
  );

  if (!projects || projects.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Recent Reports
        </h3>
        <button
          type="button"
          onClick={() =>
            openWithFocus(
              { kind: "Donor Reports", name: "Report History" },
              "Show me all donor reports. Which ones are pending submission?",
            )
          }
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {!snapshots || snapshots.length === 0 ? (
        <div className="py-4 text-center">
          <FileText className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            No reports generated yet
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {snapshots.slice(0, 5).map((snapshot) => {
            const bva = snapshot.budgetVsActual;
            const isOverBudget =
              bva && typeof bva === "object" && "totalVariance" in bva
                ? (bva as { totalVariance: number }).totalVariance > 0
                : false;

            return (
              <div
                key={snapshot.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-accent"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      snapshot.status === "submitted"
                        ? "bg-emerald-500/10"
                        : snapshot.status === "final"
                          ? "bg-blue-500/10"
                          : "bg-amber-500/10",
                    )}
                  >
                    {snapshot.status === "submitted" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : snapshot.status === "final" ? (
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {snapshot.period}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {snapshot.status}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium capitalize",
                    snapshot.status === "submitted"
                      ? "text-emerald-500"
                      : snapshot.status === "final"
                        ? "text-blue-500"
                        : "text-amber-500",
                  )}
                >
                  {snapshot.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── AI Quick Actions ──────────────────────────────────────────────────────

function DonorAiActions() {
  const { openWithFocus } = useModuleAi();

  const actions = [
    {
      label: "Generate report",
      icon: FileText,
      prompt: "Generate a donor report for my most active project",
    },
    {
      label: "Budget vs actual",
      icon: TrendingUp,
      prompt: "Show me budget vs actual for all donor projects",
    },
    {
      label: "Donor summary",
      icon: HandCoins,
      prompt: "Give me a summary of all donor funding and disbursements",
    },
    {
      label: "Upcoming deadlines",
      icon: Clock,
      prompt: "Which donor reports are due soon?",
    },
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        AI Quick Actions
      </h3>
      <p className="text-xs text-muted-foreground/70 mb-3">
        Click to ask the AI to handle donor reporting for you.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() =>
              openWithFocus(
                { kind: "Donor Reporting", name: action.label },
                action.prompt,
              )
            }
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs text-foreground transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-primary group"
          >
            <action.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function DonorReportingPage() {
  return (
    <ModulePageShell
      title="Donor & Grant Reporting"
      description="Track donor-funded projects, budget vs actual, and generate reports in required formats."
      icon={HandCoins}
      aiSuggestions={[
        {
          label: "Show project status",
          prompt: "Show me the status of all donor projects",
        },
        {
          label: "Generate quarterly report",
          prompt: "Generate a quarterly donor report",
        },
        {
          label: "Budget variances",
          prompt: "Show me budget variances across all donor projects",
        },
      ]}
    >
      <div className="space-y-4 p-3 pb-20 sm:p-6 md:pb-6">
        {/* Stats Overview */}
        <DonorStats />

        {/* Project Cards */}
        <ProjectCards />

        {/* Recent Reports */}
        <RecentReports />

        {/* AI Quick Actions */}
        <DonorAiActions />
      </div>
    </ModulePageShell>
  );
}
