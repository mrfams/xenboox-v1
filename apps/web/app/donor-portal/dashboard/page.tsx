"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  HandCoins,
  TrendingUp,
  TrendingDown,
  FileText,
  ChevronRight,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Donor Portal Dashboard ─────────────────────────────────────────────────
//
// Read-only portal for external donors to view their funded projects.
// Scoped to a single donor customer — shows only their projects and reports.
// No sidebar, no navigation to internal pages.

type DonorProject = {
  id: string;
  projectName: string;
  projectCode: string | null;
  grantAmount: string;
  amountDisbursed: string;
  amountRemaining: string;
  reportingFormat: string;
  reportingCadence: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  budgetAllocation: Record<string, number> | null;
  reportSnapshots: DonorReportSnapshot[];
};

type DonorReportSnapshot = {
  id: string;
  period: string;
  budgetVsActual: {
    categories: Array<{
      category: string;
      budgeted: number;
      actual: number;
      variance: number;
      variancePct: number;
    }>;
    totalBudgeted: number;
    totalActual: number;
    totalVariance: number;
    totalVariancePct: number;
  };
  narrativeSummary: string | null;
  status: string;
  generatedAt: string;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "GMD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Project Card ──────────────────────────────────────────────────────────

function ProjectCard({
  project,
  isExpanded,
  onToggle,
}: {
  project: DonorProject;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const grantAmount = parseFloat(project.grantAmount);
  const disbursed = parseFloat(project.amountDisbursed);
  const remaining = parseFloat(project.amountRemaining);
  const percentUsed = grantAmount > 0 ? (disbursed / grantAmount) * 100 : 0;
  const isLow = percentUsed > 80;

  return (
    <div className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-5 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                {project.projectName}
              </h3>
              {project.status === "active" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground capitalize">
                  {project.status}
                </span>
              )}
            </div>
            {project.projectCode && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Code: {project.projectCode}
              </p>
            )}
          </div>
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-90",
            )}
          />
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isLow ? "bg-amber-500" : "bg-emerald-500",
              )}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {formatCurrency(disbursed)} disbursed
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(remaining)} remaining
            </span>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="rounded-lg bg-background/50 p-2.5">
            <p className="text-[10px] font-medium text-muted-foreground/70">Grant Amount</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(grantAmount)}</p>
          </div>
          <div className="rounded-lg bg-background/50 p-2.5">
            <p className="text-[10px] font-medium text-muted-foreground/70">Reporting</p>
            <p className="text-sm font-bold text-foreground uppercase">{project.reportingFormat}</p>
          </div>
          <div className="rounded-lg bg-background/50 p-2.5">
            <p className="text-[10px] font-medium text-muted-foreground/70">Cadence</p>
            <p className="text-sm font-bold text-foreground capitalize">{project.reportingCadence ?? "Quarterly"}</p>
          </div>
        </div>
      </button>

      {/* Expanded: Reports */}
      {isExpanded && (
        <div className="border-t border-border/30 p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">Report History</h4>
          {project.reportSnapshots.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No reports generated yet. Reports are auto-generated at your reporting cadence.
            </p>
          ) : (
            <div className="space-y-2">
              {project.reportSnapshots.map((snapshot) => {
                const bva = snapshot.budgetVsActual;
                return (
                  <div
                    key={snapshot.id}
                    className="rounded-lg border border-border/30 bg-background/30 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {snapshot.status === "submitted" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : snapshot.status === "final" ? (
                          <FileText className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        <span className="text-sm font-medium text-foreground">
                          {snapshot.period}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          ({snapshot.status})
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(snapshot.generatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Budget vs Actual summary */}
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">Budgeted</span>
                        <p className="font-medium text-foreground">{formatCurrency(bva.totalBudgeted)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Actual</span>
                        <p className="font-medium text-foreground">{formatCurrency(bva.totalActual)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Variance</span>
                        <p className={cn(
                          "font-medium",
                          bva.totalVariance > 0 ? "text-red-500" : bva.totalVariance < 0 ? "text-emerald-500" : "text-foreground",
                        )}>
                          {bva.totalVariance > 0 ? "+" : ""}{formatCurrency(bva.totalVariance)}
                        </p>
                      </div>
                    </div>

                    {/* Narrative */}
                    {snapshot.narrativeSummary && (
                      <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                        {snapshot.narrativeSummary}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function DonorDashboardPage() {
  const searchParams = useSearchParams();
  const donorId = searchParams.get("donor");
  const entityId = searchParams.get("entity");
  const donorName = searchParams.get("name");

  const [projects, setProjects] = useState<DonorProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  useEffect(() => {
    if (!donorId || !entityId) {
      setError("Invalid portal access. Please use the link from your email.");
      setLoading(false);
      return;
    }

    // Fetch donor projects via internal API
    // In production, this would use a token-scoped API endpoint
    fetch(`/api/donor-portal/projects?donor=${donorId}&entity=${entityId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setProjects(data.projects ?? []);
        }
      })
      .catch(() => setError("Failed to load projects."))
      .finally(() => setLoading(false));
  }, [donorId, entityId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Access Error</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <a
            href="/donor-portal"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Request new link
          </a>
        </div>
      </div>
    );
  }

  const totalGrant = projects.reduce((s, p) => s + parseFloat(p.grantAmount), 0);
  const totalDisbursed = projects.reduce((s, p) => s + parseFloat(p.amountDisbursed), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <HandCoins className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Donor Portal</h1>
              <p className="text-[11px] text-muted-foreground">
                {donorName ?? "Donor"} · {projects.length} project{projects.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1">
              <Shield className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-medium text-emerald-700">Read-only</span>
            </div>
            <a
              href="/donor-portal"
              className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted transition-colors"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/40 bg-card/80 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <p className="text-[10px] font-medium text-muted-foreground/70">Projects</p>
            </div>
            <p className="text-xl font-bold text-foreground">{projects.length}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/80 p-4">
            <div className="flex items-center gap-2 mb-2">
              <HandCoins className="h-4 w-4 text-emerald-500" />
              <p className="text-[10px] font-medium text-muted-foreground/70">Total Grants</p>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalGrant)}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/80 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="h-4 w-4 text-amber-500" />
              <p className="text-[10px] font-medium text-muted-foreground/70">Disbursed</p>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalDisbursed)}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/80 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="h-4 w-4 text-purple-500" />
              <p className="text-[10px] font-medium text-muted-foreground/70">Remaining</p>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalGrant - totalDisbursed)}</p>
          </div>
        </div>

        {/* Projects */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Your Projects</h2>
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/40 py-12 text-center">
              <HandCoins className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No donor projects found for your account.</p>
            </div>
          ) : (
            projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isExpanded={expandedProject === project.id}
                onToggle={() =>
                  setExpandedProject(expandedProject === project.id ? null : project.id)
                }
              />
            ))
          )}
        </div>

        {/* Footer */}
        <footer className="text-center py-6">
          <p className="text-[11px] text-muted-foreground/40">
            Powered by Xenboox AI · Read-only donor portal · 24-hour session
          </p>
        </footer>
      </main>
    </div>
  );
}
