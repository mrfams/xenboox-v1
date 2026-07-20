"use client";

import { useState } from "react";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui";
import { ConfidenceBadge } from "@/components/dashboard/confidence-badge";
import { cn } from "@/lib/utils";

type ApprovalCardProps = {
  title: string;
  reason: string;
  recommendation: string;
  confidence: "high" | "medium" | "low";
  sourceDocument?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onAskWhy?: () => void;
  className?: string;
};

export function ApprovalCard({
  title,
  reason,
  recommendation,
  confidence,
  sourceDocument,
  onApprove,
  onReject,
  onAskWhy,
  className,
}: ApprovalCardProps) {
  const [actioned, setActioned] = useState(false);

  function handleAction(cb?: () => void) {
    setActioned(true);
    cb?.();
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card",
        actioned && "opacity-50 pointer-events-none",
        className,
      )}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
          </div>
          <ConfidenceBadge level={confidence} />
        </div>

        {/* Body — why it needs human */}
        <p className="text-sm text-muted-foreground">{reason}</p>

        {/* Agent recommendation */}
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            Agent Recommendation
          </p>
          <p className="text-sm text-foreground">{recommendation}</p>
        </div>

        {/* Source document link */}
        {sourceDocument && (
          <button className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <FileText className="h-3.5 w-3.5" />
            {sourceDocument}
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t px-4 py-3">
        <Button
          size="sm"
          variant="default"
          onClick={() => handleAction(onApprove)}
          disabled={actioned}
          className="gap-1.5"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction(onReject)}
          disabled={actioned}
          className="gap-1.5"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          Reject
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onAskWhy}
          disabled={actioned}
          className="gap-1.5 ml-auto"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Ask why
        </Button>
      </div>
    </div>
  );
}
