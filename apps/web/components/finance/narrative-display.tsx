"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@xenboox/ui";
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface NarrativeDisplayProps {
  summary: string;
  highlights: string[];
  concerns: string[];
  action?: string;
  confidence?: number;
  poweredBy?: "llm" | "fallback";
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  variant?: "compact" | "full";
}

export function NarrativeDisplay({
  summary,
  highlights,
  concerns,
  action,
  confidence = 0.8,
  poweredBy = "llm",
  isLoading = false,
  error = null,
  onRetry,
  variant = "full",
}: NarrativeDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(variant === "full");

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 animate-pulse text-primary" />
            <span>Generating AI narrative...</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-[shimmer_2s_infinite] bg-primary/20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span>{error}</span>
            </div>
            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="h-7 px-2"
              >
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary && highlights.length === 0 && concerns.length === 0) {
    return null;
  }

  return (      <Card className="border-border/40 bg-card/80 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">AI Financial Narrative</span>
              <span className="sm:hidden">AI Narrative</span>
              {poweredBy === "fallback" && (
                <Badge variant="outline" className="text-[10px]">
                  Fallback
                </Badge>
              )}
            </CardTitle>
            {variant === "full" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0 sm:h-7 sm:w-auto sm:px-2"
                aria-label={isExpanded ? "Collapse narrative" : "Expand narrative"}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                ) : (
                  <ChevronDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                )}
              </Button>
            )}
          </div>
        </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Summary */}
        <p className="text-sm leading-relaxed text-foreground" role="summary" aria-label="Financial narrative summary">
          {summary}
        </p>

        {isExpanded && (
          <>
            {/* Highlights */}
            {highlights.length > 0 && (
              <div className="space-y-1.5" role="list" aria-label="Positive findings">
                {highlights.map((highlight, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm"
                    role="listitem"
                  >
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-balanced-green" aria-hidden="true" />
                    <span className="text-foreground/80">{highlight}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Concerns */}
            {concerns.length > 0 && (
              <div className="space-y-1.5" role="list" aria-label="Areas of concern">
                {concerns.map((concern, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm"
                    role="listitem"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-attention-amber" aria-hidden="true" />
                    <span className="text-foreground/80">{concern}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action */}
            {action && (
              <div className="mt-2 flex items-start gap-2 rounded-md bg-primary/5 p-2.5 text-sm" role="note" aria-label="Recommended action">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="font-medium text-primary">{action}</span>
              </div>
            )}
          </>
        )}

        {/* Collapsed preview */}
        {!isExpanded && variant === "full" && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {highlights.length} highlights, {concerns.length} concerns
              {action && " · Action available"}
            </p>
            <span className="text-[10px] text-muted-foreground/60" aria-label={`Confidence: ${Math.round(confidence * 100)} percent`}>
              {Math.round(confidence * 100)}% confidence
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
