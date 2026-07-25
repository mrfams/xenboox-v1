"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Circle,
  Loader2,
  Sparkles,
  Send,
  BookOpen,
  Landmark,
  Building2,
  FileText,
  MessageSquare,
  Upload,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

export type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  inProgress?: boolean;
  href?: string;
  optional?: boolean;
};

type SetupWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: number;
};

const STEPS: Omit<OnboardingStep, "completed" | "inProgress">[] = [
  {
    id: "org",
    label: "Create your organization",
    description:
      "Set up your workspace so we can scope your books and team access correctly.",
    href: "/welcome",
  },
  {
    id: "coa",
    label: "Set up chart of accounts",
    description:
      "Import a template or create your own account structure to match your business.",
    href: "/dashboard/coa",
  },
  {
    id: "fiscal",
    label: "Configure fiscal year",
    description:
      "Confirm your financial year dates so periods, closes, and reports line up correctly.",
    href: "/dashboard/fiscal",
  },
  {
    id: "bank",
    label: "Connect bank or upload statement",
    description:
      "Link a bank account or import a statement so transactions can be reconciled.",
    href: "/dashboard/integrations",
  },
  {
    id: "documents",
    label: "Upload documents (optional)",
    description:
      "Upload invoices, receipts, or statements and the AI will extract the data.",
    href: "/dashboard/documents",
    optional: true,
  },
];

const SUGGESTED_PROMPTS = [
  {
    text: "Set up my chart of accounts for a trading business",
    icon: BookOpen,
  },
  { text: "I want to connect my bank account", icon: Landmark },
  { text: "I have invoices to upload", icon: FileText },
  {
    text: "What accounting software can you import from?",
    icon: MessageSquare,
  },
];

export function SetupWizard({
  open,
  onOpenChange,
  initialStep = 1,
}: SetupWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [chatMessage, setChatMessage] = useState("");

  const orgData = trpc.organization.listUserEntities.useQuery();
  const coaData = trpc.coa.list.useQuery();
  const fiscalData = trpc.fiscal.list.useQuery({});
  const bankData = trpc.integrations.getBankConnections.useQuery();
  const docData = trpc.document.listDocuments.useQuery();

  const steps: OnboardingStep[] = STEPS.map((s) => {
    let completed = false;
    switch (s.id) {
      case "org":
        completed = (orgData.data?.length ?? 0) > 0;
        break;
      case "coa":
        completed = (coaData.data?.length ?? 0) > 0;
        break;
      case "fiscal":
        completed = (fiscalData.data?.length ?? 0) > 0;
        break;
      case "bank":
        completed = (bankData.data?.length ?? 0) > 0;
        break;
      case "documents":
        completed = (docData.data?.length ?? 0) > 0;
        break;
    }
    return { ...s, completed };
  });

  const completedCount = steps.filter((s) => s.completed).length;
  const allComplete = completedCount === steps.length;
  const currentStep = steps[Math.min(step, steps.length) - 1];
  const isFirstStep = step === 1;

  const goTo = (next: number) => {
    setStep(Math.max(1, Math.min(steps.length, next)));
  };

  const handlePrompt = (prompt: string) => {
    router.push(`/dashboard/chat?initial=${encodeURIComponent(prompt)}`);
    onOpenChange(false);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) handlePrompt(chatMessage.trim());
  };

  const handleStepAction = () => {
    if (currentStep?.href) {
      router.push(currentStep.href);
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    goTo(step + 1);
  };

  const handleBack = () => {
    goTo(step - 1);
  };

  const getStepLabel = (stepIndex: number) => {
    if (stepIndex <= 0 || stepIndex > steps.length) return "";
    return steps[stepIndex - 1]?.label ?? "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              {allComplete
                ? "You're all set!"
                : `Setup Guide — Step ${step} of ${steps.length}`}
            </DialogTitle>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {steps.map((s, idx) => (
              <div
                key={s.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  idx < step || s.completed ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {allComplete
              ? "All setup steps are complete."
              : `${completedCount}/${steps.length} completed — ${getStepLabel(step)}`}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {allComplete ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <Check className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Setup complete</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your workspace is ready. You can still update any step later
                  from the setup button.
                </p>
              </div>
              <Button className="mt-2" onClick={() => onOpenChange(false)}>
                Go to dashboard
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{currentStep?.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {currentStep?.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={prompt.text}
                      type="button"
                      onClick={() => handlePrompt(prompt.text)}
                      className="inline-flex items-center gap-1.5 rounded-lg border bg-background/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                    >
                      <Icon className="h-3 w-3" />
                      {prompt.text}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleChatSubmit} className="relative">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Ask your AI anything — or start by describing your business..."
                  className="w-full rounded-xl border bg-background px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
                  disabled={!chatMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {currentStep?.label}
                  </span>
                  {currentStep?.completed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                      <Check className="h-3 w-3" /> Done
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                      <Circle className="h-3 w-3" /> Pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {currentStep?.description}
                </p>
                <Button
                  className="w-full"
                  onClick={handleStepAction}
                  disabled={!currentStep?.href}
                >
                  {currentStep?.id === "bank"
                    ? "Connect / Upload"
                    : currentStep?.completed
                      ? "Open again"
                      : "Start this step"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        {!allComplete && (
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={isFirstStep}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              {!currentStep?.completed && !currentStep?.optional && (
                <Button variant="outline" size="sm" onClick={handleSkip}>
                  Skip <SkipForward className="ml-1 h-4 w-4" />
                </Button>
              )}
              <Button size="sm" onClick={() => goTo(step + 1)}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
