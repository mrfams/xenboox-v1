import Link from "next/link";
import { PlayCircle, BarChart3, ArrowRight } from "lucide-react";

export default function ConsolidationPage() {
  return (
    <div className="mx-auto max-w-3xl py-12 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Consolidation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Multi-entity consolidation — inter-company elimination, side-by-side
          comparison, and group-level statements.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href="/dashboard/consolidation/pipeline"
          className="group relative rounded-2xl border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden"
        >
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-2xl" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
              <PlayCircle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold">Consolidation Pipeline</h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Run the multi-step consolidation pipeline: map entities, match
              inter-company transactions, generate eliminations, translate
              currencies, compute minority interest, and assemble consolidated
              statements.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
              Open Pipeline{" "}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/consolidation/view"
          className="group relative rounded-2xl border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden"
        >
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-blue-500/5 to-transparent blur-2xl" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 text-blue-600">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold">Consolidated View</h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Side-by-side financial comparison of the parent entity and all
              subsidiaries. View income statement, balance sheet, and activity
              metrics across the group with elimination adjustments applied.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600">
              Open Consolidated View{" "}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
