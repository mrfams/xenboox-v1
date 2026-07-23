"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Circle,
  Loader2,
  X,
  Sparkles,
  Send,
  BookOpen,
  Landmark,
  Building2,
  FileText,
  MessageSquare,
  Upload,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
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

type OnboardingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismissed?: () => void;
};

const STEPS: Omit<OnboardingStep, "completed" | "inProgress">[] = [
  {
    id: "org",
    label: "Create organization",
    description: "Your workspace is ready",
    href: "/dashboard/settings",
  },
  {
    id: "coa",
    label: "Set up chart of accounts",
    description: "Import a template or create custom accounts",
    href: "/dashboard/coa",
  },
  {
    id: "fiscal",
    label: "Configure fiscal year",
    description: "Set your financial year dates",
    href: "/dashboard/fiscal",
  },
  {
    id: "bank",
    label: "Connect bank or upload statement",
    description: "Link via Mono API or upload monthly statements manually",
    href: "/dashboard/integrations",
  },
  {
    id: "documents",
    label: "Upload documents (optional)",
    description: "AI will classify and extract data from invoices/receipts",
    href: "/dashboard/documents",
    optional: true,
  },
];

const suggestedPrompts = [
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

type QuickActionItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
};

const quickActions: QuickActionItem[] = [
  {
    id: "coa",
    label: "Chart of Accounts",
    icon: BookOpen,
    href: "/dashboard/coa",
  },
  {
    id: "fiscal",
    label: "Fiscal Year",
    icon: Landmark,
    href: "/dashboard/fiscal",
  },
  {
    id: "bank",
    label: "Connect Bank / Upload Statement",
    icon: Building2,
    href: "/dashboard/integrations",
  },
  {
    id: "chat",
    label: "Ask CFO Agent",
    icon: MessageSquare,
    href: "/dashboard/chat",
  },
];

export function OnboardingModal({
  open,
  onOpenChange,
  onDismissed,
}: OnboardingModalProps) {
  const router = useRouter();
  const [chatMessage, setChatMessage] = useState("");

  const orgData = trpc.organization.listUserEntities.useQuery();
  const coaData = trpc.coa.list.useQuery();
  const fiscalData = trpc.fiscal.list.useQuery({});
  const bankData = trpc.integrations.getBankConnections.useQuery();
  const docData = trpc.document.listDocuments.useQuery();

  const steps: OnboardingStep[] = STEPS.map((step) => {
    let completed = false;
    switch (step.id) {
      case "org":
        completed = !!orgData.data;
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
    return { ...step, completed };
  });

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  const handlePrompt = (prompt: string) => {
    router.push(`/dashboard/chat?initial=${encodeURIComponent(prompt)}`);
    onOpenChange(false);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) handlePrompt(chatMessage.trim());
  };

  const handleStepClick = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Welcome to Xenboox</DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onDismissed?.()}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your AI accounting team is ready. Tell your agent what to do —
                connect your bank, upload documents, or ask anything about your
                finances.
              </p>
            </div>
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

          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt) => {
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Setup Progress</h3>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted mb-3">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="space-y-1">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => step.href && handleStepClick(step.href!)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        step.href && handleStepClick(step.href);
                      }
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      step.href && "cursor-pointer hover:bg-accent/50",
                      step.completed && "text-muted-foreground",
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {step.completed ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "font-medium",
                          step.completed && "line-through",
                          step.optional &&
                            !step.completed &&
                            "text-muted-foreground",
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
                          handleStepClick(step.href!);
                        }}
                      >
                        {step.id === "bank" ? "Connect / Upload" : "Setup"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => handleStepClick(action.href)}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-medium">{action.label}</span>
                      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
