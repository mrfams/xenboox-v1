import { AlertCircle, AlertTriangle, Lightbulb, Info } from "lucide-react";

import { cn } from "@/lib/utils";

interface InfoCalloutProps {
  type?: "info" | "warning" | "tip" | "note";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const calloutStyles = {
  info: {
    container:
      "border-primary/20 bg-primary/5 dark:border-primary/90 dark:bg-primary/95/50",
    icon: "text-primary ",
    Icon: Info,
  },
  warning: {
    container:
      "border-attention-amber/20 bg-attention-amber/5 dark:border-attention-amber/90 dark:bg-attention-amber/95/50",
    icon: "text-attention-amber dark:text-attention-amber",
    Icon: AlertTriangle,
  },
  tip: {
    container:
      "border-emerald-200 bg-balanced-green/5 dark:border-emerald-900 dark:bg-emerald-950/50",
    icon: "text-emerald-600 dark:text-emerald-400",
    Icon: Lightbulb,
  },
  note: {
    container:
      "border-border bg-paper-2/60 dark:border-ledger-ink/80 dark:bg-ledger-ink/90/50",
    icon: "text-muted-foreground dark:text-muted-foreground/60",
    Icon: AlertCircle,
  },
};

export function InfoCallout({
  type = "info",
  title,
  children,
  className,
}: InfoCalloutProps) {
  const style = calloutStyles[type];
  const Icon = style.Icon;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        style.container,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", style.icon)} />
      <div className="space-y-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
