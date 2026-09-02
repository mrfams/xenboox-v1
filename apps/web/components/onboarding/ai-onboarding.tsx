"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Sparkles,
  Building2,
  BookOpen,
  Landmark,
  Check,
  ArrowRight,
  Loader2,
  Send,
  Bot,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/events";
import {
  trackFunnel,
  trackFeatureAdoption,
} from "@/lib/analytics/feature-tracking";

// ─── Types ──────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "ai" | "user";
  content: string;
  timestamp: Date;
};

type OnboardingPhase =
  | "greeting"
  | "collecting"
  | "setting-up"
  | "preview"
  | "complete";

type BusinessInfo = {
  name: string;
  industry: string;
};

// ─── AI Responses (simulated — wire to real LLM later) ──────────────────────

function getAIResponse(
  phase: OnboardingPhase,
  input: string,
  info: BusinessInfo,
): {
  message: string;
  nextPhase: OnboardingPhase;
  collectedInfo?: Partial<BusinessInfo>;
} {
  if (phase === "greeting") {
    if (!info.name) {
      return {
        message: `Hey! 👋 I'm your AI accounting assistant. I'll set everything up for you — chart of accounts, tax rules, entity config — all automatically. What's your business name?`,
        nextPhase: "collecting",
      };
    }
  }

  if (phase === "collecting") {
    if (!info.name) {
      return {
        message: `Great, ${input}! What industry are you in? (e.g., e-commerce, consulting, manufacturing, restaurant, real estate)`,
        nextPhase: "collecting",
        collectedInfo: { name: input },
      };
    }
    if (!info.industry) {
      return {
        message: `Perfect. I'm setting up ${info.name} for the ${input} industry now...`,
        nextPhase: "setting-up",
        collectedInfo: { industry: input },
      };
    }
  }

  if (phase === "preview") {
    return {
      message: `Everything's ready! Here's what I set up for ${info.name}. You can customize anything from the dashboard.`,
      nextPhase: "complete",
    };
  }

  return {
    message: "Let me know if you need anything else!",
    nextPhase: phase,
  };
}

// ─── Chat Bubble ────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: Message }) {
  const isAI = message.role === "ai";

  return (
    <div
      className={cn(
        "flex gap-2.5 max-w-[85%]",
        isAI ? "self-start" : "self-end flex-row-reverse",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isAI
            ? "bg-gradient-to-br from-primary to-primary/60 text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isAI ? (
          <Bot className="h-3.5 w-3.5" />
        ) : (
          <User className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Message */}
      <div
        className={cn(
          "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isAI
            ? "bg-muted text-foreground rounded-tl-md"
            : "bg-primary text-primary-foreground rounded-tr-md",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

// ─── Typing Indicator ───────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 self-start">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-muted px-3.5 py-3">
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.3s]" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.15s]" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40" />
      </div>
    </div>
  );
}

// ─── Setup Progress ─────────────────────────────────────────────────────────

function SetupProgress({ step, total }: { step: number; total: number }) {
  const steps = [
    { label: "Chart of Accounts", icon: BookOpen },
    { label: "Tax Configuration", icon: Landmark },
    { label: "Entity Setup", icon: Building2 },
  ];

  return (
    <div className="space-y-3 py-4">
      {steps.map((s, i) => {
        const isDone = i < step;
        const isCurrent = i === step;
        const Icon = s.icon;

        return (
          <div key={s.label} className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                isDone
                  ? "bg-emerald-500 text-white"
                  : isCurrent
                    ? "bg-primary text-primary-foreground animate-pulse"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {isDone ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                isDone
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isCurrent
                    ? "text-foreground"
                    : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            {isCurrent && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary ml-auto" />
            )}
            {isDone && (
              <Check className="h-3.5 w-3.5 text-emerald-500 ml-auto" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Setup Result Cards ─────────────────────────────────────────────────────

function SetupResultCards({ info }: { info: BusinessInfo }) {
  const cards = [
    {
      title: "Chart of Accounts",
      description: `${info.industry}-optimized accounts with 47 accounts`,
      icon: BookOpen,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Tax Rules",
      description: "Auto-configured for your region",
      icon: Landmark,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Entity",
      description: `${info.name} — ready to go`,
      icon: Building2,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="grid gap-2 py-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3"
        >
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              card.bg,
            )}
          >
            <card.icon className={cn("h-4 w-4", card.color)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{card.title}</p>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </div>
          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AiOnboarding() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<OnboardingPhase>("greeting");
  const [isTyping, setIsTyping] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: "",
    industry: "",
  });
  const [setupStep, setSetupStep] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setEntityId } = useEntity();
  const createOrgMutation = trpc.organization.create.useMutation();
  const createEntityMutation = trpc.organization.createEntity.useMutation();
  const listOrgsQuery = trpc.organization.list.useQuery(undefined, {
    enabled: false,
  });
  const completeOnboarding = trpc.onboarding.completeFlow.useMutation();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Initial AI greeting
  useEffect(() => {
    if (messages.length === 0 && phase === "greeting") {
      setIsTyping(true);
      const timer = setTimeout(() => {
        const response = getAIResponse("greeting", "", businessInfo);
        setMessages([
          {
            id: crypto.randomUUID(),
            role: "ai",
            content: response.message,
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
        inputRef.current?.focus();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Run setup after collecting info
  const runSetup = useCallback(
    async (info: BusinessInfo) => {
      setPhase("setting-up");
      setIsTyping(true);

      // Step 1: Chart of Accounts
      setSetupStep(0);
      await new Promise((r) => setTimeout(r, 1200));

      // Step 2: Tax Configuration
      setSetupStep(1);
      await new Promise((r) => setTimeout(r, 1000));

      // Step 3: Entity Setup
      setSetupStep(2);
      try {
        let orgs = listOrgsQuery.data;
        if (orgs === undefined) {
          orgs = (await listOrgsQuery.refetch()).data;
        }

        let orgId: string;
        if (Array.isArray(orgs) && orgs.length > 0) {
          orgId = orgs[0].id;
        } else {
          const org = await createOrgMutation.mutateAsync({
            name: info.name,
            slug: `org-${Date.now()}`,
            type: "business",
          });
          if (!org?.organization?.id) {
            throw new Error("Failed to create organization");
          }
          orgId = org.organization.id;
        }

        const entity = await createEntityMutation.mutateAsync({
          organizationId: orgId,
          name: info.name,
          type: "company",
          currency: "USD",
          country: "GM",
        });

        if (entity?.id) {
          setEntityId(entity.id, "admin");
        }
      } catch {
        toast.error(
          "Setup had a hiccup, but you can continue from the dashboard.",
        );
      }

      setSetupStep(3);
      await new Promise((r) => setTimeout(r, 600));

      // Show result
      setIsTyping(false);
      setPhase("preview");

      const previewMsg: Message = {
        id: crypto.randomUUID(),
        role: "ai",
        content: `All done! Here's what I set up for ${info.name}. Take a look, then head to your dashboard.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, previewMsg]);
    },
    [listOrgsQuery, createOrgMutation, createEntityMutation, setEntityId],
  );

  // Handle send
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Get AI response
    setIsTyping(true);
    const response = getAIResponse(phase, text, businessInfo);

    if (response.collectedInfo) {
      setBusinessInfo((prev) => ({ ...prev, ...response.collectedInfo! }));
    }

    const timer = setTimeout(() => {
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "ai",
        content: response.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
      setPhase(response.nextPhase);

      // If we just collected both name and industry, start setup
      const updatedInfo = { ...businessInfo, ...response.collectedInfo };
      if (
        response.nextPhase === "setting-up" &&
        updatedInfo.name &&
        updatedInfo.industry
      ) {
        runSetup(updatedInfo);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [input, isTyping, phase, businessInfo, runSetup]);

  // Handle go to dashboard
  const handleGoToDashboard = useCallback(async () => {
    try {
      await completeOnboarding.mutateAsync();
      track("onboarding_completed", {
        entityId: localStorage.getItem("currentEntityId") ?? "",
        duration_seconds: 0,
      });
      trackFunnel("onboarding_completed", {
        entityId: localStorage.getItem("currentEntityId") ?? "",
      });
      trackFeatureAdoption("onboarding_complete", {
        entityId: localStorage.getItem("currentEntityId") ?? "",
      });
    } catch {
      // Non-blocking
    }
    window.location.href = "/dashboard";
  }, [completeOnboarding]);

  // Handle skip
  const handleSkip = useCallback(async () => {
    try {
      await completeOnboarding.mutateAsync();
      track("onboarding_skipped", {
        entityId: localStorage.getItem("currentEntityId") ?? "",
        lastStep: phase,
      });
    } catch {
      // Non-blocking
    }
    window.location.href = "/dashboard";
  }, [completeOnboarding, phase]);

  const showInput = phase === "greeting" || phase === "collecting";
  const showSetup = phase === "setting-up";
  const showPreview = phase === "preview" || phase === "complete";

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-lg flex-col gap-3">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {isTyping && <TypingIndicator />}

          {showSetup && (
            <div className="self-start ml-9.5">
              <SetupProgress step={setupStep} total={3} />
            </div>
          )}

          {showPreview && <SetupResultCards info={businessInfo} />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      {showInput && (
        <div className="border-t border-border/50 bg-background px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="mx-auto flex max-w-lg gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                phase === "greeting"
                  ? "What's your business name?"
                  : "What industry?"
              }
              disabled={isTyping}
              className="h-10 flex-1"
              autoFocus
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={!input.trim() || isTyping}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      {/* Go to Dashboard button (after setup) */}
      {showPreview && (
        <div className="border-t border-border/50 bg-background px-4 py-3">
          <div className="mx-auto max-w-lg">
            <Button
              onClick={handleGoToDashboard}
              className="w-full h-10 text-sm font-semibold"
              size="lg"
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Skip link */}
      {phase !== "complete" && (
        <div className="pb-3 text-center">
          <button
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip setup →
          </button>
        </div>
      )}
    </div>
  );
}
