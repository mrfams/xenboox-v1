"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Brain,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";

interface RiskFlag {
  label: string;
  severity: "high" | "medium" | "low";
  description: string;
}

interface RiskAssessment {
  id: string;
  title: string;
  amount: string;
  department: string;
  flags: RiskFlag[];
  recommendation: string;
  recommendationType: "approve" | "reject" | "negotiate";
  confidence: number;
}

const DEFAULT_ASSESSMENT: RiskAssessment = {
  id: "risk-1",
  title: "New Software License — Design Tools",
  amount: "$24,000/year",
  department: "Engineering",
  flags: [
    {
      label: "Cost increased 40%",
      severity: "high",
      description:
        "Previous year was $17,000 — significant jump without justification",
    },
    {
      label: "Similar tool already exists",
      severity: "high",
      description:
        "Figma + Adobe Creative Cloud licenses already active for the team",
    },
    {
      label: "Budget exceeded",
      severity: "medium",
      description:
        "Department budget has $8,000 remaining for Q3 — this exceeds by 3x",
    },
    {
      label: "New vendor relationship",
      severity: "low",
      description: "No existing history with this supplier",
    },
  ],
  recommendation:
    "Reject or negotiate down. Consider bundling with existing vendor.",
  recommendationType: "reject",
  confidence: 94,
};

const SEVERITY_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  high: {
    color: "text-error-clay",
    bg: "bg-error-clay/10",
    label: "High Risk",
  },
  medium: {
    color: "text-attention-amber",
    bg: "bg-attention-amber/10",
    label: "Medium Risk",
  },
  low: {
    color: "text-balanced-green",
    bg: "bg-balanced-green/10",
    label: "Low Risk",
  },
};

const RECOMMENDATION_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ReactNode; label: string }
> = {
  approve: {
    color: "text-balanced-green",
    bg: "bg-balanced-green/10",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: "Recommend Approve",
  },
  reject: {
    color: "text-error-clay",
    bg: "bg-error-clay/10",
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: "Recommend Reject",
  },
  negotiate: {
    color: "text-attention-amber",
    bg: "bg-attention-amber/10",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    label: "Recommend Negotiate",
  },
};

interface KnowledgeApprovalRiskScoringProps {
  assessment?: RiskAssessment;
}

export function KnowledgeApprovalRiskScoring({
  assessment = DEFAULT_ASSESSMENT,
}: KnowledgeApprovalRiskScoringProps) {
  const [expanded, setExpanded] = useState(false);
  const recConfig = RECOMMENDATION_CONFIG[assessment.recommendationType];

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-attention-amber" />
        <h3 className="text-sm font-medium">Approval Risk Scoring</h3>
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {assessment.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {assessment.amount}
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground">
                {assessment.department}
              </span>
            </div>
          </div>
        </div>

        {/* AI Review header */}
        <div className="flex items-center gap-1.5 mb-2">
          <Brain className="h-3.5 w-3.5 text-signal-indigo" />
          <span className="text-[11px] font-semibold text-foreground">
            AI Review:
          </span>
        </div>

        {/* Risk flags */}
        <div className="space-y-1.5 mb-3">
          {assessment.flags.map((flag, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2",
                SEVERITY_CONFIG[flag.severity].bg,
              )}
            >
              <AlertTriangle
                className={cn(
                  "h-3 w-3 mt-0.5 shrink-0",
                  SEVERITY_CONFIG[flag.severity].color,
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      SEVERITY_CONFIG[flag.severity].color,
                    )}
                  >
                    {flag.label}
                  </span>
                  <span
                    className={cn(
                      "text-[8px] font-medium px-1 rounded",
                      SEVERITY_CONFIG[flag.severity].bg,
                      SEVERITY_CONFIG[flag.severity].color,
                    )}
                  >
                    {SEVERITY_CONFIG[flag.severity].label}
                  </span>
                </div>
                {expanded && (
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {flag.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <FileText className="h-2.5 w-2.5" />
          {expanded ? "Show less detail" : "Show detailed analysis"}
        </button>

        {/* Recommendation */}
        <div
          className={cn("rounded-lg p-3 flex items-start gap-2", recConfig.bg)}
        >
          <div className={cn("mt-0.5", recConfig.color)}>{recConfig.icon}</div>
          <div className="flex-1">
            <p className={cn("text-[11px] font-semibold", recConfig.color)}>
              {recConfig.label}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {assessment.recommendation}
            </p>

            {/* Confidence bar */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] text-muted-foreground">
                Confidence
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[80px]">
                <div
                  className={cn(
                    "h-full rounded-full",
                    assessment.confidence >= 95
                      ? "bg-balanced-green"
                      : assessment.confidence >= 85
                        ? "bg-attention-amber"
                        : "bg-error-clay",
                  )}
                  style={{ width: `${assessment.confidence}%` }}
                />
              </div>
              <span className="text-[10px] font-bold tabular-nums">
                {assessment.confidence}%
              </span>
            </div>
          </div>
        </div>

        {/* Action */}
        <button className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent">
          View Details <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
