"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui";

export type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  inProgress?: boolean;
  href?: string;
  action?: string;
  optional?: boolean;
};

type OnboardingChecklistProps = {
  onAction?: (action: string) => void;
  className?: string;
};

export function OnboardingChecklist({
  onAction,
  className,
}: OnboardingChecklistProps) {
  const router = useRouter();

  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: "org",
      label: "Create organization",
      description: "Your workspace is ready",
      completed: false,
      href: "/dashboard/settings",
    },
    {
      id: "coa",
      label: "Set up chart of accounts",
      description: "Import or create account categories",
      completed: false,
      href: "/dashboard/coa",
    },
    {
      id: "fiscal",
      label: "Configure fiscal year",
      description: "Set your financial year dates",
      completed: false,
      href: "/dashboard/fiscal",
    },
    {
      id: "bank",
      label: "Connect bank or upload statement",
      description: "Link via Mono or upload a statement manually",
      completed: false,
      href: "/dashboard/integrations",
    },
    {
      id: "documents",
      label: "Upload documents",
      description: "AI will classify and extract data",
      completed: false,
      href: "/dashboard/documents",
      optional: true,
    },
  ]);

  const orgData = trpc.organization.listUserEntities.useQuery();
  const coaData = trpc.coa.list.useQuery();
  const fiscalData = trpc.fiscal.list.useQuery({});
  const bankData = trpc.integrations.getBankConnections.useQuery();
  const docData = trpc.document.listDocuments.useQuery();

  useEffect(() => {
    setSteps((prev) =>
      prev.map((step) => {
        switch (step.id) {
          case "org":
            return { ...step, completed: !!orgData.data };
          case "coa":
            return { ...step, completed: (coaData.data?.length ?? 0) > 0 };
          case "fiscal":
            return { ...step, completed: (fiscalData.data?.length ?? 0) > 0 };
          case "bank":
            return { ...step, completed: (bankData.data?.length ?? 0) > 0 };
          case "documents":
            return {
              ...step,
              completed: (docData.data?.length ?? 0) > 0,
            };
          default:
            return step;
        }
      }),
    );
  }, [
    orgData.data,
    coaData.data,
    fiscalData.data,
    bankData.data,
    docData.data,
  ]);

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  const handleClick = (step: OnboardingStep) => {
    if (step.href) {
      router.push(step.href);
    } else if (step.action) {
      onAction?.(step.action);
    }
  };

  return (
    <div className={cn("rounded-xl border bg-card p-5", className)}>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Setup Progress</h3>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{steps.length}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="space-y-1">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href ?? "#"}
            onClick={(e) => {
              if (!step.href) {
                e.preventDefault();
              }
              handleClick(step);
            }}
            className={cn(
              "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              step.href && "cursor-pointer hover:bg-accent/50",
              step.completed && "text-muted-foreground",
              step.inProgress && "bg-primary/5",
            )}
          >
            <div className="mt-0.5 shrink-0">
              {step.completed ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-3 w-3 text-primary" />
                </div>
              ) : step.inProgress ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/50" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-medium",
                  step.completed && "line-through",
                  step.optional && !step.completed && "text-muted-foreground",
                )}
              >
                {step.label}
                {step.optional && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    (optional)
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step.description}
              </p>
            </div>
            {!step.completed && step.href && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-7 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClick(step);
                }}
              >
                {step.id === "bank" ? "Connect / Upload" : "Setup"}
              </Button>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
