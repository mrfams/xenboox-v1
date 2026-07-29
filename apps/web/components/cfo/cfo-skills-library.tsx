"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  BarChart3,
  Calculator,
  FileSearch,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

type Skill = {
  id: string;
  label: string;
  prompt: string;
};

type SkillCategory = {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  skills: Skill[];
};

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: "analysis",
    label: "Financial Analysis",
    icon: BarChart3,
    color: "text-signal-indigo border-signal-indigo/20 bg-signal-indigo/5",
    skills: [
      {
        id: "explain-profit",
        label: "Explain my profit",
        prompt:
          "Why is my profit different from last month? Break it down by revenue, costs, and expenses.",
      },
      {
        id: "analyze-cashflow",
        label: "Analyze cash flow",
        prompt:
          "Analyze my cash flow for the current month and highlight the key inflows and outflows.",
      },
      {
        id: "why-expenses-up",
        label: "Why did expenses increase?",
        prompt:
          "Compare this month's expenses to last month and identify which categories increased and why.",
      },
      {
        id: "compare-month",
        label: "Compare with last month",
        prompt:
          "Give me a month-over-month comparison of my key financial metrics.",
      },
    ],
  },
  {
    id: "forecasting",
    label: "Forecasting",
    icon: TrendingUp,
    color: "text-balanced-green border-balanced-green/20 bg-balanced-green-bg",
    skills: [
      {
        id: "forecast-cash",
        label: "Forecast cash",
        prompt:
          "Forecast my cash flow for the next 3 months and identify any potential shortfalls.",
      },
      {
        id: "predict-revenue",
        label: "Predict revenue",
        prompt:
          "Based on historical data, what is my projected revenue for the next quarter?",
      },
      {
        id: "hiring-scenario",
        label: "Hiring scenario",
        prompt:
          "Can I afford to hire a new employee at $X/month? Analyze the impact on my runway.",
      },
      {
        id: "runway-analysis",
        label: "Runway analysis",
        prompt:
          "How many months of runway do I have at my current burn rate? What if revenue drops 20%?",
      },
    ],
  },
  {
    id: "accounting",
    label: "Accounting",
    icon: Calculator,
    color: "text-sky-500 border-sky-500/20 bg-sky-50 dark:bg-sky-950/20",
    skills: [
      {
        id: "reconcile",
        label: "Reconcile accounts",
        prompt:
          "Run reconciliation on my bank accounts and flag any discrepancies.",
      },
      {
        id: "prepare-close",
        label: "Prepare month-end",
        prompt:
          "Start the month-end close process. Check all pending items and tell me what's needed.",
      },
      {
        id: "review-journals",
        label: "Review journals",
        prompt:
          "Review recent journal entries for accuracy and flag any unusual postings.",
      },
      {
        id: "generate-statements",
        label: "Generate statements",
        prompt:
          "Generate my financial statements (P&L, Balance Sheet, Cash Flow) for the current period.",
      },
    ],
  },
  {
    id: "tax",
    label: "Tax",
    icon: FileSearch,
    color:
      "text-attention-amber border-attention-amber/20 bg-attention-amber-bg",
    skills: [
      {
        id: "prepare-vat",
        label: "Prepare VAT",
        prompt:
          "Prepare my VAT return for the current period with all supporting calculations.",
      },
      {
        id: "estimate-tax",
        label: "Estimate tax",
        prompt:
          "Estimate my tax liability for this quarter based on current year performance.",
      },
      {
        id: "find-deductions",
        label: "Find deductions",
        prompt:
          "Review my expenses and identify any tax deductions I may have missed.",
      },
    ],
  },
  {
    id: "strategy",
    label: "Strategy",
    icon: Lightbulb,
    color:
      "text-purple-500 border-purple-500/20 bg-purple-50 dark:bg-purple-950/20",
    skills: [
      {
        id: "reduce-costs",
        label: "Reduce costs",
        prompt:
          "Analyze my spending and recommend 5 specific ways to reduce costs without impacting operations.",
      },
      {
        id: "improve-margins",
        label: "Improve margins",
        prompt:
          "What levers can I pull to improve my profit margins? Analyze pricing, costs, and mix.",
      },
      {
        id: "benchmark",
        label: "Benchmark competitors",
        prompt:
          "How does my financial performance compare to industry benchmarks for my sector?",
      },
      {
        id: "find-growth",
        label: "Find growth opportunities",
        prompt:
          "Analyze my revenue streams and identify the highest potential growth opportunities.",
      },
    ],
  },
];

type CFOSkillsLibraryProps = {
  onSelectSkill?: (prompt: string) => void;
  className?: string;
};

export function CFOSkillsLibrary({
  onSelectSkill,
  className,
}: CFOSkillsLibraryProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const router = useRouter();

  const handleSkillClick = (prompt: string) => {
    if (onSelectSkill) {
      onSelectSkill(prompt);
    } else {
      router.push(`/dashboard/chat?initial=${encodeURIComponent(prompt)}`);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {SKILL_CATEGORIES.map((category) => {
        const Icon = category.icon;
        const isExpanded = expandedCategory === category.id;

        return (
          <div key={category.id} className="rounded-lg border bg-card">
            <button
              type="button"
              onClick={() =>
                setExpandedCategory(isExpanded ? null : category.id)
              }
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-muted/50 rounded-lg",
                isExpanded && "border-b rounded-b-none",
              )}
            >
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md",
                  category.color,
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="flex-1 text-foreground/80">
                {category.label}
              </span>
              <span
                className={cn(
                  "text-[10px] text-muted-foreground/50 transition-transform",
                  isExpanded && "rotate-180",
                )}
              >
                ▼
              </span>
            </button>

            {isExpanded && (
              <div className="grid grid-cols-2 gap-1 p-2">
                {category.skills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => handleSkillClick(skill.prompt)}
                    className="rounded-md px-2.5 py-2 text-left text-[11px] leading-relaxed text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground hover:shadow-sm"
                  >
                    {skill.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
