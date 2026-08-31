"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
} from "@xenboox/ui";
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  PartyPopper,
} from "lucide-react";
import { useActivationStatus } from "@xenboox/web/lib/hooks/use-activation";
import { ACTIVATION_EVENTS } from "@xenboox/db/schema/analytics";

// ─── Activation Steps ──────────────────────────────────────────────────────

const ACTIVATION_STEPS = [
  { event: "create_invoice" as const, label: "Create your first invoice", icon: "📄" },
  { event: "import_bank" as const, label: "Import bank transactions", icon: "🏦" },
  { event: "see_narrative" as const, label: "View AI narrative", icon: "✨" },
  { event: "setup_business" as const, label: "Complete business setup", icon: "🏢" },
  { event: "invite_team" as const, label: "Invite a team member", icon: "👥" },
];

// ─── Component ─────────────────────────────────────────────────────────────

export function ActivationStatus() {
  const { score, status, nextStep, progress, completedEvents, isFullyActivated } =
    useActivationStatus();

  if (isFullyActivated) {
    return (
      <Card className="border-balanced-green/20 bg-balanced-green/5">
        <CardContent className="flex items-center gap-3 p-4">
          <PartyPopper className="h-5 w-5 text-balanced-green" />
          <div>
            <p className="text-sm font-medium text-balanced-green">
              You&apos;re fully activated! 🎉
            </p>
            <p className="text-xs text-muted-foreground">
              You&apos;ve completed all setup steps. Your AI accountant is ready to help.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Setup Progress
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {progress.completed}/{progress.total}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <Progress value={score * 100} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {status.label} — {Math.round(score * 100)}% complete
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {ACTIVATION_STEPS.map((step) => {
            const isCompleted = completedEvents.includes(step.event);
            return (
              <div
                key={step.event}
                className="flex items-center gap-2 text-sm"
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-balanced-green" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={
                    isCompleted
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }
                >
                  {step.icon} {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Next Step CTA */}
        {nextStep && (
          <div className="flex items-center gap-2 rounded-md bg-primary/5 p-2.5">
            <ArrowRight className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary">
              Next: {ACTIVATION_STEPS.find((s) => s.event === nextStep.event)?.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
