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
      "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50",
    icon: "text-blue-600 dark:text-blue-400",
    Icon: Info,
  },
  warning: {
    container:
      "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50",
    icon: "text-amber-600 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  tip: {
    container:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50",
    icon: "text-emerald-600 dark:text-emerald-400",
    Icon: Lightbulb,
  },
  note: {
    container:
      "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50",
    icon: "text-slate-600 dark:text-slate-400",
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
