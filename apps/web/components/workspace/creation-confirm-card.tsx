"use client";

import {
  Check,
  X,
  Loader2,
  FileText,
  Building2,
  User,
  Receipt,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

type CreationType =
  | "create_invoice"
  | "create_vendor"
  | "create_customer"
  | "create_expense"
  | "create_journal_entry";

interface CreationConfirmCardProps {
  type: CreationType;
  title: string;
  description: string;
  confidence: number;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

const TYPE_CONFIG: Record<
  CreationType,
  { icon: typeof FileText; label: string; color: string }
> = {
  create_invoice: {
    icon: FileText,
    label: "Invoice",
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950",
  },
  create_vendor: {
    icon: Building2,
    label: "Vendor",
    color: "text-orange-600 bg-orange-50 dark:bg-orange-950",
  },
  create_customer: {
    icon: User,
    label: "Customer",
    color: "text-green-600 bg-green-50 dark:bg-green-950",
  },
  create_expense: {
    icon: Receipt,
    label: "Expense",
    color: "text-red-600 bg-red-50 dark:bg-red-950",
  },
  create_journal_entry: {
    icon: BookOpen,
    label: "Journal Entry",
    color: "text-purple-600 bg-purple-50 dark:bg-purple-950",
  },
};

export function CreationConfirmCard({
  type,
  description,
  confidence,
  onConfirm,
  onCancel,
  isExecuting = false,
}: CreationConfirmCardProps) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className="w-full max-w-[80%] rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md",
            config.color,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-medium text-foreground">
          Create {config.label}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {Math.round(confidence * 100)}% confidence
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <pre className="text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans">
          {description}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/40 bg-muted/30">
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isExecuting}
          className="h-7 text-xs gap-1.5"
        >
          {isExecuting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {isExecuting ? "Creating..." : "Confirm & Create"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isExecuting}
          className="h-7 text-xs gap-1.5"
        >
          <X className="h-3 w-3" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
