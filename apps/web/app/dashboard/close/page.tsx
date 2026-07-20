"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  RotateCcw,
  Download,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CloseStep = {
  id: string;
  label: string;
  agent: string;
  status: "done" | "pending" | "warning";
  description: string;
};

const initialSteps: CloseStep[] = [
  {
    id: "controller",
    label: "Controller Confirmation",
    agent: "Controller Agent",
    status: "done",
    description: "All journal entries verified. Trial balance balanced.",
  },
  {
    id: "ap",
    label: "AP Reconciliation",
    agent: "AP Agent",
    status: "done",
    description: "All supplier invoices reconciled. No unmatched POs.",
  },
  {
    id: "ar",
    label: "AR Reconciliation",
    agent: "AR Agent",
    status: "done",
    description: "All customer invoices reconciled. Payment statuses verified.",
  },
  {
    id: "cash",
    label: "Cash & Bank Confirmation",
    agent: "Cash Agent",
    status: "done",
    description: "Bank accounts, mobile money, and cash tills reconciled.",
  },
  {
    id: "treasury",
    label: "Treasury Confirmation",
    agent: "Treasury Agent",
    status: "done",
    description: "Cash position verified. All transfers accounted for.",
  },
  {
    id: "compliance",
    label: "Compliance Check",
    agent: "Compliance Agent",
    status: "pending",
    description: "Pending review of PAYE and withholding tax for the period.",
  },
  {
    id: "close",
    label: "Final Close",
    agent: "Ledger Agent",
    status: "warning",
    description:
      "Awaiting compliance confirmation before closing. 2 items need review.",
  },
];

export default function CloseCenterPage() {
  const [steps, setSteps] = useState<CloseStep[]>(initialSteps);
  const [isClosing, setIsClosing] = useState(false);

  const doneCount = steps.filter((s) => s.status === "done").length;
  const totalCount = steps.length;
  const allDone = steps.every((s) => s.status === "done");

  function handleTriggerClose() {
    setIsClosing(true);
    setTimeout(() => {
      setSteps((prev) =>
        prev.map((s) => ({
          ...s,
          status: "done" as const,
        })),
      );
      setIsClosing(false);
    }, 2000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Close Center"
        description={`Books closed through June 2026 · ${doneCount}/${totalCount} steps complete`}
      >
        <Button variant="outline" size="sm" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reopen June
        </Button>
      </PageHeader>

      {/* Progress */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold">July 2026 Close Progress</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {allDone
                  ? "Ready to close"
                  : `${totalCount - doneCount} steps remaining`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {Math.round((doneCount / totalCount) * 100)}%
              </p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                allDone ? "bg-emerald-500" : "bg-primary",
              )}
              style={{ width: `${(doneCount / totalCount) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Steps checklist */}
      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "flex items-start gap-4 rounded-xl border p-4 transition-all",
              step.status === "done" &&
                "border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20",
              step.status === "warning" &&
                "border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20",
            )}
          >
            <div className="mt-0.5">
              {step.status === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : step.status === "warning" ? (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              ) : (
                <Clock className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{step.label}</p>
                <Badge
                  variant={
                    step.status === "done"
                      ? "default"
                      : step.status === "warning"
                        ? "outline"
                        : "secondary"
                  }
                  className="text-[10px]"
                >
                  {step.status === "done"
                    ? "Confirmed"
                    : step.status === "warning"
                      ? "Needs review"
                      : "Pending"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium">{step.agent}</span> —{" "}
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <Button
          size="lg"
          onClick={handleTriggerClose}
          disabled={!allDone || isClosing}
          className="gap-2"
        >
          {isClosing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Closing...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              {allDone ? "Close July 2026" : "Complete all steps to close"}
            </>
          )}
        </Button>

        {allDone && (
          <>
            <Button variant="outline" size="lg" className="gap-2">
              <Download className="h-4 w-4" />
              Download Close Package
            </Button>
            <Button variant="outline" size="lg" className="gap-2">
              <FileText className="h-4 w-4" />
              View Summary
            </Button>
          </>
        )}

        <Button variant="ghost" size="lg" className="gap-2 ml-auto">
          <RotateCcw className="h-4 w-4" />
          Reopen previous close
        </Button>
      </div>

      {/* Close package preview (shown after close) */}
      {allDone && !isClosing && (
        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              July 2026 — Close Package Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                "P&L Statement",
                "Balance Sheet",
                "Cash Flow",
                "Plain-English Summary",
              ].map((doc) => (
                <Button
                  key={doc}
                  variant="outline"
                  size="sm"
                  className="h-auto py-3 flex-col gap-1"
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-xs">{doc}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
